import { createClient } from "@/lib/supabase/server";
import { ShieldAlert } from "lucide-react";
import StagesList from "./_components/StagesList";

export default async function StagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  // ── Access control ─────────────────────────────────────────────────────────
  if (profile?.role !== "admin") {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 mb-4">
          <ShieldAlert className="h-7 w-7 text-orange-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Acceso restringido</h1>
        <p className="mt-2 text-sm text-gray-500">
          Solo los administradores pueden gestionar la configuración de etapas.
        </p>
      </div>
    );
  }

  // ── Fetch stages ───────────────────────────────────────────────────────────
  const { data: stages } = await supabase
    .from("stages_config")
    .select("id, name, color, order_index, is_active")
    .eq("company_id", profile.company_id)
    .order("order_index");

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Etapas de producción
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Definí y ordená las etapas del proceso productivo de tu empresa.
          Arrastrá para reordenar.
        </p>
      </div>

      <StagesList
        initialStages={
          (stages ?? []) as {
            id: string;
            name: string;
            color: string;
            order_index: number;
            is_active: boolean;
          }[]
        }
      />
    </div>
  );
}
