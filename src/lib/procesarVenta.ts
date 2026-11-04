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
    let cliente = input.clienteId
      ? await tx.cliente.findUnique({ where: { id: input.clienteId } })
      : null;
    if (input.clienteId && !cliente) throw new Error("Clienta no encontrada");
    // El alta comparte transacción e idempotencia con la venta: un rechazo
    // revierte también la ficha y un reintento no crea otra clienta.
    if (input.nuevoCliente) {
      cliente = await tx.cliente.create({
        data: {
          nombre: input.nuevoCliente.nombre,
          telefono: input.nuevoCliente.telefono || null,
          email: input.nuevoCliente.email || null,
          recibeNotificaciones: false,
        },
      });
    }
    const nombreClienta =
      cliente?.nombre?.trim() || input.clienteNombre?.trim();
    if (encargo && !nombreClienta)
      throw new Error(
        "Indicá el nombre de la clienta para registrar el pedido",
      );
    if (input.ignorarStock && autor.role !== "ADMIN")
      throw new Error("Solo un administrador puede vender sin stock cargado");
    const tcItems = input.cotizacionItemsUsd
      ? new Prisma.Decimal(input.cotizacionItemsUsd)
      : null;
    if (tcItems && (tcItems.lte(0) || tcItems.gt("99999999")))
      throw new Error("La cotización del dólar debe ser positiva");
    let hayItemsUsd = false;
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
      // Mezcla de divisas: un producto con precio en USD se convierte a ARS con la
      // cotización de la venta; el resto se vende a su precio en pesos.
      const enUsd = p.precioVentaUsd != null;
      if (enUsd && !tcItems)
        throw new Error(
          `Indicá la cotización del dólar para vender ${p.nombre} (precio en USD)`,
        );
      if (!enUsd && !p.enConsignacion && p.precioCompraUsd != null)
        throw new Error(`${p.nombre} tiene costo en USD: revisá la moneda del costo antes de venderlo en ARS`);
      const precioArs = enUsd
        ? dinero(p.precioVentaUsd!.times(tcItems!))
        : p.precioVenta;
      if (precioArs.lte(0))
        throw new Error(`${p.nombre} no tiene un precio de venta cargado`);
      if (enUsd && p.enConsignacion)
        throw new Error(
          `${p.nombre} está en consignación con precio en USD: la deuda al proveedor en dólares todavía no está definida`,
        );
      if (enUsd) hayItemsUsd = true;
      const comision = p.enConsignacion
        ? new Prisma.Decimal(
            p.comisionConsignacion ?? p.proveedor?.comisionPorDefecto ?? 30,
          )
        : null;
      if (comision && (comision.lt(0) || comision.gt(100)))
        throw new Error("Comisión de consignación inválida");
      const costo = dinero(
        p.enConsignacion
          ? precioArs.times(new Prisma.Decimal(100).minus(comision!)).div(100)
          : p.precioCompraUsd != null && tcItems
            ? p.precioCompraUsd.times(tcItems)
            : (p.precioCompra ?? 0),
      );
      lineas.push({
        productoId: p.id,
        productoNombre: p.nombre,
        productoSku: p.sku,
        cantidad: item.cantidad,
        precioUnitario: precioArs,
        precioUnitarioUsd: enUsd ? p.precioVentaUsd : null,
        subtotal: dinero(precioArs.times(item.cantidad)),
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
    if (subtotal.gt("99999999.99"))
      throw new Error("El total supera el máximo permitido (ARS 99.999.999,99)");
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
    // Una sola cotización por venta: si no coincidieran, dos cotizaciones
    // distintas permitirían saldar con menos dólares de los que valen los productos.
    if (
      hayItemsUsd &&
      pagos.some(
        (p) => p.cotizacionUsd != null && !p.cotizacionUsd.eq(tcItems!),
      )
    )
      throw new Error(
        "La cotización de los cobros en USD debe ser la misma que la de los productos",
      );
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
    // Las columnas de pago dividido de `Venta` describen cómo se pagó LA VENTA
    // entera: así las leen el ticket y el panel de detalle, que no las
    // contrastan contra el saldo. Una seña dividida en dos medios es otra cosa,
    // y guardarla ahí haría que el comprobante diga que la venta quedó saldada.
    // En ese caso la división vive solo en `PagoVenta`, que es la verdad
    // derivada y se muestra completa en el historial de cobros.
    const divisionParcial =
      Boolean(input.metodoPagoSecundario) && !cobro.eq(total);
    // El número se ordena como entero: como texto, "V-99999" le gana a "V-100000".
    const recientes = await tx.venta.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { numeroVenta: true },
    });
    const ultimoNumero = recientes.reduce((max, v) => {
      const n = /^V-(\d+)$/.exec(v.numeroVenta);
      return n ? Math.max(max, Number(n[1])) : max;
    }, 0);
    const numeroVenta = `V-${String(ultimoNumero + 1).padStart(5, "0")}`;
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
        metodoPagoSecundario: divisionParcial
          ? null
          : input.metodoPagoSecundario,
        // Sin segundo medio no hay tramos: no se copian importes sueltos del input.
        montoPago1Ars: !input.metodoPagoSecundario || divisionParcial ? null : pagos[0].montoArs,
        montoPago2Ars: !input.metodoPagoSecundario || divisionParcial ? null : pagos[1].montoArs,
        usdPago1: divisionParcial ? null : (pagos[0]?.montoUsd ?? null),
        usdPago2: divisionParcial ? null : (pagos[1]?.montoUsd ?? null),
        cotizacionUsd: divisionParcial ? null : (pagos.find((p) => p.montoUsd != null)?.cotizacionUsd ?? null),
        cotizacionItemsUsd: hayItemsUsd ? tcItems : null,
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
