"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";

import { Line, Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// -------------------- TYPES --------------------
type Order = {
  id: number;
  full_name: string;
  grand_total: number;
  order_date: string;
};

type Stats = {
  totalOrders: number;
  totalPOSOrders: number;
  onlineSales: number;
  posSales: number;
  totalCustomers: number;
  totalProducts: number;
  activeBanners: number;
  activeOffers: number;
  recentOrders: Order[];
  recentPosOrders: Order[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<"admin" | "subadmin" | null>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalPOSOrders: 0,
    onlineSales: 0,
    posSales: 0,
    totalCustomers: 0,
    totalProducts: 0,
    activeBanners: 0,
    activeOffers: 0,
    recentOrders: [],
    recentPosOrders: [],
  });

  const [sevenDayChart, setSevenDayChart] = useState<ChartData<"line", number[], string>>({
    labels: [],
    datasets: [],
  });

  const [comparisonChart, setComparisonChart] = useState<ChartData<"bar", number[], string>>({
    labels: [],
    datasets: [],
  });

  const [categoryChart, setCategoryChart] = useState<ChartData<"pie", number[], string>>({
    labels: [],
    datasets: [],
  });

  const [selectedRange, setSelectedRange] = useState("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  /* -------------------- MOUNT CHECK -------------------- */
  useEffect(() => setMounted(true), []);

  /* -------------------- AUTH CHECK -------------------- */
  useEffect(() => {
    const role = localStorage.getItem("role");
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (!isLoggedIn || !role) {
      router.replace("/login");
      return;
    }

    setRole(role === "admin" ? "admin" : "subadmin");
    setLoading(false);
  }, [router]);

  /* -------------------- DASHBOARD DATA -------------------- */
  async function loadDashboard() {
    setLoading(true);

    try {
      const [
        orders,
        posOrders,
        onlineSales,
        posSales,
        products,
        customers,
        banners,
        offers,
        recentOrders,
        recentPosOrders,
        last7DaysOrders,
        monthlyOrders,
        monthlyPosOrders,
        productCategories,
      ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact" }),
        supabase.from("pos_orders").select("id", { count: "exact" }),
        supabase.from("orders").select("grand_total"),
        supabase.from("pos_orders").select("grand_total"),
        supabase.from("products").select("id", { count: "exact" }),
        supabase.from("customers").select("id", { count: "exact" }),
        supabase.from("banner").select("id", { count: "exact" }).eq("active", true),
        supabase.from("offers").select("id", { count: "exact" }).eq("is_active", true),
        supabase
          .from("orders")
          .select("id, full_name, grand_total, order_date")
          .order("order_date", { ascending: false })
          .limit(5),
        supabase
          .from("pos_orders")
          .select("id, full_name, grand_total, order_date")
          .order("order_date", { ascending: false })
          .limit(5),
        supabase
          .from("orders")
          .select("grand_total, order_date")
          .gte("order_date", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("orders").select("id").gte("order_date", "2025-01-01"),
        supabase.from("pos_orders").select("id").gte("order_date", "2025-01-01"),
        supabase.from("products").select("id, category_id"),
      ]);

      /* 7-DAY SALES */
      const daily: Record<string, number> = {};
      last7DaysOrders.data?.forEach((o: any) => {
        const day = new Date(o.order_date).toLocaleDateString("en-IN", { weekday: "short" });
        daily[day] = (daily[day] || 0) + Number(o.grand_total);
      });

      const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      setSevenDayChart({
        labels: week,
        datasets: [
          {
            label: "Online Sales (₹)",
            data: week.map((d) => daily[d] || 0),
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.3)",
            borderWidth: 2,
          },
        ],
      });

      /* MONTHLY COMPARISON */
      setComparisonChart({
        labels: ["Online Orders", "POS Orders"],
        datasets: [
          {
            label: "Orders Count",
            data: [monthlyOrders?.data?.length ?? 0, monthlyPosOrders?.data?.length ?? 0],
            backgroundColor: ["#3b82f6", "#f59e0b"],
          },
        ],
      });

      /* CATEGORY PIE */
      const catCount: Record<string, number> = {};
      productCategories.data?.forEach((p: any) => {
        catCount[p.category_id] = (catCount[p.category_id] || 0) + 1;
      });
      setCategoryChart({
        labels: Object.keys(catCount),
        datasets: [
          {
            data: Object.values(catCount),
            backgroundColor: ["#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"],
          },
        ],
      });

      /* TOP STATS */
      setStats({
        totalOrders: orders.count || 0,
        totalPOSOrders: posOrders.count || 0,
        onlineSales: onlineSales.data?.reduce((s: number, o: any) => s + Number(o.grand_total), 0) || 0,
        posSales: posSales.data?.reduce((s: number, o: any) => s + Number(o.grand_total), 0) || 0,
        totalProducts: products.count || 0,
        totalCustomers: customers.count || 0,
        activeBanners: banners.count || 0,
        activeOffers: offers.count || 0,
        recentOrders: (recentOrders.data as Order[]) || [],
        recentPosOrders: (recentPosOrders.data as Order[]) || [],
      });

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (role) loadDashboard();
  }, [role]);

  const filteredChartData = sevenDayChart;

  if (!mounted) return null;
  if (!role) return <p className="text-center p-10">Checking login...</p>;
  if (loading) return <p className="text-center p-10">Loading dashboard...</p>;

  return (
    <div className="flex">
      <div className="p-6 space-y-10 bg-white w-full">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard title="Total Orders" value={stats.totalOrders} color="blue" />
          <DashboardCard title="POS Orders" value={stats.totalPOSOrders} color="purple" />
          <DashboardCard title="Total Online Sales" value={`₹${stats.onlineSales}`} color="green" />
          <DashboardCard title="Total POS Sales" value={`₹${stats.posSales}`} color="orange" />
          <DashboardCard title="Total Products" value={stats.totalProducts} color="indigo" />
          <DashboardCard title="Total Customers" value={stats.totalCustomers} color="cyan" />
          <DashboardCard title="Active Banners" value={stats.activeBanners} color="yellow" />
          <DashboardCard title="Low Stock" value={stats.activeOffers} color="red" />
        </div>

        {/* GRAPHS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartBox title="Category-wise Products">
            <div className="h-[260px] flex items-center justify-center">
              <Pie data={categoryChart} />
            </div>
          </ChartBox>

          <ChartBox title="Online vs POS Orders (Monthly)">
            <div className="h-[260px]">
              <Bar data={comparisonChart} />
            </div>
          </ChartBox>
        </div>

        <div className="w-full">
          <ChartBox title="Sales Trend">
            <div className="h-[500px] w-full flex justify-center items-center">
              <Line data={filteredChartData} />
            </div>
          </ChartBox>
        </div>
      </div>
    </div>
  );
}

/* ---------- COMPONENTS ---------- */
function DashboardCard({ title, value, color }: any) {
  return (
    <div className={`p-6 bg-white rounded-lg shadow border-l-4 border-${color}-500`}>
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function ChartBox({ title, children }: any) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}
