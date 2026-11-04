import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await auth())?.user?.id) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!/^[a-f0-9]{64}$/.test(id)) return new Response(null, { status: 404 });
  const headers = { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400, immutable", "X-Content-Type-Options": "nosniff", ETag: `"${id}"` };
  const foto = await prisma.fotoProducto.findUnique({ where: { id }, select: { contenido: true } });
  if (!foto) return new Response(null, { status: 404 });
  if (request.headers.get("if-none-match") === headers.ETag) return new Response(null, { status: 304, headers });
  return new Response(new Uint8Array(foto.contenido), { headers });
}
