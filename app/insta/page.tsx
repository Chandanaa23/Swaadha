"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";
import { TrashIcon, PencilIcon } from "@heroicons/react/24/outline";
import { Trash } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface InstagramLink {
  id: number;
  url: string;
  published: boolean;
}

export default function AdminInstagramLinks() {
  const [links, setLinks] = useState<InstagramLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [published, setPublished] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);


  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("instagram_links")
      .select("*")
      .order("id", { ascending: true });
    if (error) toast.error("Failed to fetch links");
    else setLinks(data || []);
    setLoading(false);
  };

  const instagramRegex =
    /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[A-Za-z0-9_\-]+\/?(\?.*)?$/;

  const handleSubmit = async () => {
    if (!url) return toast.error("Instagram URL is required");
    if (!instagramRegex.test(url)) return toast.error("Enter a valid Instagram URL");

    if (editId) {
      const { error } = await supabase
        .from("instagram_links")
        .update({ url, published, updated_at: new Date() })
        .eq("id", editId);
      if (error) toast.error("Failed to update link");
      else {
        toast.success("Link updated");
        resetForm();
        fetchLinks();
      }
    } else {
      const { error } = await supabase.from("instagram_links").insert({ url, published });
      if (error) toast.error("Failed to add link");
      else {
        toast.success("Link added");
        resetForm();
        fetchLinks();
      }
    }
  };

  const handleEdit = (link: InstagramLink) => {
    setEditId(link.id);
    setUrl(link.url);
    setPublished(link.published);
  };

  const openDeleteModal = (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("instagram_links").delete().eq("id", deleteId);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Deleted successfully");
      fetchLinks();
    }
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  const handlePublishedToggle = (checked: boolean) => {
    setPublished(checked);
    toast(
      checked ? "Link will be visible." : "Link will not be visible.",
    );
  };

  const resetForm = () => {
    setEditId(null);
    setUrl("");
    setPublished(true);
  };

  return (
    <div className="w-full bg-white p-8">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-bold  mb-2">Instagram Links Management</h1>

      {/* Form */}
      <div className="bg-white p-8 rounded-2xl shadow-xl mb-8 w-full  mx-auto">
        <h2 className="text-2xl font-semibold mb-6">{editId ? "Edit Link" : "Add New Link"}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Instagram URL */}
          <div className="flex flex-col gap-2">
            <label className="font-medium">Instagram URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Published */}
          <div className="flex flex-col gap-2 items-start">
            <label className="font-medium">Published</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => handlePublishedToggle(e.target.checked)}
                className="h-6 w-6"
              />
              <span>{published ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="mt-6 w-full md:w-auto bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          {editId ? "Update Link" : "Add Link"}
        </button>
      </div>

      {/* Links Table */}
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full mx-auto overflow-x-auto">
        <h2 className="text-2xl font-semibold mb-4">Existing Links</h2>
        {loading ? (
          <p>Loading links...</p>
        ) : links.length === 0 ? (
          <p>No links found.</p>
        ) : (
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">ID</th>
                <th className="border px-4 py-2">URL</th>
                <th className="border px-4 py-2">Published</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2 text-center">{link.id}</td>
                  <td className="border px-4 py-2">{link.url}</td>
                  <td className="border px-4 py-2 text-center">{link.published ? "Yes" : "No"}</td>
                  <td className="border px-4 py-2 flex gap-2 justify-center">
                    <button
                      onClick={() => handleEdit(link)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 flex items-center justify-center gap-1"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(link.id)}
                      className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    >
                      <Trash className="h-5 w-5" />
                    </button>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-80">
            <h2 className="text-lg font-semibold mb-4 text-center">
              Confirm Delete
            </h2>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete this link?
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={confirmDelete}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Yes, Delete
              </button>

              <button
                onClick={cancelDelete}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
