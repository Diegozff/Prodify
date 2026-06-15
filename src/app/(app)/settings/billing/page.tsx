import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BillingClient from "./_components/BillingClient";

type PlanKey = "free" | "pro" | "team";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: company } = await supabase
    .from("companies")
    .select("plan, plan_expires_at")
    .eq("id", profile.company_id)
    .maybeSingle();

  const params = await searchParams;
  const currentPlan = ((company?.plan as PlanKey) ?? "free");

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestioná el plan y suscripción de tu empresa.
        </p>
      </div>
      <BillingClient
        currentPlan={currentPlan}
        companyId={profile.company_id ?? ""}
        planExpiresAt={company?.plan_expires_at ?? null}
        success={!!params.success}
        cancelled={!!params.cancelled}
      />
    </div>
  );
}
