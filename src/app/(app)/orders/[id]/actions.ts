"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const VALID_STATUSES = ["pending", "in_progress", "done", "na"];

export async function updateStage(
  stageId: string,
  orderId: string,
  payload: {
    status: string;
    responsible_id: string | null;
    start_date: string | null;
    end_date: string | null;
    notes: string | null;
  }
): Promise<{ error?: string }> {
  if (!VALID_STATUSES.includes(payload.status)) return { error: "Estado inválido" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("wo_stages")
    .update({
      status: payload.status,
      responsible_id: payload.responsible_id || null,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      notes: payload.notes || null,
    })
    .eq("id", stageId);

  if (error) return { error: error.message };

  revalidatePath(`/orders/${orderId}`);
  return {};
}
