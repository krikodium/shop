import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientesTable } from "./ClientesTable";

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Clientes</h1>
          <p className="text-muted-foreground text-sm">Base de clientes y segmentación</p>
        </div>
        <Link href="/clientes/nuevo" className="sm:shrink-0">
          <Button>Nuevo cliente</Button>
        </Link>
      </div>
      <ClientesTable />
    </div>
  );
}
