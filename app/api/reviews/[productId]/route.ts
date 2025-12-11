import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use SERVICE ROLE (correct)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const productId = params.productId;

  // Fetch all reviews for this product
  const { data: reviewData, error: reviewError } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("product_id", productId);

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  if (!reviewData || reviewData.length === 0) {
    return NextResponse.json([]);
  }

  // Get all unique user IDs
  const userIds = reviewData.map(r => r.user_id);

  // Fetch user info from auth.admin
  const { data: userInfo } = await supabase.auth.admin.listUsers();

  const userMap = new Map();
  userInfo.users.forEach(u => {
    userMap.set(u.id, {
      name: u.user_metadata?.name || "Customer"
    });
  });

  // Attach user info
  const final = reviewData.map(r => ({
    ...r,
    auth_users: userMap.get(r.user_id) || { name: "Customer" }
  }));

  return NextResponse.json(final);
}
