import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ComprasTable } from "./ComprasTable";

export default function ComprasPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card/70 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Órdenes de compra</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestioná compras, seguí estados y filtrá por proveedor, monto y fecha.
            </p>
          </div>
          <Link href="/compras/nueva" className="sm:shrink-0">
            <Button className="shadow-sm">Nueva orden</Button>
          </Link>
        </div>
      </div>
      <ComprasTable />
    </div>
  );
}
