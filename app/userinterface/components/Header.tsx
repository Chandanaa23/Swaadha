"use client";

import { Home, Grid, ShoppingCart, User, Heart, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Banner {
  id: string;
  bg_color: string;
  text_color: string;
  title: string;
  active: boolean;
}

export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loadingBanner, setLoadingBanner] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Check login status
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);
    };

    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Fetch active banner
  useEffect(() => {
    const fetchBanner = async () => {
      const { data } = await supabase
        .from("banner")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) setBanner(data);
      setLoadingBanner(false);
    };

    fetchBanner();
  }, []);

  // Fetch cart count
  const fetchCartCount = async (uid: string | null) => {
    if (!uid) {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const totalQty = cart.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
      setCartCount(totalQty);
      return;
    }

    const { data } = await supabase.from("cart").select("quantity").eq("user_id", uid);
    if (data) {
      const totalQty = data.reduce((sum, i) => sum + i.quantity, 0);
      setCartCount(totalQty);
    }
  };

  useEffect(() => {
    fetchCartCount(userId);
    const handleCartEvent = () => fetchCartCount(userId);

    window.addEventListener("cartUpdated", handleCartEvent);

    return () => window.removeEventListener("cartUpdated", handleCartEvent);
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/userinterface/login";
  };

  return (
  <header className="w-full bg-white border-b shadow-sm sticky top-0 z-50">

  {/* Banner */}
  {!loadingBanner && banner && (
    <div
      className="w-full py-4 text-center"
      style={{ backgroundColor: banner.bg_color, color: banner.text_color }}
    >
      <h1 className="text-3xl md:text-4xl font-bold">{banner.title}</h1>
    </div>
  )}

  {/* Header */}
  <div className="max-w-7xl mx-auto flex items-center justify-between">

    {/* Logo */}
    <Link href="/" className="flex items-center px-6">
      <Image src="/logo.png" alt="Logo" width={140} height={80} />
    </Link>

    {/* Navigation completely right */}
    <nav className="flex align-right item-right space-x-6 px-6">

      {/* Home */}
      <Link href="/userinterface/home" className="flex items-center space-x-1 hover:text-orange-600">
        <Home size={20} />
        <span>Home</span>
      </Link>

      {/* Categories */}
      <Link href="/userinterface/category" className="flex items-center space-x-1 hover:text-orange-600">
        <Grid size={20} />
        <span>Categories</span>
      </Link>

      {/* Login button if not authenticated */}
      {!isAuthenticated && (
        <Link
          href="/userinterface/login"
          className="px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition"
        >
          Login
        </Link>
      )}

      {/* After login: Wishlist + Cart + Profile Dropdown */}
      {isAuthenticated && (
        <>
          <Link href="/userinterface/wishlist" className="hover:text-orange-600">
            <Heart size={22} />
          </Link>

          <Link href="/userinterface/cart" className="relative hover:text-orange-600">
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          <div className="relative">
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-1 hover:text-orange-600">
              <User size={22} />
              <ChevronDown size={18} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white shadow-lg border rounded-md py-2">
                <Link href="/userinterface/order" className="block px-4 py-2 hover:bg-gray-100">
                  My Orders
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </nav>
  </div>
</header>


  );
}
