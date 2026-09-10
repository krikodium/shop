export type MonedaDemo = "ARS";

export type EstadoPagoDemo = "Pendiente" | "Parcial" | "Pagado";

export type EstadoProductoDemo =
  | "Pendiente de encargar"
  | "Encargado"
  | "En fabricación"
  | "Listo para entregar"
  | "Entregado"
  | "Cancelado";

export type ModoEntregaDemo = "Entrega inmediata" | "Por encargo";

export type ItemPedidoDemo = {
  id: string;
  nombre: string;
  sku: string;
  cantidad: number;
  precioUnitarioCentavos: number;
  moneda: MonedaDemo;
  modoEntrega: ModoEntregaDemo;
  estadoProducto: EstadoProductoDemo;
  especificaciones: string[];
  anotacionInterna: string;
  responsable: string;
  cantidadRecibida: number;
  cantidadEntregada: number;
  estadoCarga?: "Completo" | "En proceso de carga";
  categoriaProvisoria?: string;
  venceCarga?: string;
};

export type PagoPedidoDemo = {
  id: string;
  fecha: string;
  importeCentavos: number;
  moneda: MonedaDemo;
  medio: string;
  referencia: string;
  autor: string;
};

export type EventoPedidoDemo = {
  id: string;
  fecha: string;
  titulo: string;
  detalle: string;
  autor: string;
  tipo: "pedido" | "pago" | "fabricacion" | "recepcion" | "entrega" | "nota";
};

export type PedidoDemo = {
  id: string;
  numero: string;
  fecha: string;
  fechaPrometida: string;
  ultimaActividad: string;
  clienta: {
    nombre: string;
    telefono: string;
    email: string;
  };
  estadoPago: EstadoPagoDemo;
  estadoProducto: EstadoProductoDemo;
  totalCentavos: number;
  cobradoCentavos: number;
  moneda: MonedaDemo;
  anotacionGeneral: string;
  items: ItemPedidoDemo[];
  pagos: PagoPedidoDemo[];
  eventos: EventoPedidoDemo[];
  demorado: boolean;
};

export const productosNuevaVentaDemo: ItemPedidoDemo[] = [
  {
    id: "demo-producto-aro",
    nombre: "Aros Nudo",
    sku: "DEMO-ARO-014",
    cantidad: 1,
    precioUnitarioCentavos: 9800000,
    moneda: "ARS",
    modoEntrega: "Entrega inmediata",
    estadoProducto: "Entregado",
    especificaciones: ["Terminación pulida", "Retiro en el local"],
    anotacionInterna: "Separar el par de la vitrina antes de cerrar la venta.",
    responsable: "Stock del local",
    cantidadRecibida: 1,
    cantidadEntregada: 1,
    estadoCarga: "Completo",
  },
  {
    id: "demo-producto-anillo",
    nombre: "Anillo Horizonte",
    sku: "DEMO-ANI-207",
    cantidad: 1,
    precioUnitarioCentavos: 20000000,
    moneda: "ARS",
    modoEntrega: "Por encargo",
    estadoProducto: "En fabricación",
    especificaciones: ["Talle 14", "Plata 925", "Terminación mate", "Fecha estimada: 18 sep"],
    anotacionInterna: "Confirmar el talle con la clienta antes de enviar al taller.",
    responsable: "Taller Norte · Marina",
    cantidadRecibida: 0,
    cantidadEntregada: 0,
    estadoCarga: "Completo",
  },
];

export const inventarioDemo: ItemPedidoDemo[] = [
  ...productosNuevaVentaDemo,
  {
    id: "demo-producto-dije-inicial",
    nombre: "Dije Inicial",
    sku: "DEMO-DIJ-031",
    cantidad: 1,
    precioUnitarioCentavos: 15600000,
    moneda: "ARS",
    modoEntrega: "Por encargo",
    estadoProducto: "Pendiente de encargar",
    especificaciones: ["Inicial a confirmar", "Cadena 45 cm"],
    anotacionInterna: "",
    responsable: "Taller Centro",
    cantidadRecibida: 0,
    cantidadEntregada: 0,
    estadoCarga: "Completo",
  },
  {
    id: "demo-producto-pulsera",
    nombre: "Pulsera Eslabones",
    sku: "DEMO-PUL-088",
    cantidad: 1,
    precioUnitarioCentavos: 13200000,
    moneda: "ARS",
    modoEntrega: "Entrega inmediata",
    estadoProducto: "Entregado",
    especificaciones: ["Largo 18 cm", "Terminación pulida"],
    anotacionInterna: "",
    responsable: "Stock del local",
    cantidadRecibida: 1,
    cantidadEntregada: 1,
    estadoCarga: "Completo",
  },
  {
    id: "demo-producto-cadena",
    nombre: "Cadena Veneciana",
    sku: "DEMO-CAD-052",
    cantidad: 1,
    precioUnitarioCentavos: 7400000,
    moneda: "ARS",
    modoEntrega: "Entrega inmediata",
    estadoProducto: "Entregado",
    especificaciones: ["Largo 50 cm"],
    anotacionInterna: "",
    responsable: "Stock del local",
    cantidadRecibida: 1,
    cantidadEntregada: 1,
    estadoCarga: "Completo",
  },
];

export const pedidosDemo: PedidoDemo[] = [
  {
    id: "pedido-demo-1048",
    numero: "PD-1048",
    fecha: "2026-09-07T13:20:00-03:00",
    fechaPrometida: "2026-09-18T18:00:00-03:00",
    ultimaActividad: "2026-09-07T16:45:00-03:00",
    clienta: {
      nombre: "Sofía Acosta (ficticia)",
      telefono: "+54 11 5555 0148",
      email: "sofia.demo@example.com",
    },
    estadoPago: "Parcial",
    estadoProducto: "En fabricación",
    totalCentavos: 29800000,
    cobradoCentavos: 10000000,
    moneda: "ARS",
    anotacionGeneral: "Regalo de aniversario. Avisar por teléfono antes de preparar el retiro.",
    items: productosNuevaVentaDemo,
    pagos: [
      {
        id: "pago-demo-1",
        fecha: "2026-09-07T13:24:00-03:00",
        importeCentavos: 10000000,
        moneda: "ARS",
        medio: "Transferencia",
        referencia: "TRX-DEMO-8031",
        autor: "Lucía V.",
      },
    ],
    eventos: [
      {
        id: "evento-demo-6",
        fecha: "2026-09-07T16:45:00-03:00",
        titulo: "Fabricación iniciada",
        detalle: "Taller Norte confirmó materiales y fecha estimada.",
        autor: "Marina P.",
        tipo: "fabricacion",
      },
      {
        id: "evento-demo-5",
        fecha: "2026-09-07T15:10:00-03:00",
        titulo: "Producto entregado parcialmente",
        detalle: "Se entregó 1 de 2 productos: Aros Nudo.",
        autor: "Lucía V.",
        tipo: "entrega",
      },
      {
        id: "evento-demo-4",
        fecha: "2026-09-07T14:05:00-03:00",
        titulo: "Encargo enviado al taller",
        detalle: "Anillo Horizonte · talle 14 · terminación mate.",
        autor: "Marina P.",
        tipo: "fabricacion",
      },
      {
        id: "evento-demo-3",
        fecha: "2026-09-07T13:28:00-03:00",
        titulo: "Anotación interna",
        detalle: "Confirmar el talle antes de autorizar cualquier ajuste.",
        autor: "Lucía V.",
        tipo: "nota",
      },
      {
        id: "evento-demo-2",
        fecha: "2026-09-07T13:24:00-03:00",
        titulo: "Pago registrado",
        detalle: "Anticipo de ARS 100.000 por transferencia.",
        autor: "Lucía V.",
        tipo: "pago",
      },
      {
        id: "evento-demo-1",
        fecha: "2026-09-07T13:20:00-03:00",
        titulo: "Pedido creado",
        detalle: "Dos productos: uno inmediato y uno por encargo.",
        autor: "Lucía V.",
        tipo: "pedido",
      },
    ],
    demorado: false,
  },
  {
    id: "pedido-demo-1047",
    numero: "PD-1047",
    fecha: "2026-09-05T10:15:00-03:00",
    fechaPrometida: "2026-09-12T18:00:00-03:00",
    ultimaActividad: "2026-09-07T11:30:00-03:00",
    clienta: { nombre: "Camila Ríos (ficticia)", telefono: "+54 11 5555 0147", email: "camila.demo@example.com" },
    estadoPago: "Pagado",
    estadoProducto: "Listo para entregar",
    totalCentavos: 15600000,
    cobradoCentavos: 15600000,
    moneda: "ARS",
    anotacionGeneral: "Retira la clienta con DNI.",
    items: [
      {
        id: "demo-producto-dije",
        nombre: "Dije Inicial C",
        sku: "DEMO-DIJ-031",
        cantidad: 1,
        precioUnitarioCentavos: 15600000,
        moneda: "ARS",
        modoEntrega: "Por encargo",
        estadoProducto: "Listo para entregar",
        especificaciones: ["Inicial C", "Cadena 45 cm", "Terminación pulida"],
        anotacionInterna: "Control de calidad realizado.",
        responsable: "Taller Centro",
        cantidadRecibida: 1,
        cantidadEntregada: 0,
      },
    ],
    pagos: [],
    eventos: [],
    demorado: false,
  },
  {
    id: "pedido-demo-1044",
    numero: "PD-1044",
    fecha: "2026-08-29T17:40:00-03:00",
    fechaPrometida: "2026-09-04T18:00:00-03:00",
    ultimaActividad: "2026-09-06T09:10:00-03:00",
    clienta: { nombre: "Julia Méndez (ficticia)", telefono: "+54 11 5555 0144", email: "julia.demo@example.com" },
    estadoPago: "Pendiente",
    estadoProducto: "Pendiente de encargar",
    totalCentavos: 8900000,
    cobradoCentavos: 0,
    moneda: "ARS",
    anotacionGeneral: "Esperar confirmación de medida.",
    items: [],
    pagos: [],
    eventos: [],
    demorado: true,
  },
  {
    id: "pedido-demo-1039",
    numero: "PD-1039",
    fecha: "2026-08-22T12:00:00-03:00",
    fechaPrometida: "2026-09-01T18:00:00-03:00",
    ultimaActividad: "2026-09-03T18:25:00-03:00",
    clienta: { nombre: "Ana Torres (ficticia)", telefono: "+54 11 5555 0139", email: "ana.demo@example.com" },
    estadoPago: "Pagado",
    estadoProducto: "Entregado",
    totalCentavos: 21200000,
    cobradoCentavos: 21200000,
    moneda: "ARS",
    anotacionGeneral: "Pedido finalizado.",
    items: [],
    pagos: [],
    eventos: [],
    demorado: false,
  },
];

export const pedidoPrincipalDemo = pedidosDemo[0];
