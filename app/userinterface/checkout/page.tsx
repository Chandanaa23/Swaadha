"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import toast,{Toaster} from "react-hot-toast";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CartItem {
  id?: string;
  productId: number;
  name: string;
  variationId: number | null;
  variationName: string | null;
  price: number;
  quantity: number;
  image: string;
  shippingCharge: number;
  stock: number; // ✅ added stock
  user_id?: string;
}

const cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata"];
const states = ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "West Bengal"];

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Shipping info
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [altPhoneNumber, setAltPhoneNumber] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // ----------------------------
  // Fetch logged in user
  // ----------------------------
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data.session?.user?.id || null);
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ----------------------------
  // Update stock after order
  // ----------------------------
  const updateStock = async (cart: CartItem[]) => {
    for (const item of cart) {
      if (!item.variationId) continue;

      await supabase.rpc("decrement_stock", {
        variation_id: item.variationId,
        qty: item.quantity,
      });
    }
  };

  // ----------------------------
  // Fetch Cart (with stock checking)
  // ----------------------------
  useEffect(() => {
    const fetchCart = async () => {
      if (userId === undefined) return;

      // ----------------------------
      // Local Cart
      // ----------------------------
      if (!userId) {
        const savedCart = localStorage.getItem("cart");
        if (savedCart) {
          try {
            const parsedCart: CartItem[] = JSON.parse(savedCart);

            // ❌ Remove products where stock = 0
            const filtered = parsedCart.filter((item: any) => item.stock !== 0);

            setCart(filtered);
          } catch {
            setCart([]);
          }
        } else {
          setCart([]);
        }
      }

      // ----------------------------
      // Supabase Cart
      // ----------------------------
      else {
        const { data, error } = await supabase
          .from("cart")
          .select(`
            id,
            product_id,
            variation_id,
            quantity,
            user_id,
            product_variations (
              id,
              price,
              unit_type,
              stock
            ),
            products (
              id,
              name,
              shipping_charge,
              product_images (
                id,
                image_url
              )
            )
          `)
          .eq("user_id", userId);

        if (!error && data) {
          const formattedCart = data.map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            variationId: item.variation_id,
            variationName: item.product_variations?.unit_type || null,
            quantity: item.quantity,
            name: item.products.name,
            price: item.product_variations?.price || 0,
            stock: item.product_variations?.stock ?? 0, // ✅ include stock
            shippingCharge: item.products.shipping_charge || 0,
            image: item.products.product_images?.[0]?.image_url || "/placeholder.png",
            user_id: item.user_id,
          }));

          // ❌ filter out out-of-stock items
          setCart(formattedCart.filter((item) => item.stock !== 0));
        } else {
          setCart([]);
        }
      }

      setLoading(false);
    };

    fetchCart();
  }, [userId]);

  // ----------------------------
  // Calculations
  // ----------------------------
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = cart.reduce((sum, item) => sum + item.shippingCharge , 0);
  const grandTotal = totalPrice + shippingCost;

  // ----------------------------
  // Validation
  // ----------------------------
  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
    else if (!/^\d{10}$/.test(phoneNumber)) newErrors.phoneNumber = "Phone number must be 10 digits";
    if (altPhoneNumber && !/^\d{10}$/.test(altPhoneNumber)) newErrors.altPhoneNumber = "Alternative phone number must be 10 digits";
    if (!houseNumber.trim()) newErrors.houseNumber = "House number is required";
    if (!street.trim()) newErrors.street = "Street is required";
    if (!city) newErrors.city = "City is required";
    if (!state) newErrors.state = "State is required";
    if (!pincode.trim()) newErrors.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(pincode)) newErrors.pincode = "Pincode must be 6 digits";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ----------------------------
  // Razorpay Script Loader
  // ----------------------------
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // ----------------------------
  // Handle Order Placement
  // ----------------------------
  const handlePlaceOrder = async () => {
    if (!validate()) return;
    if (cart.length === 0) return toast.error("Your cart is empty.");

    setSubmitting(true);

    try {
      if (paymentMethod === "razorpay") {
        const res = await loadRazorpayScript();
        if (!res) return toast.error("Razorpay failed to load.");

        const { data: orderData } = await supabase
          .from("orders")
          .insert([
            {
              user_id: userId,
              cart_items: cart,
              full_name: fullName,
              phone_number: phoneNumber,
              alt_phone_number: altPhoneNumber,
              house_number: houseNumber,
              street,
              city,
              state,
              pincode,
              payment_method: "razorpay",
              total_price: totalPrice,
              shipping_cost: shippingCost,
              grand_total: grandTotal,
              order_date: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        const rzp = new (window as any).Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
          amount: grandTotal * 100,
          currency: "INR",
          name: "Swaadha",
          description: "Order Payment",
          handler: async function (response: any) {
            await supabase
              .from("orders")
              .update({
                payment_id: response.razorpay_payment_id,
                payment_status: "paid",
              })
              .eq("id", orderData.id);

            await updateStock(cart);

            if (!userId) localStorage.removeItem("cart");
            else await supabase.from("cart").delete().eq("user_id", userId);

            toast.success("Payment successful! Order placed.");
            router.push("/userinterface/order");
          },
          theme: { color: "#F97316" },
        });

        rzp.open();
      }

      // ----------------------------
      // COD
      // ----------------------------
      else {
        await supabase.from("orders").insert([
          {
            user_id: userId,
            cart_items: cart,
            full_name: fullName,
            phone_number: phoneNumber,
            alt_phone_number: altPhoneNumber,
            house_number: houseNumber,
            street,
            city,
            state,
            pincode,
            payment_method: "cod",
            total_price: totalPrice,
            shipping_cost: shippingCost,
            grand_total: grandTotal,
            order_date: new Date().toISOString(),
          },
        ]);

        await updateStock(cart);

        if (!userId) localStorage.removeItem("cart");
        else await supabase.from("cart").delete().eq("user_id", userId);

        alert("Order placed successfully!");
        router.push("/userinterface/order");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------
  // Render
  // ----------------------------
  if (loading) return <p className="text-center mt-12">Loading...</p>;
  if (cart.length === 0) return <p className="text-center mt-12">Your cart is empty.</p>;

  return (
    <div className="min-h-screen bg-white px-6 lg:px-20 py-12">
            <Toaster position="top-right" />

      <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 px-6 py-4 rounded-md mb-8 shadow">
        Checkout
      </h1>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Shipping Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!submitting) handlePlaceOrder();
          }}
          className="flex-1 bg-white p-8 rounded-lg shadow space-y-6"
        >
          <h2 className="text-xl font-semibold text-orange-900 mb-4">
            Shipping Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`p-3 border rounded w-full ${
                errors.fullName ? "border-red-500" : "border-gray-300"
              }`}
              disabled={submitting}
            />
            {errors.fullName && <p className="text-red-600 text-sm">{errors.fullName}</p>}

            <input
              type="tel"
              placeholder="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={`p-3 border rounded w-full ${
                errors.phoneNumber ? "border-red-500" : "border-gray-300"
              }`}
              disabled={submitting}
            />
            {errors.phoneNumber && (
              <p className="text-red-600 text-sm">{errors.phoneNumber}</p>
            )}

            <input
              type="tel"
              placeholder="Alt Phone (optional)"
              value={altPhoneNumber}
              onChange={(e) => setAltPhoneNumber(e.target.value)}
              className={`p-3 border rounded w-full border-gray-300`}
              disabled={submitting}
            />

            <input
              type="text"
              placeholder="House Number"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              className={`p-3 border rounded w-full border-gray-300`}
              disabled={submitting}
            />

            <input
              type="text"
              placeholder="Street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className={`p-3 border rounded w-full border-gray-300`}
              disabled={submitting}
            />

            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="p-3 border rounded w-full"
              disabled={submitting}
            >
              <option value="">Select City</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="p-3 border rounded w-full"
              disabled={submitting}
            >
              <option value="">Select State</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className={`p-3 border rounded w-full ${
                errors.pincode ? "border-red-500" : "border-gray-300"
              }`}
              disabled={submitting}
            />
          </div>

          <h2 className="text-xl font-semibold text-orange-900 mb-4">
            Payment Method
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="paymentMethod"
                value="razorpay"
                checked={paymentMethod === "razorpay"}
                onChange={() => setPaymentMethod("razorpay")}
              />
              Razorpay
            </label>

            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
              />
              Cash on Delivery
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3 rounded-xl font-semibold ${
              submitting
                ? "bg-orange-400 text-gray-200 cursor-not-allowed"
                : "bg-orange-600 hover:bg-orange-700 text-white"
            }`}
          >
            {submitting
              ? "Placing Order..."
              : `Place Order - ₹${grandTotal.toFixed(2)}`}
          </button>
        </form>

        {/* Order Summary */}
        <aside className="w-full max-w-md bg-white rounded-lg shadow p-6 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-orange-900">Order Summary</h2>

          {cart.map((item) => (
            <div
              key={`${item.productId}-${item.variationId}`}
              className="flex justify-between"
            >
              <div>
                <p className="font-semibold text-orange-900 truncate max-w-xs">
                  {item.name}
                </p>
                {item.variationName && (
                  <p className="text-gray-600 text-sm">Unit: {item.variationName}</p>
                )}
                <p className="text-gray-600 text-sm">Qty: {item.quantity}</p>
              </div>

              <p className="font-bold text-orange-700">
                ₹{(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}

          <hr className="border-gray-300" />

          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span>₹{totalPrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span>Shipping</span>
            <span>₹{shippingCost.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-bold text-orange-900 text-lg">
            <span>Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
