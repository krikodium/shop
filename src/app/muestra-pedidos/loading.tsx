import { DemoSkeleton } from "@/components/pedidos-demo/demo-ui";

export default function MuestraPedidosLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-56 animate-skeleton-shimmer rounded bg-zinc-200" />
      <div className="h-20 animate-skeleton-shimmer rounded-xl bg-zinc-100" />
      <DemoSkeleton rows={5} />
    </div>
  );
}
