"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Order {
  id: number;
  full_name: string;
  phone_number: string;
  total_price: number;
  grand_total: number;
  status: string;
  order_date: string;
}

export default function OrderReport() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"order_date" | "total_price" | "grand_total">("order_date");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [search, sortBy, orders]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, full_name, phone_number, total_price, grand_total, status, order_date")
      .order("order_date", { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
      setOrders([]);
    } else {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let temp = [...orders];
    if (search.trim() !== "") {
      const s = search.toLowerCase();
      temp = temp.filter(
        (o) => o.full_name.toLowerCase().includes(s) || o.phone_number.includes(s)
      );
    }

    temp.sort((a, b) => {
      if (sortBy === "order_date") return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
      if (sortBy === "total_price") return b.total_price - a.total_price;
      if (sortBy === "grand_total") return b.grand_total - a.grand_total;
      return 0;
    });

    setFilteredOrders(temp);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSortBy("order_date");
  };

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.grand_total), 0);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, "orders.xlsx");
  };

  if (loading)
    return <p className="text-center mt-10 text-gray-600 font-medium">Loading orders...</p>;

  return (
    <div className="p-6 bg-white min-h-screen">
      <h1 className="text-3xl font-bold mb-3">Order Report</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card title="Total Orders" value={totalOrders} color="blue" />
        <Card title="Pending Orders" value={pendingOrders} color="yellow" />
        <Card title="Delivered Orders" value={deliveredOrders} color="green" />
        <Card title="Total Revenue" value={totalRevenue} color="purple" prefix="₹" />
      </div>

      {/* Search, Sort, Export */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer or phone"
          className="border rounded px-3 py-2 w-[900px] focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="order_date">Sort by Order Date</option>
          <option value="total_price">Sort by Total Price</option>
          <option value="grand_total">Sort by Grand Total</option>
        </select>
        <button
          onClick={clearFilters}
          className="bg-gray-200 text-black px-3 py-2 rounded transition "
        >
          Clear Filter
        </button>
        <button
          onClick={exportToExcel}
          className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 transition"
        >
          Excel
        </button>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <Th>Order ID</Th>
              <Th>Customer</Th>
              <Th>Phone</Th>
              <Th>Total</Th>
              <Th>Grand Total</Th>
              <Th>Status</Th>
              <Th>Order Date</Th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedOrders.map((order) => (
              <tr key={order.id}>
                <Td>{order.id}</Td>
                <Td>{order.full_name}</Td>
                <Td>{order.phone_number}</Td>
                <Td>{order.total_price}</Td>
                <Td>{order.grand_total}</Td>
                <Td className={statusColor(order.status) + " font-semibold"}>
                  {order.status}
                </Td>
                <Td>{new Date(order.order_date).toLocaleString()}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination with page numbers */}
      <div className="flex justify-center items-center mt-4 gap-2">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-gray-200  rounded disabled:opacity-50"
        >
          Prev
        </button>

        {[...Array(totalPages)].map((_, idx) => {
          const page = idx + 1;
          return (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded ${page === currentPage ? "bg-gray-200" : "bg-gray-200 text-gray-700"
                }`}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-gray-200  rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Status color helper
function statusColor(status: string) {
  switch (status) {
    case "pending": return "text-yellow-600";
    case "confirmed": return "text-blue-600";
    case "processing": return "text-indigo-600";
    case "out of delivery": return "text-orange-600";
    case "delivered": return "text-green-600";
    default: return "text-gray-600";
  }
}

// Table header
function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2 text-left text-sm font-semibold text-gray-700 ${className}`}
    >
      {children}
    </th>
  );
}


// Table cell
function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-2 text-sm text-gray-700 ${className}`}>
      {children}
    </td>
  );
}


// Summary card component
function Card({ title, value, color, prefix = "" }: { title: string; value: number; color: string; prefix?: string }) {
  const bgColor = `bg-${color}-100`;
  const textColor = `text-${color}-700`;

  return (
    <div className={`${bgColor} p-4 rounded shadow`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{prefix}{value.toLocaleString()}</p>
    </div>
  );
}
