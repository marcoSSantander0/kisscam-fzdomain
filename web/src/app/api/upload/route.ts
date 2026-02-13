import { NextResponse } from "next/server";
import { getMaxUploadMbFromEnv } from "@/lib/config";
import { saveUploadedImage } from "@/lib/storage";

export const runtime = "nodejs";

function jsonNoStore(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const expectedToken = process.env.UPLOAD_TOKEN;
  if (!expectedToken) {
    return jsonNoStore({ error: "UPLOAD_TOKEN no configurado en servidor." }, 500);
  }

  const providedToken = request.headers.get("x-upload-token");
  if (!providedToken || providedToken !== expectedToken) {
    return jsonNoStore({ error: "X-Upload-Token invalido." }, 401);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return jsonNoStore({ error: "Se requiere multipart/form-data." }, 400);
  }

  try {
    const formData = await request.formData();
    const photo = formData.get("photo");
    if (!(photo instanceof File)) {
      return jsonNoStore({ error: "Campo 'photo' faltante o invalido." }, 400);
    }

    const saved = await saveUploadedImage(photo);
    return jsonNoStore(saved, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_MIME") {
        return jsonNoStore({ error: "Solo se permite image/jpeg o image/png." }, 400);
      }
      if (error.message === "EMPTY_FILE") {
        return jsonNoStore({ error: "El archivo esta vacio." }, 400);
      }
      if (error.message === "MAX_SIZE_EXCEEDED") {
        return jsonNoStore({ error: `Archivo excede ${getMaxUploadMbFromEnv()} MB.` }, 413);
      }
    }

    console.error("POST /api/upload error:", error);
    return jsonNoStore({ error: "No se pudo subir la foto." }, 500);
  }
}
