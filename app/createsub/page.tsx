"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";
import { Eye, EyeOff, Trash2 } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Subadmin {
  id: string;
  email: string;
  password: string;
  created_at: string;
}

export default function SubadminSettings() {
  const [subadmins, setSubadmins] = useState<Subadmin[]>([]);
  const [selectedSubadmin, setSelectedSubadmin] = useState<Subadmin | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subadmin | null>(null); // For modal

  const fetchSubadmins = async () => {
    const { data, error } = await supabase
      .from("subadmins")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to fetch subadmins");
    else setSubadmins(data || []);
  };

  useEffect(() => {
    fetchSubadmins();
  }, []);

  const createSubadmin = () => {
    setSelectedSubadmin({
      id: "",
      email: "",
      password: "",
      created_at: new Date().toISOString(),
    });
    setShowPassword(false);
  };

  const saveSubadmin = async () => {
  if (!selectedSubadmin) return;
  setLoading(true);

  try {
    if (selectedSubadmin.id) {
      // Update existing subadmin
      const { error } = await supabase
        .from("subadmins")
        .update({
          email: selectedSubadmin.email,
          password: selectedSubadmin.password,
        })
        .eq("id", selectedSubadmin.id);

      if (error) throw error;
      toast.success("Subadmin updated!");
    } else {
      // Insert new subadmin
      const { data, error } = await supabase
        .from("subadmins")
        .insert({
          email: selectedSubadmin.email,
          password: selectedSubadmin.password,
          role: "subadmin", // default role
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success("Subadmin created!");
    }

    fetchSubadmins();
    setSelectedSubadmin(null);
  } catch (err: any) {
    console.error(err);
    toast.error("Failed to save subadmin: " + err.message);
  } finally {
    setLoading(false);
  }
};

  const confirmDelete = (subadmin: Subadmin) => {
    setDeleteTarget(subadmin);
  };

  const deleteSubadmin = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("subadmins")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) toast.error("Failed to delete subadmin");
    else {
      toast.success("Subadmin deleted");
      fetchSubadmins();
    }
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 bg-white min-h-screen space-y-4">
      <Toaster position="top-right" />
      <h2 className="text-3xl font-bold">Subadmin Management</h2>

      <button
        onClick={createSubadmin}
        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
      >
        + Create Subadmin
      </button>

      {/* Table */}
      <table className="w-full border rounded mt-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subadmins.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="p-2 border">{s.email}</td>
              <td className="p-2 border space-x-2 flex">
                <button
                  onClick={() => setSelectedSubadmin(s)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => confirmDelete(s)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Subadmin Form */}
      {selectedSubadmin && (
        <div className="p-4 border rounded shadow bg-white space-y-4 mt-4">
          <h3 className="text-xl font-semibold">
            {selectedSubadmin.id ? "Edit Subadmin" : "Create Subadmin"}
          </h3>

          <input
            type="email"
            placeholder="Email"
            value={selectedSubadmin.email}
            onChange={(e) =>
              setSelectedSubadmin({ ...selectedSubadmin, email: e.target.value })
            }
            className="w-full p-2 border rounded"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={selectedSubadmin.password}
              onChange={(e) =>
                setSelectedSubadmin({ ...selectedSubadmin, password: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-2 text-gray-500"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            onClick={saveSubadmin}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow max-w-sm w-full space-y-4">
            <h3 className="text-xl font-semibold">Confirm Delete</h3>
            <p>Are you sure you want to delete <strong>{deleteTarget.email}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={deleteSubadmin}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
