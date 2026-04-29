import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VentasTable } from "./VentasTable";

export default function VentasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Ventas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Historial y detalle de ventas</p>
        </div>
        <Link href="/ventas/nueva" className="sm:shrink-0">
          <Button className="shadow-sm">Nueva venta</Button>
        </Link>
      </div>
      <VentasTable />
    </div>
  );
}
