"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Category = {
  id: number;
  name: string;
  slug: string;
  order: number;
  active: boolean;
};

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  order: number;
  active: boolean;
  category: Category;
};

type ModifierOption = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  order: number;
  active: boolean;
};

type ModifierTemplate = {
  id: number;
  name: string;
  order: number;
  active: boolean;
  options: ModifierOption[];
};

type ProductModifierGroup = {
  id: number;
  min: number;
  max: number;
  required: boolean;
  order: number;
  active: boolean;
  template: ModifierTemplate;
};

type ModifierOptionInput = {
  localId: number;
  name: string;
  price: string;
  imageUrl: string;
  order: string;
  active: boolean;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(price);
}

function createEmptyModifierOption(): ModifierOptionInput {
  return {
    localId: Date.now() + Math.floor(Math.random() * 1000),
    name: "",
    price: "0",
    imageUrl: "",
    order: "0",
    active: true,
  };
}

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modifierTemplates, setModifierTemplates] = useState<ModifierTemplate[]>(
    []
  );

  const [categoryName, setCategoryName] = useState("");
  const [categoryOrder, setCategoryOrder] = useState("0");

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productOrder, setProductOrder] = useState("0");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [productActive, setProductActive] = useState(true);

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [updatingProductId, setUpdatingProductId] = useState<number | null>(
    null
  );

  const [selectedProductForModifiers, setSelectedProductForModifiers] =
    useState<Product | null>(null);
  const [productModifierGroups, setProductModifierGroups] = useState<
    ProductModifierGroup[]
  >([]);

  const [modifierMode, setModifierMode] = useState<
    "create" | "import" | "edit"
  >("create");

  const [editingModifierGroupId, setEditingModifierGroupId] = useState<
    number | null
  >(null);

  const [modifierName, setModifierName] = useState("");
  const [modifierMin, setModifierMin] = useState("0");
  const [modifierMax, setModifierMax] = useState("1");
  const [modifierRequired, setModifierRequired] = useState(false);
  const [modifierOrder, setModifierOrder] = useState("0");
  const [modifierActive, setModifierActive] = useState(true);
  const [modifierOptions, setModifierOptions] = useState<
    ModifierOptionInput[]
  >([createEmptyModifierOption()]);

  const [importTemplateId, setImportTemplateId] = useState("");
  const [editingGlobalModifierId, setEditingGlobalModifierId] = useState<
  number | null
>(null);
const [globalModifierName, setGlobalModifierName] = useState("");
const [globalModifierOrder, setGlobalModifierOrder] = useState("0");
const [globalModifierActive, setGlobalModifierActive] = useState(true);

const [editingGlobalOptionId, setEditingGlobalOptionId] = useState<
  number | null
>(null);
const [globalOptionName, setGlobalOptionName] = useState("");
const [globalOptionPrice, setGlobalOptionPrice] = useState("0");
const [globalOptionImageUrl, setGlobalOptionImageUrl] = useState("");
const [globalOptionOrder, setGlobalOptionOrder] = useState("0");
const [globalOptionActive, setGlobalOptionActive] = useState(true);
const [globalModifierMessage, setGlobalModifierMessage] = useState("");
const [loadingGlobalModifier, setLoadingGlobalModifier] = useState(false);

  const [loadingCategory, setLoadingCategory] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [loadingModifier, setLoadingModifier] = useState(false);
  const [deletingModifierGroupId, setDeletingModifierGroupId] = useState<
    number | null
  >(null);

  const [categoryMessage, setCategoryMessage] = useState("");
  const [productMessage, setProductMessage] = useState("");
  const [modifierMessage, setModifierMessage] = useState("");

  async function loadCategories() {
    const response = await fetch("/api/categories");
    const data = await response.json();
    setCategories(Array.isArray(data) ? data : []);
  }

  async function loadProducts() {
    const response = await fetch("/api/products");
    const data = await response.json();
    setProducts(Array.isArray(data) ? data : []);
  }

  async function loadModifierTemplates() {
    const response = await fetch("/api/modifier-templates");
    const data = await response.json();
    setModifierTemplates(Array.isArray(data) ? data : []);
  }

  async function loadProductModifierGroups(productId: number) {
    const response = await fetch(`/api/product-modifiers?productId=${productId}`);
    const data = await response.json();
    setProductModifierGroups(Array.isArray(data) ? data : []);
  }

  async function loadData() {
    await Promise.all([
      loadCategories(),
      loadProducts(),
      loadModifierTemplates(),
    ]);
  }

  async function uploadImage(file: File) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads/image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "No se pudo subir la imagen.");
      console.error("Error upload:", data);
      return null;
    }

    if (!data.url) {
      alert("La imagen subió, pero no llegó la URL.");
      return null;
    }

    return data.url as string;
  } catch (error) {
    console.error("Error al subir imagen:", error);
    alert("Error al subir imagen.");
    return null;
  }
}

  function resetProductForm() {
    setEditingProductId(null);
    setProductName("");
    setProductDescription("");
    setProductPrice("");
    setProductImageUrl("");
    setProductOrder("0");
    setProductCategoryId("");
    setProductActive(true);
    setProductMessage("");
  }

  function startEditProduct(product: Product) {
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductDescription(product.description || "");
    setProductPrice(String(product.price));
    setProductImageUrl(product.imageUrl || "");
    setProductOrder(String(product.order));
    setProductCategoryId(String(product.category.id));
    setProductActive(product.active);
    setProductMessage("Editando producto seleccionado.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openProductModifiers(product: Product) {
    setSelectedProductForModifiers(product);
    setModifierMessage("");
    resetModifierForm();
    await loadProductModifierGroups(product.id);
    await loadModifierTemplates();

    setTimeout(() => {
      document
        .getElementById("product-modifiers-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function closeProductModifiers() {
    setSelectedProductForModifiers(null);
    setProductModifierGroups([]);
    setModifierMessage("");
    resetModifierForm();
  }

  function resetModifierForm() {
    setModifierMode("create");
    setEditingModifierGroupId(null);
    setModifierName("");
    setModifierMin("0");
    setModifierMax("1");
    setModifierRequired(false);
    setModifierOrder("0");
    setModifierActive(true);
    setModifierOptions([createEmptyModifierOption()]);
    setImportTemplateId("");
  }

  function startEditModifierGroup(group: ProductModifierGroup) {
    setModifierMode("edit");
    setEditingModifierGroupId(group.id);
    setModifierName(group.template.name);
    setModifierMin(String(group.min));
    setModifierMax(String(group.max));
    setModifierRequired(group.required);
    setModifierOrder(String(group.order));
    setModifierActive(group.active);
    setModifierMessage("Editando reglas del modificador seleccionado.");
  }

  function addModifierOption() {
    setModifierOptions((current) => [...current, createEmptyModifierOption()]);
  }

  function updateModifierOption(
    localId: number,
    field: keyof ModifierOptionInput,
    value: string | boolean
  ) {
    setModifierOptions((current) =>
      current.map((option) =>
        option.localId === localId ? { ...option, [field]: value } : option
      )
    );
  }

  function removeModifierOption(localId: number) {
    setModifierOptions((current) => {
      if (current.length === 1) {
        return [createEmptyModifierOption()];
      }

      return current.filter((option) => option.localId !== localId);
    });
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoadingCategory(true);
      setCategoryMessage("");

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: categoryName,
          order: Number(categoryOrder),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCategoryMessage(data.error || "No se pudo crear la categoría.");
        return;
      }

      setCategoryName("");
      setCategoryOrder("0");
      setCategoryMessage("Categoría creada correctamente.");
      await loadCategories();
    } catch (error) {
      console.error(error);
      setCategoryMessage("Error al crear categoría.");
    } finally {
      setLoadingCategory(false);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoadingProduct(true);
      setProductMessage("");

      const method = editingProductId ? "PUT" : "POST";

      const response = await fetch("/api/products", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingProductId,
          name: productName,
          description: productDescription,
          price: Number(productPrice),
          imageUrl: productImageUrl,
          order: Number(productOrder),
          categoryId: Number(productCategoryId),
          active: productActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProductMessage(data.error || "No se pudo guardar el producto.");
        return;
      }

      setProductMessage(
        editingProductId
          ? "Producto editado correctamente."
          : "Producto creado correctamente."
      );

      resetProductForm();
      await loadProducts();
    } catch (error) {
      console.error(error);
      setProductMessage("Error al guardar producto.");
    } finally {
      setLoadingProduct(false);
    }
  }

  async function toggleProductActive(product: Product) {
    try {
      setUpdatingProductId(product.id);

      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: product.id,
          active: !product.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "No se pudo actualizar el producto.");
        return;
      }

      await loadProducts();

      if (selectedProductForModifiers?.id === product.id) {
        setSelectedProductForModifiers({
          ...selectedProductForModifiers,
          active: !product.active,
        });
      }
    } catch (error) {
      console.error(error);
      alert("Error al actualizar el producto.");
    } finally {
      setUpdatingProductId(null);
    }
  }

  async function saveProductModifier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProductForModifiers) {
      return;
    }

    try {
      setLoadingModifier(true);
      setModifierMessage("");

      if (modifierMode === "edit") {
        const response = await fetch("/api/product-modifiers", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingModifierGroupId,
            min: Number(modifierMin),
            max: Number(modifierMax),
            required: modifierRequired,
            order: Number(modifierOrder),
            active: modifierActive,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setModifierMessage(
            data.error || "No se pudo editar el modificador."
          );
          return;
        }

        setModifierMessage("Reglas del modificador actualizadas.");
        resetModifierForm();
        await loadProductModifierGroups(selectedProductForModifiers.id);
        return;
      }

      const body =
        modifierMode === "import"
          ? {
              productId: selectedProductForModifiers.id,
              templateId: Number(importTemplateId),
              min: Number(modifierMin),
              max: Number(modifierMax),
              required: modifierRequired,
              order: Number(modifierOrder),
            }
          : {
              productId: selectedProductForModifiers.id,
              name: modifierName,
              min: Number(modifierMin),
              max: Number(modifierMax),
              required: modifierRequired,
              order: Number(modifierOrder),
              options: modifierOptions.map((option) => ({
                name: option.name,
                price: Number(option.price),
                imageUrl: option.imageUrl,
                order: Number(option.order),
                active: option.active,
              })),
            };

      const response = await fetch("/api/product-modifiers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setModifierMessage(data.error || "No se pudo guardar el modificador.");
        return;
      }

      setModifierMessage(
        modifierMode === "import"
          ? "Modificador importado correctamente."
          : "Modificador creado correctamente."
      );

      resetModifierForm();
      await loadProductModifierGroups(selectedProductForModifiers.id);
      await loadModifierTemplates();
    } catch (error) {
      console.error(error);
      setModifierMessage("Error al guardar modificador.");
    } finally {
      setLoadingModifier(false);
    }
  }

  async function deleteProductModifierGroup(group: ProductModifierGroup) {
    if (!selectedProductForModifiers) {
      return;
    }

    const confirmDelete = window.confirm(
      `¿Eliminar el modificador "${group.template.name}" de este producto?`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingModifierGroupId(group.id);

      const response = await fetch("/api/product-modifiers", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: group.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "No se pudo eliminar el modificador.");
        return;
      }

      setModifierMessage("Modificador eliminado del producto.");
      resetModifierForm();
      await loadProductModifierGroups(selectedProductForModifiers.id);
    } catch (error) {
      console.error(error);
      alert("Error al eliminar el modificador.");
    } finally {
      setDeletingModifierGroupId(null);
    }
  }
function resetGlobalModifierEditor() {
  setEditingGlobalModifierId(null);
  setGlobalModifierName("");
  setGlobalModifierOrder("0");
  setGlobalModifierActive(true);

  setEditingGlobalOptionId(null);
  setGlobalOptionName("");
  setGlobalOptionPrice("0");
  setGlobalOptionImageUrl("");
  setGlobalOptionOrder("0");
  setGlobalOptionActive(true);
  setGlobalModifierMessage("");
}

function startEditGlobalModifier(template: ModifierTemplate) {
  setEditingGlobalModifierId(template.id);
  setGlobalModifierName(template.name);
  setGlobalModifierOrder(String(template.order));
  setGlobalModifierActive(template.active);

  setEditingGlobalOptionId(null);
  setGlobalOptionName("");
  setGlobalOptionPrice("0");
  setGlobalOptionImageUrl("");
  setGlobalOptionOrder("0");
  setGlobalOptionActive(true);

  setGlobalModifierMessage("Editando modificador global.");
}

function startEditGlobalOption(option: ModifierOption) {
  setEditingGlobalOptionId(option.id);
  setGlobalOptionName(option.name);
  setGlobalOptionPrice(String(option.price));
  setGlobalOptionImageUrl(option.imageUrl || "");
  setGlobalOptionOrder(String(option.order));
  setGlobalOptionActive(option.active);
  setGlobalModifierMessage("Editando opción del modificador.");
}

async function saveGlobalModifier(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!editingGlobalModifierId) {
    setGlobalModifierMessage("Primero selecciona un modificador.");
    return;
  }

  try {
    setLoadingGlobalModifier(true);
    setGlobalModifierMessage("");

    const response = await fetch("/api/modifier-templates", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingGlobalModifierId,
        name: globalModifierName,
        order: Number(globalModifierOrder),
        active: globalModifierActive,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setGlobalModifierMessage(
        data.error || "No se pudo guardar el modificador."
      );
      return;
    }

    setGlobalModifierMessage("Modificador actualizado correctamente.");
    await loadModifierTemplates();
  } catch (error) {
    console.error(error);
    setGlobalModifierMessage("Error al guardar modificador.");
  } finally {
    setLoadingGlobalModifier(false);
  }
}

async function deleteGlobalModifier(template: ModifierTemplate) {
  const ok = window.confirm(
    `¿Eliminar el modificador "${template.name}"? Esto también lo quitará de los productos donde esté importado.`
  );

  if (!ok) return;

  try {
    setLoadingGlobalModifier(true);
    setGlobalModifierMessage("");

    const response = await fetch("/api/modifier-templates", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: template.id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setGlobalModifierMessage(
        data.error || "No se pudo eliminar el modificador."
      );
      return;
    }

    resetGlobalModifierEditor();
    await loadModifierTemplates();

    if (selectedProductForModifiers) {
      await loadProductModifierGroups(selectedProductForModifiers.id);
    }

    setGlobalModifierMessage("Modificador eliminado correctamente.");
  } catch (error) {
    console.error(error);
    setGlobalModifierMessage("Error al eliminar modificador.");
  } finally {
    setLoadingGlobalModifier(false);
  }
}

async function saveGlobalOption(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!editingGlobalModifierId) {
    setGlobalModifierMessage("Primero selecciona un modificador.");
    return;
  }

  try {
    setLoadingGlobalModifier(true);
    setGlobalModifierMessage("");

    const method = editingGlobalOptionId ? "PUT" : "POST";

    const response = await fetch("/api/modifier-options", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingGlobalOptionId,
        templateId: editingGlobalModifierId,
        name: globalOptionName,
        price: Number(globalOptionPrice),
        imageUrl: globalOptionImageUrl,
        order: Number(globalOptionOrder),
        active: globalOptionActive,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setGlobalModifierMessage(data.error || "No se pudo guardar la opción.");
      return;
    }

    setEditingGlobalOptionId(null);
    setGlobalOptionName("");
    setGlobalOptionPrice("0");
    setGlobalOptionImageUrl("");
    setGlobalOptionOrder("0");
    setGlobalOptionActive(true);

    await loadModifierTemplates();

    if (selectedProductForModifiers) {
      await loadProductModifierGroups(selectedProductForModifiers.id);
    }

    setGlobalModifierMessage(
      editingGlobalOptionId
        ? "Opción actualizada correctamente."
        : "Opción creada correctamente."
    );
  } catch (error) {
    console.error(error);
    setGlobalModifierMessage("Error al guardar opción.");
  } finally {
    setLoadingGlobalModifier(false);
  }
}

async function deleteGlobalOption(option: ModifierOption) {
  const ok = window.confirm(`¿Eliminar la opción "${option.name}"?`);

  if (!ok) return;

  try {
    setLoadingGlobalModifier(true);
    setGlobalModifierMessage("");

    const response = await fetch("/api/modifier-options", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: option.id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setGlobalModifierMessage(data.error || "No se pudo eliminar la opción.");
      return;
    }

    setEditingGlobalOptionId(null);
    setGlobalOptionName("");
    setGlobalOptionPrice("0");
    setGlobalOptionImageUrl("");
    setGlobalOptionOrder("0");
    setGlobalOptionActive(true);

    await loadModifierTemplates();

    if (selectedProductForModifiers) {
      await loadProductModifierGroups(selectedProductForModifiers.id);
    }

    setGlobalModifierMessage("Opción eliminada correctamente.");
  } catch (error) {
    console.error(error);
    setGlobalModifierMessage("Error al eliminar opción.");
  } finally {
    setLoadingGlobalModifier(false);
  }
}
async function toggleGlobalOptionActive(option: ModifierOption) {
  try {
    setLoadingGlobalModifier(true);
    setGlobalModifierMessage("");

    const response = await fetch("/api/modifier-options", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: option.id,
        name: option.name,
        price: option.price,
        imageUrl: option.imageUrl || "",
        order: option.order,
        active: !option.active,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setGlobalModifierMessage(
        data.error || "No se pudo cambiar el estado de la opción."
      );
      return;
    }

    await loadModifierTemplates();

    if (selectedProductForModifiers) {
      await loadProductModifierGroups(selectedProductForModifiers.id);
    }

    setGlobalModifierMessage(
      !option.active
        ? `La opción "${option.name}" fue activada.`
        : `La opción "${option.name}" fue desactivada.`
    );
  } catch (error) {
    console.error(error);
    setGlobalModifierMessage("Error al cambiar estado de la opción.");
  } finally {
    setLoadingGlobalModifier(false);
  }
}
  useEffect(() => {
    loadData();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-6 text-zinc-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#10B557]">
              Panel Admin
            </p>
            <h1 className="mt-1 text-3xl font-black">Administración ÜWA</h1>
          </div>

          <div className="flex items-center gap-3">
  <a
    href="/admin/settings"
    className="rounded-xl bg-[#10B557] px-4 py-2 text-sm font-black text-white shadow-sm"
  >
    Configuración
  </a>

  <a
    href="/totem"
    className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-bold"
  >
    Ver tótem
  </a>

  <a
    href="/cocina"
    className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-bold"
  >
    Ver cocina
  </a>

  <a
    href="/"
    className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-bold"
  >
    Volver
  </a>
</div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-[#10B557] p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase opacity-80">
              Categorías
            </p>
            <h2 className="mt-2 text-4xl font-black">{categories.length}</h2>
            <p className="mt-1 text-sm font-semibold">Creadas desde admin</p>
          </div>

          <div className="rounded-2xl bg-[#10B557] p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase opacity-80">
              Productos
            </p>
            <h2 className="mt-2 text-4xl font-black">{products.length}</h2>
            <p className="mt-1 text-sm font-semibold">Creados desde admin</p>
          </div>

          <div className="rounded-2xl bg-white p-5 text-zinc-900 shadow-sm">
            <p className="text-xs font-black uppercase text-zinc-500">
              Modificadores
            </p>
            <h2 className="mt-2 text-4xl font-black">
              {modifierTemplates.length}
            </h2>
            <p className="mt-1 text-sm font-semibold">Plantillas globales</p>
          </div>
        </section>
        <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
  <div className="mb-5 flex items-center justify-between gap-4">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#10B557]">
        Modificadores globales
      </p>
      <h2 className="mt-1 text-2xl font-black">
        Administrar modificadores
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Edita plantillas globales, opciones, fotos, precios y disponibilidad.
      </p>
    </div>

    {editingGlobalModifierId && (
      <button
        type="button"
        onClick={resetGlobalModifierEditor}
        className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-black"
      >
        Cerrar editor
      </button>
    )}
  </div>

  {globalModifierMessage && (
    <p className="mb-4 rounded-xl bg-zinc-100 p-3 text-sm font-bold">
      {globalModifierMessage}
    </p>
  )}

  <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
    <div className="space-y-3">
      {modifierTemplates.length === 0 ? (
        <div className="rounded-xl bg-zinc-100 p-5 text-center">
          <p className="font-black">Aún no hay modificadores globales.</p>
        </div>
      ) : (
        modifierTemplates.map((template) => (
          <article
            key={template.id}
            className={`rounded-2xl border p-4 ${
              editingGlobalModifierId === template.id
                ? "border-[#10B557] bg-green-50"
                : "border-zinc-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">{template.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {template.options.length} opciones ·{" "}
                  {template.active ? "Activo" : "Inactivo"}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  template.active
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {template.active ? "Activo" : "Inactivo"}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => startEditGlobalModifier(template)}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white"
              >
                Entrar / editar
              </button>

              <button
                type="button"
                onClick={() => deleteGlobalModifier(template)}
                disabled={loadingGlobalModifier}
                className="rounded-xl bg-red-500 px-4 py-2 text-xs font-black text-white disabled:bg-zinc-300"
              >
                Eliminar
              </button>
            </div>
          </article>
        ))
      )}
    </div>

    <div>
      {!editingGlobalModifierId ? (
        <div className="rounded-2xl bg-zinc-100 p-8 text-center">
          <p className="text-lg font-black">
            Selecciona un modificador para editarlo.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <form
            onSubmit={saveGlobalModifier}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <h3 className="text-lg font-black">Editar modificador</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_140px_160px]">
              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Nombre
                </span>
                <input
                  value={globalModifierName}
                  onChange={(event) =>
                    setGlobalModifierName(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Orden
                </span>
                <input
                  value={globalModifierOrder}
                  onChange={(event) =>
                    setGlobalModifierOrder(event.target.value)
                  }
                  type="number"
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>

              <label className="mt-6 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
                <input
                  type="checkbox"
                  checked={globalModifierActive}
                  onChange={(event) =>
                    setGlobalModifierActive(event.target.checked)
                  }
                />
                <span className="text-sm font-black">Activo</span>
              </label>
            </div>

            <button
              disabled={loadingGlobalModifier}
              className="mt-5 w-full rounded-xl bg-[#10B557] py-3 text-sm font-black text-white disabled:bg-zinc-300"
            >
              Guardar modificador
            </button>
          </form>

          <form
            onSubmit={saveGlobalOption}
            className="rounded-2xl border border-zinc-200 bg-white p-4"
          >
            <h3 className="text-lg font-black">
              {editingGlobalOptionId ? "Editar opción" : "Agregar opción"}
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_140px_140px]">
              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Nombre opción
                </span>
                <input
                  value={globalOptionName}
                  onChange={(event) => setGlobalOptionName(event.target.value)}
                  placeholder="Ej: Arroz, Tomate, Extra queso"
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Precio extra
                </span>
                <input
                  value={globalOptionPrice}
                  onChange={(event) => setGlobalOptionPrice(event.target.value)}
                  type="number"
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Orden
                </span>
                <input
                  value={globalOptionOrder}
                  onChange={(event) => setGlobalOptionOrder(event.target.value)}
                  type="number"
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_160px]">
              <div>
                <span className="text-xs font-black uppercase text-zinc-500">
                  Imagen opción
                </span>

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
                    {globalOptionImageUrl ? (
                      <img
                        src={globalOptionImageUrl}
                        alt={globalOptionName || "Opción"}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-[10px] font-black text-zinc-400">
                        Sin foto
                      </span>
                    )}
                  </div>

                  <label className="cursor-pointer rounded-xl bg-zinc-900 px-4 py-3 text-xs font-black text-white">
                    Subir
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;

                        const url = await uploadImage(file);
                        if (!url) return;

                        setGlobalOptionImageUrl(url);
                      }}
                    />
                  </label>

                  {globalOptionImageUrl && (
                    <button
                      type="button"
                      onClick={() => setGlobalOptionImageUrl("")}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              <label className="mt-6 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
                <input
                  type="checkbox"
                  checked={globalOptionActive}
                  onChange={(event) =>
                    setGlobalOptionActive(event.target.checked)
                  }
                />
                <span className="text-sm font-black">Disponible</span>
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                disabled={loadingGlobalModifier}
                className="flex-1 rounded-xl bg-[#10B557] py-3 text-sm font-black text-white disabled:bg-zinc-300"
              >
                {editingGlobalOptionId ? "Actualizar opción" : "Agregar opción"}
              </button>

              {editingGlobalOptionId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingGlobalOptionId(null);
                    setGlobalOptionName("");
                    setGlobalOptionPrice("0");
                    setGlobalOptionImageUrl("");
                    setGlobalOptionOrder("0");
                    setGlobalOptionActive(true);
                  }}
                  className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-black"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h3 className="text-lg font-black">Opciones actuales</h3>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {modifierTemplates
                .find((template) => template.id === editingGlobalModifierId)
                ?.options.map((option) => (
                  <article
                    key={option.id}
                    className="rounded-2xl border border-zinc-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-zinc-50">
                        {option.imageUrl ? (
                          <img
                            src={option.imageUrl}
                            alt={option.name}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <span className="text-[10px] font-black text-zinc-400">
                            Sin foto
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-black">{option.name}</h4>
                        <p className="text-sm font-bold text-[#10B557]">
                          {formatPrice(option.price)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {option.active ? "Disponible" : "No disponible"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditGlobalOption(option)}
                        className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-black text-white"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteGlobalOption(option)}
                        disabled={loadingGlobalModifier}
                        className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white disabled:bg-zinc-300"
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
</section>

        <section className="mb-6 grid gap-5 lg:grid-cols-2">
          <form
            onSubmit={createCategory}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-xl font-black">Crear categoría</h2>

            <label className="mt-5 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Nombre
              </span>
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Ej: Bebidas, Cafés, Menús, Postres"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Orden
              </span>
              <input
                value={categoryOrder}
                onChange={(event) => setCategoryOrder(event.target.value)}
                type="number"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            {categoryMessage && (
              <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm font-bold">
                {categoryMessage}
              </p>
            )}

            <button
              disabled={loadingCategory}
              className="mt-5 w-full rounded-xl bg-[#10B557] py-3 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {loadingCategory ? "Guardando..." : "Guardar categoría"}
            </button>
          </form>

          <form
            onSubmit={saveProduct}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-black">
                {editingProductId ? "Editar producto" : "Crear producto"}
              </h2>

              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-black"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Categoría
              </span>
              <select
                value={productCategoryId}
                onChange={(event) => setProductCategoryId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              >
                <option value="">Seleccionar categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Nombre
              </span>
              <input
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Ej: Café latte, Bowl M, Hamburguesa"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Descripción
              </span>
              <input
                value={productDescription}
                onChange={(event) => setProductDescription(event.target.value)}
                placeholder="Descripción corta del producto"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
              />
            </label>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Precio
                </span>
                <input
                  value={productPrice}
                  onChange={(event) => setProductPrice(event.target.value)}
                  type="number"
                  placeholder="4200"
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Orden
                </span>
                <input
                  value={productOrder}
                  onChange={(event) => setProductOrder(event.target.value)}
                  type="number"
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                />
              </label>
            </div>

            <div className="mt-4 block">
              <span className="text-xs font-black uppercase text-zinc-500">
                Imagen del producto
              </span>

              <div className="mt-2 flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                  {productImageUrl ? (
                    <img
                      src={productImageUrl}
                      alt="Producto"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-xs font-black text-zinc-400">
                      Sin foto
                    </span>
                  )}
                </div>

                <label className="cursor-pointer rounded-xl bg-zinc-900 px-5 py-3 text-sm font-black text-white">
                  Subir imagen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;

                      const url = await uploadImage(file);
                      if (!url) return;

                      setProductImageUrl(url);
                    }}
                  />
                </label>

                {productImageUrl && (
                  <button
                    type="button"
                    onClick={() => setProductImageUrl("")}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-600"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>

            {editingProductId && (
              <label className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
                <input
                  type="checkbox"
                  checked={productActive}
                  onChange={(event) => setProductActive(event.target.checked)}
                />
                <span className="text-sm font-black">Producto activo</span>
              </label>
            )}

            {productMessage && (
              <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm font-bold">
                {productMessage}
              </p>
            )}

            <button
              disabled={loadingProduct}
              className="mt-5 w-full rounded-xl bg-[#10B557] py-3 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {loadingProduct
                ? "Guardando..."
                : editingProductId
                ? "Actualizar producto"
                : "Guardar producto"}
            </button>
          </form>
        </section>

        {selectedProductForModifiers && (
          <section
            id="product-modifiers-panel"
            className="mb-6 rounded-2xl border-2 border-[#10B557] bg-white p-5 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#10B557]">
                  Modificadores del producto
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {selectedProductForModifiers.name}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Crea, importa, edita o elimina modificadores de este producto.
                </p>
              </div>

              <button
                onClick={closeProductModifiers}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-black"
              >
                Cerrar
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  resetModifierForm();
                  setModifierMode("create");
                }}
                className={`rounded-xl px-4 py-2 text-sm font-black ${
                  modifierMode === "create"
                    ? "bg-[#10B557] text-white"
                    : "border border-zinc-300 bg-white"
                }`}
              >
                + Crear modificador
              </button>

              <button
                onClick={() => {
                  resetModifierForm();
                  setModifierMode("import");
                }}
                className={`rounded-xl px-4 py-2 text-sm font-black ${
                  modifierMode === "import"
                    ? "bg-[#10B557] text-white"
                    : "border border-zinc-300 bg-white"
                }`}
              >
                + Importar modificador
              </button>

              {modifierMode === "edit" && (
                <button
                  onClick={resetModifierForm}
                  className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-black text-red-600"
                >
                  Cancelar edición de reglas
                </button>
              )}
            </div>

            <form onSubmit={saveProductModifier}>
              {modifierMode === "edit" ? (
                <div className="rounded-2xl bg-yellow-50 p-4">
                  <h3 className="text-lg font-black">
                    Editar reglas del modificador
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    Modificador: <strong>{modifierName}</strong>
                  </p>
                </div>
          ) : modifierMode === "import" ? (
  <div className="rounded-2xl bg-zinc-50 p-4">
    <h3 className="text-lg font-black">
      Importar modificador existente
    </h3>

    <label className="mt-4 block">
      <span className="text-xs font-black uppercase text-zinc-500">
        Seleccionar modificador
      </span>

      <select
        value={importTemplateId}
        onChange={(event) => setImportTemplateId(event.target.value)}
        className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
      >
        <option value="">Selecciona un modificador</option>

        {modifierTemplates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name} · {template.options.length} opciones
          </option>
        ))}
      </select>
    </label>

    {modifierTemplates.length === 0 && (
      <p className="mt-3 rounded-xl bg-yellow-50 p-3 text-sm font-bold text-yellow-800">
        Aún no hay modificadores globales para importar. Primero crea un modificador.
      </p>
    )}
  </div>
) : (
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <h3 className="text-lg font-black">
                    Crear modificador nuevo
                  </h3>

                  <label className="mt-4 block">
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Nombre del modificador
                    </span>
                    <input
                      value={modifierName}
                      onChange={(event) => setModifierName(event.target.value)}
                      placeholder="Ej: Tipo de leche, Tamaño, Extras, Salsas"
                      className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                    />
                  </label>

                  <div className="mt-4 space-y-4">
                    {modifierOptions.map((option, index) => (
                      <div
                        key={option.localId}
                        className="rounded-2xl border border-zinc-200 bg-white p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-black">Opción #{index + 1}</h4>

                          <button
                            type="button"
                            onClick={() =>
                              removeModifierOption(option.localId)
                            }
                            className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                          >
                            Quitar
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1fr_140px_140px]">
                          <label className="block">
                            <span className="text-xs font-black uppercase text-zinc-500">
                              Nombre opción
                            </span>
                            <input
                              value={option.name}
                              onChange={(event) =>
                                updateModifierOption(
                                  option.localId,
                                  "name",
                                  event.target.value
                                )
                              }
                              placeholder="Ej: Tomate, Almendra, Grande"
                              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-black uppercase text-zinc-500">
                              Precio extra
                            </span>
                            <input
                              value={option.price}
                              onChange={(event) =>
                                updateModifierOption(
                                  option.localId,
                                  "price",
                                  event.target.value
                                )
                              }
                              type="number"
                              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-black uppercase text-zinc-500">
                              Orden
                            </span>
                            <input
                              value={option.order}
                              onChange={(event) =>
                                updateModifierOption(
                                  option.localId,
                                  "order",
                                  event.target.value
                                )
                              }
                              type="number"
                              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                            />
                          </label>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_160px]">
  <div>
    <span className="text-xs font-black uppercase text-zinc-500">
      Imagen opción
    </span>

    <div className="mt-2 flex items-center gap-3">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {option.imageUrl ? (
          <img
            src={option.imageUrl}
            alt={option.name || "Opción"}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <span className="text-[10px] font-black text-zinc-400">
            Sin foto
          </span>
        )}
      </div>

      <label className="cursor-pointer rounded-xl bg-zinc-900 px-4 py-3 text-xs font-black text-white">
        Subir
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const url = await uploadImage(file);
            if (!url) return;

            updateModifierOption(option.localId, "imageUrl", url);
          }}
        />
      </label>

      {option.imageUrl && (
        <button
          type="button"
          onClick={() =>
            updateModifierOption(option.localId, "imageUrl", "")
          }
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600"
        >
          Quitar
        </button>
      )}
    </div>
  </div>

  <label className="mt-6 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
    <input
      type="checkbox"
      checked={option.active}
      onChange={(event) =>
        updateModifierOption(
          option.localId,
          "active",
          event.target.checked
        )
      }
    />
    <span className="text-sm font-black">
      Disponible
    </span>
  </label>
</div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addModifierOption}
                    className="mt-4 rounded-xl border border-[#10B557] px-4 py-2 text-sm font-black text-[#10B557]"
                  >
                    + Agregar opción
                  </button>
                </div>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-5">
                <label className="block">
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Mínimo
                  </span>
                  <input
                    value={modifierMin}
                    onChange={(event) => setModifierMin(event.target.value)}
                    type="number"
                    className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Máximo
                  </span>
                  <input
                    value={modifierMax}
                    onChange={(event) => setModifierMax(event.target.value)}
                    type="number"
                    className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase text-zinc-500">
                    Orden
                  </span>
                  <input
                    value={modifierOrder}
                    onChange={(event) => setModifierOrder(event.target.value)}
                    type="number"
                    className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none focus:border-[#10B557]"
                  />
                </label>

                <label className="mt-6 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
                  <input
                    type="checkbox"
                    checked={modifierRequired}
                    onChange={(event) =>
                      setModifierRequired(event.target.checked)
                    }
                  />
                  <span className="text-sm font-black">Obligatorio</span>
                </label>

                {modifierMode === "edit" && (
                  <label className="mt-6 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
                    <input
                      type="checkbox"
                      checked={modifierActive}
                      onChange={(event) =>
                        setModifierActive(event.target.checked)
                      }
                    />
                    <span className="text-sm font-black">Activo</span>
                  </label>
                )}
              </div>

              {modifierMessage && (
                <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm font-bold">
                  {modifierMessage}
                </p>
              )}

              <button
  disabled={
    loadingModifier ||
    (modifierMode === "import" && !importTemplateId)
  }
  className="mt-5 w-full rounded-xl bg-[#10B557] py-3 text-sm font-black text-white disabled:bg-zinc-300"
>
                {loadingModifier
                  ? "Guardando..."
                  : modifierMode === "edit"
                  ? "Actualizar reglas del modificador"
                  : modifierMode === "import"
                  ? "Importar modificador al producto"
                  : "Crear modificador en este producto"}
              </button>
            </form>

            <div className="mt-6 border-t border-zinc-200 pt-5">
              <h3 className="text-lg font-black">
                Modificadores usados por este producto
              </h3>

              {productModifierGroups.length === 0 ? (
                <div className="mt-4 rounded-xl bg-zinc-100 p-5 text-center">
                  <p className="font-black">
                    Este producto no tiene modificadores
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Crea o importa uno desde los botones superiores.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {productModifierGroups.map((group) => (
                    <article
                      key={group.id}
                      className="rounded-2xl border border-zinc-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-black">
                            {group.template.name}
                          </h4>
                          <p className="mt-1 text-sm text-zinc-500">
                            Mín: {group.min} / Máx: {group.max} /{" "}
                            {group.required ? "Obligatorio" : "Opcional"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            group.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {group.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
  {group.template.options.map((option) => (
    <button
      key={option.id}
      type="button"
      onClick={() => toggleGlobalOptionActive(option)}
      disabled={loadingGlobalModifier}
      className={`rounded-full px-3 py-2 text-xs font-black transition disabled:opacity-50 ${
        option.active
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-red-100 text-red-700 hover:bg-red-200"
      }`}
      title={
        option.active
          ? "Click para desactivar esta opción"
          : "Click para activar esta opción"
      }
    >
      {option.name}
      {option.price > 0 && ` +${formatPrice(option.price)}`}
      {option.active ? " · Activo" : " · Inactivo"}
    </button>
  ))}
</div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditModifierGroup(group)}
                          className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white"
                        >
                          Editar reglas
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteProductModifierGroup(group)}
                          disabled={deletingModifierGroupId === group.id}
                          className="rounded-xl bg-red-500 px-4 py-2 text-xs font-black text-white disabled:bg-zinc-300"
                        >
                          {deletingModifierGroupId === group.id
                            ? "Eliminando..."
                            : "Eliminar"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Productos creados</h2>

          {products.length === 0 ? (
            <div className="mt-5 rounded-xl bg-zinc-100 p-6 text-center">
              <p className="text-lg font-black">Aún no hay productos</p>
              <p className="mt-1 text-sm text-zinc-500">
                Crea un producto desde el formulario.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="p-3 font-black">Producto</th>
                    <th className="p-3 font-black">Categoría</th>
                    <th className="p-3 font-black">Precio</th>
                    <th className="p-3 font-black">Orden</th>
                    <th className="p-3 font-black">Estado</th>
                    <th className="p-3 font-black">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-zinc-200">
                      <td className="p-3 font-bold">{product.name}</td>

                      <td className="p-3">{product.category.name}</td>

                      <td className="p-3 font-black text-[#10B557]">
                        {formatPrice(product.price)}
                      </td>

                      <td className="p-3">{product.order}</td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            product.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {product.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => startEditProduct(product)}
                            className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => openProductModifiers(product)}
                            className="rounded-xl bg-[#10B557] px-4 py-2 text-xs font-black text-white"
                          >
                            Modificadores
                          </button>

                          <button
                            onClick={() => toggleProductActive(product)}
                            disabled={updatingProductId === product.id}
                            className={`rounded-xl px-4 py-2 text-xs font-black text-white ${
                              product.active ? "bg-red-500" : "bg-[#10B557]"
                            } disabled:bg-zinc-300`}
                          >
                            {updatingProductId === product.id
                              ? "Actualizando..."
                              : product.active
                              ? "Desactivar"
                              : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}