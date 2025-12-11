"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";
import { PencilIcon, Trash } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Hero {
  id: string;
  images: string[];
  active: boolean;
  created_at: string;
}

export default function HeroSettings() {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);


  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 5; // number of heroes per page
  const [totalHeroes, setTotalHeroes] = useState(0);

  // Fetch heroes with pagination
  const fetchHeroes = async () => {
    const { data, count, error } = await supabase
      .from("hero_section")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) toast.error("Failed to fetch heroes");
    else {
      setHeroes(data || []);
      setTotalHeroes(count || 0);
    }
  };

  useEffect(() => {
    fetchHeroes();
  }, [page]);

  // Create new hero
  const createHero = () => {
    setSelectedHero({
      id: "",
      images: [],
      active: true,
      created_at: new Date().toISOString(),
    });
  };

  // Save hero
  const saveHero = async () => {
    if (!selectedHero) return;
    setLoading(true);

    try {
      // If selected hero is active, deactivate all others
      if (selectedHero.active) {
        await supabase
          .from("hero_section")
          .update({ active: false })
          .neq("id", selectedHero.id);
      }

      if (selectedHero.id) {
        await supabase
          .from("hero_section")
          .update({
            images: selectedHero.images,
            active: selectedHero.active,
          })
          .eq("id", selectedHero.id);
        toast.success("Hero updated!");
      } else {
        await supabase.from("hero_section").insert({
          images: selectedHero.images,
          active: selectedHero.active,
        });
        toast.success("Hero created!");
      }

      fetchHeroes();
      setSelectedHero(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save hero");
    } finally {
      setLoading(false);
    }
  };

  // Delete hero
  // Delete hero
  const deleteHero = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from("hero_section")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error("Failed to delete hero slider");
    } else {
      toast.success("Hero slider deleted successfully");
      fetchHeroes(); // refresh hero list
    }

    setShowDeleteModal(false);
    setDeleteId(null);
  };



  // Upload images
  const handleFileUpload = async (files: FileList) => {
    if (!selectedHero) return;
    setUploading(true);

    const urls: string[] = [];

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      urls.push(base64);
    }

    setSelectedHero({ ...selectedHero, images: [...selectedHero.images, ...urls] });
    setUploading(false);
    toast.success("Images added!");
  };

  // Remove image
  const removeImage = (index: number) => {
    if (!selectedHero) return;
    const newImages = selectedHero.images.filter((_, i) => i !== index);
    setSelectedHero({ ...selectedHero, images: newImages });
  };

  // Toggle active in UI
  const toggleActive = (hero: Hero) => {
    setHeroes((prev) =>
      prev.map((h) => ({ ...h, active: h.id === hero.id }))
    );
    if (selectedHero && selectedHero.id === hero.id) {
      setSelectedHero({ ...selectedHero, active: true });
    }
  };

  return (
    <div className="p-6 w-full min-h-screen space-y-6 bg-white">
      <h2 className="text-3xl font-bold">Hero Slider Management</h2>
      <Toaster position="top-right" />
      <button
        onClick={createHero}
        className="px-4 py-2 bg-orange-400 text-white rounded"
      >
        + Create New Hero Slider
      </button>

      {/* Hero Table */}
      <table className="w-full border rounded mt-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Images</th>
            <th className="p-2 border">Active</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {heroes.map((hero) => (
            <tr key={hero.id} className="hover:bg-gray-50">
              <td className="p-2 border flex gap-2 flex-wrap">
                {hero.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    className="w-14 h-14 object-cover rounded"
                  />
                ))}
              </td>
              <td className="p-2 border">
                <input
                  type="checkbox"
                  checked={hero.active}
                  onChange={() => toggleActive(hero)}
                />
              </td>
              <td className="p-2 border space-x-2">
                <button
                  onClick={() => setSelectedHero(hero)}
                  className="px-3 py-1 bg-blue-500 text-white rounded"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  title="Delete"
                  className="p-2 bg-red-500 text-white rounded"
                  onClick={() => {
                    setDeleteId(hero.id); // FIXED
                    setShowDeleteModal(true);
                  }}
                >
                  <Trash className="h-5 w-5" />
                </button>


              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Previous
        </button>

        <span className="font-bold">
          Page {page} / {Math.ceil(totalHeroes / pageSize)}
        </span>

        <button
          disabled={page >= Math.ceil(totalHeroes / pageSize)}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Hero Form */}
      {selectedHero && (
        <div className="p-4 border rounded shadow bg-white space-y-4 mt-4">
          <h3 className="text-xl font-semibold">
            {selectedHero.id ? "Edit Hero Slider" : "Create Hero Slider"}
          </h3>

          <label className="text-sm block font-medium">Upload Images</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files!)}
          />

          {uploading && <p className="text-gray-500 text-sm">Uploading...</p>}

          <div className="flex gap-3 flex-wrap mt-2">
            {selectedHero.images.map((img, i) => (
              <div key={i} className="relative">
                <img src={img} className="w-20 h-20 object-cover rounded" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-0 right-0 bg-red-600 text-white w-5 h-5 rounded-full text-xs"
                >
                  x
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={selectedHero.active}
              onChange={(e) =>
                setSelectedHero({ ...selectedHero, active: e.target.checked })
              }
            />
            <span>Active</span>
          </div>

          <button
            onClick={saveHero}
            disabled={loading}
            className="px-4 py-2 bg-orange-400 text-white rounded"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 animate-fadeIn">
            <h2 className="text-xl font-semibold mb-3 text-red-600">
              Confirm Deletion
            </h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this product permanently?
            </p>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteId(null); // reset
                }}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={deleteHero} // works correctly
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
