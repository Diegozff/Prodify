"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type State = { error?: string; success?: boolean } | null;

export async function createOrder(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) return { error: "Sin empresa asignada" };

  const clientName = (formData.get("client_name") as string)?.trim();
  if (!clientName) return { error: "El cliente es requerido" };

  const { data: orderNumber, error: numError } = await supabase.rpc(
    "generate_order_number",
    { p_company_id: profile.company_id }
  );

  if (numError) return { error: numError.message };

  const { error } = await supabase.from("work_orders").insert({
    company_id: profile.company_id,
    number: orderNumber as string,
    client_name: clientName,
    description: (formData.get("description") as string) || null,
    priority: (formData.get("priority") as string) || "Normal",
    purchase_order: (formData.get("purchase_order") as string) || null,
    due_date: (formData.get("due_date") as string) || null,
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
    entry_date: new Date().toISOString().split("T")[0],
  });

  if (error) return { error: error.message };

  revalidatePath("/orders");
  return { success: true };
}
