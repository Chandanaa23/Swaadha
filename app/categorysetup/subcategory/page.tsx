"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast, { Toaster } from "react-hot-toast"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Category {
  id: number;
  name: string;
}

interface Subcategory {
  id: number;
  name: string;
  category_id: number;
  category_name?: string; // joined from category table for display
  priority: number;
}

const ITEMS_PER_PAGE = 5;

export default function SubcategoriesPage() {
  const [subName, setSubName] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [priority, setPriority] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
const [subToDelete, setSubToDelete] = useState<Subcategory | null>(null);




  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubs, setFilteredSubs] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    priority?: string;
    category?: string;
  }>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredSubs.length / ITEMS_PER_PAGE);
  const paginatedSubs = filteredSubs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    loadCategories();
    loadSubcategories();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSubs(subcategories);
    } else {
      setFilteredSubs(
        subcategories.filter((sub) =>
          sub.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    setCurrentPage(1);
  }, [searchQuery, subcategories]);

  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from ("categories")
        .select("*")
        .order("priority", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load categories.");
    }
  }

  async function loadSubcategories() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
  .from("subcategories")
  .select(`*, categories(name)`)
  .order("priority", { ascending: true });


      if (error) throw error;

      // attach category_name for display
      const subs = (data || []).map((sub: any) => ({
        ...sub,
        category_name: sub.categories?.name,
      }));

      setSubcategories(subs);
      setFilteredSubs(subs);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load subcategories.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = subName.trim();
    const errors: typeof fieldErrors = {};
    if (!trimmedName) errors.name = "Subcategory name is required.";
    if (!categoryId) errors.category = "Category is required.";
    if (priority < 1) errors.priority = "Priority must be at least 1.";

    const existingWithPriority = subcategories.find(
      (sub) => sub.priority === priority && sub.id !== editingSub?.id
    );
    if (existingWithPriority) {
      errors.priority = `Priority ${priority} already used for "${existingWithPriority.name}"`;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    setError(null);

    try {
      if (!editingSub) {
        const { error } = await supabase.from("subcategories").insert({
          name: trimmedName,
          category_id: categoryId, // <-- use this
          priority,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subcategories")
          .update({ name: trimmedName, category_id: categoryId, priority })
          .eq("id", editingSub.id);
        if (error) throw error;
        setEditingSub(null);
      }


      setSubName("");
      setCategoryId(null);
      setPriority(1);
      setFieldErrors({});
      await loadSubcategories();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save subcategory.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(sub: Subcategory) {
    setEditingSub(sub);
    setSubName(sub.name);
    setCategoryId(sub.category_id);
    setPriority(sub.priority);
    setFieldErrors({});
  }

  async function deleteSub(id: number) {
    if (!confirm("Are you sure you want to delete this subcategory?")) return;
    try {
      await supabase.from("subcategories").delete().eq("id", id);
      loadSubcategories();
    } catch {
      toast.error("Failed to delete subcategory.");
    }
  }

  function exportToExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredSubs.map(({ id, name, category_name, priority }) => ({
        ID: id,
        Name: name,
        Category: category_name,
        Priority: priority,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Subcategories");
    XLSX.writeFile(workbook, "subcategories.xlsx");
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col p-8">
      <Toaster position="top-right" />

      <h1 className="text-3xl font-bold mb-8 ">
        Subcategory Setup
      </h1>



      <div className="flex flex-col lg:flex-row gap-8 max-w-full flex-grow">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded shadow p-6 w-full max-w-md"
        >
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            {editingSub ? "Edit Subcategory" : "Add Subcategory"}
          </h2>

          {/* Subcategory Name */}
          <label className="flex flex-col mb-4">
            <span className="mb-1 font-medium text-gray-700">Subcategory Name</span>
            <input
              type="text"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="Enter subcategory name"
              className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 ${fieldErrors.name
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
                }`}
            />
            {fieldErrors.name && <span className="text-red-600 text-sm mt-1">{fieldErrors.name}</span>}
          </label>

          {/* Category Dropdown */}
          <label className="flex flex-col mb-4">
            <span className="mb-1 font-medium text-gray-700">Category</span>
            <select
              value={categoryId || ""}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 ${fieldErrors.category
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
                }`}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <span className="text-red-600 text-sm mt-1">
                {fieldErrors.category}
              </span>
            )}
          </label>

          {/* Priority */}
          <label className="flex flex-col mb-6">
            <span className="mb-1 font-medium text-gray-700">Priority</span>
            <input
              type="number"
              min={1}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 ${fieldErrors.priority
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
                }`}
            />
            {fieldErrors.priority && <span className="text-red-600 text-sm mt-1">{fieldErrors.priority}</span>}
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#FAD6C0] text-white py-2 rounded hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition flex-1"
            >
              {submitting ? "Saving..." : editingSub ? "Update" : "Submit"}
            </button>
            {editingSub && (
              <button
                type="button"
                onClick={() => {
                  setEditingSub(null);
                  setSubName("");
                  setCategoryId(null);
                  setPriority(1);
                  setFieldErrors({});
                }}
                className="bg-gray-400 text-white py-2 rounded hover:bg-gray-500 transition flex-1"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="bg-white rounded shadow p-6 flex-grow">
          <div className="flex flex-col md:flex-row justify-between mb-4 gap-2">
            <input
              type="text"
              placeholder="Search subcategories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
            />
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Export Excel
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading subcategories...</p>
          ) : paginatedSubs.length === 0 ? (
            <p className="text-gray-500">No subcategories found.</p>
          ) : (
            <table className="w-full table-fixed border-collapse border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border border-gray-300">Name</th>
                  <th className="p-2 border border-gray-300">Category</th>
                  <th className="p-2 border border-gray-300 w-24">Priority</th>
                  <th className="p-2 border border-gray-300 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubs.map((sub) => (
                  <tr key={sub.id} className="border-b">
                    <td className="p-2 border border-gray-300">{sub.name}</td>
                    <td className="p-2 border border-gray-300">{sub.category_name}</td>
                    <td className="p-2 border border-gray-300 text-center">{sub.priority}</td>
                    <td className="p-2 border border-gray-300 text-center flex gap-3 justify-center">
                      <button
                        onClick={() => handleEdit(sub)}
                        className="text-blue-600 hover:text-blue-800 transition p-1 rounded"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
  onClick={() => {
    setSubToDelete(sub);
    setShowDeleteModal(true);
  }}
  className="text-red-600 hover:text-red-800 transition p-1 rounded"
  title="Delete"
>
  <TrashIcon className="h-5 w-5" />
</button>

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {paginatedSubs.length > 0 && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
      {showDeleteModal && subToDelete && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white rounded p-6 shadow-lg max-w-sm w-full">
      <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
      <p className="mb-6">
        Are you sure you want to delete subcategory <strong>{subToDelete.name}</strong>?
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            setShowDeleteModal(false);
            setSubToDelete(null);
          }}
          className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            if (!subToDelete) return;
            try {
              const { error } = await supabase
                .from("subcategories")
                .delete()
                .eq("id", subToDelete.id);
              if (error) throw error;

              // Update state locally
              setSubcategories((prev) =>
                prev.filter((sub) => sub.id !== subToDelete.id)
              );
              setFilteredSubs((prev) =>
                prev.filter((sub) => sub.id !== subToDelete.id)
              );

              toast.success("Subcategory deleted successfully!");
            } catch (err) {
              console.error(err);
              toast.error("Failed to delete subcategory.");
            } finally {
              setShowDeleteModal(false);
              setSubToDelete(null);
            }
          }}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
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
