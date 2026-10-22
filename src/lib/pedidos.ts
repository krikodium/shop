import { prisma } from "@/lib/prisma";
import { eventoSchema } from "@/lib/validaciones/ventaSchema";
import {
  dinero,
  huella,
  serializable,
} from "@/lib/calculadores/finanzasServidor";
import {
  estadoDePago,
  saldoPendiente,
  totalPagado,
} from "@/lib/calculadores/pagosVenta";
import type { z } from "zod";
export const incluirPedido = {
  venta: {
    include: {
      cliente: true,
      items: true,
      pagos: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { fecha: "asc" as const },
      },
    },
  },
  eventos: { orderBy: { createdAt: "desc" as const } },
};
export async function obtenerPedidos(id?: string) {
  const pedidos = await prisma.pedido.findMany({
    where: id ? { id } : {},
    include: incluirPedido,
    orderBy: { updatedAt: "desc" },
  });
  const autores = await prisma.user.findMany({
    where: {
      id: {
        in: [
          ...new Set(pedidos.flatMap((p) => p.eventos.map((e) => e.usuarioId))),
        ],
      },
    },
    select: { id: true, name: true, email: true },
  });
  return pedidos.map((p) => ({
    ...p,
    totalPagado: totalPagado(p.venta.pagos).toFixed(2),
    saldoPendiente: p.venta.anulada
      ? "0.00"
      : saldoPendiente(p.venta.total, p.venta.pagos).toFixed(2),
    venta: {
      ...p.venta,
      estadoPago: estadoDePago(p.venta.total, p.venta.pagos),
    },
    eventos: p.eventos.map((e) => ({
      ...e,
      fecha: e.createdAt,
      itemNombre:
        p.venta.items.find((i) => i.id === e.itemId)?.productoNombre ?? null,
      usuario: {
        nombre:
          autores.find((a) => a.id === e.usuarioId)?.name ??
          autores.find((a) => a.id === e.usuarioId)?.email ??
          "Usuario",
      },
    })),
  }));
}
export async function registrarEventoPedido(
  pedidoId: string,
  entrada: z.infer<typeof eventoSchema>,
  usuarioId: string,
) {
  const datos = eventoSchema.parse(entrada);
  const fingerprint = huella({ ...datos, pedidoId, usuarioId });
  await serializable(async (tx) => {
    const autor = await tx.user.findUnique({ where: { id: usuarioId } });
    if (!autor || autor.role === "VIEWER")
      throw new Error("No tenés permiso para modificar pedidos");
    const previo = await tx.eventoPedido.findUnique({
      where: { claveIdempotencia: datos.claveIdempotencia },
    });
    if (previo) {
      if (previo.huellaSolicitud !== fingerprint)
        throw new Error("La clave de operación ya se usó con otros datos");
      return;
    }
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { venta: { include: { items: true, pagos: true } } },
    });
    if (!pedido) throw new Error("Pedido no encontrado");
    if (pedido.venta.anulada) throw new Error("El pedido está anulado");
    const item = pedido.venta.items.find((i) => i.id === datos.itemId);
    let resumenCoordinacion: string | null = null;
    if (datos.tipo === "CANCELACION") {
      if (autor.role !== "ADMIN")
        throw new Error("Solo un administrador puede cancelar un pedido");
      if (!datos.notas?.trim())
        throw new Error("Indicá el motivo de cancelación");
      if (pedido.venta.pagos.length)
        throw new Error(
          "La cancelación con cobros requiere devolución trazable y no está habilitada",
        );
      if (pedido.venta.items.some((i) => i.cantidadEntregada > 0))
        throw new Error(
          "La cancelación con entregas requiere devolución trazable y no está habilitada",
        );
      for (const linea of pedido.venta.items) {
        // Mercadería recibida y dedicada al encargo vuelve al catálogo una única vez.
        if (linea.cantidadRecibida > 0) {
          const producto = await tx.producto.findUniqueOrThrow({
            where: { id: linea.productoId },
          });
          await tx.producto.update({
            where: { id: producto.id },
            data: { stockActual: { increment: linea.cantidadRecibida } },
          });
          await tx.movimientoStock.create({
            data: {
              productoId: producto.id,
              tipo: "ENTRADA_DEVOLUCION",
              cantidad: linea.cantidadRecibida,
              stockAnterior: producto.stockActual,
              stockNuevo: producto.stockActual + linea.cantidadRecibida,
              motivo: `Cancelación ${pedido.venta.numeroVenta}: ${datos.notas}`,
              referencia: pedido.id,
              usuario: usuarioId,
            },
          });
        }
        await tx.itemVenta.update({
          where: { id: linea.id },
          data: { seguimientoEstado: "CANCELADO" },
        });
      }
      await tx.venta.update({
        where: { id: pedido.ventaId },
        data: { anulada: true },
      });
      if (pedido.venta.clienteId) {
        const cliente = await tx.cliente.findUniqueOrThrow({
          where: { id: pedido.venta.clienteId },
        });
        const total = cliente.totalCompras.minus(pedido.venta.total);
        const cantidad = cliente.cantidadCompras - 1;
        if (total.lt(0) || cantidad < 0)
          throw new Error(
            "Las estadísticas de la clienta requieren conciliación antes de cancelar",
          );
        const ultima = await tx.venta.findFirst({
          where: { clienteId: cliente.id, anulada: false },
          orderBy: { fecha: "desc" },
          select: { fecha: true },
        });
        await tx.cliente.update({
          where: { id: cliente.id },
          data: {
            totalCompras: total,
            cantidadCompras: cantidad,
            ticketPromedio: cantidad ? dinero(total.div(cantidad)) : dinero(0),
            ultimaCompra: ultima?.fecha ?? null,
          },
        });
      }
    } else if (datos.tipo === "NOTA") {
      if (!datos.notas?.trim())
        throw new Error("La anotación no puede estar vacía");
    } else if (datos.tipo === "COORDINACION") {
      const cambios: string[] = [];
      if (datos.itemId) {
        if (!item) throw new Error("Seleccioná un ítem de este pedido");
        await tx.itemVenta.update({
          where: { id: item.id },
          data: {
            ...(datos.especificaciones !== undefined
              ? { especificaciones: datos.especificaciones?.trim() || null }
              : {}),
            ...(datos.fechaEstimada !== undefined
              ? {
                  fechaEstimada: datos.fechaEstimada
                    ? new Date(datos.fechaEstimada)
                    : null,
                }
              : {}),
          },
        });
        cambios.push(`Especificaciones / fecha de ${item.productoNombre}`);
      } else {
        await tx.pedido.update({
          where: { id: pedidoId },
          data: {
            ...(datos.fechaPrometida !== undefined
              ? {
                  fechaPrometida: datos.fechaPrometida
                    ? new Date(datos.fechaPrometida)
                    : null,
                }
              : {}),
            ...(datos.responsable !== undefined
              ? { responsable: datos.responsable?.trim() || null }
              : {}),
            ...(datos.notasPedido !== undefined
              ? { notas: datos.notasPedido?.trim() || null }
              : {}),
          },
        });
        if (datos.clienteNombre !== undefined) {
          await tx.venta.update({
            where: { id: pedido.ventaId },
            data: { clienteNombre: datos.clienteNombre?.trim() || null },
          });
          if (pedido.venta.clienteId && datos.clienteNombre?.trim()) {
            await tx.cliente.update({
              where: { id: pedido.venta.clienteId },
              data: { nombre: datos.clienteNombre.trim() },
            });
          }
          cambios.push(
            `Clienta: ${datos.clienteNombre?.trim() || "Sin especificar"}`,
          );
        }
        if (
          pedido.venta.clienteId &&
          (datos.clienteTelefono !== undefined ||
            datos.clienteEmail !== undefined)
        ) {
          await tx.cliente.update({
            where: { id: pedido.venta.clienteId },
            data: {
              ...(datos.clienteTelefono !== undefined
                ? { telefono: datos.clienteTelefono?.trim() || null }
                : {}),
              ...(datos.clienteEmail !== undefined
                ? { email: datos.clienteEmail?.trim() || null }
                : {}),
            },
          });
          cambios.push("Contacto de clienta actualizado");
        }
        if (datos.fechaPrometida !== undefined)
          cambios.push(
            datos.fechaPrometida
              ? `Fecha prometida: ${new Date(datos.fechaPrometida).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`
              : "Fecha prometida sin definir",
          );
        if (datos.responsable !== undefined)
          cambios.push(
            `Responsable: ${datos.responsable?.trim() || "Sin asignar"}`,
          );
        if (datos.notasPedido !== undefined)
          cambios.push("Notas generales actualizadas");
      }
      resumenCoordinacion = cambios.join(" · ") || "Coordinación actualizada";
    } else {
      if (!item || item.modalidad !== "ENCARGO")
        throw new Error("Seleccioná un ítem por encargo de este pedido");
      if (item.cantidadEntregada === item.cantidad)
        throw new Error("El ítem ya está entregado");
      if (datos.tipo === "ENCARGADO" || datos.tipo === "EN_FABRICACION") {
        const permitidos =
          datos.tipo === "ENCARGADO"
            ? ["PENDIENTE"]
            : ["PENDIENTE", "ENCARGADO"];
        if (
          !permitidos.includes(item.seguimientoEstado) ||
          item.cantidadRecibida >= item.cantidad
        )
          throw new Error("El cambio no corresponde al estado actual del ítem");
        await tx.itemVenta.update({
          where: { id: item.id },
          data: { seguimientoEstado: datos.tipo },
        });
      } else {
        const cantidad = datos.cantidad;
        if (!cantidad) throw new Error("Indicá una cantidad positiva");
        if (datos.tipo === "RECEPCION") {
          if (
            !["PENDIENTE", "ENCARGADO", "EN_FABRICACION", "LISTO"].includes(
              item.seguimientoEstado,
            )
          )
            throw new Error("El estado actual no permite registrar recepción");
          if (item.cantidadRecibida + cantidad > item.cantidad)
            throw new Error("La recepción supera la cantidad encargada");
          // Recepción dedicada al pedido: queda fuera del stock disponible del catálogo.
          await tx.itemVenta.update({
            where: { id: item.id },
            data: {
              cantidadRecibida: { increment: cantidad },
              seguimientoEstado: "LISTO",
            },
          });
        } else {
          if (item.cantidadEntregada + cantidad > item.cantidadRecibida)
            throw new Error("No se puede entregar una cantidad no recibida");
          if (
            saldoPendiente(pedido.venta.total, pedido.venta.pagos).gt(0) &&
            (!datos.excepcionSaldo ||
              autor.role !== "ADMIN" ||
              !datos.motivoExcepcion)
          )
            throw new Error(
              "El pedido tiene saldo: solo un administrador puede autorizar la entrega con motivo",
            );
          const entregada = item.cantidadEntregada + cantidad;
          await tx.itemVenta.update({
            where: { id: item.id },
            data: {
              cantidadEntregada: entregada,
              seguimientoEstado:
                entregada === item.cantidad
                  ? "ENTREGADO"
                  : entregada < item.cantidadRecibida
                    ? "LISTO"
                    : "EN_FABRICACION",
            },
          });
        }
      }
    }
    await tx.eventoPedido.create({
      data: {
        pedidoId,
        itemId: item?.id,
        tipo: datos.tipo,
        cantidad: datos.cantidad,
        notas:
          [
            resumenCoordinacion,
            datos.notas,
            datos.excepcionSaldo
              ? `Excepción autorizada por ${autor.id}: ${datos.motivoExcepcion}`
              : null,
          ]
            .filter(Boolean)
            .join("\n") || null,
        usuarioId,
        claveIdempotencia: datos.claveIdempotencia,
        huellaSolicitud: fingerprint,
      },
    });
    await tx.pedido.update({
      where: { id: pedidoId },
      data: { updatedAt: new Date() },
    });
  });
  return (await obtenerPedidos(pedidoId))[0];
}
