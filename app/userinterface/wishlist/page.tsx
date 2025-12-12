"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

import { TrashIcon, ShoppingCartIcon } from "@heroicons/react/24/solid";


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface WishlistItem {
  id: number;
  product_id: number;
  name: string;
  price: number;
  image: string;
  shipping_charge: number;
  stock: number;
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
const router = useRouter();

  // Load user
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data.session?.user?.id || null);
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) =>
      setUserId(session?.user?.id || null)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Fetch wishlist
const fetchWishlist = async () => {
  if (!userId) return;

  const { data, error } = await supabase
    .from("wishlists")
    .select(`
      id,
      product_id,
      products (
        id,
        name,
        shipping_charge,
        active,
        product_variations (
          price,
          stock
        ),
        product_images (
          image_url
        )
      )
    `)
    .eq("user_id", userId);

  if (error) {
    console.log("Wishlist fetch error:", error);
    return;
  }

  if (data) {
    const formatted = data
      .filter((w: any) => w.products) // keep only if product exists
      .map((w: any) => ({
        id: w.id,
        product_id: w.product_id,
        name: w.products.name || "Unnamed Product",
        price: w.products.product_variations?.[0]?.price || 0,
        stock: w.products.product_variations?.[0]?.stock || 0,
        image: w.products.product_images?.[0]?.image_url || "/placeholder.png",
        shipping_charge: w.products.shipping_charge || 0,
      }));

    setWishlist(formatted);
  }
};



  useEffect(() => {
    if (userId) fetchWishlist();
  }, [userId]);

  // Remove item
  const removeWishlistItem = async (id: number) => {
    await supabase.from("wishlists").delete().eq("id", id);
    fetchWishlist();
  };

  // Add to cart
 const addToCart = async (item: WishlistItem) => {
  if (!userId) return alert("Please login");

  const { data: exists } = await supabase
    .from("cart")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("product_id", item.product_id)
    .limit(1);

  if (exists && exists.length > 0) {
    await supabase
      .from("cart")
      .update({ quantity: exists[0].quantity + 1 })
      .eq("id", exists[0].id);
  } else {
    await supabase.from("cart").insert({
      user_id: userId,
      product_id: item.product_id,
      quantity: 1,
    });
  }

  // Remove from wishlist
  await supabase.from("wishlists").delete().eq("product_id", item.product_id);

  fetchWishlist();
  window.dispatchEvent(new Event("cartUpdated"));

  // ✅ Redirect to Cart page
  router.push("/userinterface/cart");
};

  if (!userId)
    return (
      <p className="text-center mt-10 text-lg">
        Please{" "}
        <Link href="/userinterface/login" className="text-orange-600 underline">
          login
        </Link>{" "}
        to view your wishlist.
      </p>
    );

  if (wishlist.length === 0)
    return (
      <p className="text-center mt-10 text-lg text-gray-600">
        Your wishlist is empty.
      </p>
    );
// Toggle wishlist (heart)
const toggleWishlist = async (productId: number, wishlistId?: number) => {
  if (!userId) return alert("Please login");

  if (wishlistId) {
    // remove from wishlist
    await supabase.from("wishlists").delete().eq("id", wishlistId);
  } else {
    // add to wishlist
    await supabase.from("wishlists").insert({
      user_id: userId,
      product_id: productId,
    });
  }

  fetchWishlist();
};

  return (
  <div className="min-h-screen px-4 lg:px-16 py-12">
    <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 px-6 py-4 rounded-md mb-8 shadow">
      My Wishlist
    </h1>

    {/* Smaller card width → Add more columns */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
      {wishlist.map((item) => (
       <div
  key={item.id}
  className={`group border border-gray-200 rounded-xl p-3 shadow-sm transition-all relative ${
    item.stock === 0
      ? "bg-gray-100 pointer-events-none opacity-60"
      : "bg-white hover:shadow-lg"
  }`}
>

          {/* Image with taller height */}
          <div className="relative w-full h-56 overflow-hidden rounded-lg">
  <Link href={`/userinterface/product/${item.product_id}`}>
    <Image
      src={item.image}
      alt={item.name}
      fill
      className="object-cover group-hover:scale-105 transition duration-300"
    />
  </Link>

  {/* Out of Stock Badge */}
  {item.stock === 0 && (
    <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
      Out of Stock
    </span>
  )}

  {/* ❤️ Heart Toggle */}
  <button
    onClick={() => toggleWishlist(item.product_id, item.id)}
    className="absolute top-2 right-2 bg-white shadow p-2 rounded-full hover:bg-red-50 transition"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="red"
      viewBox="0 0 24 24"
      className="w-5 h-5"
    >
      <path d="M12 21s-6.7-4.6-10-9.3C-1.5 7.5 1.3 2 6.2 2c2.3 0 4 1.3 4.9 2.7C12.8 3.3 14.5 2 16.8 2c4.8 0 7.6 5.5 4.2 9.7C18.7 16.4 12 21 12 21z" />
    </svg>
  </button>
</div>


          {/* Product Name */}
          <Link href={`/userinterface/product/${item.product_id}`}>
            <h3 className="text-orange-900 font-semibold mt-3 text-sm line-clamp-2">
              {item.name}
            </h3>
          </Link>

          {/* Price */}
          <p className="font-bold text-orange-700 mt-1">₹{item.price}</p>

          {/* Buttons */}
          <div className="flex items-center justify-between mt-6">
    
  <button
  onClick={() => addToCart(item)}
  className={`px-6 py-2 rounded-lg text-md font-semibold bg-orange-600 text-white w-[450px] flex items-center justify-center gap-2`}
  disabled={item.stock === 0}
>
  <ShoppingCartIcon className="w-4 h-4" />
  <span>Add to Cart</span>
</button>






          </div>
        </div>
      ))}
    </div>
  </div>
)};

