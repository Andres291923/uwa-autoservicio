import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function createSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [
      { order: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const order = Number(body.order || 0);

    if (!name) {
      return NextResponse.json(
        { error: "El nombre de la categoría es obligatorio." },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: createSlug(name),
        order,
        active: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No se pudo crear la categoría." },
      { status: 500 }
    );
  }
}