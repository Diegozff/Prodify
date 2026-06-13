"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function register(
  _prevState: { error?: string } | null,
  formData: FormData
) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const full_name = formData.get("full_name") as string;
  const company_name = formData.get("company_name") as string;
  const industry = formData.get("industry") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: data.user.id,
        company_name,
        industry,
        full_name,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.error ?? "Error al configurar la empresa." };
    }
  }

  redirect("/dashboard");
}
