"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface NotificationBanner {
  id: string;
  image_url: string;
  active: boolean;
  created_at: string;
}

export default function NotificationBannerSettings() {
  const [banners, setBanners] = useState<NotificationBanner[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<NotificationBanner | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(banners.length / itemsPerPage);
  const paginatedData = banners.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openDeleteModal = (id: string) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);

    const { error } = await supabase.from("notification_banner").delete().eq("id", deleteId);

    if (error) toast.error("Failed to delete");
    else {
      toast.success("Banner deleted");
      fetchBanners();
    }
    setShowDeleteModal(false);
    setDeleteId(null);
    setLoading(false);
  };

  // Fetch banners
  const fetchBanners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notification_banner")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) toast.error("Failed to fetch banners");
      else setBanners(data);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Upload image
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files?.length) return;

  const file = e.target.files[0];
  const fileName = `${Date.now()}_${file.name}`;

  setUploading(true);

  const { error: uploadError } = await supabase.storage
    .from("banners")
    .upload(fileName, file);

  if (uploadError) {
    toast.error("Upload failed");
    setUploading(false);
    return;
  }

  // FIXED: extract publicUrl correctly
  const { data } = supabase.storage.from("banners").getPublicUrl(fileName);
  const publicUrl = data.publicUrl;

  setSelectedBanner(prev => prev && { ...prev, image_url: publicUrl });
  setUploading(false);
};


  // Remove image
  const removeImage = () => {
    setSelectedBanner(prev => prev && { ...prev, image_url: "" });
  };

  // Save or update
  const saveBanner = async () => {
    if (!selectedBanner?.image_url) {
      toast.error("Please upload an image");
      return;
    }

    setLoading(true);

    if (selectedBanner.id) {
      const { error } = await supabase
        .from("notification_banner")
        .update({ image_url: selectedBanner.image_url, active: selectedBanner.active })
        .eq("id", selectedBanner.id);

      if (error) toast.error("Update failed");
      else toast.success("Banner updated!");
    } else {
      const { data, error } = await supabase
        .from("notification_banner")
        .insert({ image_url: selectedBanner.image_url, active: selectedBanner.active })
        .select()
        .single();

      if (error) toast.error("Create failed");
      else {
        toast.success("Banner created!");
        setSelectedBanner(data);
      }
    }

    fetchBanners();
    setLoading(false);
  };

  const createNewBanner = () => {
    setSelectedBanner({
      id: "",
      image_url: "",
      active: true,
      created_at: new Date().toISOString(),
    });
  };

  return (
    <div className="p-6 w-full mx-auto space-y-6 bg-white">
      <Toaster position="top-right" />

      <h2 className="text-3xl font-bold">Notification Banner Management</h2>

      <button
        onClick={createNewBanner}
        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
      >
        + Create New Banner
      </button>

      {/* Table */}
      <table className="w-full border rounded mt-4 text-left">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Image</th>
            <th className="p-2 border">Active</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map(banner => (
            <tr key={banner.id} className="hover:bg-gray-50">
              <td className="p-2 border">
                <img src={banner.image_url} alt="" className="h-16 object-cover rounded" />
              </td>
              <td className="p-2 border">{banner.active ? "Yes" : "No"}</td>
              <td className="p-2 border space-x-2">
                <button
                  onClick={() => setSelectedBanner(banner)}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Edit
                </button>

                <button
                  onClick={() => openDeleteModal(banner.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-between mt-3">
        <button
          className="px-3 py-1 border rounded"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
        >
          Prev
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="px-3 py-1 border rounded"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(prev => prev + 1)}
        >
          Next
        </button>
      </div>

      {/* Form */}
      {selectedBanner && (
        <div className="p-4 border rounded shadow bg-white space-y-4 mt-4">
          <h3 className="text-xl font-semibold">
            {selectedBanner.id ? "Edit Banner" : "Create Banner"}
          </h3>

          <input type="file" accept="image/*" onChange={handleFileChange} />
          {uploading && <p>Uploading...</p>}

          {selectedBanner.image_url && (
            <div>
              <img src={selectedBanner.image_url} className="h-32 rounded mt-2" />
              <button
                onClick={removeImage}
                className="mt-2 text-red-600 underline"
              >
                Remove Image
              </button>
            </div>
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedBanner.active}
              onChange={e =>
                setSelectedBanner({ ...selectedBanner, active: e.target.checked })
              }
            />
            Active
          </label>

          <button
            onClick={saveBanner}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white rounded"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow space-y-4 w-80">
            <h2 className="text-lg font-semibold">Delete Banner?</h2>
            <p>Are you sure you want to delete this banner?</p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1 bg-red-600 text-white rounded"
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
