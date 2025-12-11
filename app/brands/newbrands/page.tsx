"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AddBrand() {
  const [form, setForm] = useState({
    brandName: "",
    altText: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(""); // Success message state

  // ------------------------
  // VALIDATION
  // ------------------------
  const validate = () => {
    const newErrors: any = {};

    if (!form.brandName.trim()) newErrors.brandName = "Brand name is required.";
    else if (form.brandName.length < 3)
      newErrors.brandName = "Brand name must be at least 3 characters.";

    if (!form.altText.trim()) newErrors.altText = "Image alt text is required.";

    if (!imageFile) newErrors.image = "Please upload an image.";
    else if (imageFile.size > 2 * 1024 * 1024)
      newErrors.image = "Image size must be less than 2MB.";
    else if (!["image/jpeg", "image/png", "image/jpg"].includes(imageFile.type))
      newErrors.image = "Only JPG, JPEG, PNG formats allowed.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ------------------------
  // IMAGE UPLOAD
  // ------------------------
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImageFile(file);
  };

  // ------------------------
  // SUBMIT FORM
  // ------------------------
  const handleSubmit = async () => {
  if (!validate()) return;

  setLoading(true);

  // -------------------------
  // Check if brand already exists (case-insensitive)
  // -------------------------
  const { data: existingBrand, error: fetchError } = await supabase
    .from("brands")
    .select("id")
    .ilike("name_en", form.brandName) // case-insensitive check
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Fetch Error:", fetchError);
    setLoading(false);
    return;
  }

  if (existingBrand) {
    setErrors({ ...errors, brandName: "Brand name already exists." });
    setLoading(false);
    return;
  }

  let imageUrl = null;

  // -------------------------
  // Upload image
  // -------------------------
  if (imageFile) {
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `brand_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("brand-images")
      .upload(fileName, imageFile, { cacheControl: 3600, upsert: false });

    if (uploadError) {
      console.error("Upload Error:", uploadError);
      setLoading(false);
      return;
    }

    const { data } = supabase.storage.from("brand-images").getPublicUrl(fileName);
    imageUrl = data.publicUrl;
  }

  // -------------------------
  // Insert into Supabase table
  // -------------------------
  const { error: insertError } = await supabase.from("brands").insert([
    {
      name_en: form.brandName,
      alt_text: form.altText,
      image_url: imageUrl,
    },
  ]);

  if (insertError) {
    console.error("Insert Error:", insertError);
  } else {
    setSuccessMsg("Brand added successfully!");
    handleReset();
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  setLoading(false);
};


  // ------------------------
  // RESET FORM
  // ------------------------
  const handleReset = () => {
    setForm({ brandName: "", altText: "" });
    setImageFile(null);
    setErrors({});
  };

  return (
    <div className="p-6 bg-white shadow rounded-md w-full max-w-full mx-auto relative">
      <h2 className="text-3xl font-bold mb-6">Brand Setup</h2>

      {/* SUCCESS MESSAGE POPUP */}
      {successMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded shadow-md">
          {successMsg}
        </div>
      )}

      {/* BRAND NAME */}
      <div className="mb-6">
        <label className="font-medium">Brand Name (EN) *</label>
        <input
          type="text"
          value={form.brandName}
          onChange={(e) => setForm({ ...form, brandName: e.target.value })}
          placeholder="Ex: LUX"
          className="w-full border px-4 py-2 rounded mt-2"
        />
        {errors.brandName && (
          <p className="text-red-600 text-sm mt-1">{errors.brandName}</p>
        )}
      </div>

      {/* ALT TEXT */}
      <div className="mb-6">
        <label className="font-medium">Image Alt Text *</label>
        <input
          type="text"
          value={form.altText}
          onChange={(e) => setForm({ ...form, altText: e.target.value })}
          placeholder="Ex: Apex Brand"
          className="w-full border px-4 py-2 rounded mt-2"
        />
        {errors.altText && (
          <p className="text-red-600 text-sm mt-1">{errors.altText}</p>
        )}
      </div>

      {/* IMAGE UPLOAD */}
      <div className="mb-6">
        <label className="font-medium">
          Upload Image <span className="text-red-500">(Size 1:1)</span>
        </label>
<label className="border-2 border-dashed w-48 h-48 flex flex-col items-center justify-center cursor-pointer bg-gray-50 rounded-md hover:bg-gray-100 mt-2">          {imageFile ? (
            <Image
              src={URL.createObjectURL(imageFile)}
              alt="Preview"
              width={200}
              height={200}
              className="object-cover w-full h-full rounded-md"
            />
          ) : (
            <>
              <span className="text-gray-600 text-sm">Upload Image</span>
              <span className="text-gray-400 text-xs mt-1">
                JPG, PNG, Max 2MB
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadImage}
          />
        </label>
        {errors.image && (
          <p className="text-red-600 text-sm mt-2">{errors.image}</p>
        )}
      </div>

      {/* BUTTONS */}
      <div className="flex justify-end gap-4 mt-8">
        <button
          className="bg-gray-300 px-5 py-2 rounded"
          onClick={handleReset}
        >
          Reset
        </button>

        <button
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
