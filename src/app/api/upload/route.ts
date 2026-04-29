import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { auth } from "@/auth";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
/** Tamaño máximo de archivo entrante (antes de optimizar) */
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
/** Lado máximo en px; se reduce peso sin recorte visible en catálogo */
const MAX_DIMENSION = 1600;
/** WebP: excelente compresión manteniendo calidad visual */
const WEBP_QUALITY = 90;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
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
      output = await sharp(buffer)
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
    } catch {
      return NextResponse.json(
        { error: "No se pudo procesar la imagen (formato no soportado)" },
        { status: 400 }
      );
    }

    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const fileName = `${baseName}.webp`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = path.join(UPLOAD_DIR, fileName);
    await writeFile(filePath, output);

    const url = `/uploads/${fileName}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error subiendo archivo:", error);
    return NextResponse.json(
      { error: "Error al subir la imagen" },
      { status: 500 }
    );
  }
}
