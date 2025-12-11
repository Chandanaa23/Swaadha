"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function CustomerListPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const USERS_PER_PAGE = 15;

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/customers");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleBlockUser = async (userId: string, block: boolean) => {
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, block }),
    });
    fetchUsers();
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredUsers.map(u => ({
        Email: u.email,
        Phone: u.user_metadata?.phone ?? "N/A",
        CreatedAt: new Date(u.created_at).toLocaleString(),
        LastLogin: u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "Never",
        Status: u.user_metadata?.is_blocked ? "Blocked" : "Active",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "customers.xlsx");
  };

  if (loading)
    return <p className="p-10 text-lg font-medium text-gray-700">Loading customers...</p>;

  // Filter & Search logic
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.user_metadata?.phone ?? "").includes(search);
    const matchesStatus =
      statusFilter === "All"
        ? true
        : statusFilter === "Active"
        ? !u.user_metadata?.is_blocked
        : u.user_metadata?.is_blocked;
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * USERS_PER_PAGE,
    page * USERS_PER_PAGE
  );

  // Clear filters
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  return (
    <div className="p-6 md:p-10 bg-white">
      <h1 className="text-3xl font-semibold text-gray-800 mb-4">Customer List</h1>

      {/* Search & Filter Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-start gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by Email or Phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 w-full md:w-68"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 w-full md:w-48"
        >
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Blocked">Blocked</option>
        </select>
        <button
          onClick={clearFilters}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition md:w-28"
        >
          Clear
        </button>
        <button
          onClick={exportToExcel}
          className="px-5 py-2 bg-green-500 text-white font-medium rounded-lg shadow hover:bg-green-600 transition"
        >
          Excel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Created At</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Last Login</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedUsers.map(u => (
              <tr
                key={u.id}
                className="hover:bg-gray-50 transition rounded-lg"
              >
                <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{u.user_metadata?.phone ?? "N/A"}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{new Date(u.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "Never"}
                </td>
                <td className={`px-4 py-3 text-sm font-semibold ${u.user_metadata?.is_blocked ? 'text-red-600' : 'text-green-600'}`}>
                  {u.user_metadata?.is_blocked ? "Blocked" : "Active"}
                </td>
                <td className="px-4 py-3 flex space-x-2">
                  {u.user_metadata?.is_blocked ? (
                    <button
                      onClick={() => toggleBlockUser(u.id, false)}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
                    >
                      Unblock
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleBlockUser(u.id, true)}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                    >
                      Block
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1 rounded ${p === page ? 'bg-orange-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
