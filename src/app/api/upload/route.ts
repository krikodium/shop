import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Tamaño máximo de archivo entrante (antes de optimizar) */
const MAX_INPUT_BYTES = 4 * 1024 * 1024;
/** Lado máximo en px; se reduce peso sin recorte visible en catálogo */
const MAX_DIMENSION = 1600;
/** WebP: excelente compresión manteniendo calidad visual */
const WEBP_QUALITY = 90;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.user.role === "VIEWER") return NextResponse.json({ error: "Tu usuario es de solo lectura" }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "No se envió ningún archivo" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Solo se permiten imágenes" },
        { status: 400 }
      );
    }

    if (file.size > MAX_INPUT_BYTES) {
      return NextResponse.json(
        { error: `El archivo supera ${MAX_INPUT_BYTES / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let output: Buffer;
    try {
      const imagen = sharp(buffer, { limitInputPixels: 32_000_000 });
      const formato = (await imagen.metadata()).format;
      if (!formato || !["jpeg", "png", "webp", "gif", "heif"].includes(formato)) throw new Error("Formato inválido");
      output = await imagen
        .rotate()
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality: WEBP_QUALITY,
          effort: 4,
          smartSubsample: true,
        })
        .toBuffer();
      if (output.length > 1024 * 1024) {
        output = await sharp(output).resize(1000, 1000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
      }
      if (output.length > 1024 * 1024) throw new Error("Imagen demasiado grande");
    } catch {
      return NextResponse.json(
        { error: "No se pudo procesar la imagen (formato no soportado)" },
        { status: 400 }
      );
    }

    const id = createHash("sha256").update(output).digest("hex");
    await prisma.fotoProducto.createMany({ data: { id, contenido: new Uint8Array(output) }, skipDuplicates: true });
    const url = `/api/upload/${id}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error subiendo archivo:", error);
    return NextResponse.json(
      { error: "Error al subir la imagen" },
      { status: 500 }
    );
  }
}
