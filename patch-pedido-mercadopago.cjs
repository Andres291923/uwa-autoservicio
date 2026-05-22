const fs = require("fs");

const path = "app/pedido/page.tsx";
let text = fs.readFileSync(path, "utf8");

const replacement = `  async function createOnlineOrder() {
    try {
      setLoadingOrder(true);
      setMessage("");

      if (cart.length === 0) {
        setMessage("Agrega productos al pedido.");
        return;
      }

      const finalCustomerName = loggedCustomer?.name || guestName.trim();

      if (!finalCustomerName) {
        setMessage("Ingresa tu nombre o entra con tu cuenta.");
        return;
      }

      let scheduledForValue: string | null = null;

      if (fulfillmentType === "scheduled") {
        if (!scheduledDate || !scheduledTime) {
          setMessage("Selecciona fecha y hora para programar el pedido.");
          return;
        }

        if (!selectedDaySchedule) {
          setMessage("La tienda está cerrada ese día. Elige otra fecha.");
          return;
        }

        if (!availableTimeSlots.includes(scheduledTime)) {
          setMessage("Selecciona una hora disponible.");
          return;
        }

        scheduledForValue = \`\${scheduledDate}T\${scheduledTime}:00\`;
      }

      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flow: "personal_order",
          customerId: loggedCustomer?.id || null,
          customerName: finalCustomerName,
          customerEmail: loggedCustomer?.email || authEmail.trim() || null,
          discountCouponCode: appliedCoupon?.code || null,
          walletAmountUsed: walletAmountToUse,
          orderSource: "online",
          fulfillmentType,
          scheduledFor: scheduledForValue
            ? new Date(scheduledForValue).toISOString()
            : null,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: 1,
            modifierOptionIds: item.modifierOptionIds,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo iniciar el pago con Mercado Pago.");
        return;
      }

      const paymentUrl = data.sandboxInitPoint || data.initPoint;

      if (!paymentUrl) {
        setMessage("Mercado Pago no devolvió URL de pago.");
        return;
      }

      setMessage("Redirigiendo a Mercado Pago...");
      window.location.href = paymentUrl;
    } catch (error) {
      console.error(error);
      setMessage("Error al iniciar pago con Mercado Pago.");
    } finally {
      setLoadingOrder(false);
    }
  }
`;

text = text.replace(
  /  async function createOnlineOrder\(\) \{[\s\S]*?\n  return \(/,
  replacement + "\n\n  return ("
);

fs.writeFileSync(path, text, "utf8");

console.log("Listo: /pedido ahora redirige a Mercado Pago.");
