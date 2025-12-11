"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Attribute {
  id: number;
  name: string;
  type: string;
}

export default function Attributes() {
  const [tastes, setTastes] = useState<Attribute[]>([]);
  const [unitTypes, setUnitTypes] = useState<Attribute[]>([]);
  const [newTaste, setNewTaste] = useState("");
  const [newUnit, setNewUnit] = useState("");

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    try {
      const { data: tasteData, error: tasteError } = await supabase
        .from("attributes")
        .select("*")
        .eq("type", "taste");

      const { data: unitData, error: unitError } = await supabase
        .from("attributes")
        .select("*")
        .eq("type", "unit_type");

      if (tasteError) console.error(tasteError);
      if (unitError) console.error(unitError);

      setTastes(tasteData ?? []);
      setUnitTypes(unitData ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch attributes");
    }
  };

  const addTaste = async () => {
    if (!newTaste.trim()) return toast.error("Taste cannot be empty");
    try {
      await supabase.from("attributes").insert({ name: newTaste, type: "taste" });
      setNewTaste("");
      toast.success("Taste added successfully!");
      fetchAttributes();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add taste");
    }
  };

  const addUnit = async () => {
    if (!newUnit.trim()) return toast.error("Unit type cannot be empty");
    try {
      await supabase.from("attributes").insert({ name: newUnit, type: "unit_type" });
      setNewUnit("");
      toast.success("Unit type added successfully!");
      fetchAttributes();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add unit type");
    }
  };

  return (
    <div className="p-6 w-full space-y-6">
      {/* Toast Container */}
      <Toaster position="top-right" reverseOrder={false} />

      <h1 className="text-3xl font-bold text-gray-800 mb-4">Manage Attributes</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tastes Card */}
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Tastes</h2>
          <ul className="space-y-1 max-h-60 overflow-y-auto">
            {tastes.map((t) => (
              <li key={t.id} className="border-b py-1 text-gray-600">
                {t.name}
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-2">
            <input
              value={newTaste}
              onChange={(e) => setNewTaste(e.target.value)}
              placeholder="New Taste"
              className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={addTaste}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Add
            </button>
          </div>
        </div>

        {/* Unit Types Card */}
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Unit Types</h2>
          <ul className="space-y-1 max-h-60 overflow-y-auto">
            {unitTypes.map((u) => (
              <li key={u.id} className="border-b py-1 text-gray-600">
                {u.name}
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-2">
            <input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="New Unit Type"
              className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={addUnit}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
