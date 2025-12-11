"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

// Swiper imports fixed for v10+
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

/* ---------- SUPABASE CLIENT ---------- */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: number;
  name: string;
  description: string | null;
  sku: string;
  image_urls?: string[];
  has_variations?: boolean;
  max_shelf_life?: string;
  pack_of?: string;
  taste_name?: string; // dynamically fetched taste
}

interface ProductVariation {
  id: number;
  product_id: number;
  unit_type: string;
  price: number;
  stock: number;
  taste_id?: number;
  taste_name?: string;
}

export default function ProductViewPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch taste name by ID from attributes table
  const fetchAttributeName = async (id?: number) => {
    if (!id) return "-";
    const { data } = await supabase.from("attributes").select("name").eq("id", id).single();
    return data?.name || "-";
  };

  const fetchProductAndVariations = async () => {
    setLoading(true);
    try {
      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (productError || !productData) {
        toast.error("Failed to fetch product");
        setLoading(false);
        return;
      }

      // Fetch main product taste dynamically
      const taste_name = await fetchAttributeName(productData.taste_id);

      // Fetch images
      const { data: imagesData } = await supabase
        .from("product_images")
        .select("image_url")
        .eq("product_id", productId);

      const image_urls = imagesData?.map((img) => img.image_url) || [];

      setProduct({ ...productData, image_urls, taste_name });

      // Fetch variations
      const { data: variationData, error: variationError } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", productId);

      if (!variationError && variationData) {
        const formattedVariations = await Promise.all(
          variationData.map(async (v: ProductVariation) => ({
            ...v,
            taste_name: await fetchAttributeName(v.taste_id),
          }))
        );
        setVariations(formattedVariations);
      }

    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductAndVariations();
  }, [productId]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500 text-lg">Loading product details...</p>
      </div>
    );

  if (!product)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500 text-lg">Product not found.</p>
      </div>
    );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" />

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
      >
        ← Back
      </button>

      {/* Product Info */}
      <div className="flex flex-col md:flex-row gap-6 bg-white shadow rounded p-6">
        {/* Image Carousel */}
        <div className="md:w-96">
          {product.image_urls && product.image_urls.length > 0 ? (
            <Swiper
              modules={[Navigation, Pagination]}
              navigation
              pagination={{ clickable: true }}
              spaceBetween={10}
              slidesPerView={1}
            >
              {product.image_urls.map((url, i) => (
                <SwiperSlide key={i}>
                  <img
                    src={url}
                    alt={`${product.name} image ${i + 1}`}
                    className="w-full h-96 object-cover rounded"
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="w-full h-96 bg-gray-100 flex items-center justify-center text-gray-400 rounded">
              No Image
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-gray-600">{product.description}</p>
          {product.max_shelf_life && <p className="text-gray-600">Shelf Life: {product.max_shelf_life}</p>}
          {product.pack_of && <p className="text-gray-600">Pack Of: {product.pack_of}</p>}
          {product.taste_name && <p className="text-gray-600">Taste: {product.taste_name}</p>} {/* Dynamically fetched taste */}
        </div>
      </div>

      {/* Product Variations Table */}
      <div className="bg-white shadow rounded p-6">
        <h2 className="text-2xl font-semibold mb-4">Product Variations</h2>

        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Unit Type</th>
              <th className="border px-4 py-2">Stock</th>
              <th className="border px-4 py-2">Price</th>
            </tr>
          </thead>
          <tbody>
            {variations.length > 0 ? (
              variations.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{v.unit_type}</td>
                  <td className="border px-4 py-2">{v.stock}</td>
                  <td className="border px-4 py-2">₹{v.price}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border px-4 py-2 text-center" colSpan={4}>
                  No variations available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
