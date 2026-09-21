import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ComprasTable } from "./ComprasTable";

export default function ComprasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        overline="Mercadería · Compras"
        title="Órdenes de compra"
        description="Gestioná compras, seguí estados y filtrá por proveedor, monto y fecha."
      >
        <Button asChild>
          <Link href="/compras/nueva">Nueva orden</Link>
        </Button>
      </PageHeader>
      <ComprasTable />
    </div>
  );
}
