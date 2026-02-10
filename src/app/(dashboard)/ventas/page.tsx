import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VentasTable } from "./VentasTable";

export default function VentasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ventas</h1>
        <Link href="/ventas/nueva">
          <Button>Nueva venta</Button>
        </Link>
      </div>
      <VentasTable />
    </div>
  );
}
