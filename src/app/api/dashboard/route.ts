import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { METODO_PAGO_LABEL } from "@/lib/constants";
import { totalDeudaConsignacionPendiente } from "@/lib/consignacionHelpers";
import { fechaNegocio, inicioDiaNegocio, siguienteDia } from "@/lib/fechasNegocio";
import { dinero, resumenCobros, resumenVentas, sumarImportes } from "@/lib/resumenFinanciero";
import { saldoPendiente as calcularSaldoVenta } from "@/lib/calculadores/pagosVenta";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const hoy = fechaNegocio();
    const inicioMes = inicioDiaNegocio(`${hoy.slice(0, 7)}-01`);
    const inicioHoy = inicioDiaNegocio(hoy);
    const finHoy = inicioDiaNegocio(siguienteDia(hoy));
    const inicioGrafico = inicioDiaNegocio(siguienteDia(hoy, -13));

    const [
      ventasMes,
      cobrosMes,
      ventasGrafico,
      pendientes,
      productos,
      ultimasVentas,
      totalProductos,
      deuda,
      pedidosRaw,
      cajaAbierta,
    ] = await Promise.all([
      prisma.venta.findMany({
        where: { anulada: false, fecha: { gte: inicioMes, lt: finHoy } },
        select: {
          fecha: true,
          total: true,
          gananciaBruta: true,
          pagos: { select: { montoArs: true } },
        },
      }),
      prisma.pagoVenta.findMany({
        where: { venta: { anulada: false }, fecha: { gte: inicioMes, lt: finHoy } },
        select: {
          fecha: true,
          montoArs: true,
          montoUsd: true,
          metodoPago: true,
        },
      }),
      prisma.venta.findMany({
        where: { anulada: false, fecha: { gte: inicioGrafico, lt: finHoy } },
        select: { fecha: true, total: true },
      }),
      prisma.venta.findMany({
        where: { anulada: false },
        select: { total: true, gananciaBruta: true, pagos: { select: { montoArs: true } } },
      }),
      prisma.producto.findMany({
        where: { activo: true },
        select: {
          id: true,
          sku: true,
          nombre: true,
          stockActual: true,
          stockMinimo: true,
          precioVenta: true,
          precioVentaUsd: true,
          enConsignacion: true,
          categoria: { select: { nombre: true } },
        },
      }),
      prisma.venta.findMany({
        where: { anulada: false },
        orderBy: { fecha: "desc" },
        take: 6,
        select: {
          id: true,
          numeroVenta: true,
          fecha: true,
          total: true,
          metodoPago: true,
          metodoPagoSecundario: true,
          clienteNombre: true,
          cliente: { select: { nombre: true } },
          pedido: { select: { id: true, fechaPrometida: true } },
          items: { select: { productoNombre: true, cantidad: true } },
          pagos: { select: { montoUsd: true, montoArs: true } },
        },
      }),
      prisma.producto.count(),
      totalDeudaConsignacionPendiente(),
      prisma.pedido.findMany({
        where: { venta: { anulada: false } },
        orderBy: { updatedAt: "desc" },
        include: {
          venta: {
            select: {
              id: true,
              numeroVenta: true,
              total: true,
              clienteNombre: true,
              cliente: { select: { nombre: true } },
              items: {
                select: {
                  id: true,
                  productoNombre: true,
                  cantidad: true,
                  cantidadEntregada: true,
                  seguimientoEstado: true,
                },
              },
              pagos: { select: { montoArs: true } },
            },
          },
        },
      }),
      prisma.cajaChica.findFirst({
        where: { estado: "ABIERTA" },
        orderBy: { fechaApertura: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          movimientos: { select: { tipo: true, monto: true, moneda: true } },
        },
      }),
    ]);

    const mes = resumenVentas(ventasMes);
    const dia = resumenVentas(ventasMes.filter((v) => v.fecha >= inicioHoy));
    const cobros = resumenCobros(cobrosMes);
    const cobrosHoy = resumenCobros(cobrosMes.filter((p) => p.fecha >= inicioHoy));

    // Lógica real del negocio:
    // - Productos con stockActual > 0 están físicamente en salón (entrega inmediata).
    // - Productos con stockActual === 0 están activos bajo modalidad "Por encargo / a pedido".
    // - Alerta real de stock en salón: artículos de salón a los que les queda 1 última unidad
    //   (o están por debajo de un mínimo explícito distinto del default 5), o sin precio definido.
    const productosEnSalon = productos.filter((p) => p.stockActual > 0);
    const productosPorEncargo = productos.filter((p) => p.stockActual === 0);
    const unidadesEnSalon = productosEnSalon.reduce((acc, p) => acc + p.stockActual, 0);

    let valorSalonArs = 0;
    let valorSalonUsd = 0;
    let productosEnUsd = 0;
    let productosEnArs = 0;
    const productosSinPrecio: Array<{ id: string; sku: string; nombre: string }> = [];

    for (const p of productos) {
      const pUsd = p.precioVentaUsd != null ? Number(p.precioVentaUsd) : 0;
      const pArs = Number(p.precioVenta ?? 0);
      if (pUsd > 0) {
        productosEnUsd += 1;
        if (p.stockActual > 0) valorSalonUsd += pUsd * p.stockActual;
      } else if (pArs > 0) {
        productosEnArs += 1;
        if (p.stockActual > 0) valorSalonArs += pArs * p.stockActual;
      } else {
        productosSinPrecio.push({ id: p.id, sku: p.sku, nombre: p.nombre });
      }
    }

    // Últimas unidades en salón (1 unidad física restante en exhibición)
    const ultimasUnidadesSalon = productosEnSalon
      .filter((p) => p.stockActual === 1)
      .sort((a, b) => Number(b.precioVenta) - Number(a.precioVenta));

    // Pedidos activos (no entregados en su totalidad)
    const pedidosActivos = pedidosRaw
      .map((p) => {
        const items = p.venta.items;
        const todosEntregados =
          items.length > 0 &&
          items.every(
            (i) => i.seguimientoEstado === "ENTREGADO" || i.cantidadEntregada >= i.cantidad
          );
        const listosParaEntregar =
          !todosEntregados &&
          items.some(
            (i) => i.seguimientoEstado === "LISTO_ENTREGA" || i.seguimientoEstado === "DISPONIBLE"
          );
        const saldo = Number(calcularSaldoVenta(p.venta.total, p.venta.pagos));
        return {
          id: p.id,
          ventaId: p.venta.id,
          numeroVenta: p.venta.numeroVenta,
          cliente: p.venta.cliente?.nombre ?? p.venta.clienteNombre ?? "Clienta",
          resumenItems: items.map((i) => `${i.cantidad}× ${i.productoNombre}`).join(", "),
          fechaPrometida: p.fechaPrometida,
          total: Number(p.venta.total),
          saldoPendiente: saldo,
          estado: todosEntregados
            ? "ENTREGADO"
            : listosParaEntregar
              ? "LISTO_ENTREGA"
              : "EN_CURSO",
        };
      })
      .filter((p) => p.estado !== "ENTREGADO");

    const pedidosListosCount = pedidosActivos.filter((p) => p.estado === "LISTO_ENTREGA").length;

    // Estado de caja chica abierta
    let cajaResumen: {
      abierta: boolean;
      responsable: string | null;
      saldoArs: number;
      saldoUsd: number;
    } = {
      abierta: false,
      responsable: null,
      saldoArs: 0,
      saldoUsd: 0,
    };
    if (cajaAbierta) {
      const initArs = Number(cajaAbierta.montoInicial ?? 0);
      const initUsd = Number(cajaAbierta.montoInicialUsd ?? 0);
      const movsArs = cajaAbierta.movimientos
        .filter((m) => (m.moneda ?? "ARS") === "ARS")
        .reduce((s, m) => s + (m.tipo === "INGRESO" ? Number(m.monto) : -Number(m.monto)), 0);
      const movsUsd = cajaAbierta.movimientos
        .filter((m) => (m.moneda ?? "ARS") === "USD")
        .reduce((s, m) => s + (m.tipo === "INGRESO" ? Number(m.monto) : -Number(m.monto)), 0);
      cajaResumen = {
        abierta: true,
        responsable: cajaAbierta.user?.name ?? cajaAbierta.user?.email ?? "Turno actual",
        saldoArs: initArs + movsArs,
        saldoUsd: initUsd + movsUsd,
      };
    }

    const ventasUltimos14Dias = Array.from({ length: 14 }, (_, i) => {
      const fecha = siguienteDia(hoy, i - 13);
      const filas = ventasGrafico.filter((v) => fechaNegocio(v.fecha) === fecha);
      return {
        fecha,
        label: inicioDiaNegocio(fecha).toLocaleDateString("es-AR", {
          timeZone: "America/Argentina/Buenos_Aires",
          day: "2-digit",
          month: "short",
        }),
        total: dinero(sumarImportes(filas.map((v) => v.total))).toNumber(),
        cantidad: filas.length,
      };
    });

    return NextResponse.json({
      resumen: {
        totalVentasMes: mes.totalVentas,
        totalGananciaMes: mes.totalGanancia,
        cantidadVentasMes: mes.cantidadVentas,
        totalVentasHoy: dia.totalVentas,
        cantidadVentasHoy: dia.cantidadVentas,
        totalCobradoMes: cobros.totalCobrado,
        totalCobradoHoy: cobrosHoy.totalCobrado,
        saldoPendiente: resumenVentas(pendientes).saldoPendiente,
        totalDeudaConsignacion: dinero(deuda).toFixed(2),
        totalProductos,
        productosActivos: productos.length,
        productosBajoStock: ultimasUnidadesSalon.length,
        productosEnSalon: productosEnSalon.length,
        productosPorEncargo: productosPorEncargo.length,
        unidadesEnSalon,
        valorSalonArs: dinero(valorSalonArs).toFixed(2),
        valorSalonUsd: dinero(valorSalonUsd).toFixed(2),
        productosEnArs,
        productosEnUsd,
        productosSinPrecioCount: productosSinPrecio.length,
        pedidosActivosCount: pedidosActivos.length,
        pedidosListosCount,
        totalUsdRecibidoMes: cobros.totalUsd,
        ventasConUsdMes: cobros.cantidadConUsd,
        totalUsdRecibidoHoy: cobrosHoy.totalUsd,
        ventasConUsdHoy: cobrosHoy.cantidadConUsd,
      },
      caja: cajaResumen,
      pedidosActivos: pedidosActivos.slice(0, 5),
      productosSinPrecio,
      ventasUltimos14Dias,
      metodoPagoChart: Object.entries(cobros.porMetodo).map(([metodo, valor]) => ({
        name: METODO_PAGO_LABEL[metodo] ?? metodo,
        value: Number(valor.total),
        cantidad: valor.cantidad,
      })),
      productosBajoStock: ultimasUnidadesSalon.slice(0, 5).map((p) => ({
        id: p.id,
        sku: p.sku,
        nombre: p.nombre,
        stockActual: p.stockActual,
        stockMinimo: p.stockMinimo,
        categoria: p.categoria?.nombre ?? null,
      })),
      ultimasVentas: ultimasVentas.map((v) => {
        const saldo = Number(calcularSaldoVenta(v.total, v.pagos));
        return {
          id: v.id,
          numeroVenta: v.numeroVenta,
          fecha: v.fecha,
          total: v.total.toFixed(2),
          cliente: v.cliente?.nombre ?? v.clienteNombre ?? "Consumidor final",
          resumenItems: v.items.map((i) => `${i.cantidad}× ${i.productoNombre}`).join(", "),
          esPedido: Boolean(v.pedido),
          pedidoId: v.pedido?.id ?? null,
          saldoPendiente: saldo,
          metodoPagoLabel: METODO_PAGO_LABEL[v.metodoPago] ?? v.metodoPago,
          tieneUsd: v.pagos.some((p) => p.montoUsd?.gt(0)),
          pagoDividido: !!v.metodoPagoSecundario,
        };
      }),
    });
  } catch (error) {
    console.error("Error dashboard:", error);
    return NextResponse.json({ error: "Error al cargar dashboard" }, { status: 500 });
  }
}
