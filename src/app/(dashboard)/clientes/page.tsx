import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ClientesTable } from "./ClientesTable";

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        overline="Gestión · Clientes"
        title="Clientes"
        description="Base de clientes y segmentación"
      >
        <Link href="/clientes/nuevo">
          <Button>Nuevo cliente</Button>
        </Link>
      </PageHeader>
      <ClientesTable />
    </div>
  );
}
