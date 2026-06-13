import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("owner_id", user?.id)
    .maybeSingle();

  const companyName = company?.name ?? user?.email ?? "tu empresa";

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Bienvenido a Prodify
      </h1>
      <p className="mt-2 text-muted-foreground text-lg">{companyName}</p>
      <div className="mt-8 rounded-lg border border-border bg-muted/50 p-6">
        <p className="text-sm text-muted-foreground">
          Tu sesión está activa. Desde aquí vas a gestionar la producción de tu
          empresa.
        </p>
      </div>
    </div>
  );
}
