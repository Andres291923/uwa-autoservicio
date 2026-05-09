import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.modifierTemplate.findMany({
    include: {
      options: {
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const order = Number(body.order || 0);

    const options = Array.isArray(body.options)
      ? body.options
          .map((option: any, index: number) => ({
            name: String(option.name || "").trim(),
            price: Number(option.price || 0),
            imageUrl: String(option.imageUrl || "").trim() || null,
            order: Number(option.order ?? index),
            active: Boolean(option.active ?? true),
          }))
          .filter((option: any) => option.name)
      : [];

    if (!name) {
      return NextResponse.json(
        { error: "El nombre del modificador es obligatorio." },
        { status: 400 }
      );
    }

    if (options.length === 0) {
      return NextResponse.json(
        { error: "Debes agregar al menos una opción al modificador." },
        { status: 400 }
      );
    }

    const template = await prisma.modifierTemplate.create({
      data: {
        name,
        order,
        active: true,
        options: {
          create: options,
        },
      },
      include: {
        options: {
          orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No se pudo crear el modificador." },
      { status: 500 }
    );
  }
}