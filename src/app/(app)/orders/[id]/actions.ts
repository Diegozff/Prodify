"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const VALID_STATUSES = ["pending", "in_progress", "done", "na"];

export async function updateStageStatus(
  stageId: string,
  status: string,
  orderId: string
): Promise<{ error?: string }> {
  if (!VALID_STATUSES.includes(status)) return { error: "Estado inválido" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("wo_stages")
    .update({ status })
    .eq("id", stageId);

  if (error) return { error: error.message };

  revalidatePath(`/orders/${orderId}`);
  return {};
}
