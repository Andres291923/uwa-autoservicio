import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const templates = await prisma.modifierTemplate.findMany({
      orderBy: [{ order: "asc" }, { id: "asc" }],
      include: {
        options: {
          orderBy: [{ order: "asc" }, { id: "asc" }],
        },
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("GET_MODIFIER_TEMPLATES_ERROR", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los modificadores." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id);
    const name = String(body.name || "").trim();
    const order = Number(body.order || 0);
    const active = Boolean(body.active);

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID del modificador." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "El nombre del modificador es obligatorio." },
        { status: 400 }
      );
    }

    const template = await prisma.modifierTemplate.update({
      where: { id },
      data: {
        name,
        order,
        active,
      },
      include: {
        options: {
          orderBy: [{ order: "asc" }, { id: "asc" }],
        },
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("UPDATE_MODIFIER_TEMPLATE_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el modificador." },
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
        { error: "Falta el ID del modificador." },
        { status: 400 }
      );
    }

    const options = await prisma.modifierOption.findMany({
      where: {
        templateId: id,
      },
      select: {
        id: true,
      },
    });

    const optionIds = options.map((option) => option.id);

    await prisma.$transaction(async (tx) => {
      if (optionIds.length > 0) {
        await tx.orderItemModifier.deleteMany({
          where: {
            optionId: {
              in: optionIds,
            },
          },
        });
      }

      await tx.productModifierGroup.deleteMany({
        where: {
          templateId: id,
        },
      });

      await tx.modifierOption.deleteMany({
        where: {
          templateId: id,
        },
      });

      await tx.modifierTemplate.delete({
        where: {
          id,
        },
      });
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("DELETE_MODIFIER_TEMPLATE_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo eliminar el modificador. Revisa PowerShell para ver el detalle." },
      { status: 500 }
    );
  }
}