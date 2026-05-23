import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function isAdmin(request: Request) {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const sessionToken = process.env.ADMIN_SESSION_TOKEN || "";
  const cookie = request.headers.get("cookie") || "";

  return Boolean(sessionToken && cookie.includes(`admin_session=${sessionToken}`));
}

function cleanFileName(name: string) {
  const withoutExtension = name.replace(/\.[^/.]+$/, "");

  return (
    withoutExtension
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60) || "imagen"
  );
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { error: "No autorizado. Debes estar logueado en admin." },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibio ningun archivo." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "El archivo debe ser una imagen." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "La imagen no puede pesar mas de 5MB." },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const baseName = cleanFileName(file.name);
    const fileName = `uploads/${baseName}-${Date.now()}-${randomUUID()}.${extension}`;

    const blob = await put(fileName, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
    });
  } catch (error) {
    console.error("UPLOAD_IMAGE_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo subir la imagen." },
      { status: 500 }
    );
  }
}
