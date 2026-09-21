import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ConsignacionDashboard } from "./ConsignacionDashboard";

export default function ConsignacionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        overline="Mercadería · Consignación"
        title="Consignación"
        description="Deudas y rendiciones de proveedores en un solo libro."
      >
        <Button asChild variant="outline">
          <Link href="/consignacion/rendiciones">Ver rendiciones</Link>
        </Button>
        <Button asChild>
          <Link href="/consignacion/rendiciones/nueva">Nueva rendición</Link>
        </Button>
      </PageHeader>
      <ConsignacionDashboard />
    </div>
  );
}
