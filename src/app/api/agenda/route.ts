import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { crearNotasInicialesGledis, NotaAgenda } from "@/lib/agenda-gledis";

const ARCHIVO_AGENDA = resolve(process.cwd(), "data", "agenda-gledis.json");

async function leerNotasDisco(): Promise<NotaAgenda[]> {
  try {
    const contenido = await readFile(ARCHIVO_AGENDA, "utf8");
    const parseado = JSON.parse(contenido);
    if (Array.isArray(parseado)) {
      return parseado as NotaAgenda[];
    }
  } catch {
    // Si no existe todavía, inicializamos con las notas de ejemplo de Gledis
  }
  const iniciales = crearNotasInicialesGledis();
  try {
    await mkdir(dirname(ARCHIVO_AGENDA), { recursive: true });
    await writeFile(ARCHIVO_AGENDA, JSON.stringify(iniciales, null, 2), "utf8");
  } catch {
    // Entorno solo lectura
  }
  return iniciales;
}

async function guardarNotasDisco(notas: NotaAgenda[]): Promise<void> {
  await mkdir(dirname(ARCHIVO_AGENDA), { recursive: true });
  await writeFile(ARCHIVO_AGENDA, JSON.stringify(notas, null, 2), "utf8");
}

export async function GET() {
  const notas = await leerNotasDisco();
  return NextResponse.json({ notas });
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { notas?: NotaAgenda[] };
    if (!body || !Array.isArray(body.notas)) {
      return NextResponse.json(
        { error: "Formato de agenda inválido" },
        { status: 400 },
      );
    }
    await guardarNotasDisco(body.notas);
    return NextResponse.json({ ok: true, total: body.notas.length });
  } catch {
    return NextResponse.json(
      { error: "No se pudo guardar la agenda" },
      { status: 500 },
    );
  }
}
