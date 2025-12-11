"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";
import { TrashIcon, PencilIcon } from "@heroicons/react/24/outline";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [applyTo, setApplyTo] = useState<"all" | "category">("all");

  const [title, setTitle] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [subSubcategoryId, setSubSubcategoryId] = useState<number | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);

  const [editId, setEditId] = useState<number | null>(null);

  const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd format

  useEffect(() => {
    fetchOffers();
    fetchCategories();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    const { data } = await supabase.from("offers").select("*").order("id");
    setOffers(data || []);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id,name");
    setCategories(data || []);
  };

  const fetchSubcategories = async (id: number) => {
    const { data } = await supabase
      .from("subcategories")
      .select("id,name")
      .eq("category_id", id);

    setSubcategories(data || []);
  };

  const fetchSubSub = async (id: number) => {
    const { data } = await supabase
      .from("sub_subcategories")
      .select("id,name")
      .eq("subcategory_id", id);

    setSubSubcategories(data || []);
  };

  const validateForm = () => {
    if (!title) return toast.error("Offer title required");
    if (!discountValue) return toast.error("Discount value required");
    if (!startDate || !endDate) return toast.error("Start & End date required");

    if (applyTo === "category") {
      if (!categoryId) return toast.error("Select a category");
      if (!subcategoryId) return toast.error("Select a subcategory");
      if (!subSubcategoryId)
        return toast.error("Select a sub-subcategory");
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const payload = {
      title,
      discount_type: discountType,
      discount_value: Number(discountValue),

      category_id: applyTo === "all" ? null : categoryId,
      subcategory_id: applyTo === "all" ? null : subcategoryId,
      sub_subcategory_id: applyTo === "all" ? null : subSubcategoryId,

      start_date: startDate,
      end_date: endDate,
      is_active: true,
    };

    let error;
    if (editId) {
      const res = await supabase
        .from("offers")
        .update(payload)
        .eq("id", editId);
      error = res.error;
    } else {
      const res = await supabase.from("offers").insert(payload);
      error = res.error;
    }

    if (error) toast.error("Failed to save offer");
    else {
      toast.success(editId ? "Offer updated" : "Offer created");
      resetForm();
      fetchOffers();
    }
  };

  const handleEdit = (o: any) => {
    setEditId(o.id);
    setTitle(o.title);
    setDiscountType(o.discount_type);
    setDiscountValue(o.discount_value);
    setStartDate(o.start_date);
    setEndDate(o.end_date);

    if (o.category_id) {
      setApplyTo("category");
      setCategoryId(o.category_id);
      fetchSubcategories(o.category_id);
      setSubcategoryId(o.subcategory_id);
      fetchSubSub(o.subcategory_id);
      setSubSubcategoryId(o.sub_subcategory_id);
    } else {
      setApplyTo("all");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;

    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Offer deleted");
      fetchOffers();
    }
  };

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setDiscountValue("");
    setCategoryId(null);
    setSubcategoryId(null);
    setSubSubcategoryId(null);
    setApplyTo("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="p-6 w-full">
      <Toaster />

      <h1 className="text-3xl font-bold mb-6">Offer Management</h1>

      {/* FORM */}
      <div className="bg-white p-6 rounded shadow mb-8">

        <h2 className="text-xl font-semibold mb-4">
          {editId ? "Edit Offer" : "Create Offer"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Apply To */}
          <div>
            <label className="font-medium">Apply Offer To</label>
            <select
              className="border p-2 rounded w-full"
              value={applyTo}
              onChange={(e) => setApplyTo(e.target.value as any)}
            >
              <option value="all">All Products</option>
              <option value="category">Specific Categories</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="font-medium">Offer Title</label>
            <input
              className="border p-2 rounded w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: Summer Sale 30% OFF"
            />
          </div>

          {/* Discount */}
          <div>
            <label className="font-medium">Discount Value</label>
            <input
              type="number"
              className="border p-2 rounded w-full"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>

          {/* SHOW CATEGORY FIELDS ONLY IF applyTo = category */}
          {applyTo === "category" && (
            <>
              {/* Category */}
              <div>
                <label className="font-medium">Category</label>
                <select
                  className="border p-2 rounded w-full"
                  value={categoryId || ""}
                  onChange={async (e) => {
                    const id = Number(e.target.value);
                    setCategoryId(id);
                    setSubcategoryId(null);
                    setSubSubcategoryId(null);
                    fetchSubcategories(id);
                  }}
                >
                  <option value="">Select Category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              <div>
                <label className="font-medium">Subcategory</label>
                <select
                  className="border p-2 rounded w-full"
                  value={subcategoryId || ""}
                  onChange={async (e) => {
                    const id = Number(e.target.value);
                    setSubcategoryId(id);
                    fetchSubSub(id);
                  }}
                >
                  <option value="">Select Subcategory</option>
                  {subcategories.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Subcategory */}
              <div>
                <label className="font-medium">Sub-Subcategory</label>
                <select
                  className="border p-2 rounded w-full"
                  value={subSubcategoryId || ""}
                  onChange={(e) => setSubSubcategoryId(Number(e.target.value))}
                >
                  <option value="">Select Sub-Subcategory</option>
                  {subSubcategories.map((ss: any) => (
                    <option key={ss.id} value={ss.id}>
                      {ss.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Dates */}
          {/* Start Date */}
<div>
  <label className="font-medium">Start Date</label>
  <input
    type="date"
    className="border p-2 rounded w-full"
    value={startDate}
    min={today} // cannot select before today
    onChange={(e) => setStartDate(e.target.value)}
  />
</div>

{/* End Date */}
<div>
  <label className="font-medium">End Date</label>
  <input
    type="date"
    className="border p-2 rounded w-full"
    value={endDate}
    min={startDate || today} // cannot select before startDate
    onChange={(e) => setEndDate(e.target.value)}
  />
</div>

        </div>

        <button
          onClick={handleSubmit}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded"
        >
          {editId ? "Update Offer" : "Create Offer"}
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Offers List</h2>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-3">Title</th>
              <th className="border p-3">Discount</th>
              <th className="border p-3">Apply To</th>
              <th className="border p-3">Start</th>
              <th className="border p-3">End</th>
              <th className="border p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {offers.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="border p-3">{o.title}</td>
                <td className="border p-3">
                  {o.discount_value}
                  {o.discount_type === "percentage" ? "%" : "₹"}
                </td>

                <td className="border p-3">
                  {o.category_id ? "Specific Category" : "All Products"}
                </td>

                <td className="border p-3">{o.start_date}</td>
                <td className="border p-3">{o.end_date}</td>

                <td className="border p-3 flex gap-2 justify-center">
                  <button
                    className="bg-yellow-500 text-white p-2 rounded"
                    onClick={() => handleEdit(o)}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>

                  <button
                    className="bg-red-600 text-white p-2 rounded"
                    onClick={() => handleDelete(o.id)}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}
