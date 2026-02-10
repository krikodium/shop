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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <Link href="/proveedores/nuevo">
          <Button>Nuevo proveedor</Button>
        </Link>
      </div>
      <ProveedoresTable />
    </div>
  );
}
