import { NextResponse } from "next/server";
import { deleteImageFromDisk, readImageFromDisk } from "@/lib/storage";

export const runtime = "nodejs";

function decodeId(rawId: string): string {
  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function jsonNoStore(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function validateOperatorToken(request: Request): { ok: boolean; status: number; message: string } {
  const expectedToken = process.env.UPLOAD_TOKEN;
  if (!expectedToken) {
    return { ok: false, status: 500, message: "UPLOAD_TOKEN no configurado en servidor." };
  }

  const providedToken = request.headers.get("x-upload-token");
  if (!providedToken || providedToken !== expectedToken) {
    return { ok: false, status: 401, message: "X-Upload-Token invalido." };
  }

  return { ok: true, status: 200, message: "ok" };
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    const image = await readImageFromDisk(decodeId(id));

    if (!image) {
      return NextResponse.json(
        { error: "Imagen no encontrada." },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    return new NextResponse(image.body, {
      status: 200,
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("GET /api/images/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar imagen." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const auth = validateOperatorToken(request);
  if (!auth.ok) {
    return jsonNoStore({ error: auth.message }, auth.status);
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteImageFromDisk(decodeId(id));

    if (!deleted) {
      return jsonNoStore({ error: "Imagen no encontrada." }, 404);
    }

    return jsonNoStore({ ok: true, id: decodeId(id) }, 200);
  } catch (error) {
    console.error("DELETE /api/images/[id] error:", error);
    return jsonNoStore({ error: "No se pudo eliminar la imagen." }, 500);
  }
}
