import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { VentasTable } from "./VentasTable";

export default function VentasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        overline="Operación"
        title="Ventas"
        description="Historial y detalle de ventas."
      >
        <Button asChild className="h-11 w-full sm:w-auto">
          <Link href="/ventas/nueva">
            <ShoppingCart className="size-4" aria-hidden="true" />
            Nueva venta
          </Link>
        </Button>
      </PageHeader>
      <VentasTable />
    </div>
  );
}
