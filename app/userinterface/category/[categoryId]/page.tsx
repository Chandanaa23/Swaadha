"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient, Session } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import toast,{Toaster} from "react-hot-toast";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CategoryProductsPage() {
  const params = useParams();
  const categoryId = params.categoryId;

  const [products, setProducts] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [userSession, setUserSession] = useState<Session | null>(null);

  // --------------------------
  // AUTH SESSION LISTEN
  // --------------------------
  useEffect(() => {
    async function fetchSession() {
      const { data } = await supabase.auth.getSession();
      setUserSession(data.session);
    }
    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUserSession(session)
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // -------------------------------------------------
  // FETCH PRODUCTS + VARIATIONS + IMAGES FOR CATEGORY
  // -------------------------------------------------
  useEffect(() => {
    async function fetchProducts() {
      if (!categoryId) return;

      // 1️⃣ Fetch products
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("active",true)
        .eq("category_id", categoryId);

      if (productError) {
        console.error("Product fetch error:", productError);
        return;
      }

      // 2️⃣ Fetch variations for all products
      const productIds = productData.map((p: any) => p.id);

      const { data: variationData } = await supabase
        .from("product_variations")
        .select("*")
        .in("product_id", productIds);

      // 3️⃣ Fetch images for all products
      const { data: imageData } = await supabase
        .from("product_images")
        .select("*")
        .in("product_id", productIds);

      // 4️⃣ Combine results
      const finalProducts = productData.map((prod: any) => {
        const variations = variationData?.filter((v) => v.product_id === prod.id) || [];
        const images = imageData?.filter((img) => img.product_id === prod.id) || [];

        // Build public URLs for all images
        const imgUrls = images.map(img => img.image_url);


        return {
          ...prod,
          variations,
          first_price: variations[0]?.price ?? prod.unit_price ?? "N/A",
          images: imgUrls, // store all image URLs
        };


      });

      setProducts(finalProducts);
    }

    fetchProducts();
  }, [categoryId]);
  const addToCart = async (product: any) => {
    if (!userSession) {
      return window.location.href = "/signin";
    }

    const userId = userSession.user.id;

    const variationId = product.variations?.[0]?.id || null;

    // check if cart already contains this product + variation
    const { data: existing, error: existingError } = await supabase
      .from("cart")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .eq("variation_id", variationId)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("Cart check error:", existingError);
      return;
    }

    if (existing) {
      // Update quantity
      await supabase
        .from("cart")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id);
    } else {
      // Insert new row
      await supabase.from("cart").insert({
        user_id: userId,
        product_id: product.id,
        variation_id: variationId,
        quantity: 1,
      });
    }

    // Tell the app cart changed
    window.dispatchEvent(new Event("cartUpdated"));

    toast.success("Added to cart!");
  };



  // --------------------------
  // FETCH CATEGORY NAME
  // --------------------------
  useEffect(() => {
    async function fetchCategory() {
      if (!categoryId) return;

      const { data, error } = await supabase
        .from("categories")
        .select("name")
        .eq("id", categoryId)
        .single();

      if (!error && data) setCategoryName(data.name);
    }

    fetchCategory();
  }, [categoryId]);

  // --------------------------
  // UI RENDER
  // --------------------------
  function ImageCarousel({ images }: { images: string[] }) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
      if (!images || images.length === 0) return;

      const interval = setInterval(() => {
        setIndex((prev) => (prev + 1) % images.length);
      }, 4000); // 4 seconds slide

      return () => clearInterval(interval);
    }, [images]);

    if (!images || images.length === 0) {
      return (
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500 rounded-t-lg">
          No Image
        </div>
      );
    }

    return (
      <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
        <Image
          key={index}
          src={images[index]}
          alt="Product Image"
          fill
          className="object-cover transition-all duration-700"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-6 lg:px-12 py-12">
      <Toaster position="top-right"/>
      <a
        href="/userinterface/category"
        className="text-sm text-orange-600 hover:underline mb-6 inline-block font-medium"
      >
        &larr; Back to Categories
      </a>

      <h1 className="text-4xl font-extrabold text-orange-900 mb-1">
        {categoryName || "Loading..."}
      </h1>
      <p className="text-orange-700 mb-10 font-semibold">
        {products.length} product{products.length !== 1 ? "s" : ""}
      </p>

      {products.length === 0 && (
        <p className="text-center text-orange-600 font-semibold">
          No products found.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-5 gap-6">
        {products.map((product: any) => (
          <div
            key={product.id}
            className={`bg-white rounded-lg shadow-md flex flex-col transition-all ${product.stock === 0
                ? "opacity-50 pointer-events-none" // gray out & disable interactions
                : "hover:shadow-xl"
              }`}
          >

            {/* PRODUCT IMAGE */}
            <ImageCarousel images={product.images} />


            {/* CONTENT */}
            <div className="p-4 flex flex-col flex-grow">
              <div className="relative">

              </div>


              <p className="text-orange-800 text-sm mb-4 line-clamp-2">
                {product.description}
              </p>

              <p className="text-orange-800 font-bold text-lg mb-4">
                ₹{product.first_price}
              </p>

              <div className="mt-auto flex space-x-3">
                {userSession ? (
                  <button
                    type="button"
                    className="flex-1 bg-orange-600 text-white py-2 rounded-md text-sm font-semibold hover:bg-orange-700 transition"
                    onClick={() => addToCart(product)}
                  >
                    Add to Cart
                  </button>

                ) : (
                  <button
                    type="button"
                    className="flex-1 border border-orange-600 text-orange-600 py-2 rounded-md text-sm font-semibold hover:bg-orange-100 transition"
                    onClick={() => (window.location.href = "/userinterface/login")}
                  >
                    Sign In
                  </button>
                )}

                <button
                  type="button"
                  className="flex-1 border border-orange-600 text-orange-600 py-2 rounded-md text-sm font-semibold hover:bg-orange-100 transition"
                  onClick={() =>
                    (window.location.href = `/userinterface/product/${product.id}`)
                  }
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
