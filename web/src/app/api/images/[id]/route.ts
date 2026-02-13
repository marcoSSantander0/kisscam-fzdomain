import { NextResponse } from "next/server";
import { readImageFromDisk } from "@/lib/storage";

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
