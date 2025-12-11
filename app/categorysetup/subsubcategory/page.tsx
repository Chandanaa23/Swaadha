"use client"; 

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

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
  category_name?: string;
  priority: number;
}

interface SubSubcategory {
  id: number;
  name: string;
  category_id: number;
  subcategory_id: number;
  priority: number;
  category_name?: string;
  subcategory_name?: string;
}

const ITEMS_PER_PAGE = 5;

export default function SubSubcategoriesPage() {
  const [subSubName, setSubSubName] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [priority, setPriority] = useState(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  const [filteredSubs, setFilteredSubs] = useState<SubSubcategory[]>([]);

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    category?: string;
    subcategory?: string;
    priority?: string;
  }>({});

  const [editing, setEditing] = useState<SubSubcategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    loadSubSubcategories();
  }, []);

  useEffect(() => {
    if (categoryId) {
      setFilteredSubcategories(subcategories.filter((sub) => sub.category_id === categoryId));
    } else {
      setFilteredSubcategories([]);
    }
    setSubcategoryId(null);
  }, [categoryId, subcategories]);

  useEffect(() => {
    // Filter table based on search
    if (!searchQuery.trim()) {
      setFilteredSubs(subSubcategories);
    } else {
      setFilteredSubs(
        subSubcategories.filter((sub) =>
          sub.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    setCurrentPage(1);
  }, [searchQuery, subSubcategories]);

  async function loadCategories() {
    const { data, error } = await supabase.from<Category>("categories").select("*").order("priority");
    if (error) return console.error(error);
    setCategories(data || []);
  }
  async function loadSubcategories() {
  setError(null);
  try {
    const { data, error } = await supabase
      .from<Subcategory>("subcategories")
      .select("*")
      .order("priority");
    if (error) throw error;
    setSubcategories(data || []);
  } catch (err: any) {
    console.error("Supabase load subcategories error:", err.message ?? JSON.stringify(err));
    setError("Failed to load subcategories");
  }
}


  async function loadSubSubcategories() {
  setLoading(true);
  setError(null);

  try {
    const { data, error } = await supabase
      .from<SubSubcategory>("sub_subcategories")
      .select(`
        *,
        categories(name),
        subcategories(name)
      `)
      .order("priority");

    if (error) throw error;

    const subs = (data || []).map((sub: any) => ({
      ...sub,
      category_name: sub.categories?.name,
      subcategory_name: sub.subcategories?.name,
    }));

    setSubSubcategories(subs);
  } catch (err: any) {
    console.error("Supabase load error:", err.message ?? JSON.stringify(err));
    setError("Failed to load sub-subcategories");
  } finally {
    setLoading(false);
  }
}



  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  const trimmedName = subSubName.trim();
  const errors: typeof fieldErrors = {};

  // 1️⃣ Validate mandatory fields
  if (!trimmedName) errors.name = "Sub-Subcategory name is required";
  if (!categoryId || isNaN(categoryId)) errors.category = "Category is required";
  if (!subcategoryId || isNaN(subcategoryId)) errors.subcategory = "Subcategory is required";
  if (!priority || priority < 1) errors.priority = "Priority must be at least 1";

  // Stop if basic validation fails
  if (Object.keys(errors).length) {
    setFieldErrors(errors);
    return;
  }

  setSubmitting(true);
  setError(null);

  try {
    // 2️⃣ Check uniqueness of name within subcategory
    const { data: existingName } = await supabase
      .from("sub_subcategories")
      .select("id")
      .eq("subcategory_id", subcategoryId)
      .eq("name", trimmedName)
      .maybeSingle();

    if (existingName && (!editing || existingName.id !== editing.id)) {
      errors.name = "Sub-Subcategory name already exists in this subcategory";
    }

    // 3️⃣ Check uniqueness of priority within subcategory
    const { data: existingPriority } = await supabase
      .from("sub_subcategories")
      .select("id")
      .eq("subcategory_id", subcategoryId)
      .eq("priority", priority)
      .maybeSingle();

    if (existingPriority && (!editing || existingPriority.id !== editing.id)) {
      errors.priority = "This priority is already used in the selected subcategory";
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    // 4️⃣ Insert or update
    if (!editing) {
      const { error } = await supabase.from("sub_subcategories").insert({
        name: trimmedName,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        priority,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("sub_subcategories")
        .update({
          name: trimmedName,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          priority,
        })
        .eq("id", editing.id);
      if (error) throw error;

      setEditing(null);
    }

    // Reset form
    setSubSubName("");
    setCategoryId(null);
    setSubcategoryId(null);
    setPriority(1);
    setFieldErrors({});
    await loadSubSubcategories();
  } catch (err: any) {
    console.error("Supabase insert/update error:", err.message ?? JSON.stringify(err));
    setError(err.message ?? "Failed to save sub-subcategory");
  } finally {
    setSubmitting(false);
  }
}


  function handleEdit(item: SubSubcategory) {
    setEditing(item);
    setSubSubName(item.name);
    setCategoryId(item.category_id);
    setSubcategoryId(item.subcategory_id);
    setPriority(item.priority);
    setFieldErrors({});
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from("sub_subcategories").delete().eq("id", id);
    if (error) return console.error(error);
    loadSubSubcategories();
  }

  function exportToExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredSubs.map(({ id, name, category_name, subcategory_name, priority }) => ({
        ID: id,
        Name: name,
        Category: category_name,
        Subcategory: subcategory_name,
        Priority: priority,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sub-Subcategories");
    XLSX.writeFile(workbook, "sub_subcategories.xlsx");
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col p-8">
      <h1 className="text-3xl font-bold mb-8 ">Sub-Subcategory Setup</h1>

      {error && <div className="mb-6 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

      <div className="flex flex-col lg:flex-row gap-8 max-w-full flex-grow">
        <form onSubmit={handleSubmit} className="bg-white rounded shadow p-6 w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            {editing ? "Edit Sub-Subcategory" : "Add Sub-Subcategory"}
          </h2>

          {/* Sub-Subcategory Name */}
          <label className="flex flex-col mb-4">
            <span className="mb-1 font-medium text-gray-700">Sub-Subcategory Name</span>
            <input
              type="text"
              value={subSubName}
              onChange={(e) => setSubSubName(e.target.value)}
              placeholder="Enter name"
              className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 ${
                fieldErrors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
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
              className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 ${
                fieldErrors.category ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
              }`}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {fieldErrors.category && <span className="text-red-600 text-sm mt-1">{fieldErrors.category}</span>}
          </label>

          {/* Subcategory Dropdown */}
          <label className="flex flex-col mb-4">
            <span className="mb-1 font-medium text-gray-700">Subcategory</span>
            <select
              value={subcategoryId || ""}
              onChange={(e) => setSubcategoryId(Number(e.target.value))}
              className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 ${
                fieldErrors.subcategory ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
              }`}
            >
              <option value="">Select subcategory</option>
              {filteredSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
            {fieldErrors.subcategory && <span className="text-red-600 text-sm mt-1">{fieldErrors.subcategory}</span>}
          </label>

          {/* Priority */}
          <label className="flex flex-col mb-6">
            <span className="mb-1 font-medium text-gray-700">Priority</span>
            <input
              type="number"
              min={1}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 ${
                fieldErrors.priority ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
              }`}
            />
            {fieldErrors.priority && <span className="text-red-600 text-sm mt-1">{fieldErrors.priority}</span>}
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#FAD6C0] text-white py-2 rounded hover:bg-orange-200 disabled:opacity-50 flex-1"
            >
              {submitting ? "Saving..." : editing ? "Update" : "Submit"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setSubSubName("");
                  setCategoryId(null);
                  setSubcategoryId(null);
                  setPriority(1);
                  setFieldErrors({});
                }}
                className="bg-gray-400 text-white py-2 rounded hover:bg-gray-500 flex-1"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Table */}
        <section className="bg-white rounded shadow p-6 flex-grow">
          <div className="flex flex-col md:flex-row justify-between mb-4 gap-2">
            <input
              type="text"
              placeholder="Search sub-subcategories..."
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
            <p className="text-gray-500">Loading...</p>
          ) : paginatedSubs.length === 0 ? (
            <p className="text-gray-500">No sub-subcategories found.</p>
          ) : (
            <table className="w-full table-fixed border-collapse border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border border-gray-300">Name</th>
                  <th className="p-2 border border-gray-300">Category</th>
                  <th className="p-2 border border-gray-300">Subcategory</th>
                  <th className="p-2 border border-gray-300 w-24">Priority</th>
                  <th className="p-2 border border-gray-300 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubs.map((sub) => (
                  <tr key={sub.id} className="border-b">
                    <td className="p-2 border border-gray-300">{sub.name}</td>
                    <td className="p-2 border border-gray-300">{sub.category_name}</td>
                    <td className="p-2 border border-gray-300">{sub.subcategory_name}</td>
                    <td className="p-2 border border-gray-300 text-center">{sub.priority}</td>
                    <td className="p-2 border border-gray-300 flex gap-3 justify-center">
                      <button onClick={() => handleEdit(sub)} className="text-blue-600 hover:text-blue-800">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDelete(sub.id)} className="text-red-600 hover:text-red-800">
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
    </div>
  );
}
