"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function POSPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [customerType, setCustomerType] = useState(""); // "existing" | "new"
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" });
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedVariations, setSelectedVariations] = useState<{ [key: number]: number }>({});
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [error, setError] = useState<string | null>(null);

  // TAX & DISCOUNT STATES
  const [taxAmount, setTaxAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [editingField, setEditingField] = useState<"tax" | "discount" | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | "">("");

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("priority", { ascending: true });
      if (error) console.error("Error fetching categories:", error);
      else setCategories(data || []);
    }
    loadCategories();
  }, []);

  // FETCH PRODUCTS
  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select(`*, product_variations (*)`);
      if (error) console.error("Error fetching products:", error);
      else setProducts(data || []);
      setLoading(false);
    }
    loadProducts();
  }, []);

  // FETCH EXISTING CUSTOMERS
  useEffect(() => {
    async function loadCustomers() {
      const { data, error } = await supabase.from("customers").select("*");
      if (error) console.error("Error fetching customers:", error);
      else setCustomers(data || []);
    }
    loadCustomers();
  }, []);

  // ADD TO CART (handle variations & no variations)
  // ADD TO CART (handle variations & no variations)
  // ADD TO CART (handle variations & no variations)
  const addToCart = (product: any) => {
    const variationId = selectedVariations[product.id];
    const variation =
      product.product_variations?.find((v: any) => v.id === variationId) ||
      (product.product_variations?.length === 1 ? product.product_variations[0] : null);

    const cid = variation ? `${product.id}-${variation.id}` : product.id;

    const existing = cart.find((item) => item.cid === cid);

    const availableStock = variation ? variation.stock : product.stock;
    const currentQty = existing ? existing.qty : 0;

    if (currentQty + 1 > availableStock) {
      return toast.error("Cannot add more, stock is insufficient!");
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.cid === cid ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          cid,
          id: product.id,
          name: product.name,
          variation,
          price: variation ? variation.price : product.price,
          qty: 1,
        },
      ]);
    }
  };


  // UPDATE QTY
  const updateQty = (cid: string, change: number) => {
    const item = cart.find((i) => i.cid === cid);
    if (!item) return;

    const availableStock =
      item.variation
        ? item.variation.stock
        : products.find((p) => p.id === item.id)?.stock || 0;

    const newQty = item.qty + change;

    if (newQty > availableStock) {
      return toast.error("Cannot increase, stock is insufficient!");
    }

    if (newQty <= 0) {
      setCart(cart.filter((i) => i.cid !== cid));
    } else {
      setCart(cart.map((i) => (i.cid === cid ? { ...i, qty: newQty } : i)));
    }
  };



  // BILLING CALCULATIONS
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const grandTotal = subtotal + taxAmount - discountAmount;

  if (loading) return <p className="p-10 text-lg text-gray-600">Loading products...</p>;

  // PLACE ORDER FUNCTION
  // PLACE ORDER FUNCTION
  const placeOrder = async () => {
    if (!cart.length) {
      toast.error("Cart is empty.");
      setTimeout(() => toast.error(null), 3000); // hide after 3 seconds
      return;
    }

    if (!customerType) {
      toast.error("Please select a customer type.");
      setTimeout(() => toast.error(null), 3000);
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method.");
      setTimeout(() => toast.error(null), 3000);
      return;
    }


    let customerId = selectedCustomerId;
    let customerName = "";
    let customerPhone = "";

    if (customerType === "new") {
      const { name, email, phone } = newCustomer;
      const nameRegex = /^[A-Za-z\s]+$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[6-9]\d{9}$/;

      if (!name || !email || !phone) return alert("Fill all customer fields.");
      if (!nameRegex.test(name)) return alert("Name should contain only letters.");
      if (!emailRegex.test(email)) return alert("Enter a valid email.");
      if (!phoneRegex.test(phone)) return alert("Enter a valid 10-digit Indian phone number.");

      const { data, error } = await supabase
        .from("customers")
        .insert([{ name, email, phone }])
        .select();

      if (error) return toast.error("Failed to add new customer.");

      customerId = data[0].id;
      customerName = data[0].name;
      customerPhone = data[0].phone;
    } else {
      const customer = customers.find((c) => c.id === selectedCustomerId);
      if (!customer) return toast.error("Customer not found.");
      customerName = customer.name || customer.email || "Unknown";
      customerPhone = customer.phone || "N/A";
    }

    // Place the order
    const { data, error } = await supabase
      .from("pos_orders")
      .insert([
        {
          customer_id: customerId,
          full_name: customerName,
          phone_number: customerPhone,
          payment_method: paymentMethod.toLowerCase(),
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          grand_total: grandTotal,
          order_items: JSON.stringify(cart),
        },
      ])
      .select();

    if (error) return toast.error("Failed to place order.");

    // --- DECREMENT STOCK ---
    for (let item of cart) {
      if (item.variation) {
        // Update variation stock
        const newStock = item.variation.stock - item.qty;
        await supabase
          .from("product_variations")
          .update({ stock: newStock >= 0 ? newStock : 0 })
          .eq("id", item.variation.id);
      } else {
        // Update product stock if no variations
        const product = products.find((p) => p.id === item.id);
        if (product) {
          const newStock = product.stock - item.qty;
          await supabase
            .from("products")
            .update({ stock: newStock >= 0 ? newStock : 0 })
            .eq("id", item.id);
        }
      }
    }

    // After successfully placing the order
    toast.success(`Order placed! Order ID: ${data[0].id}`);

    // Automatically hide after 3 seconds

    // RESET
    setCart([]);
    setCustomerType("");
    setSelectedCustomerId("");
    setNewCustomer({ name: "", email: "", phone: "" });
    setTaxAmount(0);
    setDiscountAmount(0);
    setPaymentMethod("");
    setSelectedVariations({});

    // Reload products to reflect updated stock
    const { data: refreshedProducts } = await supabase
      .from("products")
      .select(`*, product_variations (*)`);
    setProducts(refreshedProducts || []);
  };
  const filteredProducts = products
    .filter((p) =>
      searchTerm
        ? p.name.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    )
    .filter((p) =>
      selectedCategory ? p.category_id === selectedCategory : true
    )
    .sort((a, b) => a.name.localeCompare(b.name)); // optional alphabetical sort

  if (loading)
    return <p className="p-10 text-lg text-gray-600">Loading products...</p>;




  return (
    <div className="p-6 md:p-10 bg-white w-full h-screen overflow-auto">
      <Toaster position="top-right" />


      <h1 className="text-3xl font-bold  mb-6">POS</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRODUCTS */}

        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow space-y-5">
          <div className="flex flex-col md:flex-row items-center justify-between mb-4 space-y-2 md:space-y-0 md:space-x-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border p-2 rounded w-full md:w-1/2"
            />

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(Number(e.target.value))}
              className="border p-2 rounded w-full md:w-1/3"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Clear Button */}
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("");
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
            >
              Clear
            </button>
          </div>

          <h2 className="text-xl font-bold text-gray-700 mb-4">Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((p) => {
              const variations = p.product_variations || [];
              const singleVar = variations.length === 1 ? variations[0] : null;

              return (
                <div
                  key={p.id}
                  className="border rounded-lg p-4 shadow-sm hover:shadow-md transition"
                >
                  <p className="font-semibold text-lg text-gray-800">{p.name}</p>

                  {singleVar ? (
                    <div className="mt-2">
                      <p className="font-medium text-gray-700">
                        {singleVar.unit_value} {singleVar.unit_type.toUpperCase()}
                      </p>
                      <p className={singleVar.stock > 0 ? "text-green-600" : "text-red-600"}>
                        {singleVar.stock > 0 ? `${singleVar.stock} in stock` : "Out of Stock"}
                      </p>
                      <p className="text-gray-800 font-semibold">₹ {singleVar.price}</p>
                      <button
                        onClick={() => addToCart(p)}
                        disabled={singleVar.stock === 0}
                        className="w-full mt-2 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 transition"
                      >
                        {singleVar.stock === 0 ? "Out of Stock" : "Add"}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-col space-y-2">
                      <select
                        value={selectedVariations[p.id] || ""}
                        onChange={(e) =>
                          setSelectedVariations({
                            ...selectedVariations,
                            [p.id]: Number(e.target.value),
                          })
                        }
                        className="border p-2 rounded w-full"
                      >
                        <option value="">Select Option</option>
                        {variations.map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {v.unit_value} {v.unit_type.toUpperCase()} - ₹ {v.price} (
                            {v.stock} stock)
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => addToCart(p)}
                        disabled={
                          variations.length > 0 &&
                          (!selectedVariations[p.id] ||
                            variations.find((v: any) =>
                              v.id === selectedVariations[p.id])?.stock ===
                            0)
                        }
                        className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 transition"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CUSTOMER + CART */}
        <div className="bg-white p-6 rounded-xl shadow space-y-6">
          {/* CUSTOMER */}
          <div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Customer</h2>
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Select Customer Type</option>
              <option value="existing">Existing Customer</option>
              <option value="new">New Customer</option>
            </select>

            {customerType === "existing" && (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full border p-2 rounded mt-2"
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email} ({c.email})
                  </option>
                ))}
              </select>
            )}

            {customerType === "new" && (
              <div className="space-y-2 mt-2">
                {/* Name */}
                <input
                  type="text"
                  placeholder="Name"
                  value={newCustomer.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCustomer({ ...newCustomer, name });

                    // Validate name
                    if (!/^[A-Za-z\s]*$/.test(name)) {
                      setErrors((prev) => ({ ...prev, name: "Name should contain only letters." }));
                    } else {
                      setErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  className={`w-full border p-2 rounded ${errors.name ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}

                {/* Email */}
                <input
                  type="email"
                  placeholder="Email"
                  value={newCustomer.email}
                  onChange={(e) => {
                    const email = e.target.value;
                    setNewCustomer({ ...newCustomer, email });

                    // Validate email
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                      setErrors((prev) => ({ ...prev, email: "Enter a valid email." }));
                    } else {
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  className={`w-full border p-2 rounded ${errors.email ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

                {/* Phone */}
                <input
                  type="text"
                  placeholder="Phone"
                  value={newCustomer.phone}
                  onChange={(e) => {
                    const phone = e.target.value;
                    setNewCustomer({ ...newCustomer, phone });

                    // Validate Indian 10-digit phone
                    if (!/^[6-9]\d{0,9}$/.test(phone)) {
                      setErrors((prev) => ({ ...prev, phone: "Enter a valid 10-digit Indian number." }));
                    } else if (phone.length !== 10) {
                      setErrors((prev) => ({ ...prev, phone: "Phone must be 10 digits." }));
                    } else {
                      setErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  className={`w-full border p-2 rounded ${errors.phone ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}

              </div>
            )}
          </div>

          {/* CART */}
          <div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Cart</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500">No items in cart.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.cid}
                    className="flex justify-between items-center border-b pb-2"
                  >
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      {item.variation && (
                        <p className="text-sm text-gray-500">
                          {item.variation.unit_value} {item.variation.unit_type}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        ₹ {item.price} × {item.qty}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQty(item.cid, -1)}
                        className="px-2 py-1 bg-gray-200 rounded"
                      >
                        -
                      </button>
                      <span>{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.cid, 1)}
                        className="px-2 py-1 bg-gray-200 rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BILLING */}
          <div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Billing</h2>
            <div className="space-y-1 text-gray-700">
              <p>Subtotal: ₹ {subtotal.toFixed(2)}</p>

              <div className="flex justify-between items-center">
                <span>Tax:</span>
                <div className="flex items-center space-x-2">
                  <span>₹ {taxAmount.toFixed(2)}</span>
                  <button
                    onClick={() => setEditingField("tax")}
                    className="text-blue-600 hover:text-blue-800 font-bold"
                  >
                    ✎
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span>Discount:</span>
                <div className="flex items-center space-x-2">
                  <span>₹ {discountAmount.toFixed(2)}</span>
                  <button
                    onClick={() => setEditingField("discount")}
                    className="text-blue-600 hover:text-blue-800 font-bold"
                  >
                    ✎
                  </button>
                </div>
              </div>

              <p className="font-bold text-lg">Grand Total: ₹ {grandTotal.toFixed(2)}</p>
            </div>
          </div>

          {/* PAYMENT */}
          <div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Payment</h2>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Select Payment Method</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI</option>
            </select>
          </div>

          <button
            onClick={placeOrder}
            className="w-full py-3 bg-green-600 text-white rounded-lg text-lg font-semibold hover:bg-green-700 transition"
          >
            Place Order
          </button>
        </div>
      </div>

      {/* EDIT TAX/DISCOUNT MODAL */}
      {editingField && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-72 space-y-4 shadow-lg">
            <h3 className="text-lg font-bold text-gray-700">
              Edit {editingField === "tax" ? "Tax" : "Discount"}
            </h3>
            <input
              type="number"
              value={editingField === "tax" ? taxAmount : discountAmount}
              onChange={(e) => {
                const val = Number(e.target.value);
                editingField === "tax" ? setTaxAmount(val) : setDiscountAmount(val);
              }}
              className="border p-2 w-full rounded text-right"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setEditingField(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                Close
              </button>


            </div>
          </div>
        </div>
      )}
    </div>
  );
}
