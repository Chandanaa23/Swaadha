"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CartItem {
  id: number;
  productId: number; // add this if not already present
  name: string;
  variation_name?: string;
  quantity: number;
  shipping_charge?: number;
  price: number;
  image?: string;
}


interface Order {
  id: number;
  full_name: string;
  phone_number: string;
  alt_phone_number?: string;
  house_number: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  payment_method: string;
  total_price: number;
  shipping_cost: number;
  grand_total: number;
  order_date: string;
  status: string;
  cart_items?: CartItem[];
  email?: string;
  reference_code?: string;
  payment_status?: string;
}

export default function OrderUpdatePage() {
  const pathname = usePathname();
const segments = pathname.split("/").filter(Boolean);
const orderId = parseInt(segments[segments.length - 1], 10);


  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For controlling inputs
  const [orderStatus, setOrderStatus] = useState<string>("pending");
  const [paymentPaid, setPaymentPaid] = useState<boolean>(false);
  const [shippingMethod, setShippingMethod] = useState<string>("");

  // Update status loading & error
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  useEffect(() => {
  async function fetchOrder() {
    setLoading(true);
    setError(null);

    if (!orderId || isNaN(orderId)) {
      setError("Invalid order ID");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const result = await res.json();

      console.log("API response:", result); // Debug log

      // Make sure order exists in response
      if (!result.order) {
        setError(result.error || "Order not found");
        setOrder(null);
        setLoading(false);
        return;
      }

      const orderData: Order = result.order;

      // Ensure cart items have shipping charges if needed
let items: CartItem[] = Array.isArray(orderData.cart_items) ? orderData.cart_items : [];
      if (items.length > 0) {
        const productIds = items.map((item) => item.productId);
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id, shipping_charge")
          .in("id", productIds);

        if (productsError) throw productsError;

        items = items.map((item) => {
          const product = productsData?.find((p) => p.id === item.productId);
          return {
            ...item,
            shipping_charge: product?.shipping_charge ?? 0,
          };
        });
      }

      setOrder({ ...orderData, cart_items: items });
      setOrderStatus(orderData.status);
      setPaymentPaid(
        orderData.payment_method === "paid" ||
        orderData.payment_status === "paid"
      );
      setShippingMethod("");
      setLoading(false);
    } catch (err: any) {
      console.error("Fetch order error:", err);
      setError(err.message || "Unknown error");
      setLoading(false);
    }
  }

  fetchOrder();
}, [orderId]);





  // Function to update order status in DB
  async function handleStatusChange(newStatus: string) {
    if (!order) return;
    setOrderStatus(newStatus);
    setStatusUpdating(true);
    setStatusUpdateError(null);

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order.id);

      if (error) {
        setStatusUpdateError(error.message);
        // revert UI status back to previous status on failure
        setOrderStatus(order.status);
      } else {
        // update local order state status on success
        setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
      }
    } catch (err: any) {
      setStatusUpdateError(err.message || "Error updating status");
      setOrderStatus(order.status);
    } finally {
      setStatusUpdating(false);
    }
  }
  const handlePaymentStatusChange = async (paid: boolean) => {
    if (!order) return;

    const newStatus = paid ? "paid" : "pending";

    const { data, error } = await supabase
      .from("orders")
      .update({ payment_status: newStatus })
      .eq("id", order.id);

    if (error) {
      setError("Failed to update payment status: " + error.message);
      setTimeout(() => setError(null), 3000); // 
    } else {
      setOrder({ ...order, payment_status: newStatus });
      setPaymentPaid(paid);
    }
  };


  // Dummy tax and discount data per item (replace with real if you have)
  function getItemTax(item: CartItem) {
    return 0; // example fixed 0
  }
  function getItemDiscount(item: CartItem) {
    return 0.5; // example fixed discount of 0.5 Rs
  }

  if (loading) return <div className="p-6 bg-white">Loading order #{orderId}...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!order) return <div className="p-6">No order found</div>;
  const printInvoice = () => {
    if (!order) return;

    // Create HTML content for printing
    const invoiceContent = `
    <html>
      <head>
        <title>Invoice #${order.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <h2>Invoice #${order.id}</h2>
        <p><strong>Date:</strong> ${new Date(order.order_date).toLocaleString()}</p>
        <p><strong>Customer:</strong> ${order.full_name}</p>
        <p><strong>Phone:</strong> ${order.phone_number}</p>
        <p><strong>Address:</strong> ${order.house_number} ${order.street}, ${order.city}, ${order.pincode}</p>

        <table>
          <thead>
            <tr>
              <th>SL</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Shipping</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
  {order.cart_items && order.cart_items.length > 0 ? (
    order.cart_items.map((item, idx) => {
      const price = item.price ?? 0;
      const qty = item.quantity ?? 0;
      const shipping = item.shipping_charge ?? 0;
      const tax = getItemTax(item);
      const discount = getItemDiscount(item);
      const totalPrice = price * qty + shipping + tax - discount;

      return (
        <tr key={item.id} className="border-b">
          <td className="py-2 px-3 align-top">{idx + 1}</td>
          <td className="py-2 px-3 flex items-start gap-3">
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded" />
            ) : (
              <div className="w-10 h-10 bg-gray-200 flex items-center justify-center rounded" />
            )}
            <div>
              <p className="font-semibold">
                {(item.name ?? "Unnamed Product").length > 20
                  ? (item.name ?? "Unnamed Product").slice(0, 20) + "..."
                  : item.name ?? "Unnamed Product"}
              </p>
              <p className="text-xs text-gray-500">Qty : {qty}</p>
              <p className="text-xs text-gray-500">Price : ₹{price.toFixed(2)}</p>
              {item.variation_name && <p className="text-xs text-gray-500">Variation : {item.variation_name}</p>}
            </div>
          </td>
          <td className="py-2 px-3 text-right align-top">₹{price.toFixed(2)}</td>
          <td className="py-2 px-3 text-right align-top">₹{shipping.toFixed(2)}</td>
          <td className="py-2 px-3 text-right align-top">₹{totalPrice.toFixed(2)}</td>
        </tr>
      );
    })
  ) : (
    <tr>
      <td colSpan={5} className="text-center text-gray-400 py-4">
        No items in this order
      </td>
    </tr>
  )}
</tbody>

        </table>

        <h3 class="text-right">Grand Total: ₹${order.grand_total.toFixed(2)}</h3>
      </body>
    </html>
  `;

    // Open a new window and print
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(invoiceContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };


  return (
    <div className="p-6 flex gap-8 min-h-screen bg-white">
      {/* Left side: Order Details */}
      <div className="flex-1 bg-white rounded shadow p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="font-bold text-xl">Order ID #{order.id}</h2>
            <p className="text-gray-600 mt-1">
              {new Date(order.order_date).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            <div className="mt-2 space-y-1 text-sm text-gray-700">
              <p>
                Status:{" "}
                <span
                  className={`inline-block px-2 py-1 rounded text-white text-xs ${orderStatus === "confirmed"
                      ? "bg-green-500"
                      : orderStatus === "pending"
                        ? "bg-yellow-500"
                        : orderStatus === "cancelled"
                          ? "bg-red-500"
                          : "bg-gray-400"
                    }`}
                >
                  {orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}
                </span>
              </p>
              <p>Payment Method: {order.payment_method}</p>
              {order.reference_code && <p>Reference Code: {order.reference_code}</p>}
              {paymentPaid && <p className="text-green-600">Payment Status: Paid</p>}
            </div>
          </div>

          <div className="flex gap-2">

            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              onClick={printInvoice}
            >
              Print Invoice
            </button>

          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border border-gray-200 text-sm text-gray-800">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-3 border-b text-left">SL</th>
              <th className="py-2 px-3 border-b text-left">Item Details</th>
              <th className="py-2 px-3 border-b text-right">Item Price</th>
              <th className="py-2 px-3 border-b text-right">Shipping charge</th>
              <th className="py-2 px-3 border-b text-right">Total Price</th>
            </tr>
          </thead>
          <tbody>
            {order.cart_items?.map((item, idx) => {
              const productName = item.name ?? "Unnamed Product";
              const tax = getItemTax(item);
              const discount = getItemDiscount(item);
              const totalPrice = item.price * item.quantity + (item.shipping_charge ?? 0) + tax - discount;
              return (
                <tr key={item.id} className="border-b">
                  <td className="py-2 px-3 align-top">{idx + 1}</td>
                  <td className="py-2 px-3 flex items-start gap-3">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={productName}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 flex items-center justify-center rounded">
                        {/* placeholder icon */}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">
                        {productName.length > 20
                          ? productName.slice(0, 20) + "..."
                          : productName}
                      </p>
                      <p className="text-xs text-gray-500">Qty : {item.quantity}</p>
                      <p className="text-xs text-gray-500">price : ₹{item.price.toFixed(2)}</p>
                      {item.variation_name && (
                        <p className="text-xs text-gray-500">
                          Variation : {item.variation_name}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right align-top">₹{item.price.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right align-top">
                    ₹{(item.shipping_charge ?? 0).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right align-top">₹{totalPrice.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Price Breakdown */}
        <div className="mt-6 max-w-xs ml-auto text-right space-y-1 text-sm text-gray-700">
          <div className="flex justify-between">
            <span className="font-semibold">Item price</span>
            <span>₹{order.total_price.toFixed(2)}</span>
          </div>

          <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
            <span>Sub Total</span>
            <span>₹{(order.total_price - 0.5).toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>Shipping Fee</span>
            <span>₹{order.shipping_cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-300 pt-1 font-bold text-lg">
            <span>Total</span>
            <span>₹{order.grand_total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Right side: Controls and customer info */}
      <div className="w-80 space-y-6">
        {/* Order & Shipping Info */}
        <div className="bg-white rounded shadow p-4 space-y-4">
          <h3 className="font-semibold border-b pb-2">Order & Shipping Info</h3>

          {/* Change Order Status */}
          <div>
            <label htmlFor="orderStatus" className="block font-medium mb-1">
              Change Order Status
            </label>
            <select
              id="orderStatus"
              className="w-full border border-gray-300 rounded p-2"
              value={orderStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusUpdating}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="out of delivery">Out of Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {statusUpdateError && (
              <p className="text-red-600 text-sm mt-1">{statusUpdateError}</p>
            )}
          </div>

          {/* Payment Status Toggle */}
          <div className="flex items-center justify-between">
            <label className="font-medium">Payment Status</label>
            <input
              type="checkbox"
              checked={paymentPaid}
              onChange={(e) => handlePaymentStatusChange(e.target.checked)}
              className="w-12 h-6 rounded-full bg-gray-300 relative cursor-pointer"
            />
          </div>

        </div>

        {/* Customer Information */}
        <div className="bg-white rounded shadow p-4 space-y-3">
          <h3 className="font-semibold border-b pb-2">Customer Information</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.121 17.804A13.937 13.937 0 0112 15c2.2 0 4.272.536 6.121 1.46M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold">{order.full_name}</p>
              <p className="text-sm text-gray-600">3 Orders</p> {/* Hardcoded example */}
              <p className="text-sm text-gray-600">Email: {order.email}</p>

              <p className="text-sm text-gray-600">{order.phone_number}</p>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded shadow p-4 space-y-3 relative">
          <h3 className="font-semibold border-b pb-2">Shipping Address</h3>

          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <strong>Name:</strong> {order.full_name}
            </p>
            <p>
              <strong>Contact:</strong> {order.phone_number}
            </p>
            <p>
              <strong>Country:</strong> India
            </p>
            <p>
              <strong>City:</strong> {order.city}
            </p>
            <p>
              <strong>Zip code:</strong> {order.pincode}
            </p>
            <p className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 11c1.104 0 2-.896 2-2s-.896-2-2-2-2 .896-2 2 .896 2 2 2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21s-6-4.686-6-10a6 6 0 0112 0c0 5.314-6 10-6 10z"
                />
              </svg>
              {order.house_number} {order.street} {order.city}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
