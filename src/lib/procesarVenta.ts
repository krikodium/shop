import { Prisma } from "@prisma/client";
import {
  ventaSchema,
  type VentaFormValues,
} from "@/lib/validaciones/ventaSchema";
import {
  dinero,
  huella,
  serializable,
  validarMoneda,
} from "@/lib/calculadores/finanzasServidor";
import { estadoDePago, totalPagado } from "@/lib/calculadores/pagosVenta";
export type VentaInput = VentaFormValues & { usuarioId: string };
export async function procesarVenta(entrada: VentaInput) {
  const input = ventaSchema.parse(entrada);
  const fingerprint = huella({ ...input, usuarioId: entrada.usuarioId });
  return serializable(async (tx) => {
    const autor = await tx.user.findUnique({
      where: { id: entrada.usuarioId },
    });
    if (!autor || autor.role === "VIEWER")
      throw new Error("No tenés permiso para registrar ventas");
    if (input.claveIdempotencia) {
      const previa = await tx.venta.findUnique({
        where: { claveIdempotencia: input.claveIdempotencia },
        include: { items: true, cliente: true, pedido: true, pagos: true },
      });
      if (previa) {
        if (previa.huellaSolicitud !== fingerprint)
          throw new Error("La clave de operación ya se usó con otros datos");
        return previa;
      }
    }
    const encargo =
      input.items.some((i) => i.modalidad === "ENCARGO") ||
      Boolean(input.pedido);
    const cliente = input.clienteId
      ? await tx.cliente.findUnique({ where: { id: input.clienteId } })
      : null;
    if (input.clienteId && !cliente) throw new Error("Clienta no encontrada");
    const nombreClienta =
      cliente?.nombre?.trim() || input.clienteNombre?.trim();
    if (encargo && !nombreClienta)
      throw new Error(
        "Indicá el nombre de la clienta para registrar el pedido",
      );
    const lineas: Prisma.ItemVentaCreateManyVentaInput[] = [];
    for (const item of input.items) {
      const p = await tx.producto.findUnique({
        where: { id: item.productoId },
        include: { proveedor: true },
      });
      if (!p?.activo) throw new Error("Producto no encontrado o inactivo");
      if (encargo && p.enConsignacion)
        throw new Error(
          "Los pedidos con consignación están deshabilitados hasta definir su liquidación",
        );
      const comision = p.enConsignacion
        ? new Prisma.Decimal(
            p.comisionConsignacion ?? p.proveedor?.comisionPorDefecto ?? 30,
          )
        : null;
      if (comision && (comision.lt(0) || comision.gt(100)))
        throw new Error("Comisión de consignación inválida");
      const costo = dinero(
        p.enConsignacion
          ? p.precioVenta
              .times(new Prisma.Decimal(100).minus(comision!))
              .div(100)
          : (p.precioCompra ?? 0),
      );
      lineas.push({
        productoId: p.id,
        productoNombre: p.nombre,
        productoSku: p.sku,
        cantidad: item.cantidad,
        precioUnitario: p.precioVenta,
        subtotal: dinero(p.precioVenta.times(item.cantidad)),
        costoUnitario: costo,
        costoTotal: dinero(costo.times(item.cantidad)),
        esConsignacion: p.enConsignacion,
        comisionShop: comision,
        deudaProveedor: p.enConsignacion
          ? dinero(costo.times(item.cantidad))
          : null,
        proveedorId: p.proveedorId,
        modalidad: item.modalidad,
        especificaciones: item.especificaciones,
        fechaEstimada: item.fechaEstimada ? new Date(item.fechaEstimada) : null,
        seguimientoEstado:
          item.modalidad === "ENCARGO" ? "PENDIENTE" : "ENTREGADO",
        cantidadRecibida: item.modalidad === "INMEDIATA" ? item.cantidad : 0,
        cantidadEntregada: item.modalidad === "INMEDIATA" ? item.cantidad : 0,
      });
    }
    const suma = (campo: "subtotal" | "costoTotal" | "deudaProveedor") =>
      lineas.reduce((a, l) => a.plus(String(l[campo] ?? 0)), dinero(0));
    const subtotal = suma("subtotal"),
      descuento = dinero(input.descuento),
      total = subtotal.minus(descuento),
      costoTotal = suma("costoTotal");
    if (total.lte(0) || descuento.gt(subtotal))
      throw new Error(
        "El total debe ser positivo y el descuento no puede superar el subtotal",
      );
    // Una actualización del catálogo no puede inventar un cobro mayor al confirmado.
    // La comparación ocurre dentro de la misma transacción que congela precios y pagos.
    if (!total.eq(input.totalEsperado)) {
      throw new Error(
        "Los precios cambiaron. Recargá el catálogo y revisá la operación antes de confirmar otra vez.",
      );
    }
    const pagos = [];
    const cobro = input.cobroInicial
      ? dinero(input.cobroInicial.montoArs)
      : total;
    if (cobro.lt(0) || cobro.gt(total))
      throw new Error("El cobro inicial supera el total");
    if (input.metodoPagoSecundario) {
      if (input.montoPago1Ars == null || input.montoPago2Ars == null)
        throw new Error("Indicá ambos importes del pago dividido");
      if (!dinero(input.montoPago1Ars).plus(input.montoPago2Ars).eq(cobro))
        throw new Error("Los pagos divididos deben sumar lo cobrado hoy");
      pagos.push(
        {
          montoArs: dinero(input.montoPago1Ars),
          metodoPago: input.metodoPago,
          montoUsd: input.usdPago1 ? dinero(input.usdPago1) : null,
          cotizacionUsd: input.usdPago1
            ? new Prisma.Decimal(input.cotizacionUsd ?? 0)
            : null,
        },
        {
          montoArs: dinero(input.montoPago2Ars),
          metodoPago: input.metodoPagoSecundario,
          montoUsd: input.usdPago2 ? dinero(input.usdPago2) : null,
          cotizacionUsd: input.usdPago2
            ? new Prisma.Decimal(input.cotizacionUsd ?? 0)
            : null,
        },
      );
    } else if (cobro.gt(0))
      pagos.push({
        montoArs: cobro,
        metodoPago: input.cobroInicial?.metodoPago ?? input.metodoPago,
        montoUsd: input.cobroInicial?.montoUsd
          ? dinero(input.cobroInicial.montoUsd)
          : input.usdPago1
            ? dinero(input.usdPago1)
            : null,
        cotizacionUsd: input.cobroInicial?.cotizacionUsd
          ? new Prisma.Decimal(input.cobroInicial.cotizacionUsd)
          : input.usdPago1
            ? new Prisma.Decimal(input.cotizacionUsd ?? 0)
            : null,
      });
    for (const p of pagos) {
      if (p.montoArs.lte(0))
        throw new Error("Cada tramo de pago debe ser positivo");
      validarMoneda(p);
    }
    if (
      encargo &&
      totalPagado(pagos).lt(total) &&
      lineas.some((l) => l.modalidad === "INMEDIATA")
    )
      throw new Error(
        "Un pedido con saldo no puede entregar líneas inmediatas. Registralas por encargo y entregá al saldar",
      );
    const ultima = await tx.venta.findFirst({
      orderBy: { numeroVenta: "desc" },
      select: { numeroVenta: true },
    });
    const numeroVenta = `V-${String(Number(ultima?.numeroVenta.replace("V-", "") ?? 0) + 1).padStart(5, "0")}`;
    const gananciaBruta = total.minus(costoTotal);
    const venta = await tx.venta.create({
      data: {
        numeroVenta,
        clienteId: cliente?.id,
        clienteNombre: cliente?.nombre ?? input.clienteNombre,
        usuarioId: autor.id,
        subtotal,
        descuento,
        total,
        costoTotal,
        gananciaBruta,
        margenPorcentaje: dinero(gananciaBruta.div(total).times(100)),
        deudaConsignacion: suma("deudaProveedor"),
        metodoPago: input.metodoPago,
        estadoPago: estadoDePago(total, pagos),
        notas: input.notas,
        claveIdempotencia: input.claveIdempotencia,
        huellaSolicitud: fingerprint,
        metodoPagoSecundario: input.metodoPagoSecundario,
        montoPago1Ars: input.montoPago1Ars,
        montoPago2Ars: input.montoPago2Ars,
        usdPago1: input.usdPago1,
        usdPago2: input.usdPago2,
        cotizacionUsd: input.cotizacionUsd,
        items: { create: lineas },
        pagos: {
          create: pagos.map((p) => ({
            ...p,
            usuarioId: autor.id,
            notas: input.cobroInicial?.notas,
          })),
        },
        ...(encargo
          ? {
              pedido: {
                create: {
                  fechaPrometida: input.pedido?.fechaPrometida
                    ? new Date(input.pedido.fechaPrometida)
                    : null,
                  responsable: input.pedido?.responsable,
                  notas: input.pedido?.notas,
                  eventos: {
                    create: {
                      tipo: "CREADO",
                      notas: "Pedido registrado",
                      usuarioId: autor.id,
                      claveIdempotencia: `alta-${input.claveIdempotencia ?? crypto.randomUUID()}`,
                      huellaSolicitud: fingerprint,
                    },
                  },
                },
              },
            }
          : {}),
      },
    });
    for (const l of lineas.filter((l) => l.modalidad === "INMEDIATA")) {
      const p = await tx.producto.findUniqueOrThrow({
        where: { id: l.productoId },
      });
      if (p.stockActual < l.cantidad && !input.ignorarStock)
        throw new Error(`Stock insuficiente para ${p.nombre}`);
      const stockNuevo = Math.max(0, p.stockActual - l.cantidad);
      await tx.producto.update({
        where: { id: p.id },
        data: { stockActual: stockNuevo },
      });
      await tx.movimientoStock.create({
        data: {
          productoId: p.id,
          tipo: "SALIDA_VENTA",
          cantidad: -l.cantidad,
          stockAnterior: p.stockActual,
          stockNuevo,
          motivo:
            p.stockActual < l.cantidad
              ? `Venta ${numeroVenta} (sin stock previo cargado)`
              : `Venta ${numeroVenta}`,
          referencia: venta.id,
          usuario: autor.id,
        },
      });
    }
    if (cliente) {
      const nuevo = cliente.totalCompras.plus(total);
      const cantidad = cliente.cantidadCompras + 1;
      await tx.cliente.update({
        where: { id: cliente.id },
        data: {
          totalCompras: nuevo,
          cantidadCompras: cantidad,
          ticketPromedio: dinero(nuevo.div(cantidad)),
          ultimaCompra: venta.fecha,
          ...(input.clienteTelefono?.trim()
            ? { telefono: input.clienteTelefono.trim() }
            : {}),
          ...(input.clienteEmail?.trim()
            ? { email: input.clienteEmail.trim() }
            : {}),
        },
      });
    }
    return tx.venta.findUniqueOrThrow({
      where: { id: venta.id },
      include: { items: true, cliente: true, pedido: true, pagos: true },
    });
  });
}
