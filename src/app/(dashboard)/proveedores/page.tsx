import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ProveedoresTable } from "./ProveedoresTable";

export default function ProveedoresPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        overline="Gestión · Proveedores"
        title="Proveedores"
        description="Proveedores regulares y en consignación"
      >
        <Link href="/proveedores/nuevo">
          <Button>Nuevo proveedor</Button>
        </Link>
      </PageHeader>
      <ProveedoresTable />
    </div>
  );
}
