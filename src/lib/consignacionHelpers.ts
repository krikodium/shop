/**
 * Excluye items de ventas que ya fueron incluidas en rendiciones anteriores.
 * Una venta está "rendida" si su fecha cae dentro del rango [fechaDesde, fechaHasta]
 * de alguna rendición previa del mismo proveedor.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── Validación de frecuencia de rendiciones ─────────────────────────

export interface ValidacionRendicion {
  permitido: boolean;
  motivo: string | null;
  rendicionExistenteEnMes: {
    id: string;
    numeroRendicion: string;
    fechaRendicion: Date;
  } | null;
  esUltimaSemana: boolean;
  diasParaUltimaSemana: number;
}

/** Devuelve true si `fecha` cae en los últimos 7 días del mes. */
export function esUltimaSemanaDelMes(fecha: Date = new Date()): boolean {
  const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
  return fecha.getDate() > ultimoDia - 7;
}

/** Días que faltan hasta que empiece la última semana del mes. 0 si ya estamos en ella. */
export function diasHastaUltimaSemana(fecha: Date = new Date()): number {
  const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
  const inicioUltimaSemana = ultimoDia - 7 + 1;
  const diff = inicioUltimaSemana - fecha.getDate();
  return diff > 0 ? diff : 0;
}

/**
 * Valida si se puede crear una nueva rendición para un proveedor.
 * - Si no hay rendición en el mes actual → permitido siempre.
 * - Si ya hay una en el mes → solo se permite en la última semana del mes.
 */
export async function validarCreacionRendicion(
  proveedorId: string
): Promise<ValidacionRendicion> {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);

  const rendicionEnMes = await prisma.rendicion.findFirst({
    where: {
      proveedorId,
      fechaRendicion: { gte: inicioMes, lte: finMes },
    },
    orderBy: { fechaRendicion: "desc" },
    select: { id: true, numeroRendicion: true, fechaRendicion: true },
  });

  const ultimaSemana = esUltimaSemanaDelMes(ahora);
  const diasRestantes = diasHastaUltimaSemana(ahora);

  if (!rendicionEnMes) {
    return {
      permitido: true,
      motivo: null,
      rendicionExistenteEnMes: null,
      esUltimaSemana: ultimaSemana,
      diasParaUltimaSemana: diasRestantes,
    };
  }

  if (ultimaSemana) {
    return {
      permitido: true,
      motivo: null,
      rendicionExistenteEnMes: rendicionEnMes,
      esUltimaSemana: true,
      diasParaUltimaSemana: 0,
    };
  }

  const mesNombre = ahora.toLocaleDateString("es-AR", { month: "long" });
  return {
    permitido: false,
    motivo: `Ya existe una rendición este mes (${rendicionEnMes.numeroRendicion}, generada el ${rendicionEnMes.fechaRendicion.toLocaleDateString("es-AR")}). Podés generar otra a partir de la última semana de ${mesNombre} (faltan ${diasRestantes} días).`,
    rendicionExistenteEnMes: rendicionEnMes,
    esUltimaSemana: false,
    diasParaUltimaSemana: diasRestantes,
  };
}

/** Normaliza fechaDesde a inicio del día y fechaHasta a fin del día (para incluir ventas del último día) */
export function normalizarRangoFechas(fechaDesde: Date, fechaHasta: Date) {
  const desde = new Date(fechaDesde);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(fechaHasta);
  hasta.setHours(23, 59, 59, 999);
  return { desde, hasta };
}

/** Items de consignación en un período que aún no fueron rendidos */
export async function itemsNoRendidos(
  proveedorId: string,
  fechaDesde: Date,
  fechaHasta: Date
) {
  const [items, rendicionesPrevias] = await Promise.all([
    prisma.itemVenta.findMany({
      where: {
        esConsignacion: true,
        proveedorId,
        venta: {
          anulada: false,
          fecha: { gte: fechaDesde, lte: fechaHasta },
        },
      },
      select: {
        id: true,
        ventaId: true,
        venta: { select: { fecha: true } },
        productoNombre: true,
        productoSku: true,
        cantidad: true,
        precioUnitario: true,
        subtotal: true,
        comisionShop: true,
        deudaProveedor: true,
      },
    }),
    prisma.rendicion.findMany({
      where: { proveedorId },
      select: { fechaDesde: true, fechaHasta: true },
    }),
  ]);

  const filtrados = items.filter((item) => {
    const ventaFecha = item.venta.fecha;
    const yaRendido = rendicionesPrevias.some(
      (r) =>
        ventaFecha >= r.fechaDesde &&
        ventaFecha <= r.fechaHasta
    );
    return !yaRendido;
  });

  return filtrados;
}

/** Total de deuda pendiente de consignación (suma de todos los proveedores).
 * Solo incluye items que NO fueron rendidos en ninguna rendición previa.
 * La deuda histórica se determina por ítem, aunque cambie el tipo del proveedor. */
export async function totalDeudaConsignacionPendiente(): Promise<string> {
  // Dos consultas en total, sin importar cuántos proveedores haya.
  const porProveedor = await itemsDeudaPendientePorProveedor();

  let total = new Prisma.Decimal(0);
  for (const items of porProveedor.values()) {
    total = total.plus(items.reduce((s, i) => s.plus(i.deudaProveedor ?? 0), new Prisma.Decimal(0)));
  }
  return total.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);
}

type ItemDeudaPendiente = {
  deudaProveedor: Prisma.Decimal | null;
  subtotal: Prisma.Decimal;
  venta: { fecha: Date };
};

/**
 * Versión en lote de `itemsDeudaPendiente`: resuelve todos los proveedores con
 * dos consultas (ítems + rendiciones) y agrupa en memoria. Misma regla: un ítem
 * queda excluido si la fecha de su venta cae dentro de alguna rendición previa
 * de SU proveedor.
 *
 * @param proveedorIds Si se indica, limita a esos proveedores. Si no, incluye
 *   todos los que tengan ítems de consignación.
 */
export async function itemsDeudaPendientePorProveedor(
  proveedorIds?: string[]
): Promise<Map<string, ItemDeudaPendiente[]>> {
  const filtroProveedor = proveedorIds ? { in: proveedorIds } : { not: null };

  const [items, rendiciones] = await Promise.all([
    prisma.itemVenta.findMany({
      where: {
        esConsignacion: true,
        proveedorId: filtroProveedor,
        venta: { anulada: false },
      },
      select: {
        proveedorId: true,
        deudaProveedor: true,
        subtotal: true,
        venta: { select: { fecha: true } },
      },
    }),
    prisma.rendicion.findMany({
      where: proveedorIds ? { proveedorId: { in: proveedorIds } } : {},
      select: { proveedorId: true, fechaDesde: true, fechaHasta: true },
    }),
  ]);

  const rangosPorProveedor = new Map<string, { fechaDesde: Date; fechaHasta: Date }[]>();
  for (const r of rendiciones) {
    const lista = rangosPorProveedor.get(r.proveedorId) ?? [];
    lista.push(r);
    rangosPorProveedor.set(r.proveedorId, lista);
  }

  const resultado = new Map<string, ItemDeudaPendiente[]>();
  for (const id of proveedorIds ?? []) resultado.set(id, []);

  for (const { proveedorId, ...item } of items) {
    if (!proveedorId) continue;
    const fecha = item.venta.fecha;
    const rangos = rangosPorProveedor.get(proveedorId) ?? [];
    if (rangos.some((r) => fecha >= r.fechaDesde && fecha <= r.fechaHasta)) continue;
    const lista = resultado.get(proveedorId) ?? [];
    lista.push(item);
    resultado.set(proveedorId, lista);
  }

  return resultado;
}

/**
 * Versión en lote de `validarCreacionRendicion`: una sola consulta para todos
 * los proveedores. Devuelve el mismo resultado que llamar a la función
 * individual por cada uno.
 */
export async function validarCreacionRendicionLote(
  proveedorIds: string[]
): Promise<Map<string, ValidacionRendicion>> {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);

  const rendicionesMes = proveedorIds.length
    ? await prisma.rendicion.findMany({
        where: {
          proveedorId: { in: proveedorIds },
          fechaRendicion: { gte: inicioMes, lte: finMes },
        },
        orderBy: { fechaRendicion: "desc" },
        select: { id: true, proveedorId: true, numeroRendicion: true, fechaRendicion: true },
      })
    : [];

  // Ordenadas desc: la primera de cada proveedor es la más reciente del mes.
  const masRecientePorProveedor = new Map<string, (typeof rendicionesMes)[number]>();
  for (const r of rendicionesMes) {
    if (!masRecientePorProveedor.has(r.proveedorId)) masRecientePorProveedor.set(r.proveedorId, r);
  }

  const ultimaSemana = esUltimaSemanaDelMes(ahora);
  const diasRestantes = diasHastaUltimaSemana(ahora);
  const mesNombre = ahora.toLocaleDateString("es-AR", { month: "long" });

  const resultado = new Map<string, ValidacionRendicion>();
  for (const id of proveedorIds) {
    const r = masRecientePorProveedor.get(id);
    const rendicionEnMes = r
      ? { id: r.id, numeroRendicion: r.numeroRendicion, fechaRendicion: r.fechaRendicion }
      : null;

    if (!rendicionEnMes) {
      resultado.set(id, {
        permitido: true,
        motivo: null,
        rendicionExistenteEnMes: null,
        esUltimaSemana: ultimaSemana,
        diasParaUltimaSemana: diasRestantes,
      });
    } else if (ultimaSemana) {
      resultado.set(id, {
        permitido: true,
        motivo: null,
        rendicionExistenteEnMes: rendicionEnMes,
        esUltimaSemana: true,
        diasParaUltimaSemana: 0,
      });
    } else {
      resultado.set(id, {
        permitido: false,
        motivo: `Ya existe una rendición este mes (${rendicionEnMes.numeroRendicion}, generada el ${rendicionEnMes.fechaRendicion.toLocaleDateString("es-AR")}). Podés generar otra a partir de la última semana de ${mesNombre} (faltan ${diasRestantes} días).`,
        rendicionExistenteEnMes: rendicionEnMes,
        esUltimaSemana: false,
        diasParaUltimaSemana: diasRestantes,
      });
    }
  }
  return resultado;
}

/** Items de consignación que aún no fueron incluidos en ninguna rendición (para deuda pendiente) */
export async function itemsDeudaPendiente(proveedorId: string) {
  const [items, rendicionesPrevias] = await Promise.all([
    prisma.itemVenta.findMany({
      where: {
        esConsignacion: true,
        proveedorId,
        venta: { anulada: false },
      },
      select: {
        deudaProveedor: true,
        subtotal: true,
        venta: { select: { fecha: true } },
      },
    }),
    prisma.rendicion.findMany({
      where: { proveedorId },
      select: { fechaDesde: true, fechaHasta: true },
    }),
  ]);

  const filtrados = items.filter((item) => {
    const ventaFecha = item.venta.fecha;
    const yaRendido = rendicionesPrevias.some(
      (r) =>
        ventaFecha >= r.fechaDesde &&
        ventaFecha <= r.fechaHasta
    );
    return !yaRendido;
  });

  return filtrados;
}

/**
 * Ventas aún no rendidas con fecha estrictamente posterior al cierre (`fechaHasta`) de una rendición.
 * Sirve para mostrar en el detalle que lo liquidado acá no incluye esas ventas (próxima rendición).
 */
export async function totalesPendientesPosterioresACierre(
  proveedorId: string,
  fechaHastaRendicion: Date
): Promise<{ deudaPendiente: number; totalVendidoBruto: number }> {
  const items = await itemsDeudaPendiente(proveedorId);
  const cierre = new Date(fechaHastaRendicion);
  const posteriores = items.filter((i) => i.venta.fecha > cierre);
  return {
    deudaPendiente: posteriores.reduce(
      (s, i) => s + Number(i.deudaProveedor ?? 0),
      0
    ),
    totalVendidoBruto: posteriores.reduce(
      (s, i) => s + Number(i.subtotal),
      0
    ),
  };
}
