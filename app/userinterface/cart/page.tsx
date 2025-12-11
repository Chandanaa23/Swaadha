"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { TrashIcon } from "@heroicons/react/24/solid"; // solid version

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CartItem {
  id?: string;
  productId: number;
  name: string;
  variationId: number | null;
  variationName: string | null;
  price: number;
  quantity: number;
  image: string;
  shippingCharge: number;
  stock: number;   // ← IMPORTANT
  user_id?: string;
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data.session?.user?.id || null);
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchCart = async () => {
  if (!userId) {
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(savedCart);
    return;
  }

  const { data, error } = await supabase
  .from("cart")
  .select(`
    id,
    product_id,
    variation_id,
    quantity,
    user_id,
    products (
      id,
      name,
       active,
      shipping_charge,
      product_images (
        image_url
      )
    ),
    product_variations (
      id,
      price,
      unit_type,
      stock
    )
  `)
  .eq("user_id", userId);



  if (error) {
    console.error("Cart fetch error:", error);
    return;
  }

  if (data) {
  const formattedCart = data .filter((item: any) => item.products?.active) // ✅ only active products
  .map((item: any) => ({
    
    id: item.id,
    productId: item.product_id,
    variationId: item.variation_id,
    variationName: item.product_variations?.unit_type || null,
    quantity: item.quantity,
    name: item.products?.name || "Unnamed Product",
    stock: item.product_variations?.stock ?? 0,
    price: item.product_variations?.price || 0,
    shippingCharge: item.products?.shipping_charge || 0,
    image: item.products?.product_images?.[0]?.image_url || "/placeholder.png",
    user_id: item.user_id,
  }));
  setCart(formattedCart);
}

};

  useEffect(() => {
    fetchCart();
    const handleCartUpdate = () => fetchCart();
    window.addEventListener("cartUpdated", handleCartUpdate);
    window.addEventListener("storage", handleCartUpdate);
    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
      window.removeEventListener("storage", handleCartUpdate);
    };
  }, [userId]);

  const updateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) return;

    if (!userId) {
      const updatedCart = cart.map((c) =>
        c.productId === item.productId && c.variationId === item.variationId
          ? { ...c, quantity: newQuantity }
          : c
      );
      setCart(updatedCart);
      localStorage.setItem("cart", JSON.stringify(updatedCart));
      window.dispatchEvent(new Event("cartUpdated"));
      return;
    }

    await supabase.from("cart").update({ quantity: newQuantity }).eq("id", item.id);
    fetchCart();
  };

  const removeFromCart = async (item: CartItem) => {
    if (!userId) {
      const updatedCart = cart.filter(
        (c) => !(c.productId === item.productId && c.variationId === item.variationId)
      );
      setCart(updatedCart);
      localStorage.setItem("cart", JSON.stringify(updatedCart));
      window.dispatchEvent(new Event("cartUpdated"));
      return;
    }

    await supabase.from("cart").delete().eq("id", item.id);
    fetchCart();
  };

  const clearCart = async () => {
    if (!userId) {
      setCart([]);
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartUpdated"));
      return;
    }
    await supabase.from("cart").delete().eq("user_id", userId);
    fetchCart();
  };

  // ------------------------------------------------------------
  // ⭐ Remove out-of-stock items from totals
  // ------------------------------------------------------------

// Only include products that are in stock and active
const availableItems = cart.filter(item => item.stock !== 0);

  const totalPrice = availableItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Shipping cost applied once per product, free shipping items = 0
const shippingCost = availableItems.reduce((sum, item) => {
  const isFreeShipping = item.price * item.quantity >= 500; // threshold
  return sum + (isFreeShipping ? 0 : item.shippingCharge);
}, 0);



  const grandTotal = totalPrice + shippingCost;

  const freeShippingThreshold = 500;
  const remainingForFreeShipping =
    totalPrice < freeShippingThreshold ? freeShippingThreshold - totalPrice : 0;

  if (cart.length === 0)
    return (
      <p className="text-center mt-12 text-lg text-gray-600">
        Your cart is empty.
      </p>
    );

  return (
    <div className="min-h-screen bg-white px-6 lg:px-20 py-12">
      <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 px-6 py-4 rounded-md mb-8 shadow">
        Shopping Cart
      </h1>

      {/* Updated count excludes out-of-stock */}
      <p className="text-gray-700 mb-6">
        {availableItems.length} item{availableItems.length > 1 ? "s" : ""} in your cart
      </p>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-orange-900">Cart Items</h2>
            <button
              onClick={clearCart}
              className="text-red-600 hover:text-red-800 flex items-center gap-1 font-semibold"
            >
              Clear Cart
            </button>
          </div>

         <div className="space-y-6">
  {availableItems.map((item) => {
    const isFreeShipping = item.price * item.quantity >= 500;

    return (
      <div
        key={`${item.productId}-${item.variationId}`}
        className="relative flex items-center gap-4 border border-gray-200 rounded-lg p-4"
      >
        {/* Image */}
        <Link
          href={`/userinterface/product/${item.productId}`}
          className="flex-shrink-0"
        >
          <Image
            src={item.image}
            alt={item.name}
            width={80}
            height={80}
            className="rounded object-cover cursor-pointer"
          />
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/product/${item.productId}`}
              className="flex items-center gap-2"
            >
              <h3 className="text-orange-900 font-semibold truncate cursor-pointer">
                {item.name}
              </h3>
              {isFreeShipping && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Free Shipping
                </span>
              )}
            </Link>
          </div>

          <p className="text-orange-700 font-bold mt-1 text-md">
            ₹{item.price}
          </p>

          {item.variationName && (
            <p className="text-gray-600 text-sm">Unit: {item.variationName}</p>
          )}

          {/* Qty controls */}
          <div className="flex items-center gap-2 mt-2">
            <button
              disabled={item.quantity <= 1}
              onClick={() => updateQuantity(item, item.quantity - 1)}
              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded disabled:opacity-40"
            >
              −
            </button>

            <span className="px-3 font-bold text-lg">{item.quantity}</span>

            <button
              onClick={() => updateQuantity(item, item.quantity + 1)}
              className="w-8 h-8 flex items-center justify-center bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              +
            </button>
          </div>
        </div>

        {/* Remove */}
        <button
          onClick={() => removeFromCart(item)}
          className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-100 transition"
          title="Remove from cart"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    );
  })}

          </div>
        </div>

        {/* Order Summary */}
        <aside className="w-full max-w-sm bg-white rounded-lg shadow p-6 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-orange-900">Order Summary</h2>

          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span>₹{totalPrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span>Shipping</span>
            <span>₹{shippingCost.toFixed(2)}</span>
          </div>

          <div className="border-t border-gray-300 pt-3 flex justify-between font-bold text-orange-900 text-lg">
            <span>Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>

         

          <div className="flex justify-center">
            <Link href="/userinterface/checkout">
              <button className="mt-4 px-9 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition">
                Proceed to Checkout
              </button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
