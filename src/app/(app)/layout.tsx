import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-background px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard">
          <Image
            src="/logo.png"
            alt="Prodify"
            width={100}
            height={32}
            className="object-contain"
            priority
          />
        </Link>
        <span className="text-sm text-muted-foreground">{user.email}</span>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
