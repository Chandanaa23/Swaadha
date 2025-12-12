"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Category { id: number; name: string; }
interface SubCategory { id: number; name: string; }
interface SubSubCategory { id: number; name: string; }
interface Taste { id: number; name: string; }

interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  ingredients?: string;
  category_id?: number;
  subcategory_id?: number;
  sub_subcategory_id?: number;
  pack_of?: string;
  max_shelf_life?: string;
  taste_id?: number;
  has_variation?: boolean;
  shipping_charge?: number;
  youtube_url?: string;
}

interface ProductVariation {
  id?: number;
  product_id?: number;
  unit_type: string;
  price: number;
  stock: number;
}

interface ProductImage {
  id?: number;
  product_id?: number;
  image_url: string;
}

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>([]);
  const [tastes, setTastes] = useState<Taste[]>([]);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    fetchProduct();
    fetchCategories();
    fetchTastes();
    fetchVariations();
    fetchImages();
  }, [productId]);

  const fetchProduct = async () => {
    const { data, error } = await supabase.from("products").select("*").eq("id", productId).single();
    if (error || !data) toast.error("Failed to fetch product");
    else setProduct(data);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("categories").select("*");
    if (!error && data) setCategories(data);
  };

  const fetchTastes = async () => {
    const { data, error } = await supabase.from("attributes").select("*");
    if (!error && data) setTastes(data);
  };

  const fetchVariations = async () => {
    const { data, error } = await supabase.from("product_variations").select("*").eq("product_id", productId);
    if (!error && data) setVariations(data);
  };

  const fetchImages = async () => {
    const { data, error } = await supabase.from("product_images").select("*").eq("product_id", productId);
    if (!error && data) setImages(data);
  };

  useEffect(() => {
    if (!product?.category_id) return;
    supabase.from("subcategories").select("*").eq("category_id", product.category_id).then(({ data, error }) => {
      if (!error && data) setSubCategories(data);
    });
  }, [product?.category_id]);

  useEffect(() => {
    if (!product?.subcategory_id || !product?.category_id) return;
    supabase.from("sub_subcategories")
      .select("*")
      .eq("category_id", product.category_id)
      .eq("subcategory_id", product.subcategory_id)
      .then(({ data, error }) => { if (!error && data) setSubSubCategories(data); });
  }, [product?.subcategory_id, product?.category_id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (!product) return;
    setProduct({
      ...product,
      [name]: type === "number" ? Number(value) : value,
    });
  };

  const handleVariationChange = (index: number, field: keyof ProductVariation, value: any) => {
    const updated = [...variations];
    (updated[index] as any)[field]  = field === "price" || field === "stock" ? Number(value) : value;
    setVariations(updated);
  };

  const addVariation = () => {
    setVariations([...variations, { unit_type: "", price: 0, stock: 0 }]);
  };

  const removeVariation = (index: number) => {
    const updated = [...variations];
    updated.splice(index, 1);
    setVariations(updated);
  };

  const handleImageFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImageFiles([...imageFiles, ...Array.from(e.target.files)]);
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from(folder).upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { publicUrl } = supabase.storage.from(folder).getPublicUrl(fileName).data;
    return publicUrl;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!product) return;

    try {
      // Update product
      const { error: prodError } = await supabase.from("products").update(product).eq("id", product.id);
      if (prodError) throw prodError;

      // Update variations
      for (let v of variations) {
        if (v.id) {
          await supabase.from("product_variations").update(v).eq("id", v.id);
        } else {
          await supabase.from("product_variations").insert({ ...v, product_id: product.id });
        }
      }

      // Upload new images
      for (let f of imageFiles) {
        const url = await uploadFile(f, "product-images");
        await supabase.from("product_images").insert({ product_id: product.id, image_url: url });
      }

      toast.success("Product updated successfully");
      router.push("/products/listproducts");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update product");
    }
  };
  const removeImage = async (imageId: number) => {
  try {
    await supabase.from("product_images").delete().eq("id", imageId);
    setImages(images.filter(img => img.id !== imageId));
    toast.success("Image removed successfully");
  } catch (err) {
    toast.error("Failed to remove image");
  }
};

const removeNewImage = (index: number) => {
  const updated = [...imageFiles];
  updated.splice(index, 1);
  setImageFiles(updated);
  toast.success("Removed selected file");
};


  if (!product) return <p className="text-center mt-20 text-gray-500">Loading product...</p>;

  return (
    <div className="p-8 max-w-7xl mx-auto bg-white shadow rounded-lg">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-bold mb-6">Edit Product</h1>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Product Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Name</label>
            <input type="text" name="name" value={product.name} onChange={handleChange} className="w-full p-3 border rounded-md" required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">SKU</label>
            <input type="text" name="sku" value={product.sku} onChange={handleChange} className="w-full p-3 border rounded-md" required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Description</label>
          <textarea name="description" value={product.description || ""} onChange={handleChange} className="w-full p-3 border rounded-md" rows={3}></textarea>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Ingredients</label>
          <textarea name="ingredients" value={product.ingredients || ""} onChange={handleChange} className="w-full p-3 border rounded-md" rows={2}></textarea>
        </div>

        {/* Category & Taste */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label>Category</label>
            <select name="category_id" value={product.category_id || ""} onChange={handleChange} className="w-full p-3 border rounded-md">
              <option value="">Select</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>SubCategory</label>
            <select name="subcategory_id" value={product.subcategory_id || ""} onChange={handleChange} className="w-full p-3 border rounded-md">
              <option value="">Select</option>
              {subCategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
            </select>
          </div>
          <div>
            <label>SubSubCategory</label>
            <select name="sub_subcategory_id" value={product.sub_subcategory_id || ""} onChange={handleChange} className="w-full p-3 border rounded-md">
              <option value="">Select</option>
              {subSubCategories.map(ssc => <option key={ssc.id} value={ssc.id}>{ssc.name}</option>)}
            </select>
          </div>
          <div>
            <label>Taste</label>
            <select name="taste_id" value={product.taste_id || ""} onChange={handleChange} className="w-full p-3 border rounded-md">
              <option value="">Select</option>
              {tastes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {/* Pack & Shelf Life */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label>Pack Of</label>
            <input type="text" name="pack_of" value={product.pack_of || ""} onChange={handleChange} className="w-full p-3 border rounded-md" />
          </div>
          <div>
            <label>Max Shelf Life</label>
            <input type="text" name="max_shelf_life" value={product.max_shelf_life || ""} onChange={handleChange} className="w-full p-3 border rounded-md" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" name="has_variation" checked={!!product.has_variation} onChange={e => setProduct({...product, has_variation: e.target.checked})} className="w-4 h-4 border-gray-300" />
          <span>Has Variations</span>
        </div>

        {/* Product Variations */}
        {product.has_variation && (
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Variations</h3>
            {variations.map((v, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                <input placeholder="Unit Type" value={v.unit_type} onChange={e => handleVariationChange(idx, "unit_type", e.target.value)} className="p-2 border rounded" />
                <input type="number" placeholder="Price" value={v.price} onChange={e => handleVariationChange(idx, "price", e.target.value)} className="p-2 border rounded" />
                <input type="number" placeholder="Stock" value={v.stock} onChange={e => handleVariationChange(idx, "stock", e.target.value)} className="p-2 border rounded" />
                <button type="button" onClick={() => removeVariation(idx)} className="bg-red-500 text-white rounded px-2">Remove</button>
              </div>
            ))}
            <button type="button" onClick={addVariation} className="bg-orange-500 text-white rounded px-4 py-1">Add Variation</button>
          </div>
        )}

        {/* Product Images */}
        {/* Product Images */}
<div>
  <label className="block font-semibold mb-1">Images</label>
  <input
    type="file"
    accept="image/*"
    multiple
    onChange={handleImageFiles}
    className="w-full p-2 border rounded"
  />

  {/* Existing Images */}
  <h4 className="mt-3 font-medium text-gray-700">Existing Images</h4>
  <div className="flex flex-wrap gap-3 mt-2">
    {images.map(img => (
      <div key={img.id} className="relative">
        <img
          src={img.image_url}
          alt="Product"
          className="w-24 h-24 object-cover rounded border"
        />
        <button
          type="button"
          onClick={() => removeImage(img.id!)}
          className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded"
        >
          Remove
        </button>
      </div>
    ))}
  </div>

  {/* New Uploaded (Preview Before Save) */}
  {imageFiles.length > 0 && (
    <>
      <h4 className="mt-4 font-medium text-gray-700">Selected New Images</h4>
      <div className="flex flex-wrap gap-3 mt-2">
        {imageFiles.map((file, idx) => (
          <div key={idx} className="relative">
            <img
              src={URL.createObjectURL(file)}
              alt="new upload"
              className="w-24 h-24 object-cover rounded border"
            />
            <button
              type="button"
              onClick={() => removeNewImage(idx)}
              className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 rounded"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </>
  )}
</div>

        {/* YouTube URL */}
<div>
  <label className="block text-sm font-semibold mb-1">YouTube URL</label>
  <input
    type="text"
    name="youtube_url"
    value={product.youtube_url || ""}
    onChange={handleChange}
    placeholder="https://www.youtube.com/watch?v=..."
    className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-400"
  />
</div>


        <button type="submit" className="bg-orange-500 text-white px-6 py-3">Update Product</button>
      </form>
    </div>
  );
}
