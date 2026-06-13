import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, companies(name)")
    .eq("id", user.id)
    .maybeSingle();

  const companies = profile?.companies as unknown as
    | { name: string }
    | { name: string }[]
    | null;
  const companyName =
    (Array.isArray(companies) ? companies[0]?.name : companies?.name) ??
    user.email ??
    "Mi empresa";

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[#0F172A] border-r border-white/[0.08]">
        <div className="px-5 py-5 border-b border-white/[0.08]">
          <Image
            src="/logo.png"
            alt="Prodify"
            width={100}
            height={32}
            className="object-contain"
            priority
          />
        </div>

        <div className="px-5 py-4 border-b border-white/[0.08]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
            Empresa
          </p>
          <p className="mt-1 text-sm font-semibold text-white truncate">
            {companyName}
          </p>
        </div>

        <SidebarNav />

        <div className="px-3 py-4 border-t border-white/[0.08]">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-[#F8FAFC] p-8">{children}</main>
    </div>
  );
}
