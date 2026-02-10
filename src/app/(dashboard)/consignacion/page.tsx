import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConsignacionDashboard } from "./ConsignacionDashboard";

export default function ConsignacionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Consignación</h1>
        <div className="flex gap-2">
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
