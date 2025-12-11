// /app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase";


// POST: Create a new order
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { cart, shippingDetails, paymentMethod, totals, orderDate, userId } = data;

    // 1️⃣ Fetch user email if userId is provided
    let userEmail = "";
    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from("auth.users") // requires service role
        .select("email")
        .eq("id", userId)
        .single();

      if (!userError && userData) userEmail = userData.email;
    }

    // 2️⃣ Insert order
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert([{
        user_id: userId || null,
        full_name: shippingDetails.fullName,
        phone_number: shippingDetails.phoneNumber,
        alt_phone_number: shippingDetails.altPhoneNumber,
        house_number: shippingDetails.houseNumber,
        street: shippingDetails.street,
        city: shippingDetails.city,
        state: shippingDetails.state,
        pincode: shippingDetails.pincode,
        payment_method: paymentMethod,
        total_price: totals.totalPrice,
        shipping_cost: totals.shippingCost,
        tax_amount: totals.taxAmount,
        grand_total: totals.grandTotal,
        order_date: orderDate,
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    const orderId = orderData.id;

    // 3️⃣ Insert all order items at once
    const orderItems = cart.map(item => ({
      order_id: orderId,
      product_id: item.productId,
      product_name: item.name,
      variation_id: item.variationId,
      variation_name: item.variationName,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) throw itemsError;

    // 4️⃣ Return order with email and items
    return NextResponse.json({
      message: "Order placed successfully",
      order: {
        ...orderData,
        email: userEmail,
        items: orderItems,
      },
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Error placing order" },
      { status: 500 }
    );
  }
}

// GET: Fetch a single order by ID
export async function GET(req: NextRequest) {
  try {
    const urlParts = req.url.split("/");
    const orderId = Number(urlParts[urlParts.length - 1]);
    if (!orderId) return NextResponse.json({ error: "Order ID missing" }, { status: 400 });

    // Fetch order
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !orderData)
      return NextResponse.json({ error: orderError?.message || "Order not found" }, { status: 404 });

    // Fetch email if user_id exists
    let email = "";
    if (orderData.user_id) {
  const { data: userData, error: userError } = await supabase
    .from("auth.users")
    .select("email")
    .eq("id", orderData.user_id)
    .single();

  if (!userError && userData) {
    email = userData.email;
  }
}


    // Fetch order items
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderData.id);

    return NextResponse.json({ order: { ...orderData, email, items } });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
