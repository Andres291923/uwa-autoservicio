const fs = require("fs");

const file = "app/pedido-empresas/page.tsx";
let s = fs.readFileSync(file, "utf8");

// Quitar CSS viejo si quedó
s = s.replace(/\s*<style>\{`\s*\/\* EMPRESAS_HIDE_COUPON \*\/[\s\S]*?`\}<\/style>/, "");

// Buscar bloque cupón
const terms = ["Cupón de descuento", "CUPÓN DE DESCUENTO", "Ej: UWA10"];
let idx = -1;

for (const term of terms) {
  idx = s.indexOf(term);
  if (idx !== -1) break;
}

if (idx === -1) {
  console.log("No encontré el bloque de cupón.");
  fs.writeFileSync(file, s, "utf8");
  process.exit(0);
}

// Buscar el div contenedor anterior
const start = s.lastIndexOf("<div", idx);

if (start === -1) {
  console.log("No encontré inicio del div del cupón.");
  fs.writeFileSync(file, s, "utf8");
  process.exit(0);
}

// Encontrar cierre correcto del div
const re = /<div\b|<\/div>/g;
re.lastIndex = start;

let depth = 0;
let end = -1;
let match;

while ((match = re.exec(s)) !== null) {
  if (match[0].startsWith("<div")) depth++;
  else depth--;

  if (depth === 0) {
    end = re.lastIndex;
    break;
  }
}

if (end === -1) {
  console.log("No encontré cierre del div del cupón.");
  fs.writeFileSync(file, s, "utf8");
  process.exit(0);
}

s = s.slice(0, start) + s.slice(end);

// Asegurar que empresas no mande cupón ni descuente cupón
s = s.replace(
  /const subtotalAfterDiscount = Math\.max\(0, cartTotal - couponDiscountAmount\);/,
  "const subtotalAfterDiscount = cartTotal;"
);

s = s.replace(
  /discountCouponCode: appliedCoupon\?\.code \|\| null,/,
  "discountCouponCode: null,"
);

fs.writeFileSync(file, s, "utf8");

console.log("Cupón eliminado de pedido empresas correctamente.");
