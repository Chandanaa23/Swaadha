import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,                 // NOT NEXT_PUBLIC
      process.env.SUPABASE_SERVICE_ROLE_KEY!     // NEVER PUBLIC
    );

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("Supabase Admin Error:", error);
      return NextResponse.json({ users: [] }, { status: 500 });
    }

    return NextResponse.json({ users: data.users }, { status: 200 });
  } catch (err) {
    console.error("Unexpected Error:", err);
    return NextResponse.json({ users: [] }, { status: 500 });
  }
}
