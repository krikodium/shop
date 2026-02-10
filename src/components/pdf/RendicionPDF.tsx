"use client";

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#666",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 24,
    gap: 16,
  },
  totalBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  table: {
    marginTop: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#333",
    color: "white",
    padding: 8,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#fafafa",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  colProducto: { width: "35%" },
  colCant: { width: "10%", textAlign: "right" },
  colPrecio: { width: "18%", textAlign: "right" },
  colTotal: { width: "18%", textAlign: "right" },
  colProveedor: { width: "19%", textAlign: "right", fontWeight: "bold" },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    fontSize: 8,
    color: "#999",
  },
  firma: {
    marginTop: 12,
    fontWeight: "bold",
    fontSize: 9,
  },
});

interface DetalleItem {
  productoNombre: string;
  cantidad: number;
  precioVenta: number;
  totalVenta: number;
  montoProveedor: number;
}

interface RendicionPDFProps {
  numeroRendicion: string;
  proveedorNombre: string;
  fechaDesde: string;
  fechaHasta: string;
  totalVendido: number;
  comisionShop: number;
  totalARendir: number;
  estado: string;
  items: DetalleItem[];
}

export function RendicionPDF({
  numeroRendicion,
  proveedorNombre,
  fechaDesde,
  fechaHasta,
  totalVendido,
  comisionShop,
  totalARendir,
  estado,
  items,
}: RendicionPDFProps) {
  const formatearFecha = (d: string) =>
    new Date(d).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Rendición de Consignación</Text>
          <Text style={styles.subtitle}>
            {numeroRendicion} • {proveedorNombre}
          </Text>
          <Text style={styles.subtitle}>
            Período: {formatearFecha(fechaDesde)} - {formatearFecha(fechaHasta)}
          </Text>
          <Text style={styles.subtitle}>Estado: {estado}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.row}>
            <Text>Total vendido</Text>
            <Text>${totalVendido.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Comisión del shop</Text>
            <Text>${comisionShop.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ fontWeight: "bold" }}>Total a rendir al proveedor</Text>
            <Text style={{ fontWeight: "bold" }}>${totalARendir.toFixed(2)}</Text>
          </View>
        </View>

        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Detalle de ventas</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colProducto}>Producto</Text>
              <Text style={styles.colCant}>Cant.</Text>
              <Text style={styles.colPrecio}>P. venta</Text>
              <Text style={styles.colTotal}>Total venta</Text>
              <Text style={styles.colProveedor}>A proveedor</Text>
            </View>
            {items.map((item, i) => (
              <View
                key={i}
                style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={styles.colProducto}>{item.productoNombre}</Text>
                <Text style={styles.colCant}>{item.cantidad}</Text>
                <Text style={styles.colPrecio}>
                  ${(item.precioVenta ?? 0).toFixed(2)}
                </Text>
                <Text style={styles.colTotal}>
                  ${(item.totalVenta ?? 0).toFixed(2)}
                </Text>
                <Text style={styles.colProveedor}>
                  ${(item.montoProveedor ?? 0).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Documento generado por Shop - Sistema de gestión</Text>
          <View>
            <Text style={styles.firma}>Firma del proveedor</Text>
            <Text>_________________________</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
