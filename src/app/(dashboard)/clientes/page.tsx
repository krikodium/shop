import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ClientesTable } from "./ClientesTable";

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        overline="Operación · Clientes"
        title="Clientes"
        description="Base de clientes y su historial de compras"
      >
        <Button asChild>
          <Link href="/clientes/nuevo">Nuevo cliente</Link>
        </Button>
      </PageHeader>
      <ClientesTable />
    </div>
  );
}
