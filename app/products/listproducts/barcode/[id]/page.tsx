"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import JsBarcode from "jsbarcode";
import { useReactToPrint } from "react-to-print";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: number;
  name: string;
  sku: string;
  has_variation?: boolean;
  stock?: number;
  unit_type?: string;
}

interface ProductVariation {
  id: number;
  product_id: number;
  unit_type: string;
  price: number;
  stock: number;
  sku?: string;
}

export default function BarcodePage() {
  const params = useParams();
  const productId = Number(params.id);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [qty, setQty] = useState(1);

  const previewRef = useRef<HTMLDivElement>(null);     // Visible grid
  const printAreaRef = useRef<HTMLDivElement>(null);   // Hidden print content

  useEffect(() => {
    fetchProductAndVariations();
  }, [productId]);

  const fetchProductAndVariations = async () => {
    const { data: productData } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productData) {
      setProduct(productData);

      const { data: variationData } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", productId);

      if (variationData && variationData.length > 0) {
        setVariations(variationData);
        setSelectedVariation(variationData[0]);
      } else {
        setVariations([]);
        setSelectedVariation(null);
      }
    }
  };

  const generateBarcode = useCallback(() => {
    if (!previewRef.current || !product) return;

    previewRef.current.innerHTML = "";
    printAreaRef.current!.innerHTML = "";

    const itemName = product.name;
    const unitType = selectedVariation?.unit_type ?? product.unit_type ?? "";
    const skuValue = selectedVariation?.sku ?? product.sku ?? String(product.id);

    for (let i = 0; i < qty; i++) {
      const createLabel = () => {
        const wrapper = document.createElement("div");
        wrapper.className =
          "label-box p-4 border border-gray-300 rounded-lg shadow-sm bg-white text-center flex flex-col justify-center";

        const brand = document.createElement("div");
        brand.textContent = "Swaadha";
        brand.className = "font-bold text-base text-gray-800";

        const name = document.createElement("div");
        name.textContent = itemName;
        name.className = "text-sm text-gray-700 mt-1";

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        JsBarcode(svg, skuValue, {
          format: "CODE128",
          displayValue: false,
          width: 2,
          height: 50,
          margin: 5,
        });
        svg.style.display = "block";
        svg.style.margin = "0 auto";
        svg.style.width = "50%";
        svg.style.height = "50px";

        const codeText = document.createElement("div");
        codeText.textContent = ` ${skuValue}`;
        codeText.className = "text-xs mt-2 font-mono text-gray-500";

        const stockInfo = document.createElement("div");
        stockInfo.textContent = ` ${unitType}`;
        stockInfo.className = "text-xs mt-2 text-gray-600";

        wrapper.appendChild(brand);
        wrapper.appendChild(name);
        wrapper.appendChild(svg);
        wrapper.appendChild(codeText);
        wrapper.appendChild(stockInfo);

        return wrapper;
      };

      previewRef.current.appendChild(createLabel().cloneNode(true));
      printAreaRef.current!.appendChild(createLabel());
    }
  }, [product, selectedVariation, qty]);

  // NEW react-to-print API
const handlePrint = useReactToPrint({
  contentRef: printAreaRef,   // 👈 Required for Next.js 15/16
  documentTitle: `${product?.name}_barcodes`,
  removeAfterPrint: true,
});

const printWithGenerate = async () => {
  generateBarcode();
  await new Promise((resolve) => setTimeout(resolve, 300)); // ensure SVG renders

  if (!printAreaRef.current || printAreaRef.current.innerHTML.trim() === "") {
    console.error("Print area is empty.");
    return;
  }

  handlePrint();
};
 const handleReset = () => {
    previewRef.current!.innerHTML = "";
    printAreaRef.current!.innerHTML = "";
    setQty(1);
  };



  const handleQtyChange = (value: number) => {
    if (!product) return;
    const maxQty = selectedVariation?.stock ?? product.stock ?? 1;
    setQty(Math.max(1, Math.min(value, maxQty)));
  };

  if (!product)
    return <p className="text-center mt-10 text-gray-500">Loading...</p>;

  return (
    <div className="p-6 bg-white w-full flex flex-col items-start space-y-6">
      <h1 className="text-3xl font-bold">Barcode Generator</h1>

      <button
        onClick={() => router.back()}
        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
      >
        ← Back
      </button>

      <div className="bg-white p-4 rounded-lg shadow-md w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-gray-800 font-semibold">{product.name}</p>
          <p className="text-gray-500">
            Stock Quantity: {selectedVariation?.stock ?? product.stock} | Unit:{" "}
            {selectedVariation?.unit_type ?? product.unit_type}
          </p>
        </div>

        {variations.length > 0 && (
          <div>
            <label className="text-gray-700 font-medium mr-2">Variation:</label>
            <select
              value={selectedVariation?.id || ""}
              onChange={(e) => {
                const variation = variations.find((v) => v.id === Number(e.target.value)) || null;
                setSelectedVariation(variation);
                handleQtyChange(1);
              }}
              className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {variations.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.unit_type} - Rs {v.price.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={selectedVariation?.stock ?? product.stock ?? 1}
            value={qty}
            onChange={(e) => handleQtyChange(Number(e.target.value))}
            className="border p-2 rounded w-24 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <button
            onClick={generateBarcode}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Generate
          </button>

          <button
            onClick={handleReset}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
          >
            Reset
          </button>

          <button
            onClick={printWithGenerate}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Print
          </button>
        </div>
      </div>

      {/* --- VISIBLE PREVIEW GRID --- */}
      <div
        ref={previewRef}
        className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-items-center"
      ></div>

      {/* --- HIDDEN PRINT AREA (100% PRINT SAFE) --- */}
      <div className="hidden">
        <div ref={printAreaRef}></div>
      </div>
    </div>
  );
}
