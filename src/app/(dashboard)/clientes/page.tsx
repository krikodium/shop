import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientesTable } from "./ClientesTable";

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Link href="/clientes/nuevo">
          <Button>Nuevo cliente</Button>
        </Link>
      </div>
      <ClientesTable />
    </div>
  );
}
