import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ComprasTable } from "./ComprasTable";

export default function ComprasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Órdenes de compra</h1>
        <Link href="/compras/nueva">
          <Button>Nueva orden</Button>
        </Link>
      </div>
      <ComprasTable />
    </div>
  );
}
