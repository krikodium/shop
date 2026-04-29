"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { RendicionPDF } from "./RendicionPDF";
import { Button } from "@/components/ui/button";

interface DetalleItem {
  productoNombre: string;
  cantidad: number;
  precioVenta: number;
  totalVenta: number;
  montoProveedor: number;
}

interface RendicionPDFDownloadProps {
  numeroRendicion: string;
  proveedorNombre: string;
  fechaDesde: string;
  fechaHasta: string;
  totalVendido: number;
  comisionShop: number;
  totalARendir: number;
  monedaLiquidacion?: "ARS" | "USD";
  cotizacionUsd?: number | null;
  totalARendirUsd?: number | null;
  estado: string;
  items: DetalleItem[];
}

export function RendicionPDFDownload(props: RendicionPDFDownloadProps) {
  const fileName = `Rendicion-${props.numeroRendicion}-${props.proveedorNombre.replace(/\s+/g, "-")}.pdf`;

  return (
    <PDFDownloadLink
      document={<RendicionPDF {...props} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button variant="outline" disabled={loading}>
          {loading ? "Generando PDF…" : "Descargar PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
