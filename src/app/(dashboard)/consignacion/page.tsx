import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ConsignacionDashboard } from "./ConsignacionDashboard";

export default function ConsignacionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        overline="Gestión · Consignación"
        title="Consignación"
        description="Deudas y rendiciones de proveedores en un solo libro."
      >
        <Link href="/consignacion/rendiciones">
          <Button variant="outline">Ver rendiciones</Button>
        </Link>
        <Link href="/consignacion/rendiciones/nueva">
          <Button>Nueva rendición</Button>
        </Link>
      </PageHeader>
      <ConsignacionDashboard />
    </div>
  );
}
