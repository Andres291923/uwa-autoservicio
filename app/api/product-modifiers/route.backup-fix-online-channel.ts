import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ModifierOptionInput = {
  name?: string;
  price?: number;
  imageUrl?: string;
  order?: number;
  active?: boolean;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = Number(searchParams.get("productId") || 0);

  if (!productId) {
    return NextResponse.json(
      { error: "El ID del producto es obligatorio." },
      { status: 400 }
    );
  }

  const groups = await prisma.productModifierGroup.findMany({
    where: {
      productId,
    },
    include: {
      template: {
        include: {
          options: {
            orderBy: [{ order: "asc" }, { createdAt: "desc" }],
          },
        },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(groups);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productId = Number(body.productId || 0);
    const templateId = Number(body.templateId || 0);

    const name = String(body.name || "").trim();
    const min = Number(body.min || 0);
    const max = Number(body.max || 1);
    const required = Boolean(body.required);
    const order = Number(body.order || 0);

    if (!productId) {
      return NextResponse.json(
        { error: "El ID del producto es obligatorio." },
        { status: 400 }
      );
    }

    if (max < min) {
      return NextResponse.json(
        { error: "La cantidad máxima no puede ser menor que la mínima." },
        { status: 400 }
      );
    }

    if (templateId) {
      const existing = await prisma.productModifierGroup.findUnique({
        where: {
          productId_templateId: {
            productId,
            templateId,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Este modificador ya está importado en el producto." },
          { status: 400 }
        );
      }

      const group = await prisma.productModifierGroup.create({
        data: {
          productId,
          templateId,
          min,
          max,
          required,
          order,
          active: true,
        },
        include: {
          template: {
            include: {
              options: {
                orderBy: [{ order: "asc" }, { createdAt: "desc" }],
              },
            },
          },
        },
      });

      return NextResponse.json(group, { status: 201 });
    }

    const options = Array.isArray(body.options)
      ? body.options
          .map((option: ModifierOptionInput, index: number) => ({
            name: String(option.name || "").trim(),
            price: Number(option.price || 0),
            imageUrl: String(option.imageUrl || "").trim() || null,
            order: Number(option.order ?? index),
            active: Boolean(option.active ?? true),
          }))
          .filter((option: ModifierOptionInput) => option.name)
      : [];

    if (!name) {
      return NextResponse.json(
        { error: "El nombre del modificador es obligatorio." },
        { status: 400 }
      );
    }

    if (options.length === 0) {
      return NextResponse.json(
        { error: "Debes agregar al menos una opción." },
        { status: 400 }
      );
    }

    const group = await prisma.$transaction(async (tx) => {
      const template = await tx.modifierTemplate.create({
        data: {
          name,
          order,
          active: true,
          options: {
            create: options,
          },
        },
      });

      return tx.productModifierGroup.create({
        data: {
          productId,
          templateId: template.id,
          min,
          max,
          required,
          order,
          active: true,
        },
        include: {
          template: {
            include: {
              options: {
                orderBy: [{ order: "asc" }, { createdAt: "desc" }],
              },
            },
          },
        },
      });
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No se pudo guardar el modificador del producto." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id || 0);
    const min = Number(body.min || 0);
    const max = Number(body.max || 1);
    const required = Boolean(body.required);
    const order = Number(body.order || 0);
    const active = Boolean(body.active);

    if (!id) {
      return NextResponse.json(
        { error: "El ID del modificador es obligatorio." },
        { status: 400 }
      );
    }

    if (max < min) {
      return NextResponse.json(
        { error: "La cantidad máxima no puede ser menor que la mínima." },
        { status: 400 }
      );
    }

    const group = await prisma.productModifierGroup.update({
      where: {
        id,
      },
      data: {
        min,
        max,
        required,
        order,
        active,
      },
      include: {
        template: {
          include: {
            options: {
              orderBy: [{ order: "asc" }, { createdAt: "desc" }],
            },
          },
        },
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No se pudo editar el modificador del producto." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id || 0);

    if (!id) {
      return NextResponse.json(
        { error: "El ID del modificador es obligatorio." },
        { status: 400 }
      );
    }

    await prisma.productModifierGroup.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Modificador eliminado del producto.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No se pudo eliminar el modificador del producto." },
      { status: 500 }
    );
  }
}