const LIMITE_SUBIDA = 4 * 1024 * 1024;

export async function prepararFotoProducto(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") throw new Error("Elegí una foto en JPG, PNG o WebP.");
  if (file.size <= LIMITE_SUBIDA) return file;
  if (file.size > 30 * 1024 * 1024) throw new Error("Elegí una foto de hasta 30 MB.");
  const imagen = await createImageBitmap(file).catch(() => {
    throw new Error("No pudimos abrir esta foto. Probá guardarla como JPG o PNG.");
  });
  try {
    const escala = Math.min(1, 1600 / Math.max(imagen.width, imagen.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(imagen.width * escala));
    canvas.height = Math.max(1, Math.round(imagen.height * escala));
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("No se pudo reducir la foto.");
    contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
    const reducida = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.88));
    if (!reducida || reducida.size > LIMITE_SUBIDA) throw new Error("La foto sigue siendo demasiado grande. Probá con otra más liviana.");
    return new File([reducida], "foto-producto", { type: reducida.type });
  } finally {
    imagen.close();
  }
}
