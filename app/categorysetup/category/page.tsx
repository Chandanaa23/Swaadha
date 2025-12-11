"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast, { Toaster } from "react-hot-toast";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Category {
  id: number;
  name: string;
  priority: number;
  image_url: string | null;
  home_status: boolean;
}

const ITEMS_PER_PAGE = 5;

export default function CategoriesPage() {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(1);
  const [file, setFile] = useState<File | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [fileKey, setFileKey] = useState(Date.now());




  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // field-level error state
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    priority?: string;
    image?: string;
  }>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE);
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    loadCategories();
  }, []);
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);



  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCategories(categories);
    } else {
      setFilteredCategories(
        categories.filter((cat) =>
          cat.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    setCurrentPage(1);
  }, [searchQuery, categories]);

  async function loadCategories() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from<Category>("categories")
        .select("*")
        .order("priority", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
      setFilteredCategories(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(): Promise<string | null> {
    // If editing and no new file selected, reuse existing image
    if (editingCategory && !file) {
      return editingCategory.image_url;
    }

    // If no file selected (adding new category), return null
    if (!file) return null;

    try {
      const base64 = await fileToBase64(file);
      return base64; // store this string in your DB
    } catch (err) {
      console.error("uploadImage failed:", err);
      return null;
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file); // produces "data:image/png;base64,....."
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }




  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = name.trim();
    const errors: typeof fieldErrors = {};

    // Basic validations
    if (!trimmedName) errors.name = "Category name is required.";
    if (priority < 1) errors.priority = "Priority must be at least 1.";

    // Image required only if adding a new category
    if (!file && !editingCategory) {
      errors.image = "Category image is required.";
    }

    // Check priority uniqueness
    const existingWithSamePriority = categories.find(
      (cat) => cat.priority === priority && cat.id !== editingCategory?.id
    );
    if (existingWithSamePriority) {
      errors.priority = `Priority ${priority} is already used by "${existingWithSamePriority.name}".`;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setError(null);
    toast.success(null); // Clear previous success message

    try {
      // Name uniqueness check (only for new categories)
      if (!editingCategory) {
        const { data: existing } = await supabase
          .from("categories")
          .select("id")
          .eq("name", trimmedName)
          .limit(1)
          .single();

        if (existing) {
          setFieldErrors({ name: "Category name already exists." });
          setSubmitting(false);
          return;
        }
      }

      const imageUrl = await uploadImage();

      if (!imageUrl && !editingCategory) {
        setFieldErrors({ image: "Category image is required." });
        setSubmitting(false);
        return;
      }

      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from("categories")
          .update({
            name: trimmedName,
            priority,
            image_url: imageUrl,
          })
          .eq("id", editingCategory.id);
        if (error) throw error;

        setEditingCategory(null);
        toast.success("Category updated successfully!");
      } else {
        // Insert new category
        const { error } = await supabase.from("categories").insert({
          name: trimmedName,
          priority,
          image_url: imageUrl,
          home_status: false,
        });
        if (error) throw error;

        toast.success("Category added successfully!");
      }

      // Reset form
      setName("");
      setPriority(1);
      setFile(null);
      setFieldErrors({});
      setFileKey(Date.now()); // force input to re-render and clear file

      await loadCategories();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  }



  async function toggleHome(id: number, currentStatus: boolean) {
    try {
      await supabase
        .from("categories")
        .update({ home_status: !currentStatus })
        .eq("id", id);
      loadCategories();
    } catch {
      toast.error("Failed to update home status.");
    }
  }

  async function deleteCategory(id: number) {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;

      // Update state locally instead of reloading from Supabase
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      setFilteredCategories((prev) => prev.filter((cat) => cat.id !== id));

      toast.success("Category deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete category.");
    }
  }



  function handleEdit(cat: Category) {
    setEditingCategory(cat);
    setName(cat.name);
    setPriority(cat.priority);
    setFile(null);
    setFieldErrors({});
  }

  function exportToExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredCategories.map(({ id, name, priority, home_status }) => ({
        ID: id,
        Name: name,
        Priority: priority,
        Home: home_status ? "Yes" : "No",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");
    XLSX.writeFile(workbook, "categories.xlsx");
  }

  return (
    <div className="min-h-screen w-full bg-white  flex flex-col p-8">
      <Toaster position="top-right" />

      <h1 className="text-3xl font-bold mb-8 ">
        Category Setup
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded shadow-sm max-w-6xl">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 max-w-full flex-grow">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded shadow p-6 w-full max-w-md"
        >
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            {editingCategory ? "Edit Category" : "Add Category"}
          </h2>

          {/* Name */}
          <label className="flex flex-col mb-4">
            <span className="mb-1 font-medium text-gray-700">
              Category Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter category name"
              className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 ${fieldErrors.name
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
                }`}
            />
            {fieldErrors.name && (
              <span className="text-red-600 text-sm mt-1">
                {fieldErrors.name}
              </span>
            )}
          </label>

          {/* Priority */}
          <label className="flex flex-col mb-4">
            <span className="mb-1 font-medium text-gray-700">
              Priority
            </span>
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
            {fieldErrors.priority && (
              <span className="text-red-600 text-sm mt-1">
                {fieldErrors.priority}
              </span>
            )}
          </label>

          {/* Image */}
          <label className="flex flex-col mb-6">
            <span className="mb-1 font-medium text-gray-700">
              Category Image
            </span>
            <input
              key={fileKey}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className={`border rounded px-3 py-2 ${fieldErrors.image ? "border-red-500" : "border-gray-300"}`}
            />



          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="
  bg-[#FAD6C0]
  text-white
  py-2
  rounded
  hover:bg-orange-400
  disabled:opacity-50
  disabled:cursor-not-allowed
  transition
  flex-1
  font-semibold
  text-center
"
            >

              {submitting
                ? "Saving..."
                : editingCategory
                  ? "Update"
                  : "Submit"}
            </button>
            {editingCategory && (
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setName("");
                  setPriority(1);
                  setFile(null);
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
              placeholder="Search categories..."
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
            <p className="text-gray-500">Loading categories...</p>
          ) : paginatedCategories.length === 0 ? (
            <p className="text-gray-500">No categories found.</p>
          ) : (
            <table className="w-full table-fixed border-collapse border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border border-gray-300 w-20">Image</th>
                  <th className="p-2 border border-gray-300">Name</th>
                  <th className="p-2 border border-gray-300 w-24">Priority</th>
                  <th className="p-2 border border-gray-300 w-20">Home</th>
                  <th className="p-2 border border-gray-300 w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategories.map((cat) => (
                  <tr key={cat.id} className="border-b">
                    <td className="p-2 border border-gray-300">
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={`${cat.name} category`}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded" />
                      )}
                    </td>
                    <td className="p-2 border border-gray-300">{cat.name}</td>
                    <td className="p-2 border border-gray-300 text-center">
                      {cat.priority}
                    </td>
                    <td className="p-2 border border-gray-300 text-center">
                      <input
                        type="checkbox"
                        checked={cat.home_status}
                        onChange={() =>
                          toggleHome(cat.id, cat.home_status)
                        }
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="p-2 border border-gray-300 text-center flex gap-3 justify-center">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="text-blue-600 hover:text-blue-800 transition p-1 rounded"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setCategoryToDelete(cat);
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

          {paginatedCategories.length > 0 && (
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
      {showDeleteModal && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
            <p className="mb-6">
              Are you sure you want to delete category <strong>{categoryToDelete.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCategoryToDelete(null);
                }}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!categoryToDelete) return;
                  try {
                    const { error } = await supabase
                      .from("categories")
                      .delete()
                      .eq("id", categoryToDelete.id);
                    if (error) throw error;

                    // Update state
                    setCategories((prev) =>
                      prev.filter((cat) => cat.id !== categoryToDelete.id)
                    );
                    setFilteredCategories((prev) =>
                      prev.filter((cat) => cat.id !== categoryToDelete.id)
                    );

                    toast.success("Category deleted successfully!");
                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to delete category.");
                  } finally {
                    setShowDeleteModal(false);
                    setCategoryToDelete(null);
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
