import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConsignacionDashboard } from "./ConsignacionDashboard";

export default function ConsignacionPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Consignación</h1>
          <p className="text-muted-foreground text-sm">Deudas y rendiciones a proveedores</p>
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Link href="/consignacion/rendiciones">
            <Button variant="outline">Ver rendiciones</Button>
          </Link>
          <Link href="/consignacion/rendiciones/nueva">
            <Button>Nueva rendición</Button>
          </Link>
        </div>
      </div>
      <ConsignacionDashboard />
    </div>
  );
}
