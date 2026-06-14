import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TeamClient, { type Member, type Invitation } from "./_components/TeamClient";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (currentProfile?.role !== "admin") redirect("/dashboard");

  const companyId = currentProfile.company_id;

  // Always OR in the current user so they appear even when RLS restricts
  // cross-profile reads.  If companyId is available, also pull all company
  // members — works when the RLS policy allows company_id = my_company_id().
  const memberFilter = companyId
    ? `company_id.eq.${companyId},id.eq.${user!.id}`
    : `id.eq.${user!.id}`;

  const [{ data: members }, { data: rawInvitations }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, is_active")
      .or(memberFilter)
      .order("full_name"),
    supabase
      .from("invitations")
      .select("id, email, role, invited_by, expires_at")
      .eq("company_id", companyId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  // Resolve invited_by names from profiles already fetched
  const profilesMap = Object.fromEntries(
    (members ?? []).map((p) => [p.id, p.full_name ?? p.email ?? "—"])
  );

  const invitations: Invitation[] = (rawInvitations ?? []).map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    invited_by: inv.invited_by,
    invited_by_name: profilesMap[inv.invited_by] ?? "—",
    expires_at: inv.expires_at,
  }));

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Equipo</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administrá los usuarios y permisos de tu empresa.
        </p>
      </div>
      <TeamClient
        members={(members ?? []) as unknown as Member[]}
        invitations={invitations}
        currentUserId={user!.id}
      />
    </div>
  );
}
