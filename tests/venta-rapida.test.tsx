import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import {
  prepararVentaRapida,
  type DatosVentaRapida,
} from "@/components/ventas/venta-rapida-modelo";
import { VentaRapida } from "@/components/ventas/VentaRapida";
import { gruposNav, isActive, navBase } from "@/lib/nav-config";

const producto = {
  id: "p1",
  nombre: "Bandeja Salta",
  sku: "BAN-01",
  precioVenta: "333.25",
  stockActual: 5,
};
const base: DatosVentaRapida = {
  lineas: [{ producto, cantidad: "2" }],
  cliente: { nombre: "Ana Pérez", telefono: "1155558888", email: "" },
  descuento: "0",
  cobro: "total",
  montoCobrado: "",
  metodo: "TRANSFERENCIA",
  notas: "",
};
const response = (data: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => data,
});

describe("Confirmación de venta rápida", () => {
  it("es la única entrada de venta del menú y no enciende dos botones a la vez", () => {
    const items = gruposNav(false)[0].items.map((i) => i.href);
    expect(items).toContain("/ventas/rapida");
    // La vista habitual se abre solo desde el botón de la venta rápida.
    expect(items).not.toContain("/ventas/nueva");
    expect(navBase.map((i) => i.href)).not.toContain("/ventas/nueva");
    expect(isActive("/ventas/rapida", "/ventas", navBase)).toBe(false);
    expect(isActive("/ventas/rapida", "/ventas/rapida", navBase)).toBe(true);
    // Estando en la vista habitual se ilumina Ventas, no la venta rápida.
    expect(isActive("/ventas/nueva", "/ventas/rapida", navBase)).toBe(false);
    expect(isActive("/ventas/nueva", "/ventas", navBase)).toBe(true);
  });
  it("conserva centavos exactos, descuento y cobro parcial explícito", () => {
    const payload = prepararVentaRapida({
      ...base,
      descuento: "0,01",
      cobro: "parte",
      montoCobrado: "166,63",
    });
    expect(payload.totalEsperado).toBe("666.49");
    expect(payload.descuento).toBe("0.01");
    expect(payload.cobroInicial.montoArs).toBe("166.63");
    expect(payload.nuevoCliente).toEqual({
      nombre: "Ana Pérez",
      telefono: "1155558888",
      email: "",
    });
    expect(payload.items).toEqual([
      { productoId: "p1", cantidad: 2, modalidad: "INMEDIATA" },
    ]);
  });
  it("no omite el cobro cero de una venta a cuenta", () => {
    expect(
      prepararVentaRapida({ ...base, cobro: "pendiente", metodo: "" })
        .cobroInicial.montoArs,
    ).toBe("0.00");
  });
  it("exige contacto, medio de pago y cantidades válidas; rechaza sobrecobro y USD sin conversión", () => {
    expect(() =>
      prepararVentaRapida({
        ...base,
        cliente: { nombre: "Ana", telefono: "", email: "" },
      }),
    ).toThrow("contactar");
    expect(() => prepararVentaRapida({ ...base, metodo: "" })).toThrow(
      "cómo pagó",
    );
    expect(() =>
      prepararVentaRapida({ ...base, lineas: [{ producto, cantidad: "1.5" }] }),
    ).toThrow("enteros");
    expect(() =>
      prepararVentaRapida({ ...base, lineas: [{ producto, cantidad: "6" }] }),
    ).toThrow("stock");
    expect(() =>
      prepararVentaRapida({ ...base, cobro: "parte", montoCobrado: "9999" }),
    ).toThrow("menor al total");
    expect(() =>
      prepararVentaRapida({
        ...base,
        lineas: [
          { producto: { ...producto, precioVentaUsd: "200" }, cantidad: "1" },
        ],
      }),
    ).toThrow("precio");
  });
  it("divide el cobro en dos formas y calcula el segundo tramo por resta", () => {
    const payload = prepararVentaRapida({
      ...base,
      metodo: "EFECTIVO",
      metodo2: "TRANSFERENCIA",
      montoMetodo1: "200,50",
    });
    expect(payload.metodoPago).toBe("EFECTIVO");
    expect(payload.metodoPagoSecundario).toBe("TRANSFERENCIA");
    expect(payload.montoPago1Ars).toBe("200.50");
    expect(payload.montoPago2Ars).toBe("466.00");
    // El servidor exige que los dos tramos sumen exactamente lo cobrado hoy.
    expect(payload.cobroInicial.montoArs).toBe("666.50");
  });
  it("divide también un cobro parcial, sin tocar el saldo pendiente", () => {
    const payload = prepararVentaRapida({
      ...base,
      cobro: "parte",
      montoCobrado: "300",
      metodo: "EFECTIVO",
      metodo2: "MERCADOPAGO",
      montoMetodo1: "120",
    });
    expect(payload.cobroInicial.montoArs).toBe("300.00");
    expect(payload.montoPago1Ars).toBe("120.00");
    expect(payload.montoPago2Ars).toBe("180.00");
  });
  it("rechaza divisiones imposibles en lugar de inventar un tramo", () => {
    const dividido = {
      ...base,
      metodo: "EFECTIVO" as const,
      metodo2: "TRANSFERENCIA" as const,
    };
    expect(() =>
      prepararVentaRapida({ ...dividido, montoMetodo1: "" }),
    ).toThrow("primera forma de pago");
    expect(() =>
      prepararVentaRapida({ ...dividido, montoMetodo1: "0" }),
    ).toThrow("mayor a cero");
    // Tramo 1 igual o mayor al cobro dejaría el segundo medio en cero.
    expect(() =>
      prepararVentaRapida({ ...dividido, montoMetodo1: "666,50" }),
    ).toThrow("mayor a cero");
    expect(() =>
      prepararVentaRapida({
        ...dividido,
        metodo2: "EFECTIVO",
        montoMetodo1: "100",
      }),
    ).toThrow("distintas");
    expect(() =>
      prepararVentaRapida({
        ...dividido,
        cobro: "pendiente",
        montoMetodo1: "100",
      }),
    ).toThrow("cobrar algo hoy");
  });
  it("no agrega campos de pago dividido cuando hay una sola forma", () => {
    const payload = prepararVentaRapida(base);
    expect(payload.metodoPagoSecundario).toBeUndefined();
    expect(payload.montoPago1Ars).toBeUndefined();
    expect(payload.montoPago2Ars).toBeUndefined();
  });
  it("vincula una ficha existente sin solicitar otra alta", () => {
    const data = prepararVentaRapida({
      ...base,
      cliente: { ...base.cliente, id: "clienta1" },
    });
    expect(data.clienteId).toBe("clienta1");
    expect(data).not.toHaveProperty("nuevoCliente");
  });
});

describe("Operación de la planilla", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    cleanup();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("/api/productos")
        ? response({ productos: [producto] })
        : response([]),
    );
  });
  const continuar = () =>
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  /** Paso 1 completo y pantalla parada en el buscador de productos. */
  async function irAProductos() {
    render(<VentaRapida />);
    fireEvent.change(screen.getByLabelText(/Nombre y apellido/), {
      target: { value: "Ana Pérez" },
    });
    fireEvent.change(screen.getByLabelText("Teléfono / WhatsApp"), {
      target: { value: "1155558888" },
    });
    continuar();
    await screen.findByRole("textbox", { name: "Buscar producto" });
  }
  async function completar() {
    await irAProductos();
    fireEvent.click(
      await screen.findByRole("button", { name: "Agregar Bandeja Salta" }),
    );
    continuar();
    fireEvent.click(screen.getByRole("button", { name: "Transferencia" }));
  }
  it("escalona los pasos: no avanza sin clienta y el resumen acompaña desde el primero", async () => {
    render(<VentaRapida />);
    // Un paso por vez: el buscador de productos todavía no está en pantalla.
    expect(
      screen.queryByRole("textbox", { name: "Buscar producto" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Productos/ })).toBeDisabled();
    expect(screen.getByText("Sin completar")).toBeInTheDocument();
    continuar();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /nombre y un teléfono o email/i,
    );
    expect(
      screen.queryByRole("textbox", { name: "Buscar producto" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nombre y apellido/), {
      target: { value: "Ana Pérez" },
    });
    fireEvent.change(screen.getByLabelText("Teléfono / WhatsApp"), {
      target: { value: "1155558888" },
    });
    // El resumen la muestra sin esperar al final del registro.
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    continuar();
    await screen.findByRole("textbox", { name: "Buscar producto" });
    // Sin productos tampoco se pasa al cobro.
    continuar();
    expect(screen.getByRole("alert")).toHaveTextContent(/al menos un producto/i);
  });
  it("registra clienta y venta juntas, con total confirmado y clave idempotente", async () => {
    await completar();
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/ventas"
        ? response(
            {
              id: "v1",
              numeroVenta: "V-001",
              total: "333.25",
              cliente: { nombre: "Ana Pérez" },
            },
            201,
          )
        : response([]),
    );
    fireEvent.click(screen.getByRole("button", { name: /Registrar venta ·/ }));
    expect(await screen.findByText("Venta registrada")).toBeInTheDocument();
    const request = fetchMock.mock.calls.find(
      ([url]) => url === "/api/ventas",
    )!;
    const body = JSON.parse(request[1].body);
    expect(body.nuevoCliente.telefono).toBe("1155558888");
    expect(body.totalEsperado).toBe("333.25");
    expect(body.cobroInicial.montoArs).toBe("333.25");
    expect(body.claveIdempotencia.length).toBeGreaterThan(15);
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/clientes/quick"),
    ).toBe(false);
  });
  it("divide el pago en la misma pantalla, sin pasar por la vista habitual", async () => {
    await completar();
    fireEvent.click(
      screen.getByRole("button", { name: /Dividir entre dos formas de pago/ }),
    );
    fireEvent.change(screen.getByLabelText(/Importe por Transferencia/), {
      target: { value: "100" },
    });
    fireEvent.click(
      within(
        screen.getByRole("group", { name: "Segunda forma de pago" }),
      ).getByRole("button", { name: "Mercado Pago" }),
    );
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/ventas"
        ? response({ id: "v1", numeroVenta: "V-001", total: "333.25" }, 201)
        : response([]),
    );
    fireEvent.click(screen.getByRole("button", { name: /Registrar venta ·/ }));
    expect(await screen.findByText("Venta registrada")).toBeInTheDocument();
    const body = JSON.parse(
      fetchMock.mock.calls.find(([url]) => url === "/api/ventas")![1].body,
    );
    expect(body.metodoPago).toBe("TRANSFERENCIA");
    expect(body.metodoPagoSecundario).toBe("MERCADOPAGO");
    expect(body.montoPago1Ars).toBe("100.00");
    expect(body.montoPago2Ars).toBe("233.25");
    expect(body.cobroInicial.montoArs).toBe("333.25");
  });
  it("una respuesta perdida bloquea cambios y reintenta exactamente la misma operación", async () => {
    await completar();
    fetchMock.mockRejectedValueOnce(new Error("Conexión interrumpida"));
    fireEvent.click(screen.getByRole("button", { name: /Registrar venta ·/ }));
    const retry = await screen.findByRole("button", {
      name: "Reintentar la misma operación",
    });
    // El fieldset congela el paso que está en pantalla mientras se reintenta.
    expect(screen.getByLabelText(/Observaciones/)).toBeDisabled();
    const first = fetchMock.mock.calls.find(
      ([url]) => url === "/api/ventas",
    )![1].body;
    fetchMock.mockResolvedValueOnce(
      response({ id: "v1", numeroVenta: "V-001", total: "333.25" }, 201),
    );
    fireEvent.click(retry);
    await screen.findByText("Venta registrada");
    const requests = fetchMock.mock.calls.filter(
      ([url]) => url === "/api/ventas",
    );
    expect(requests).toHaveLength(2);
    expect(requests[1][1].body).toBe(first);
  });
  it("actualiza precios de la selección sin perder clienta ni cantidades", async () => {
    await irAProductos();
    fireEvent.click(
      await screen.findByRole("button", { name: "Agregar Bandeja Salta" }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Cantidad de Bandeja Salta" }),
      { target: { value: "2" } },
    );
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/productos/p1"
        ? response({ ...producto, precioVenta: "500.00" })
        : response({ productos: [producto] }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Actualizar precios y stock" }),
    );
    // El resumen lateral acompaña el paso 2 sin esperar al final.
    await waitFor(() =>
      expect(screen.getAllByText(/1\.000,00/).length).toBeGreaterThan(0),
    );
    expect(
      screen.getByRole("spinbutton", { name: "Cantidad de Bandeja Salta" }),
    ).toHaveValue(2);
    continuar();
    fireEvent.click(screen.getByRole("button", { name: "Transferencia" }));
    await screen.findByRole("button", { name: /Registrar venta ·.*1\.000/ });
    // Volver al paso 1 no pierde lo cargado.
    fireEvent.click(screen.getByRole("button", { name: /Clienta/ }));
    expect(screen.getByLabelText(/Nombre y apellido/)).toHaveValue("Ana Pérez");
  });
  it("no agrega resultados viejos al apretar Enter durante otra búsqueda", async () => {
    await irAProductos();
    await screen.findByRole("button", { name: "Agregar Bandeja Salta" });
    const input = screen.getByRole("textbox", { name: "Buscar producto" });
    fireEvent.change(input, { target: { value: "OTRO-SKU" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
  it("Enter en el buscador agrega un producto sin enviar la venta", async () => {
    await irAProductos();
    await screen.findByRole("button", { name: "Agregar Bandeja Salta" });
    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "Buscar producto" }),
      { key: "Enter" },
    );
    await waitFor(() =>
      expect(
        screen.getByRole("spinbutton", { name: "Cantidad de Bandeja Salta" }),
      ).toHaveValue(1),
    );
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/ventas")).toBe(
      false,
    );
  });
});
