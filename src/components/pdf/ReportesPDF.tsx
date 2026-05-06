import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

type TopProducto = {
  nombre: string;
  sku: string;
  valor: number;
};

type ReportesPDFProps = {
  periodo: {
    desde: string;
    hasta: string;
  };
  filtros: {
    metodoPago?: string | null;
    proveedor?: string | null;
    categoria?: string | null;
  };
  ventas: {
    totalVentas: number;
    cantidadVentas: number;
    totalGanancia: number;
    margenPromedio: number;
    topPorVenta: TopProducto[];
    topPorGanancia: TopProducto[];
  };
  inventario: {
    cantidadProductos: number;
    valorInventarioCompra: number;
    valorInventarioVenta: number;
    cantidadBajoStock: number;
  };
  rentabilidad: {
    totalVentas: number;
    totalCosto: number;
    totalGanancia: number;
    margenPorcentaje: number;
  };
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  header: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    color: "#6B7280",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 8.5,
    color: "#374151",
    backgroundColor: "#F9FAFB",
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#F9FAFB",
  },
  kpiLabel: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 5,
  },
  rowName: {
    width: "72%",
    color: "#111827",
  },
  rowValue: {
    width: "28%",
    textAlign: "right",
    fontWeight: "bold",
    color: "#111827",
  },
  twoCols: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  colCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
  },
  tableTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#9CA3AF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const ars = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n);

export function ReportesPDF({
  periodo,
  filtros,
  ventas,
  inventario,
  rentabilidad,
}: ReportesPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Reporte Ejecutivo</Text>
          <Text style={styles.subtitle}>
            Período: {periodo.desde} al {periodo.hasta}
          </Text>
          <View style={styles.filterRow}>
            <Text style={styles.filterChip}>
              Método de pago: {filtros.metodoPago ?? "Todos"}
            </Text>
            <Text style={styles.filterChip}>
              Proveedor: {filtros.proveedor ?? "Todos"}
            </Text>
            <Text style={styles.filterChip}>
              Categoría: {filtros.categoria ?? "Todas"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ventas</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total ventas</Text>
              <Text style={styles.kpiValue}>{ars(ventas.totalVentas)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Cantidad operaciones</Text>
              <Text style={styles.kpiValue}>{ventas.cantidadVentas}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Ganancia total</Text>
              <Text style={styles.kpiValue}>{ars(ventas.totalGanancia)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Margen promedio</Text>
              <Text style={styles.kpiValue}>{ventas.margenPromedio.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventario</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Productos activos</Text>
              <Text style={styles.kpiValue}>{inventario.cantidadProductos}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Valor costo</Text>
              <Text style={styles.kpiValue}>{ars(inventario.valorInventarioCompra)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Valor venta</Text>
              <Text style={styles.kpiValue}>{ars(inventario.valorInventarioVenta)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Bajo stock</Text>
              <Text style={styles.kpiValue}>{inventario.cantidadBajoStock}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rentabilidad</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total ventas</Text>
              <Text style={styles.kpiValue}>{ars(rentabilidad.totalVentas)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Costo total</Text>
              <Text style={styles.kpiValue}>{ars(rentabilidad.totalCosto)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Ganancia</Text>
              <Text style={styles.kpiValue}>{ars(rentabilidad.totalGanancia)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Margen</Text>
              <Text style={styles.kpiValue}>{rentabilidad.margenPorcentaje.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rankings</Text>
          <View style={styles.twoCols}>
            <View style={styles.colCard}>
              <Text style={styles.tableTitle}>Top productos por venta</Text>
              {ventas.topPorVenta.slice(0, 5).map((p) => (
                <View key={p.sku} style={styles.row}>
                  <Text style={styles.rowName}>{p.nombre}</Text>
                  <Text style={styles.rowValue}>{ars(p.valor)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.colCard}>
              <Text style={styles.tableTitle}>Top productos por ganancia</Text>
              {ventas.topPorGanancia.slice(0, 5).map((p) => (
                <View key={p.sku} style={styles.row}>
                  <Text style={styles.rowName}>{p.nombre}</Text>
                  <Text style={styles.rowValue}>{ars(p.valor)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Shop · Reportes</Text>
          <Text>Generado automáticamente</Text>
        </View>
      </Page>
    </Document>
  );
}
