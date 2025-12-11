import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data.users });
}

export async function POST(req: NextRequest) {
  const { userId, block } = await req.json();
  if (!userId || typeof block !== "boolean") {
    return NextResponse.json({ error: "Missing userId or block status" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { is_blocked: block },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
