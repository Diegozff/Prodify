"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Stage = {
  id: string;
  name: string;
  color: string;
  order_index: number;
  is_active: boolean;
};

async function getAdminProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin")
    return { error: "Solo administradores pueden modificar etapas" as const, supabase, user, profile: null };
  if (!profile?.company_id)
    return { error: "Sin empresa asignada" as const, supabase, user, profile: null };

  return { error: null, supabase, user, profile };
}

export async function saveStage(payload: {
  id?: string;
  name: string;
  color: string;
}): Promise<{ error?: string; stage?: Stage }> {
  const { error, supabase, profile } = await getAdminProfile();
  if (error) return { error };

  if (payload.id) {
    const { error: err } = await supabase!
      .from("stages_config")
      .update({ name: payload.name, color: payload.color })
      .eq("id", payload.id);
    if (err) return { error: err.message };
    revalidatePath("/settings/stages");
    return {};
  }

  // New stage — get next order_index
  const { data: maxRow } = await supabase!
    .from("stages_config")
    .select("order_index")
    .eq("company_id", profile!.company_id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextIndex = (maxRow?.order_index ?? 0) + 1;

  const { data, error: insErr } = await supabase!
    .from("stages_config")
    .insert({
      company_id: profile!.company_id,
      name: payload.name,
      color: payload.color,
      order_index: nextIndex,
    })
    .select("id, name, color, order_index, is_active")
    .single();

  if (insErr) return { error: insErr.message };
  revalidatePath("/settings/stages");
  return { stage: data as Stage };
}

export async function toggleStageActive(
  stageId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const { error, supabase } = await getAdminProfile();
  if (error) return { error };

  const { error: err } = await supabase!
    .from("stages_config")
    .update({ is_active: isActive })
    .eq("id", stageId);

  if (err) return { error: err.message };
  revalidatePath("/settings/stages");
  return {};
}

export async function deleteStage(
  stageId: string
): Promise<{ error?: string }> {
  const { error, supabase } = await getAdminProfile();
  if (error) return { error };

  const { error: err } = await supabase!
    .from("stages_config")
    .delete()
    .eq("id", stageId);

  if (err) return { error: err.message };
  revalidatePath("/settings/stages");
  return {};
}

export async function updateStageOrder(
  stages: { id: string; order_index: number }[]
): Promise<{ error?: string }> {
  const { error, supabase } = await getAdminProfile();
  if (error) return { error };

  const results = await Promise.all(
    stages.map(({ id, order_index }) =>
      supabase!
        .from("stages_config")
        .update({ order_index })
        .eq("id", id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };
  return {};
}

export async function resetToTemplate(): Promise<{
  error?: string;
  stages?: Stage[];
}> {
  const { error, supabase, profile } = await getAdminProfile();
  if (error) return { error };

  // Get company industry
  const { data: company } = await supabase!
    .from("companies")
    .select("industry")
    .eq("id", profile!.company_id)
    .single();

  const industry = company?.industry ?? "otro";

  // Delete existing stages (wo_stages cascade on delete)
  const { error: delErr } = await supabase!
    .from("stages_config")
    .delete()
    .eq("company_id", profile!.company_id);

  if (delErr) return { error: delErr.message };

  // Fetch template for the industry
  const { data: templates } = await supabase!
    .from("stage_templates")
    .select("name, color, order_index")
    .eq("industry", industry)
    .order("order_index");

  if (!templates?.length) {
    return { error: `No hay plantilla para la industria "${industry}"` };
  }

  const { data: newStages, error: insErr } = await supabase!
    .from("stages_config")
    .insert(
      templates.map((t) => ({
        company_id: profile!.company_id,
        name: t.name,
        color: t.color,
        order_index: t.order_index,
      }))
    )
    .select("id, name, color, order_index, is_active");

  if (insErr) return { error: insErr.message };

  revalidatePath("/settings/stages");
  return { stages: (newStages ?? []) as Stage[] };
}
