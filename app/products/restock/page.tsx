"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import toast,{Toaster} from "react-hot-toast";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RestockPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "price">("name");
  const [stockFilter, setStockFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  // Fetch products
  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, product_variations(id, unit_type, price, stock)");
    if (error) console.error(error);
    else setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Handle stock update
  const updateStock = async () => {
  if (!editingProduct) return;

  try {
    const { error } = await supabase
      .from("product_variations")
      .update({ stock: newStock })
      .eq("id", editingProduct.variationId);

    if (error) {
      toast.error("Failed to update stock");
      setTimeout(() => setError(null), 3000); // clear error after 3 sec
      return;
    }

    toast.success("Stock updated successfully!");

    setEditingProduct(null);
    await loadProducts(); // reload products after update
  } catch (err: any) {
    toast.error(err.message || "Something went wrong");
    setTimeout(() => setError(null), 3000);
  }
};

  // Filter & search
  const filteredProducts = products
    .flatMap((p) =>
      p.product_variations.map((v: any) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        variationId: v.id,
        unit: v.unit_type,
        price: v.price,
        stock: v.stock,
      }))
    )
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());

      const matchesStock = stockFilter ? p.stock < 20 : true;

      return matchesSearch && matchesStock;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "price") return a.price - b.price;
      if (sortBy === "stock") return a.stock - b.stock;
      if (sortBy === "lowStock") return a.stock - b.stock; // Low stock on top
      return 0;
    });


  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 md:p-10 bg-white  min-h-screen">
            <Toaster position="top-right" />




      <h1 className="text-3xl font-bold mb-6">Re-stock Products</h1>

      {/* Search + Filters */}
      {/* Search + Sort Filter */}
      {/* Search + Sort + Low Stock Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search by product or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-[900px] focus:ring-2 focus:ring-blue-400"
        />

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="border p-2 rounded w-full md:w-1/4 focus:ring-2 focus:ring-blue-400"
        >
          <option value="name">Sort by Name</option>
          <option value="price">Sort by Price</option>
          <option value="stock">Sort by Stock</option>
          <option value="lowStock">Low Stock (&lt;20)</option>
        </select>


      </div>



      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow p-4">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Product</th>
              <th className="border px-4 py-2">SKU</th>
              <th className="border px-4 py-2">Unit</th>
              <th className="border px-4 py-2">Price</th>
              <th className="border px-4 py-2">Stock</th>
              <th className="border px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr
                key={p.variationId}
                className={`hover:bg-gray-50 transition ${p.stock < 20 ? "bg-red-50" : ""
                  }`}
              >
                <td className="border px-4 py-2 font-medium">{p.name}</td>
                <td className="border px-4 py-2">{p.sku}</td>
                <td className="border px-4 py-2">{p.unit}</td>
                <td className="border px-4 py-2">₹ {p.price}</td>
                <td
                  className={`border px-4 py-2 font-semibold ${p.stock < 20 ? "text-red-600" : ""
                    }`}
                >
                  {p.stock}
                </td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() => {
                      setEditingProduct(p);
                      setNewStock(p.stock);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Re-stock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stock update modal */}
      {editingProduct && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="bg-white p-6 rounded-xl w-80 space-y-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-700">
              Update Stock for {editingProduct.name}
            </h3>
            <input
              type="number"
              min={0}
              value={newStock}
              onChange={(e) =>
                setNewStock(Math.max(0, Number(e.target.value)))
              }
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={updateStock}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
