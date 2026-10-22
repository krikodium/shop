export type ColorNota =
  | "ambar"
  | "salvia"
  | "cielo"
  | "rosa"
  | "lavanda"
  | "arena";

export type ContextoNota =
  | "entrega"
  | "clienta"
  | "proveedor"
  | "local"
  | "personal";

export type PrioridadNota = "normal" | "importante" | "urgente";

export type TamanoNota = "normal" | "grande";

export interface SubtareaNota {
  id: string;
  texto: string;
  hecho: boolean;
}

export interface NotaAgenda {
  id: string;
  titulo: string;
  detalle: string;
  /** Formato YYYY-MM-DD */
  fecha: string;
  /** Formato HH:mm o "" si es todo el día */
  hora: string;
  color: ColorNota;
  contexto: ContextoNota;
  prioridad: PrioridadNota;
  tamano: TamanoNota;
  /** Persona, clienta, taller o referencia corta */
  contacto: string;
  referencia: string;
  fijada: boolean;
  completada: boolean;
  subtareas: SubtareaNota[];
  creadaEn: string;
  actualizadaEn: string;
}

export interface ConfigColorNota {
  id: ColorNota;
  nombre: string;
  descripcion: string;
  claseTema: string;
  claseSwatch: string;
}

export const COLORES_NOTA: ConfigColorNota[] = [
  {
    id: "ambar",
    nombre: "Ámbar",
    descripcion: "Entregas y avisos del día",
    claseTema: "nota-tema-ambar",
    claseSwatch: "nota-swatch-ambar",
  },
  {
    id: "salvia",
    nombre: "Salvia",
    descripcion: "Cobros, señas y pedidos listos",
    claseTema: "nota-tema-salvia",
    claseSwatch: "nota-swatch-salvia",
  },
  {
    id: "cielo",
    nombre: "Cielo",
    descripcion: "Talleres y proveedores",
    claseTema: "nota-tema-cielo",
    claseSwatch: "nota-swatch-cielo",
  },
  {
    id: "rosa",
    nombre: "Coral",
    descripcion: "Clientas y presupuestos",
    claseTema: "nota-tema-rosa",
    claseSwatch: "nota-swatch-rosa",
  },
  {
    id: "lavanda",
    nombre: "Lavanda",
    descripcion: "Local y organización",
    claseTema: "nota-tema-lavanda",
    claseSwatch: "nota-swatch-lavanda",
  },
  {
    id: "arena",
    nombre: "Arena",
    descripcion: "Notas generales",
    claseTema: "nota-tema-arena",
    claseSwatch: "nota-swatch-arena",
  },
];

export interface ConfigContextoNota {
  id: ContextoNota;
  etiqueta: string;
  descripcionCorta: string;
  colorSugerido: ColorNota;
  placeholderTitulo: string;
  placeholderContacto: string;
  placeholderReferencia: string;
}

export const CONTEXTOS_NOTA: ConfigContextoNota[] = [
  {
    id: "entrega",
    etiqueta: "Entrega",
    descripcionCorta: "Retiro o envío programado",
    colorSugerido: "ambar",
    placeholderTitulo: "Ej: Pasa Lucía a retirar mesa ratona...",
    placeholderContacto: "Clienta o teléfono",
    placeholderReferencia: "Pedido / Saldo",
  },
  {
    id: "clienta",
    etiqueta: "Clienta",
    descripcionCorta: "Presupuesto, consulta o seña",
    colorSugerido: "rosa",
    placeholderTitulo: "Ej: Pasar presupuesto de respaldo en lino a...",
    placeholderContacto: "Clienta o teléfono",
    placeholderReferencia: "Seña / Medida",
  },
  {
    id: "proveedor",
    etiqueta: "Taller",
    descripcionCorta: "Llamar al taller o recibir mercadería",
    colorSugerido: "cielo",
    placeholderTitulo: "Ej: Consultar al taller por terminación de sillas...",
    placeholderContacto: "Taller o proveedor",
    placeholderReferencia: "Encargo",
  },
  {
    id: "local",
    etiqueta: "Local",
    descripcionCorta: "Stock, vidriera o caja",
    colorSugerido: "lavanda",
    placeholderTitulo: "Ej: Armar rincón nuevo y actualizar etiquetas...",
    placeholderContacto: "Sector",
    placeholderReferencia: "Salón",
  },
  {
    id: "personal",
    etiqueta: "Nota Gledys",
    descripcionCorta: "Recordatorio personal",
    colorSugerido: "salvia",
    placeholderTitulo: "Ej: Separar muestrario de géneros nuevos...",
    placeholderContacto: "Opcional",
    placeholderReferencia: "Personal",
  },
];

export const PRIORIDADES_NOTA: Array<{
  id: PrioridadNota;
  etiqueta: string;
}> = [
  { id: "normal", etiqueta: "Normal" },
  { id: "importante", etiqueta: "Importante" },
  { id: "urgente", etiqueta: "Urgente" },
];

export const HORARIOS_RAPIDOS = ["10:00", "11:30", "15:00", "17:00", "18:30"];

/** Devuelve YYYY-MM-DD local sumando `diasOffset` a hoy */
export function fechaLocalISO(diasOffset = 0, base = new Date()): string {
  const copia = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + diasOffset,
  );
  const yyyy = copia.getFullYear();
  const mm = String(copia.getMonth() + 1).padStart(2, "0");
  const dd = String(copia.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function proximoLunesISO(base = new Date()): string {
  const diaSemana = base.getDay();
  const diasHastaLunes = diaSemana === 0 ? 1 : 8 - diaSemana;
  return fechaLocalISO(diasHastaLunes, base);
}

export type EstadoTemporalNota =
  | "vencida"
  | "hoy"
  | "manana"
  | "esta_semana"
  | "proxima";

export interface ResumenTemporalNota {
  estado: EstadoTemporalNota;
  etiquetaDia: string;
  etiquetaRelativa: string;
  esUrgentePorTiempo: boolean;
  ordenTimestamp: number;
}

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function analizarTiempoNota(
  fechaISO: string,
  hora: string,
  completada: boolean,
  ahora = new Date(),
): ResumenTemporalNota {
  const hoyISO = fechaLocalISO(0, ahora);
  const mananaISO = fechaLocalISO(1, ahora);
  const ayerISO = fechaLocalISO(-1, ahora);

  const [y, m, d] = fechaISO.split("-").map((n) => Number.parseInt(n, 10));
  const [hh, min] = hora
    ? hora.split(":").map((n) => Number.parseInt(n, 10))
    : [23, 59];

  const fechaObj = new Date(
    y || ahora.getFullYear(),
    (m || 1) - 1,
    d || 1,
    hh || 0,
    min || 0,
  );
  const inicioHoy = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
  );
  const inicioFecha = new Date(
    fechaObj.getFullYear(),
    fechaObj.getMonth(),
    fechaObj.getDate(),
  );
  const diffDias = Math.round(
    (inicioFecha.getTime() - inicioHoy.getTime()) / (1000 * 60 * 60 * 24),
  );

  let etiquetaDia = "";
  if (fechaISO === hoyISO) {
    etiquetaDia = "Hoy";
  } else if (fechaISO === mananaISO) {
    etiquetaDia = "Mañana";
  } else if (fechaISO === ayerISO) {
    etiquetaDia = "Ayer";
  } else {
    etiquetaDia = `${DIAS_CORTOS[fechaObj.getDay()]} ${fechaObj.getDate()} ${MESES_CORTOS[fechaObj.getMonth()]}`;
  }

  if (completada) {
    return {
      estado: diffDias === 0 ? "hoy" : diffDias === 1 ? "manana" : "proxima",
      etiquetaDia,
      etiquetaRelativa: "Lista",
      esUrgentePorTiempo: false,
      ordenTimestamp: fechaObj.getTime(),
    };
  }

  if (diffDias < 0) {
    const diasAtras = Math.abs(diffDias);
    return {
      estado: "vencida",
      etiquetaDia,
      etiquetaRelativa: diasAtras === 1 ? "Ayer" : `Hace ${diasAtras} días`,
      esUrgentePorTiempo: true,
      ordenTimestamp: fechaObj.getTime(),
    };
  }

  if (diffDias === 0) {
    if (!hora) {
      return {
        estado: "hoy",
        etiquetaDia: "Hoy",
        etiquetaRelativa: "Hoy",
        esUrgentePorTiempo: false,
        ordenTimestamp: fechaObj.getTime(),
      };
    }
    const diffMin = Math.round((fechaObj.getTime() - ahora.getTime()) / 60000);
    if (diffMin < -15) {
      const horasPasadas = Math.floor(Math.abs(diffMin) / 60);
      return {
        estado: "vencida",
        etiquetaDia: "Hoy",
        etiquetaRelativa:
          horasPasadas >= 1
            ? `Hace ${horasPasadas} h`
            : `Hace ${Math.abs(diffMin)} min`,
        esUrgentePorTiempo: true,
        ordenTimestamp: fechaObj.getTime(),
      };
    }
    if (diffMin <= 60) {
      return {
        estado: "hoy",
        etiquetaDia: "Hoy",
        etiquetaRelativa: diffMin <= 5 ? "Ahora" : `En ${diffMin} min`,
        esUrgentePorTiempo: true,
        ordenTimestamp: fechaObj.getTime(),
      };
    }
    const horasFaltan = Math.round(diffMin / 60);
    return {
      estado: "hoy",
      etiquetaDia: "Hoy",
      etiquetaRelativa: `En ${horasFaltan} h`,
      esUrgentePorTiempo: false,
      ordenTimestamp: fechaObj.getTime(),
    };
  }

  if (diffDias === 1) {
    return {
      estado: "manana",
      etiquetaDia: "Mañana",
      etiquetaRelativa: "Mañana",
      esUrgentePorTiempo: false,
      ordenTimestamp: fechaObj.getTime(),
    };
  }

  if (diffDias <= 7) {
    return {
      estado: "esta_semana",
      etiquetaDia,
      etiquetaRelativa: `En ${diffDias} días`,
      esUrgentePorTiempo: false,
      ordenTimestamp: fechaObj.getTime(),
    };
  }

  return {
    estado: "proxima",
    etiquetaDia,
    etiquetaRelativa: `En ${diffDias} días`,
    esUrgentePorTiempo: false,
    ordenTimestamp: fechaObj.getTime(),
  };
}

export function crearNotasInicialesGledis(ahora = new Date()): NotaAgenda[] {
  const hoy = fechaLocalISO(0, ahora);
  const manana = fechaLocalISO(1, ahora);
  const isoAhora = ahora.toISOString();

  return [
    {
      id: "gledys-demo-1",
      titulo: "Retiro de banqueta y espejo — Sofía M.",
      detalle: "Avisar cuando llegue el flete. Abona el saldo al retirar.",
      fecha: hoy,
      hora: "16:30",
      color: "ambar",
      contexto: "entrega",
      prioridad: "importante",
      tamano: "normal",
      contacto: "Sofía Martínez",
      referencia: "",
      fijada: true,
      completada: false,
      subtareas: [],
      creadaEn: isoAhora,
      actualizadaEn: isoAhora,
    },
    {
      id: "gledys-demo-2",
      titulo: "Consultar al taller por las dos mesas ratonas",
      detalle: "Confirmar si entran en el reparto de mañana a la mañana.",
      fecha: hoy,
      hora: "11:00",
      color: "cielo",
      contexto: "proveedor",
      prioridad: "normal",
      tamano: "normal",
      contacto: "Taller Hierro Sur",
      referencia: "",
      fijada: false,
      completada: false,
      subtareas: [],
      creadaEn: isoAhora,
      actualizadaEn: isoAhora,
    },
    {
      id: "gledys-demo-3",
      titulo: "Pasar presupuesto de respaldo en lino antimanchas",
      detalle: "Medida Queen 1,60 m en tono arena y piedra.",
      fecha: manana,
      hora: "10:30",
      color: "rosa",
      contexto: "clienta",
      prioridad: "normal",
      tamano: "normal",
      contacto: "Valeria Gómez",
      referencia: "",
      fijada: false,
      completada: false,
      subtareas: [],
      creadaEn: isoAhora,
      actualizadaEn: isoAhora,
    },
  ];
}
