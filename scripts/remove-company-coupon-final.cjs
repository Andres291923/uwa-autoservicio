const fs = require("fs");

const file = "app/pedido-empresas/page.tsx";
let s = fs.readFileSync(file, "utf8");

const marker = '<section className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">';
const start = s.indexOf(marker);

if (start === -1) {
  console.log("No encontré la sección del cupón.");
} else {
  const endTag = "</section>";
  const end = s.indexOf(endTag, start);

  if (end === -1) {
    console.log("Encontré inicio, pero no cierre del cupón.");
  } else {
    s = s.slice(0, start) + s.slice(end + endTag.length);
    console.log("Bloque visual de cupón eliminado.");
  }
}

// Blindaje: en empresas el descuento por cupón siempre es 0
s = s.replace(
  /const couponDiscountAmount = appliedCoupon[\s\S]*?: 0;/,
  "const couponDiscountAmount = 0;"
);

// Blindaje: empresa nunca manda cupón al pedido
s = s.replace(
  /discountCouponCode: appliedCoupon\?\.code \|\| null,/,
  "discountCouponCode: null,"
);

fs.writeFileSync(file, s, "utf8");
