import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { RendicionesTable } from "./RendicionesTable";

export default function RendicionesPage() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/consignacion">← Consignación</Link>
      </Button>
      <PageHeader
        overline="Mercadería · Consignación"
        title="Rendiciones"
        description="Liquidaciones emitidas a proveedores de consignación."
      >
        <Button asChild>
          <Link href="/consignacion/rendiciones/nueva">Nueva rendición</Link>
        </Button>
      </PageHeader>

      <RendicionesTable />
    </div>
  );
}
