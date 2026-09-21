import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ProveedoresTable } from "./ProveedoresTable";

export default function ProveedoresPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        overline="Mercadería"
        title="Proveedores"
        description="Proveedores regulares y en consignación"
      >
        <Button asChild>
          <Link href="/proveedores/nuevo">Nuevo proveedor</Link>
        </Button>
      </PageHeader>
      <ProveedoresTable />
    </div>
  );
}
