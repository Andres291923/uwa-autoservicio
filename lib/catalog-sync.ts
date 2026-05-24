export type CatalogChannel = "totem" | "online" | "company";

function channelKey(channel: CatalogChannel) {
  if (channel === "totem") return "totem";
  return "online";
}

function sortByOrderThenId(a: any, b: any) {
  const orderA = Number(a?.order || 0);
  const orderB = Number(b?.order || 0);
  if (orderA !== orderB) return orderA - orderB;
  return Number(a?.id || 0) - Number(b?.id || 0);
}

function groupVisible(channelVisibility: unknown, channel: CatalogChannel) {
  const visibility = String(channelVisibility || "all");
  if (visibility === "all") return true;
  return visibility === channelKey(channel);
}

export function getActiveCatalogProduct(product: any, channel: CatalogChannel) {
  if (!product) return null;
  if (product.active === false) return null;
  if (product.category?.active === false) return null;

  const modifierGroups = (product.modifierGroups || [])
    .filter((group: any) => group.active !== false)
    .filter((group: any) => group.template && group.template.active !== false)
    .filter((group: any) => groupVisible(group.channelVisibility, channel))
    .map((group: any) => ({
      ...group,
      template: {
        ...group.template,
        options: (group.template.options || [])
          .filter((option: any) => option.active !== false)
          .sort(sortByOrderThenId),
      },
    }))
    .filter((group: any) => group.template.options.length > 0)
    .sort(sortByOrderThenId);

  return {
    ...product,
    modifierGroups,
  };
}

export function findCatalogProductForChannel(
  products: any[],
  productId: number,
  channel: CatalogChannel
) {
  const product = (products || []).find(
    (item: any) => Number(item.id) === Number(productId)
  );

  return getActiveCatalogProduct(product, channel);
}

function effectiveMin(group: any) {
  if (group?.required && Number(group?.min || 0) === 0) return 1;
  return Math.max(0, Number(group?.min || 0));
}

function buildOptionContext(product: any) {
  const optionContextById = new Map<number, any>();

  for (const group of product?.modifierGroups || []) {
    for (const option of group?.template?.options || []) {
      optionContextById.set(Number(option.id), {
        groupId: Number(group.id),
        groupName: group.template.name,
        option,
      });
    }
  }

  return optionContextById;
}

function validateRequiredGroups(product: any, optionIds: number[]) {
  for (const group of product?.modifierGroups || []) {
    const min = effectiveMin(group);
    const max = Math.max(0, Number(group?.max || 0));

    const selectedCount = optionIds.filter((optionId) =>
      (group?.template?.options || []).some(
        (option: any) => Number(option.id) === Number(optionId)
      )
    ).length;

    if (selectedCount < min) return false;
    if (max > 0 && selectedCount > max) return false;
  }

  return true;
}

export function sanitizeOnlineCartWithCatalog(
  cart: any[],
  products: any[],
  channel: CatalogChannel
) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { cart, changed: false, message: "" };
  }

  if (!Array.isArray(products) || products.length === 0) {
    return { cart, changed: false, message: "" };
  }

  let changed = false;

  const nextCart = cart.flatMap((item: any) => {
    const product = findCatalogProductForChannel(
      products,
      Number(item.productId),
      channel
    );

    if (!product) {
      changed = true;
      return [];
    }

    const optionContextById = buildOptionContext(product);
    const originalIds = Array.isArray(item.modifierOptionIds)
      ? item.modifierOptionIds.map((id: unknown) => Number(id)).filter(Boolean)
      : [];

    const validIds = originalIds.filter((id: number) =>
      optionContextById.has(id)
    );

    if (validIds.length !== originalIds.length) {
      changed = true;
    }

    if (!validateRequiredGroups(product, validIds)) {
      changed = true;
      return [];
    }

    const modifiersText = validIds.map((id: number) => {
      const context = optionContextById.get(id);
      return `${context.groupName}: ${context.option.name}`;
    });

    const modifiersTotal = validIds.reduce((sum: number, id: number) => {
      const context = optionContextById.get(id);
      return sum + Number(context?.option?.price || 0);
    }, 0);

    const nextTotal = Number(product.price || 0) + modifiersTotal;

    if (
      item.productName !== product.name ||
      Number(item.total || 0) !== nextTotal ||
      JSON.stringify(item.modifierOptionIds || []) !== JSON.stringify(validIds)
    ) {
      changed = true;
    }

    return [
      {
        ...item,
        productName: product.name,
        total: nextTotal,
        modifierOptionIds: validIds,
        modifiersText,
      },
    ];
  });

  return {
    cart: nextCart,
    changed,
    message: changed
      ? "Actualizamos el catalogo: quitamos productos u opciones que ya no estan disponibles."
      : "",
  };
}

export function sanitizeTotemCartWithCatalog(cart: any[], products: any[]) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { cart, changed: false, message: "" };
  }

  if (!Array.isArray(products) || products.length === 0) {
    return { cart, changed: false, message: "" };
  }

  let changed = false;

  const nextCart = cart.flatMap((item: any) => {
    const product = findCatalogProductForChannel(
      products,
      Number(item.productId),
      "totem"
    );

    if (!product) {
      changed = true;
      return [];
    }

    const optionContextById = buildOptionContext(product);
    const originalIds = (item.modifiers || []).flatMap((group: any) =>
      (group.options || [])
        .map((option: any) => Number(option.id))
        .filter(Boolean)
    );

    const validIds = originalIds.filter((id: number) =>
      optionContextById.has(id)
    );

    if (validIds.length !== originalIds.length) {
      changed = true;
    }

    if (!validateRequiredGroups(product, validIds)) {
      changed = true;
      return [];
    }

    const grouped = new Map<string, any[]>();

    for (const id of validIds) {
      const context = optionContextById.get(id);
      if (!context) continue;

      if (!grouped.has(context.groupName)) {
        grouped.set(context.groupName, []);
      }

      grouped.get(context.groupName)!.push({
        id: context.option.id,
        name: context.option.name,
        price: context.option.price,
      });
    }

    const modifiers = Array.from(grouped.entries()).map(
      ([groupName, options]) => ({
        groupName,
        options,
      })
    );

    const modifiersTotal = validIds.reduce((sum: number, id: number) => {
      const context = optionContextById.get(id);
      return sum + Number(context?.option?.price || 0);
    }, 0);

    const nextTotal = Number(product.price || 0) + modifiersTotal;

    if (
      item.name !== product.name ||
      Number(item.basePrice || 0) !== Number(product.price || 0) ||
      Number(item.total || 0) !== nextTotal ||
      JSON.stringify(item.modifiers || []) !== JSON.stringify(modifiers)
    ) {
      changed = true;
    }

    return [
      {
        ...item,
        name: product.name,
        basePrice: Number(product.price || 0),
        total: nextTotal,
        modifiers,
      },
    ];
  });

  return {
    cart: nextCart,
    changed,
    message: changed
      ? "Actualizamos el catalogo: quitamos productos u opciones que ya no estan disponibles."
      : "",
  };
}

export function sanitizeSelectedOptionsByGroup(
  product: any,
  selectedOptionsByGroup: Record<number, number[]>,
  channel: CatalogChannel
) {
  const activeProduct = getActiveCatalogProduct(product, channel);

  if (!activeProduct) {
    return {
      activeProduct: null,
      optionsByGroup: {},
      changed: true,
      message: "Este producto ya no esta disponible.",
    };
  }

  const allowedByGroup = new Map<number, Set<number>>();

  for (const group of activeProduct.modifierGroups || []) {
    allowedByGroup.set(
      Number(group.id),
      new Set(
        (group.template.options || []).map((option: any) => Number(option.id))
      )
    );
  }

  let changed = false;
  const next: Record<number, number[]> = {};

  for (const [groupIdText, ids] of Object.entries(
    selectedOptionsByGroup || {}
  )) {
    const groupId = Number(groupIdText);
    const allowed = allowedByGroup.get(groupId);

    if (!allowed) {
      changed = true;
      continue;
    }

    const validIds = (ids || [])
      .map((id) => Number(id))
      .filter((id) => allowed.has(id));

    if (validIds.length !== ids.length) {
      changed = true;
    }

    if (validIds.length > 0) {
      next[groupId] = validIds;
    }
  }

  return {
    activeProduct,
    optionsByGroup: next,
    changed,
    message: changed
      ? "Actualizamos las opciones de este producto porque el catalogo cambio."
      : "",
  };
}
