import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ComprasTable } from "./ComprasTable";

export default function ComprasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        overline="Gestión · Compras"
        title="Órdenes de compra"
        description="Gestioná compras, seguí estados y filtrá por proveedor, monto y fecha."
      >
        <Link href="/compras/nueva">
          <Button>Nueva orden</Button>
        </Link>
      </PageHeader>
      <ComprasTable />
    </div>
  );
}
