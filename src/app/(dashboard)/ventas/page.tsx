import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { VentasTable } from "./VentasTable";

export default function VentasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        overline="Gestión · Ventas"
        title="Ventas"
        description="Historial y detalle de ventas"
      >
        <Link href="/ventas/nueva">
          <Button>Nueva venta</Button>
        </Link>
      </PageHeader>
      <VentasTable />
    </div>
  );
}
