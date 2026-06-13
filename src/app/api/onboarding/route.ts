import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { user_id, company_name, industry, full_name } = await request.json();

  if (!user_id || !company_name || !industry) {
    return NextResponse.json(
      { error: "Faltan campos requeridos." },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const slug = company_name.toLowerCase().replace(/\s+/g, "-");

  const { error } = await supabase.rpc("onboard_company", {
    p_user_id: user_id,
    p_name: company_name,
    p_slug: slug,
    p_industry: industry,
    p_full_name: full_name ?? "",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
