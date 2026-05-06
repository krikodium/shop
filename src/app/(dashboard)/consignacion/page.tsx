import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConsignacionDashboard } from "./ConsignacionDashboard";

export default function ConsignacionPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card/70 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Consignación</h1>
            <p className="text-sm text-muted-foreground">
              Deudas y rendiciones de proveedores en un solo panel
            </p>
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <Link href="/consignacion/rendiciones">
              <Button variant="outline" className="shadow-sm">Ver rendiciones</Button>
            </Link>
            <Link href="/consignacion/rendiciones/nueva">
              <Button className="shadow-sm">Nueva rendición</Button>
            </Link>
          </div>
        </div>
      </div>
      <ConsignacionDashboard />
    </div>
  );
}
