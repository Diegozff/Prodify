"use client";

import { useState } from "react";
import { Check, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type PlanKey = "free" | "pro" | "team";

const PLAN_ORDER: PlanKey[] = ["free", "pro", "team"];

// Replace with real Stripe Price IDs from your Stripe dashboard
const PRICE_IDS: Record<"pro" | "team", string> = {
  pro: "price_PRO_PLACEHOLDER",
  team: "price_TEAM_PLACEHOLDER",
};

type Plan = {
  key: PlanKey;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    key: "free",
    name: "Free",
    price: 0,
    description: "Para empezar a organizar tu producción",
    features: [
      "1 usuario",
      "Hasta 10 OTs activas",
      "Gestión básica de etapas",
      "Dashboard de KPIs",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 49,
    description: "Para equipos en crecimiento",
    features: [
      "Hasta 5 usuarios",
      "OTs ilimitadas",
      "Vista Gantt",
      "Exportación de datos",
      "Gestión de equipo",
    ],
    popular: true,
  },
  {
    key: "team",
    name: "Team",
    price: 99,
    description: "Para empresas con alta demanda",
    features: [
      "Hasta 15 usuarios",
      "Todo lo incluido en Pro",
      "Soporte prioritario",
      "Onboarding personalizado",
      "SLA garantizado",
    ],
  },
];

const PLAN_BADGE_CLS: Record<PlanKey, string> = {
  free: "bg-gray-50 text-gray-600 border-gray-200",
  pro: "bg-[#1B9AAA]/10 text-[#1B9AAA] border-[#1B9AAA]/20",
  team: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function BillingClient({
  currentPlan,
  companyId,
  planExpiresAt,
  success,
  cancelled,
}: {
  currentPlan: PlanKey;
  companyId: string;
  planExpiresAt: string | null;
  success: boolean;
  cancelled: boolean;
}) {
  const [showSuccess, setShowSuccess] = useState(success);
  const [showCancelled, setShowCancelled] = useState(cancelled);
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const currentPlanDef = PLANS.find((p) => p.key === currentPlan)!;

  async function handleUpgrade(plan: Plan) {
    if (plan.key === "free") return;
    setLoading(plan.key);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: PRICE_IDS[plan.key as "pro" | "team"],
          planName: plan.key,
          companyId,
          origin: window.location.origin,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Error al crear sesión");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar el checkout");
      setLoading(null);
    }
  }

  return (
    <div>
      {/* Success banner */}
      {showSuccess && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700 font-medium">
              ¡Pago exitoso! Tu plan ha sido actualizado.
            </p>
          </div>
          <button onClick={() => setShowSuccess(false)}>
            <X className="h-4 w-4 text-green-400 hover:text-green-600" />
          </button>
        </div>
      )}

      {/* Cancelled banner */}
      {showCancelled && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-700">
            El pago fue cancelado. Podés intentarlo de nuevo cuando quieras.
          </p>
          <button onClick={() => setShowCancelled(false)}>
            <X className="h-4 w-4 text-amber-400 hover:text-amber-600" />
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)}>
            <X className="h-4 w-4 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {/* Current plan summary */}
      <div className="mb-6 flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Plan actual
          </p>
          <p className="text-base font-semibold text-gray-900 mt-0.5">
            {currentPlanDef.name}
          </p>
          {planExpiresAt && currentPlan !== "free" && (
            <p className="text-xs text-gray-400 mt-0.5">
              Próxima renovación:{" "}
              {new Date(planExpiresAt).toLocaleDateString("es-AR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <span
          className={cn(
            "flex-shrink-0 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold border",
            PLAN_BADGE_CLS[currentPlan]
          )}
        >
          {currentPlanDef.name}
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const planIdx = PLAN_ORDER.indexOf(plan.key);
          const isCurrent = plan.key === currentPlan;
          const isUpgrade = planIdx > currentIdx;

          return (
            <div
              key={plan.key}
              className={cn(
                "relative flex flex-col bg-white rounded-xl border-2 p-6 transition-shadow",
                isCurrent
                  ? "border-[#1B9AAA] shadow-md shadow-[#1B9AAA]/10"
                  : plan.popular
                  ? "border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                  <span className="inline-flex items-center gap-1 bg-[#F97316] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    <Zap className="h-3 w-3" />
                    Más popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  {isCurrent && (
                    <span className="text-[11px] font-semibold text-[#1B9AAA] bg-[#1B9AAA]/10 px-2 py-0.5 rounded-full">
                      Actual
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-snug">
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-5">
                {plan.price === 0 ? (
                  <p className="text-3xl font-bold text-gray-900">Gratis</p>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-sm font-medium text-gray-400 mb-1.5">
                      USD
                    </span>
                    <span className="text-3xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-sm text-gray-400 mb-1.5">/mes</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-2.5 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-[#1B9AAA] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div className="h-10 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-sm font-medium text-gray-400">
                    Plan actual
                  </span>
                </div>
              ) : isUpgrade ? (
                <Button
                  onClick={() => handleUpgrade(plan)}
                  disabled={loading !== null}
                  className={cn(
                    "w-full font-semibold",
                    plan.popular
                      ? "bg-[#1B9AAA] hover:bg-[#156E79] text-white"
                      : "bg-gray-900 hover:bg-gray-700 text-white"
                  )}
                >
                  {loading === plan.key
                    ? "Redirigiendo..."
                    : `Upgrade a ${plan.name}`}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-center text-gray-400">
        Pagos procesados de forma segura por Stripe · Cancelá en cualquier
        momento · Precios en USD
      </p>
    </div>
  );
}
