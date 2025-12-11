// pages/api/users.ts
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("Supabase admin error:", error);
      return res.status(500).json({ users: [] });
    }

    // Ensure users is always an array
    const users = data?.users || [];
    return res.status(200).json({ users });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ users: [] });
  }
}
