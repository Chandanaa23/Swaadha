"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Brand {
  id: number;
  name_en: string;
  image_url: string | null;
  status?: boolean;
}

export default function BrandList() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Edit modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [requireNewImage, setRequireNewImage] = useState(false);

  // Fetch brands
  const fetchBrands = async () => {
    setLoading(true);
    let query = supabase.from("brands").select("*");
    if (search.trim()) query = query.ilike("name_en", `%${search}%`);
    const { data, error } = await query.order("id", { ascending: true });
    if (error) console.error(error);
    else setBrands(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  // Search
  const handleSearch = () => fetchBrands();

  // Status toggle
  const toggleStatus = async (brand: Brand) => {
    const { error } = await supabase
      .from("brands")
      .update({ status: !brand.status })
      .eq("id", brand.id);
    if (error) console.error(error);
    else fetchBrands();
  };

  // Delete brand
  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Are you sure you want to delete ${brand.name_en}?`)) return;
    const { error } = await supabase.from("brands").delete().eq("id", brand.id);
    if (error) console.error(error);
    else fetchBrands();
  };

  // Open edit modal
  const openEditModal = (brand: Brand) => {
    setSelectedBrand(brand);
    setNameInput(brand.name_en || "");
    setImageFile(null);
    setRequireNewImage(false);
    setIsModalOpen(true);
  };

  // Save changes
  const handleSave = async () => {
  if (!selectedBrand) return;

  let updatedData: any = { name_en: nameInput.trim() };

  // ------------------------------------------
  // 1. DELETE OLD IMAGE IF REPLACED OR REMOVED
  // ------------------------------------------
  if ((requireNewImage || imageFile) && selectedBrand.image_url) {
    const path = selectedBrand.image_url.split("/").pop()?.split("?")[0];

    if (path) {
      const { error: deleteError } = await supabase.storage
        .from("brand-images")
        .remove([path]);

      if (deleteError)
        console.error("Error deleting old image:", deleteError);
    }

    // Mark empty if user removed image
    if (!imageFile) {
      updatedData.image_url = null;
    }
  }

  // ------------------------------------------
  // 2. UPLOAD NEW IMAGE (IF provided)
  // ------------------------------------------
  if (imageFile) {
    const ext = imageFile.name.split(".").pop();
    const filename = `brand_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("brand-images")
      .upload(filename, imageFile);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return;
    }

    // PUBLIC URL + CACHE BUSTER
    const { data } = supabase.storage
  .from("brand-images")
  .getPublicUrl(filename);

const publicUrl = data?.publicUrl || "";

updatedData.image_url = `${publicUrl}?v=${Date.now()}`;
// <--- prevents caching
  }

  // ------------------------------------------
  // 3. UPDATE BRAND RECORD
  // ------------------------------------------
  const { error } = await supabase
    .from("brands")
    .update(updatedData)
    .eq("id", selectedBrand.id);

  if (error) {
    console.error(error);
    return;
  }

  // Reset UI
  fetchBrands();
  setIsModalOpen(false);
  setImageFile(null);
  setRequireNewImage(false);
};

  return (
    <div className="p-6 bg-white shadow rounded-md w-full max-w-6xl mx-auto">
  
  <h2 className="text-3xl font-bold mb-4">Brand List</h2>

  {/* Search + Export Row */}
  <div className="flex gap-2 mb-4 items-center">
    <input
      type="text"
      placeholder="Search by brand name"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="border px-4 py-2 rounded flex-1"
    />

    <button
      onClick={handleSearch}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      Search
    </button>

    <button
      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
    >
      Export
    </button>
  </div>


      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2">SL</th>
              <th className="border px-4 py-2">Brand Logo</th>
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Status</th>
              <th className="border px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : brands.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  No brands found.
                </td>
              </tr>
            ) : (
              brands.map((brand, index) => (
                <tr key={brand.id} className="text-center">
                  <td className="border px-4 py-2">{index + 1}</td>
                  <td className="border px-4 py-2 flex justify-center">
                    {brand.image_url ? (
                      <Image
                        src={brand.image_url}
                        alt={brand.name_en}
                        width={50}
                        height={50}
                        className="object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 flex items-center justify-center rounded">
                        <span className="text-gray-400">No Img</span>
                      </div>
                    )}
                  </td>
                  <td className="border px-4 py-2">{brand.name_en}</td>
                  <td className="border px-4 py-2">
                    <input
                      type="checkbox"
                      checked={brand.status || false}
                      onChange={() => toggleStatus(brand)}
                      className="toggle toggle-sm"
                    />
                  </td>
                  <td className="border px-4 py-2 flex justify-center gap-2">
                    <button
                      className="text-blue-500 hover:text-blue-700"
                      onClick={() => openEditModal(brand)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(brand)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {isModalOpen && selectedBrand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Brand</h3>
            <div className="flex flex-col gap-3">
              {/* Current Image */}
              <div className="text-center mb-2">
                <p className="text-sm text-gray-500">Current Image</p>
                <div className="w-32 h-32 mx-auto my-1">
                  {selectedBrand.image_url ? (
  <Image
    key={selectedBrand.image_url}     // ← 🔥 FORCE REFRESH
    src={selectedBrand.image_url}
    alt={selectedBrand.name_en}
    width={128}
    height={128}
    className="object-cover rounded"
  />
) : (
                    <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded">
                      <span className="text-gray-400">No Img</span>
                    </div>
                  )}
                </div>
                {selectedBrand.image_url && (
                  <button
                    type="button"
                    className="text-red-500 text-sm underline"
                    onClick={() => {
                      setSelectedBrand({ ...selectedBrand, image_url: null });
                      setRequireNewImage(true);
                      setImageFile(null);
                      alert(
                        "You removed the current image. Please upload a new image before saving."
                      );
                    }}
                  >
                    Remove Current Image
                  </button>
                )}
              </div>

              {/* Upload New Image */}
              {requireNewImage && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-gray-500">Upload New Image</p>
                  <input
                    type="file"
                    onChange={(e) =>
                      setImageFile(e.target.files ? e.target.files[0] : null)
                    }
                    className="border px-3 py-2 rounded"
                  />
                  {imageFile && (
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded mx-auto mt-2"
                    />
                  )}
                </div>
              )}

              {/* Brand Name Input */}
              <input
                type="text"
                value={nameInput || ""}
                onChange={(e) => setNameInput(e.target.value)}
                className="border px-3 py-2 rounded"
                placeholder="Brand Name"
              />

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
