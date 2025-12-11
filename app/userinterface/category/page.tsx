"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation"; // Next.js 13+ router

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("home_status", true)
        .order("priority", { ascending: true });

      if (error) {
        console.error(error);
        return;
      }

      setCategories(data || []);
    }

    fetchCategories();
  }, []);

  const handleCategoryClick = (categoryId: number) => {
    // Navigate to products page for this category
    router.push(`/userinterface/category/${categoryId}`);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white py-28 px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-4">
          Discover Our Categories
        </h1>
        <p className="text-lg md:text-xl mb-6">
          Browse our wide range of authentic products tailored just for you
        </p>
      </section>

      {/* Categories Grid */}
      <section className="px-6 lg:px-12 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Explore Categories
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-12 justify-items-center">
          {categories.map((category: any) => (
            <div
              key={category.id}
              className="flex flex-col items-center group cursor-pointer"
              onClick={() => handleCategoryClick(category.id)}
            >
              {/* Circle Card */}
              <div className="relative w-56 h-56 rounded-full overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
                {category.image_url ? (
                  <Image
                    src={category.image_url}
                    alt={category.name}
                    width={224}
                    height={224}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                    No Image
                  </div>
                )}

                {category.is_popular && (
                  <span className="absolute top-3 right-3 bg-orange-500 text-white text-sm font-semibold px-3 py-1 rounded-full shadow-md">
                    Popular
                  </span>
                )}
              </div>

              <h3 className="mt-4 text-lg font-semibold text-gray-900 text-center">
                {category.name}
              </h3>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
