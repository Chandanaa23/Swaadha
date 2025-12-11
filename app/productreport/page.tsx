"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number | null;
  stock: number | null;
  active: boolean;
  shipping_charge: number | null;
  total_orders: number;
  total_revenue: number;
  created_at: string;
}

export default function ProductReport() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "created_at" | "price" | "stock" | "total_orders" | "total_revenue"
  >("created_at");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchProducts();
  }, []);

  /* -------------------------------------------
     FETCH PRODUCTS + ORDER ITEMS
  -------------------------------------------- */
  const fetchProducts = async () => {
  setLoading(true);

  try {
    // 1️⃣ Fetch products with variations
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        sku,
        active,
        shipping_charge,
        created_at,
        has_variation,
        product_variations!inner(price, stock)
      `)
      .order("created_at", { ascending: false });

    if (productsError) throw productsError;

    // 2️⃣ Fetch order items with order_id
    const { data: orderItems, error: orderItemsError } = await supabase
      .from("order_items")
      .select("order_id, product_id, quantity, price");

    if (orderItemsError) throw orderItemsError;

    // 3️⃣ Compute totals
    const orderCountMap: Record<number, Set<number>> = {}; // product_id -> set of unique order_ids
    const revenueMap: Record<number, number> = {}; // product_id -> total revenue

    orderItems?.forEach((item: any) => {
      const pid = Number(item.product_id);
      const orderId = Number(item.order_id);
      const qty = Number(item.quantity);
      const price = Number(item.price);

      // Track unique orders
      if (!orderCountMap[pid]) orderCountMap[pid] = new Set();
      orderCountMap[pid].add(orderId);

      // Track revenue
      revenueMap[pid] = (revenueMap[pid] || 0) + price * qty;
    });

    // 4️⃣ Map products with variations, totals, revenue
    const mapped: Product[] = (productsData as any[]).map((p) => {
      const variation = p.product_variations?.[0]; // use first variation if exists
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: variation?.price ?? null,
        stock: variation?.stock ?? null,
        active: p.active,
        shipping_charge: p.shipping_charge ?? 0,
        total_orders: orderCountMap[p.id]?.size ?? 0, // number of unique orders
        total_revenue: revenueMap[p.id] ?? 0, // total revenue
        created_at: p.created_at,
      };
    });

    setProducts(mapped);
    applyFilters(mapped);
  } catch (error) {
    console.error("Fetch error:", error);
    setProducts([]);
  } finally {
    setLoading(false);
  }
};


  /* -------------------------------------------
     FILTER + SORT
  -------------------------------------------- */
  const applyFilters = (sourceProducts?: Product[]) => {
    let temp = sourceProducts ? [...sourceProducts] : [...products];

    if (search.trim() !== "") {
      const s = search.toLowerCase();
      temp = temp.filter(
        (p) =>
          p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)
      );
    }

    temp.sort((a, b) => {
      if (sortBy === "created_at")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "price") return (b.price || 0) - (a.price || 0);
      if (sortBy === "stock") return (b.stock || 0) - (a.stock || 0);
      if (sortBy === "total_orders") return b.total_orders - a.total_orders;
      if (sortBy === "total_revenue") return b.total_revenue - a.total_revenue;
      return 0;
    });

    setFilteredProducts(temp);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSortBy("created_at");
    applyFilters(products);
  };

  /* -------------------------------------------
     PAGINATION
  -------------------------------------------- */
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* -------------------------------------------
     EXPORT TO EXCEL
  -------------------------------------------- */
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredProducts);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "products.xlsx");
  };

  if (loading)
    return (
      <p className="text-center mt-10 text-gray-600 font-medium">
        Loading products...
      </p>
    );

  return (
    <div className="p-6 bg-white min-h-screen">
      <h1 className="text-3xl font-bold mb-3">Product Report</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Total Products" value={products.length} color="blue" />
        <Card title="Active Products" value={products.filter((p) => p.active).length} color="green" />
        <Card title="Inactive Products" value={products.filter((p) => !p.active).length} color="red" />
      </div>

      {/* Search, Sort, Export */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or SKU"
          className="border rounded px-3 py-2 w-[800px] focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="created_at">Sort by Created Date</option>
          <option value="price">Sort by Price</option>
          <option value="stock">Sort by Stock</option>
          <option value="total_orders">Sort by Orders</option>
          <option value="total_revenue">Sort by Revenue</option>
        </select>

        <button
          onClick={clearFilters}
          className="bg-gray-200 text-black px-3 py-2 rounded border "
        >
          Clear Filter
        </button>

        <button
          onClick={exportToExcel}
          className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
        >
          Export to Excel
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>SKU</Th>
              <Th>Price</Th>
              <Th>Stock</Th>
              <Th>Shipping</Th>
              <Th>Status</Th>
              <Th>Created At</Th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedProducts.map((p) => (
              <tr key={p.id}>
                <Td>{p.id}</Td>
                <Td>{p.name}</Td>
                <Td>{p.sku}</Td>
                <Td>{p.price ?? "-"}</Td>
                <Td>{p.stock ?? "-"}</Td>
                
                <Td>{p.shipping_charge === 0 ? "Free" : `₹${p.shipping_charge}`}</Td>
                <Td className={p.active ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                  {p.active ? "Active" : "Inactive"}
                </Td>
                <Td>{new Date(p.created_at).toLocaleString()}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center mt-4 gap-2">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-gray-200  rounded disabled:opacity-50"
        >
          Prev
        </button>

        {Array.from({ length: totalPages }).map((_, idx) => (
          <button
            key={idx + 1}
            onClick={() => setCurrentPage(idx + 1)}
            className={`px-3 py-1 rounded ${
              currentPage === idx + 1
                ? "bg-gray-200 "
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {idx + 1}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------
   REUSABLE COMPONENTS
-------------------------------------------- */

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2 text-sm text-gray-700">{children}</td>;
}

function Card({ title, value, color }: { title: string; value: number; color: string }) {
  const bgClass = `bg-${color}-100`;
  const textClass = `text-${color}-700`;
  return (
    <div className={`${bgClass} p-4 rounded shadow`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className={`text-2xl font-bold ${textClass}`}>{value.toLocaleString()}</p>
    </div>
  );
}
