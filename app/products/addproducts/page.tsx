"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";

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
}

interface SubSubcategory {
  id: number;
  name: string;
  subcategory_id: number;
}

interface Attribute {
  id: number;
  type: string;
  name: string;
}

interface Variation {
  unit_type: string;
  price: number | string;
  stock: number | string;
}


export default function AddProduct() {
const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState([]);
const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  const [tastes, setTastes] = useState<any[]>([]);
  const [unitTypes, setUnitTypes] = useState<any[]>([]);
  const [fieldErrors, setFieldErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    category_id: "",
    subcategory_id: "",
    sub_subcategory_id: "",
    ingredients: "",
    taste_id: "",
    pack_of: "",
    max_shelf_life: "",
    has_variation: false,
    variations: [{ unit_type: "", price: "", stock: "" }],
    shipping_type: "free",
    shipping_charge: 0,
    youtube_url: "",
    images: [] as File[],
    imagePreviews: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: catData } = await supabase.from("categories").select("*");
setCategories(catData || []); // fallback to empty array


      const { data: attrData } = await supabase.from("attributes").select("*");
      setTastes(attrData?.filter((a) => a.type === "taste") || []);
      setUnitTypes(attrData?.filter((a) => a.type === "unit_type") || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch initial data");
    }
  };

  const handleCategoryChange = async (categoryId: string) => {
    setForm({ ...form, category_id: categoryId, subcategory_id: "", sub_subcategory_id: "" });
    const { data } = await supabase
  .from("subcategories")
  .select("*")
  .eq("category_id", categoryId) as { data: Subcategory[] | null };

    setSubSubcategories([]);
  };

  const handleSubcategoryChange = async (subcategoryId: string) => {
    setForm({ ...form, subcategory_id: subcategoryId, sub_subcategory_id: "" });
    const { data } = await supabase
    .from("sub_subcategories")
    .select("*")
    .eq("subcategory_id", subcategoryId)
    setSubSubcategories(data || []);
  };

  const handleVariationChange = (index: number, field: string, value: string) => {
  const newVariations = [...form.variations];
  (newVariations[index] as any)[field] = value;
  setForm({ ...form, variations: newVariations });
};


  const addVariation = () => {
    setForm({ ...form, variations: [...form.variations, { unit_type: "", price: "", stock: "" }] });
  };

  const removeVariation = (index: number) => {
    setForm({ ...form, variations: form.variations.filter((_, i) => i !== index) });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesArray = Array.from(e.target.files || []);
    const previews = filesArray.map((file) => URL.createObjectURL(file));
    setForm({ ...form, images: filesArray, imagePreviews: previews });
  };

  const generateSKU = () => {
    const sku = "SKU-" + Math.random().toString(36).substr(2, 8).toUpperCase();
    setForm({ ...form, sku });
  };

  const fileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const validateForm = () => {
    const errors: any = {};
    if (!form.name.trim()) errors.name = "Product name is required";
    if (!form.category_id) errors.category_id = "Category is required";
    if (!form.ingredients.trim()) errors.ingredients = "Ingredients required";
    if (!form.taste_id) errors.taste_id = "Taste is required";
    if (!form.pack_of.trim()) errors.pack_of = "Pack Of is required";
    if (!form.max_shelf_life.trim()) errors.max_shelf_life = "Max Shelf Life is required";
    if (form.shipping_type === "paid" && (!form.shipping_charge || form.shipping_charge <= 0)) errors.shipping_charge = "Enter valid shipping charge";
    if (form.images.length === 0) errors.images = "Upload at least one image";

    if (form.has_variation) {
      form.variations.forEach((v, i) => {
        if (!v.unit_type) errors[`variation_unit_type_${i}`] = "Unit type required";
        if (!v.price || Number(v.price) <= 0) errors[`variation_price_${i}`] = "Price must be > 0";
        if (!v.stock || Number(v.stock) < 0) errors[`variation_stock_${i}`] = "Stock cannot be negative";
      });
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .insert([{
          name: form.name,
          sku: form.sku,
          description: form.description,
          category_id: form.category_id,
          subcategory_id: form.subcategory_id || null,
          sub_subcategory_id: form.sub_subcategory_id || null,
          ingredients: form.ingredients,
          taste_id: form.taste_id || null,
          pack_of: form.pack_of,
          max_shelf_life: form.max_shelf_life,
          has_variation: form.has_variation,
          shipping_charge: form.shipping_type === "free" ? 0 : form.shipping_charge,
          youtube_url: form.youtube_url,
        }])
        .select()
        .single();

      if (productError) throw productError;

      const productId = productData.id;

      const variationsToInsert = form.variations
        .filter((v) => v.unit_type && v.price && v.stock)
        .map((v) => ({ product_id: productId, ...v }));
      if (variationsToInsert.length) await supabase.from("product_variations").insert(variationsToInsert);

      for (let file of form.images) {
        const base64 = await fileToBase64(file);
        await supabase.from("product_images").insert({ product_id: productId, image_url: base64 });
      }

      toast.success("Product added successfully!");

      // revoke previews to avoid memory leak
      form.imagePreviews.forEach((url) => URL.revokeObjectURL(url));

      setForm({
        name: "",
        sku: "",
        description: "",
        category_id: "",
        subcategory_id: "",
        sub_subcategory_id: "",
        ingredients: "",
        taste_id: "",
        pack_of: "",
        max_shelf_life: "",
        has_variation: false,
        variations: [{ unit_type: "", price: "", stock: "" }],
        shipping_type: "free",
        shipping_charge: 0,
        youtube_url: "",
        images: [],
        imagePreviews: [],
      });

      // reset dropdown data selections also
      setSubcategories([]);
      setSubSubcategories([]);
      setFieldErrors({});

    } catch (err: any) {
      console.error(err);
      toast.error("Failed to add product: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 w-full mx-auto">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-bold mb-4">Add Product</h1>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Product Name */}
        <div>
          <label>Product Name</label>
          <input
            type="text"
            className={`border p-2 w-full ${fieldErrors.name ? "border-red-500" : ""}`}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          {fieldErrors.name && <p className="text-red-500 text-sm">{fieldErrors.name}</p>}
        </div>

        {/* SKU */}
        <div>
          <label>SKU</label>
          <div className="flex space-x-2">
            <input type="text" className="border p-2 flex-1" value={form.sku} readOnly />
            <button type="button" className="bg-orange-500 text-white px-4" onClick={generateSKU}>
              Generate SKU
            </button>
          </div>
        </div>

        {/* Description */}
        <div>
          <label>Description</label>
          <textarea
            className={`border p-2 w-full ${fieldErrors.description ? "border-red-500" : ""}`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {fieldErrors.description && <p className="text-red-500 text-sm">{fieldErrors.description}</p>}
        </div>

        {/* Categories */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label>Category</label>
            <select
              className={`border p-2 w-full ${fieldErrors.category_id ? "border-red-500" : ""}`}
              value={form.category_id}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="">Select Category</option>
              {categories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {fieldErrors.category_id && <p className="text-red-500 text-sm">{fieldErrors.category_id}</p>}
          </div>

          <div>
            <label>Sub Category</label>
            <select
              className={`border p-2 w-full ${fieldErrors.subcategory_id ? "border-red-500" : ""}`}
              value={form.subcategory_id}
              onChange={(e) => handleSubcategoryChange(e.target.value)}
            >
              <option value="">Select Sub Category</option>
              {subcategories.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label>Sub Sub Category</label>
            <select
              className={`border p-2 w-full ${fieldErrors.sub_subcategory_id ? "border-red-500" : ""}`}
              value={form.sub_subcategory_id}
              onChange={(e) => setForm({ ...form, sub_subcategory_id: e.target.value })}
            >
              <option value="">Select Sub Sub Category</option>
              {subSubcategories.map((ss:any) => <option key={ss.id} value={ss.id}>{ss.name}</option>)}
            </select>
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <label>Ingredients</label>
          <textarea
            className={`border p-2 w-full ${fieldErrors.ingredients ? "border-red-500" : ""}`}
            value={form.ingredients}
            onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
          />
          {fieldErrors.ingredients && <p className="text-red-500 text-sm">{fieldErrors.ingredients}</p>}
        </div>

        {/* Taste, Pack, Shelf Life */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label>Taste</label>
            <select
              className={`border p-2 w-full ${fieldErrors.taste_id ? "border-red-500" : ""}`}
              value={form.taste_id}
              onChange={(e) => setForm({ ...form, taste_id: e.target.value })}
            >
              <option value="">Select Taste</option>
              {tastes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {fieldErrors.taste_id && <p className="text-red-500 text-sm">{fieldErrors.taste_id}</p>}
          </div>

          <div>
            <label>Pack Of</label>
            <input
              type="text"
              className={`border p-2 w-full ${fieldErrors.pack_of ? "border-red-500" : ""}`}
              value={form.pack_of}
              onChange={(e) => setForm({ ...form, pack_of: e.target.value })}
            />
            {fieldErrors.pack_of && <p className="text-red-500 text-sm">{fieldErrors.pack_of}</p>}
          </div>

          <div>
            <label>Max Shelf Life</label>
            <input
              type="text"
              className={`border p-2 w-full ${fieldErrors.max_shelf_life ? "border-red-500" : ""}`}
              value={form.max_shelf_life}
              onChange={(e) => setForm({ ...form, max_shelf_life: e.target.value })}
            />
            {fieldErrors.max_shelf_life && <p className="text-red-500 text-sm">{fieldErrors.max_shelf_life}</p>}
          </div>
        </div>

        {/* Has Variation */}
        <div className="flex items-center space-x-4">
          <label>Has Variation?</label>
          <input
            type="checkbox"
            checked={form.has_variation}
            onChange={(e) => setForm({ ...form, has_variation: e.target.checked })}
          />
        </div>

        {/* Variations Section */}
        <div>
          <h2 className="font-bold mb-2">Variations</h2>
          {form.variations.map((v, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 mb-2">
              <select
                className={`border p-2 ${fieldErrors[`variation_unit_type_${i}`] ? "border-red-500" : ""}`}
                value={v.unit_type}
                onChange={(e) => handleVariationChange(i, "unit_type", e.target.value)}
              >
                <option value="">Unit Type</option>
                {unitTypes.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
              {fieldErrors[`variation_unit_type_${i}`] && <p className="text-red-500 text-sm">{fieldErrors[`variation_unit_type_${i}`]}</p>}

              <input
                type="number"
                placeholder="Price"
                className={`border p-2 ${fieldErrors[`variation_price_${i}`] ? "border-red-500" : ""}`}
                value={v.price}
                onChange={(e) => handleVariationChange(i, "price", e.target.value)}
              />
              {fieldErrors[`variation_price_${i}`] && <p className="text-red-500 text-sm">{fieldErrors[`variation_price_${i}`]}</p>}

              <input
                type="number"
                placeholder="Stock"
                className={`border p-2 ${fieldErrors[`variation_stock_${i}`] ? "border-red-500" : ""}`}
                value={v.stock}
                onChange={(e) => handleVariationChange(i, "stock", e.target.value)}
              />
              {fieldErrors[`variation_stock_${i}`] && <p className="text-red-500 text-sm">{fieldErrors[`variation_stock_${i}`]}</p>}

              {form.has_variation && (
                <button type="button" className="bg-red-500 text-white px-2" onClick={() => removeVariation(i)}>Remove</button>
              )}
            </div>
          ))}
          {form.has_variation && (
            <button type="button" className="bg-green-500 text-white px-4" onClick={addVariation}>Add Variation</button>
          )}
        </div>

        {/* Shipping */}
        <div>
          <label>Shipping Type</label>
          <select
            className="border p-2 w-full"
            value={form.shipping_type}
            onChange={(e) => setForm({ ...form, shipping_type: e.target.value })}
          >
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
          {form.shipping_type === "paid" && (
            <input
              type="number"
              className={`border p-2 w-full mt-2 ${fieldErrors.shipping_charge ? "border-red-500" : ""}`}
              placeholder="Enter shipping charges"
              value={form.shipping_charge}
              onChange={(e) => setForm({ ...form, shipping_charge: Number(e.target.value)
 })}
            />
          )}
          {fieldErrors.shipping_charge && <p className="text-red-500 text-sm">{fieldErrors.shipping_charge}</p>}
        </div>

        {/* Images */}
        {/* Images */}
        <div>
          <label>Product Images</label>
          <input type="file" multiple onChange={handleImageChange} />
          {fieldErrors.images && <p className="text-red-500 text-sm">{fieldErrors.images}</p>}

          <div className="flex gap-2 mt-2 flex-wrap">
            {form.imagePreviews.map((src, i) => (
              <div key={i} className="relative w-24 h-24">
                <img
                  src={src}
                  alt="preview"
                  className="w-24 h-24 object-cover border rounded"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newImages = [...form.images];
                    const newPreviews = [...form.imagePreviews];
                    newImages.splice(i, 1);
                    newPreviews.splice(i, 1);
                    setForm({ ...form, images: newImages, imagePreviews: newPreviews });
                  }}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>


        {/* YouTube URL */}
        <div>
          <label>YouTube URL</label>
          <input
            type="text"
            className={`border p-2 w-full ${fieldErrors.youtube_url ? "border-red-500" : ""}`}
            value={form.youtube_url}
            onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
          />
        </div>

        <button type="submit" className="bg-orange-500 text-white px-4 py-2" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
