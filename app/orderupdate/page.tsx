"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Order {
  id: number;
  full_name: string;
  grand_total: number;
  order_date: string;
  status: string;
}

interface OrderCounts {
  pending: number;
  confirmed: number;
  processing: number;
  out_for_delivery: number;
  delivered: number;
}

export default function OrdersDashboard() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<OrderCounts>({
    pending: 0,
    confirmed: 0,
    processing: 0,
    out_for_delivery: 0,
    delivered: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalOrders, setTotalOrders] = useState(0);

  const fetchOrders = async () => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("orders").select("*", { count: "exact" });

    if (search) query = query.ilike("full_name", `%${search}%`);
    if (statusFilter) query = query.eq("status", statusFilter);

    query = query.order("order_date", { ascending: sortOrder === "asc" }).range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      return;
    }

    setOrders(data as Order[]);
    setTotalOrders(count || 0);
  };

  const fetchCounts = async () => {
    const { data, error } = await supabase.from("orders").select("status", { count: "exact" });

    if (error) {
      console.error("Error fetching counts:", error);
      return;
    }

    const newCounts: OrderCounts = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      out_for_delivery: 0,
      delivered: 0,
    };

    data?.forEach((item: any) => {
      switch (item.status) {
        case "pending":
          newCounts.pending++;
          break;
        case "confirmed":
          newCounts.confirmed++;
          break;
        case "processing":
          newCounts.processing++;
          break;
        case "out_for_delivery":
        case "out of delivery":
          newCounts.out_for_delivery++;
          break;
        case "delivered":
          newCounts.delivered++;
          break;
       
      }
    });

    setCounts(newCounts);
  };

  useEffect(() => {
    fetchOrders();
    fetchCounts();
  }, [search, statusFilter, sortOrder, page]);

  const handleOpenOrder = (id: number) => {
    router.push(`/orderupdate/vieworder/${id}`);
  };

  const totalPages = Math.ceil(totalOrders / pageSize);

  return (
    <div className="p-6 space-y-6 bg-white">
      <h1 className="text-3xl font-bold">Orders</h1>

      {/* Status Counts */}
      <div className="flex flex-wrap gap-4 mb-6">
        <StatusCard label="Pending" value={counts.pending} color="yellow" />
        <StatusCard label="Confirmed" value={counts.confirmed} color="blue" />
        <StatusCard label="Processing" value={counts.processing} color="purple" />
        <StatusCard label="Out for Delivery" value={counts.out_for_delivery} color="orange" />
        <StatusCard label="Delivered" value={counts.delivered} color="green" />
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
  <input
  type="text"
  placeholder="Search by customer name..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="border px-3 py-2 rounded w-[880px]"
/>


  <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    className="border px-3 py-2 rounded"
  >
    <option value="">All Statuses</option>
    <option value="pending">Pending</option>
    <option value="confirmed">Confirmed</option>
    <option value="processing">Processing</option>
    <option value="out_for_delivery">Out for Delivery</option>
    <option value="delivered">Delivered</option>
    <option value="cancelled">Cancelled</option>
  </select>

  <select
    value={sortOrder}
    onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
    className="border px-3 py-2 rounded"
  >
        <option value="">Sort by</option>

    <option value="desc">Newest First</option>
    <option value="asc">Oldest First</option>
  </select>

  <button
    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
    onClick={() => {
      setSearch("");
      setStatusFilter("");
      setSortOrder("desc");
      setPage(1);
    }}
  >
    Clear Filters
  </button>
</div>


      {/* Orders Table */}
      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b">Order Date</th>
              <th className="py-2 px-4 border-b">Customer</th>
              <th className="py-2 px-4 border-b">Grand Total</th>
              <th className="py-2 px-4 border-b">Status</th>
              <th className="py-2 px-4 border-b">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">
                  {new Date(order.order_date).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-2 px-4 border-b">{order.full_name}</td>
                <td className="py-2 px-4 border-b">₹{order.grand_total.toFixed(2)}</td>
                <td className="py-2 px-4 border-b">
                  <StatusBadge status={order.status} />
                </td>
                <td className="py-2 px-4 border-b">
                  <button
                    className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
                    onClick={() => handleOpenOrder(order.id)}
                  >
                    Update
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <button
          className="px-4 py-2 border rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          className="px-4 py-2 border rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function StatusCard({ label, value, color = "gray" }: { label: string; value: number; color?: string }) {
  const colors: Record<string, string> = {
    yellow: "bg-yellow-100 text-yellow-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <div className={`flex-1 min-w-[150px] justify-between items-center p-4 rounded shadow flex ${colors[color]}`}>
      <span className="font-medium">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500 text-white",
    confirmed: "bg-blue-500 text-white",
    processing: "bg-purple-500 text-white",
    out_for_delivery: "bg-orange-500 text-white",
    delivered: "bg-green-500 text-white",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${statusColors[status] || "bg-gray-500 text-white"}`}>
      {status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}
