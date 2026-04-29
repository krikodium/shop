import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProveedoresTable } from "./ProveedoresTable";

export default function ProveedoresPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Proveedores</h1>
          <p className="text-muted-foreground text-sm">Proveedores regulares y en consignación</p>
        </div>
        <Link href="/proveedores/nuevo" className="sm:shrink-0">
          <Button>Nuevo proveedor</Button>
        </Link>
      </div>
      <ProveedoresTable />
    </div>
  );
}
