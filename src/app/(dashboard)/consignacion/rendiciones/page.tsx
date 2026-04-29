import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RendicionesTable } from "./RendicionesTable";
import { ArrowLeft, Plus, History } from "lucide-react";

export default function RendicionesPage() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
            <Link href="/consignacion" className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-2">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-wider">Dashboard</span>
            </Link>
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <History className="h-5 w-5" />
                </div>
                <h1 className="text-3xl font-black tracking-tighter sm:text-4xl text-foreground">
                    Historial de Rendiciones
                </h1>
            </div>
        </div>
        <Link href="/consignacion/rendiciones/nueva">
          <Button className="font-bold shadow-lg shadow-primary/20 h-11 px-6">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Rendición
          </Button>
        </Link>
      </div>

      <RendicionesTable />
    </div>
  );
}
