import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const templateId = Number(body.templateId);
    const name = String(body.name || "").trim();
    const price = Number(body.price || 0);
    const imageUrl = body.imageUrl ? String(body.imageUrl) : null;
    const order = Number(body.order || 0);
    const active = body.active === undefined ? true : Boolean(body.active);

    if (!templateId) {
      return NextResponse.json(
        { error: "Falta el modificador padre." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "El nombre de la opción es obligatorio." },
        { status: 400 }
      );
    }

    const option = await prisma.modifierOption.create({
      data: {
        templateId,
        name,
        price,
        imageUrl,
        order,
        active,
      },
    });

    return NextResponse.json(option);
  } catch (error) {
    console.error("CREATE_MODIFIER_OPTION_ERROR", error);
    return NextResponse.json(
      { error: "No se pudo crear la opción." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id);
    const name = String(body.name || "").trim();
    const price = Number(body.price || 0);
    const imageUrl = body.imageUrl ? String(body.imageUrl) : null;
    const order = Number(body.order || 0);
    const active = Boolean(body.active);

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID de la opción." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "El nombre de la opción es obligatorio." },
        { status: 400 }
      );
    }

    const option = await prisma.modifierOption.update({
      where: { id },
      data: {
        name,
        price,
        imageUrl,
        order,
        active,
      },
    });

    return NextResponse.json(option);
  } catch (error) {
    console.error("UPDATE_MODIFIER_OPTION_ERROR", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la opción." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID de la opción." },
        { status: 400 }
      );
    }

    await prisma.orderItemModifier.deleteMany({
      where: { optionId: id },
    });

    await prisma.modifierOption.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE_MODIFIER_OPTION_ERROR", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la opción." },
      { status: 500 }
    );
  }
}