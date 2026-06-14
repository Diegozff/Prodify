"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { error: "No autenticado" as const, supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin")
    return {
      error: "Solo administradores pueden realizar esta acción" as const,
      supabase,
      user,
      profile: null,
    };
  if (!profile?.company_id)
    return { error: "Sin empresa asignada" as const, supabase, user, profile: null };

  return { error: null, supabase, user, profile };
}

export async function changeRole(
  userId: string,
  newRole: string
): Promise<{ error?: string }> {
  const { error, supabase, profile } = await getAdminProfile();
  if (error) return { error };

  const { error: err } = await supabase!
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId)
    .eq("company_id", profile!.company_id);

  if (err) return { error: err.message };
  revalidatePath("/settings/team");
  return {};
}

export async function setUserActive(
  userId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const { error, supabase, profile } = await getAdminProfile();
  if (error) return { error };

  const { error: err } = await supabase!
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId)
    .eq("company_id", profile!.company_id);

  if (err) return { error: err.message };
  revalidatePath("/settings/team");
  return {};
}

export async function inviteUser(payload: {
  email: string;
  role: string;
}): Promise<{ error?: string }> {
  const { error, supabase, user, profile } = await getAdminProfile();
  if (error) return { error };

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: err } = await supabase!.from("invitations").insert({
    company_id: profile!.company_id,
    email: payload.email.toLowerCase().trim(),
    role: payload.role,
    token,
    invited_by: user!.id,
    expires_at: expiresAt.toISOString(),
  });

  if (err) return { error: err.message };
  revalidatePath("/settings/team");
  return {};
}

export async function cancelInvitation(
  invitationId: string
): Promise<{ error?: string }> {
  const { error, supabase, profile } = await getAdminProfile();
  if (error) return { error };

  const { error: err } = await supabase!
    .from("invitations")
    .delete()
    .eq("id", invitationId)
    .eq("company_id", profile!.company_id);

  if (err) return { error: err.message };
  revalidatePath("/settings/team");
  return {};
}
