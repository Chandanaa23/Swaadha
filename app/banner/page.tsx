"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";
import { Trash } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Banner {
  id: string;
  title: string;
  bg_color: string;
  text_color: string;
  active: boolean;
  created_at: string;
}

export default function BannerSettings() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalBanners, setTotalBanners] = useState(0);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchBanners = async (pageNumber: number = 1) => {
    setLoading(true);
    try {
      const from = (pageNumber - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("banner")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error(error);
        toast.error("Failed to fetch banners");
      } else {
        setBanners(data || []);
        if (count !== null) setTotalBanners(count);
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners(page);
  }, [page]);

  const totalPages = Math.ceil(totalBanners / pageSize);

  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const saveBanner = async () => {
    if (!selectedBanner) return;

    setLoading(true);
    try {
      if (selectedBanner.id) {
        const { error } = await supabase
          .from("banner")
          .update({
            title: selectedBanner.title,
            bg_color: selectedBanner.bg_color,
            text_color: selectedBanner.text_color,
            active: selectedBanner.active,
          })
          .eq("id", selectedBanner.id);

        if (error) {
          console.error(error);
          toast.error("Failed to update banner");
        } else {
          toast.success("Banner updated successfully!");
          fetchBanners(page);
        }
      } else {
        const { data, error } = await supabase
          .from("banner")
          .insert({
            title: selectedBanner.title,
            bg_color: selectedBanner.bg_color,
            text_color: selectedBanner.text_color,
            active: selectedBanner.active,
          })
          .select()
          .single();

        if (error) {
          console.error(error);
          toast.error("Failed to create banner");
        } else {
          toast.success("Banner created successfully!");
          fetchBanners(page);
          setSelectedBanner(data);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while saving banner");
    } finally {
      setLoading(false);
    }
  };

  const createNewBanner = () => {
    setSelectedBanner({
      id: "",
      title: "",
      bg_color: "#ffffff",
      text_color: "#000000",
      active: true,
      created_at: new Date().toISOString(),
    });
  };

  const deleteBanner = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from("banner")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error("Failed to delete banner");
    } else {
      toast.success("Banner deleted successfully");
      fetchBanners(page);
    }

    setShowDeleteModal(false);
    setDeleteId(null);
  };

  const renderPageNumbers = () => {
    const buttons = [];
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`px-3 py-1 rounded ${
            page === i ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="p-6 w-full mx-auto space-y-6 bg-white">
      <Toaster position="top-right" />
      <h2 className="text-3xl font-bold">Banner Management</h2>

      <button
        onClick={createNewBanner}
        className="px-4 py-2 bg-orange-400 text-white rounded"
      >
        + Create New Banner
      </button>

      {/* Banner Table */}
      <table className="w-full border rounded-md text-left mt-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Title</th>
            <th className="p-2 border">Background Color</th>
            <th className="p-2 border">Text Color</th>
            <th className="p-2 border">Active</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {banners.map((banner) => (
            <tr key={banner.id} className="hover:bg-gray-50">
              <td className="p-2 border">{banner.title}</td>
              <td className="p-2 border">
                <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: banner.bg_color }} />
              </td>
              <td className="p-2 border">
                <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: banner.text_color }} />
              </td>
              <td className="p-2 border">{banner.active ? "Yes" : "No"}</td>
              <td className="p-2 border flex gap-2">
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded"
                  onClick={() => setSelectedBanner(banner)}
                >
                  Edit
                </button>
                <button
                  className="p-2 bg-red-500 text-white rounded"
                  onClick={() => {
                    setDeleteId(banner.id);
                    setShowDeleteModal(true);
                  }}
                >
                  <Trash className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 flex-wrap items-center">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          {renderPageNumbers()}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-md">
            <h3 className="text-xl font-semibold text-red-600">Confirm Deletion</h3>
            <p className="text-gray-700 mt-3">Are you sure you want to delete this banner?</p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={deleteBanner}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {selectedBanner && (
        <div className="space-y-4 p-4 border rounded-lg bg-white shadow-md mt-4">
          <h3 className="text-xl font-semibold">{selectedBanner.id ? "Edit Banner" : "Create New Banner"}</h3>

          <input
            type="text"
            placeholder="Banner Title"
            className="border p-2 rounded w-full"
            value={selectedBanner.title}
            onChange={(e) => setSelectedBanner({ ...selectedBanner, title: e.target.value })}
          />

          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm">Background Color</label>
              <input
                type="color"
                value={selectedBanner.bg_color}
                onChange={(e) => setSelectedBanner({ ...selectedBanner, bg_color: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm">Text Color</label>
              <input
                type="color"
                value={selectedBanner.text_color}
                onChange={(e) => setSelectedBanner({ ...selectedBanner, text_color: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedBanner.active}
              onChange={(e) => setSelectedBanner({ ...selectedBanner, active: e.target.checked })}
            />
            <span>Active</span>
          </div>

          <button
            onClick={saveBanner}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded"
          >
            {loading ? "Saving..." : "Save Banner"}
          </button>
        </div>
      )}
    </div>
  );
}
