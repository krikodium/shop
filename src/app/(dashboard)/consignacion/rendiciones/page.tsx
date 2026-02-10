import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RendicionesTable } from "./RendicionesTable";

export default function RendicionesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/consignacion">
          <Button variant="ghost">← Consignación</Button>
        </Link>
        <Link href="/consignacion/rendiciones/nueva">
          <Button>Nueva rendición</Button>
        </Link>
      </div>
      <h1 className="text-2xl font-bold">Rendiciones</h1>
      <RendicionesTable />
    </div>
  );
}
