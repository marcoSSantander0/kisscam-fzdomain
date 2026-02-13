import { NextResponse } from "next/server";
import { listImagesFromDisk } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const images = await listImagesFromDisk();
    return NextResponse.json(images, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/images error:", error);
    return NextResponse.json(
      { error: "No se pudo listar imagenes." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
