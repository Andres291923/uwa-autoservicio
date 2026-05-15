import { NextRequest, NextResponse } from "next/server";

const PAGE_PERMISSIONS: { prefix: string; permissions: string[] }[] = [
  { prefix: "/admin/forbidden", permissions: [] },
  { prefix: "/admin/products", permissions: ["products"] },
  { prefix: "/admin/settings", permissions: ["settings"] },
  { prefix: "/admin/reports", permissions: ["reports"] },
  { prefix: "/admin/customers", permissions: ["customers"] },
  { prefix: "/admin/inventory", permissions: ["inventory"] },
  { prefix: "/admin", permissions: ["dashboard"] },
  { prefix: "/cocina", permissions: ["kitchen"] },
];

const API_PERMISSIONS: { prefix: string; permissions: string[]; allowPublicGet?: boolean; allowPublicPost?: boolean }[] = [
  { prefix: "/api/admin-users", permissions: ["settings"] },
  { prefix: "/api/reports", permissions: ["reports"] },
  { prefix: "/api/customers", permissions: ["customers"] },
  { prefix: "/api/wallet-transactions", permissions: ["customers"] },
  { prefix: "/api/cashback-rules", permissions: ["customers"] },

  { prefix: "/api/orders", permissions: ["kitchen", "reports"], allowPublicPost: true },

  { prefix: "/api/products", permissions: ["products"], allowPublicGet: true },
  { prefix: "/api/categories", permissions: ["products"], allowPublicGet: true },
  { prefix: "/api/product-modifiers", permissions: ["products"], allowPublicGet: true },
  { prefix: "/api/modifier-templates", permissions: ["products"], allowPublicGet: true },
  { prefix: "/api/modifier-options", permissions: ["products"], allowPublicGet: true },

  { prefix: "/api/settings", permissions: ["settings"], allowPublicGet: true },
  { prefix: "/api/coupons", permissions: ["settings"], allowPublicGet: false },
];

function getPermissions(request: NextRequest) {
  const raw = request.cookies.get("admin_permissions")?.value || "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLogged(request: NextRequest) {
  return Boolean(request.cookies.get("admin_session")?.value);
}

function isOwner(request: NextRequest) {
  return request.cookies.get("admin_is_owner")?.value === "1";
}

function hasAnyPermission(request: NextRequest, permissions: string[]) {
  if (permissions.length === 0) return true;
  if (isOwner(request)) return true;

  const userPermissions = getPermissions(request);
  return permissions.some((permission) => userPermissions.includes(permission));
}

function findPageRule(pathname: string) {
  return PAGE_PERMISSIONS.find((rule) => pathname.startsWith(rule.prefix));
}

function findApiRule(pathname: string) {
  return API_PERMISSIONS.find((rule) => pathname.startsWith(rule.prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const apiRule = findApiRule(pathname);

  if (apiRule) {
    if (apiRule.allowPublicGet && request.method === "GET") {
      return NextResponse.next();
    }

    if (apiRule.allowPublicPost && request.method === "POST") {
      return NextResponse.next();
    }

    if (!isLogged(request)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    if (!hasAnyPermission(request, apiRule.permissions)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    return NextResponse.next();
  }

  const pageRule = findPageRule(pathname);

  if (!pageRule) {
    return NextResponse.next();
  }

  if (!isLogged(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!hasAnyPermission(request, pageRule.permissions)) {
    const forbiddenUrl = new URL("/admin/forbidden", request.url);
    return NextResponse.redirect(forbiddenUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/cocina/:path*",
    "/api/admin-users/:path*",
    "/api/reports/:path*",
    "/api/customers/:path*",
    "/api/wallet-transactions/:path*",
    "/api/cashback-rules/:path*",
    "/api/orders/:path*",
    "/api/products/:path*",
    "/api/categories/:path*",
    "/api/product-modifiers/:path*",
    "/api/modifier-templates/:path*",
    "/api/modifier-options/:path*",
    "/api/settings/:path*",
    "/api/coupons/:path*"
  ],
};
