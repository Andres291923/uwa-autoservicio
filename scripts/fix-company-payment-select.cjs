const fs = require("fs");

const file = "app/pedido-empresas/page.tsx";
let s = fs.readFileSync(file, "utf8");

// Asegurar tipo de estado
s = s.replace(
  /"debit_credit" \| "food_benefit"/g,
  `"debit_credit" | "food_benefit" | "bank_transfer"`
);

s = s.replace(
  /"debit_credit" \| "bank_transfer" \| "bank_transfer"/g,
  `"debit_credit" | "bank_transfer"`
);

// Buscar el select que controla paymentMethod
const selectRegex = /<select\b[\s\S]*?value=\{paymentMethod\}[\s\S]*?<\/select>/;
const newSelect = `<select
                    suppressHydrationWarning
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target.value as "debit_credit" | "bank_transfer"
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black outline-none focus:border-[#10B557]"
                  >
                    <option value="debit_credit">Tarjeta</option>
                    <option value="bank_transfer">Transferencia</option>
                  </select>`;

if (!selectRegex.test(s)) {
  console.log("No encontré el select de paymentMethod.");
} else {
  s = s.replace(selectRegex, newSelect);
  console.log("Selector de medio de pago reemplazado.");
}

fs.writeFileSync(file, s, "utf8");
