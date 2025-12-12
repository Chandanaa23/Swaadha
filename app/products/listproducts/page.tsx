"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";
import { EyeIcon, PencilIcon, TrashIcon, QrCodeIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

/* ---------- SUPABASE CLIENT ---------- */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Product {
  id: number;
  name: string;
  active: boolean;

}

export default function ProductList() {
  /* ---------- Filters ---------- */
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<any[]>([]);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedSubSubCategory, setSelectedSubSubCategory] = useState("");
  const [search, setSearch] = useState("");

  /* ---------- Products ---------- */
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);


  /* ---------- Fetch Categories ---------- */
  useEffect(() => {
    supabase
      .from("categories")
      .select("*")
      .order("priority", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setCategories(data || []);
      });
  }, []);

  /* ---------- Fetch SubCategories ---------- */
  useEffect(() => {
    if (!selectedCategory) {
      setSubCategories([]);
      setSelectedSubCategory("");
      return;
    }
    supabase
      .from("subcategories")
      .select("*")
      .eq("category_id", Number(selectedCategory))
      .order("priority", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setSubCategories(data || []);
      });
  }, [selectedCategory]);

  /* ---------- Fetch SubSubCategories ---------- */
  useEffect(() => {
    if (!selectedSubCategory) {
      setSubSubCategories([]);
      setSelectedSubSubCategory("");
      return;
    }
    supabase
      .from("sub_subcategories")
      .select("*")
      .eq("category_id", Number(selectedCategory))
      .eq("subcategory_id", Number(selectedSubCategory))
      .order("priority", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setSubSubCategories(data || []);
      });
  }, [selectedSubCategory, selectedCategory]);

  /* ---------- Fetch Products ---------- */
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedSubCategory, selectedSubSubCategory, search, page]);

  const fetchProducts = async () => {
    let query = supabase.from("products").select("*", { count: "exact" });

    if (selectedCategory) query = query.eq("category_id", Number(selectedCategory));
    if (selectedSubCategory) query = query.eq("subcategory_id", Number(selectedSubCategory));
    if (selectedSubSubCategory) query = query.eq("sub_subcategory_id", Number(selectedSubSubCategory));
    if (search) query = query.ilike("name_en", `%${search}%`);

    // optional: only show active products
    // query = query.eq("active", true);

    const { data, count, error } = await query
      .order("id", { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) console.error(error);
    else {
      setProducts(data || []);
      setTotalCount(count || 0);
    }
  };


  /* ---------- Delete Product ---------- */
  const deleteProduct = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from("products").delete().eq("id", deleteId);

    if (error) toast.error("Failed to delete product");
    else {
      toast.success("Product deleted successfully");
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
    }

    setShowDeleteModal(false);
    setDeleteId(null);
  };


  /* ---------- Pagination ---------- */
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-6 space-y-6 w-full  bg-white">
      <Toaster position="top-right" />

      <h1 className="text-3xl font-bold">Product List</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={selectedSubCategory}
          onChange={(e) => setSelectedSubCategory(e.target.value)}
          className="border p-2 rounded"
          disabled={!subCategories.length}
        >
          <option value="">All Sub-Categories</option>
          {subCategories.map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.name}
            </option>
          ))}
        </select>

        <select
          value={selectedSubSubCategory}
          onChange={(e) => setSelectedSubSubCategory(e.target.value)}
          className="border p-2 rounded"
          disabled={!subSubCategories.length}
        >
          <option value="">All Sub-Sub-Categories</option>
          {subSubCategories.map((ssc) => (
            <option key={ssc.id} value={ssc.id}>
              {ssc.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded flex-1"
        />
      </div>

      {/* Products Table */}
      <table className="min-w-full border-collapse border border-gray-300 mt-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.length ? (
            products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{product.name}</td>
                <td className="border px-4 py-2 flex gap-2 items-center">

                  {/* Active / Inactive Toggle */}
                  <button
                    onClick={async () => {
                      const { error } = await supabase
                        .from("products")
                        .update({ active: !product.active })
                        .eq("id", product.id);

                      if (error) toast.error("Failed to update status");
                      else {
                        toast.success(`Product is now ${product.active ? "Inactive" : "Active"}`);
                        setProducts((prev) =>
                          prev.map((p) =>
                            p.id === product.id ? { ...p, active: !p.active } : p
                          )
                        );
                      }
                    }}
                    className={`px-2 py-1 rounded text-white ${product.active ? "bg-green-600" : "bg-gray-400"
                      }`}
                  >
                    {product.active ? "Active" : "Inactive"}
                  </button>

                  {/* Other Action Buttons */}
                  <button
                    title="Barcode"
                    className="p-2 bg-gray-200 rounded"
                    onClick={() => router.push(`/products/listproducts/barcode/${product.id}`)}
                  >
                    <QrCodeIcon className="h-5 w-5" />
                  </button>
                  <button
                    title="View"
                    className="p-2 bg-blue-600 text-white rounded"
                    onClick={() => router.push(`/products/listproducts/view/${product.id}`)}
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button
                    title="Edit"
                    className="p-2 bg-yellow-500 text-white rounded"
                    onClick={() => router.push(`/products/listproducts/edit/${product.id}`)}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    title="Delete"
                    className="p-2 bg-red-600 text-white rounded"
                    onClick={() => {
                      setDeleteId(product.id);
                      setShowDeleteModal(true);
                    }}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>

                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={2} className="text-center p-4 text-gray-500">
                No products found.
              </td>
            </tr>
          )}
        </tbody>

      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 border rounded ${page === i + 1 ? "bg-blue-600 text-white" : ""}`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow p-6 w-80 text-center">
            <h2 className="text-xl font-semibold mb-4">Confirm Deletion</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this product?
            </p>

            <div className="flex justify-center gap-3">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={deleteProduct}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
