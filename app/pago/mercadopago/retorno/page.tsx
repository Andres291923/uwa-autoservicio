import { Suspense } from "react";
import MercadoPagoReturnClient from "./retorno-client";

export const dynamic = "force-dynamic";

export default function MercadoPagoReturnPage() {
  return (
    <Suspense fallback={<main className="p-8 font-black">Cargando retorno...</main>}>
      <MercadoPagoReturnClient />
    </Suspense>
  );
}