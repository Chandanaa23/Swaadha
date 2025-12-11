"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Toaster, toast } from "react-hot-toast";


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CartItem {
  productId: number;
  name: string;
  variationName?: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface Order {
  id: string;
  user_id: string;
  cart_items: CartItem[];
  full_name: string;
  phone_number: string;
  house_number: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  payment_method: string;
  payment_status?: string;
  total_price: number;
  shipping_cost: number;
  grand_total: number;
  order_date: string;
  status: string;
}

const statusFlow = ["pending", "confirmed", "processing", "out for delivery", "delivered"];
const statusLabels: Record<string, string> = {
  pending: "Order Placed",
  confirmed: "Order Confirmed",
  processing: "Processing",
  "out for delivery": "Out For Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const statusColors: Record<string, string> = {
  pending: "bg-yellow-400 text-black",
  confirmed: "bg-blue-500 text-white",
  processing: "bg-indigo-600 text-white",
  "out for delivery": "bg-orange-500 text-white",
  delivered: "bg-green-600 text-white",
  cancelled: "bg-red-600 text-white",
};

export default function UserOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
const [reviewProduct, setReviewProduct] = useState<{ productId: number; name: string } | null>(null);
const [rating, setRating] = useState(0);
const [comment, setComment] = useState("");


  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data.session?.user?.id || null);
    };
    fetchUser();
  }, []);

    useEffect(() => {
  const fetchOrders = async () => {
    if (!userId) return;

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("order_date", { ascending: false });

    if (!ordersData) return;

    // Fetch all product images
    const { data: imagesData } = await supabase
      .from("product_images")
      .select("product_id, image_url");

    const imageMap = new Map();
    imagesData?.forEach((img) => {
      if (!imageMap.has(img.product_id)) {
        imageMap.set(img.product_id, img.image_url);
      }
    });

    // Attach image_url to cart items
    const updatedOrders = ordersData.map((order) => ({
      ...order,
      cart_items: order.cart_items.map((item) => ({
        ...item,
        image_url: imageMap.get(item.productId) || "/placeholder.png",
      })),
    }));

    setOrders(updatedOrders);
    setLoading(false);
  };

  fetchOrders();
}, [userId]);

  

  if (loading) return <p className="text-center mt-12">Loading orders...</p>;
  if (orders.length === 0) return <p className="text-center mt-12">No orders found.</p>;

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
const submitReview = async () => {
  if (!rating) {
    toast.error("Please select a rating");
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const user_id = sessionData.session?.user?.id;

  if (!user_id) {
    toast.error("Login required");
    return;
  }

  // Prevent duplicate reviews
  const { data: existing } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("product_id", reviewProduct?.productId)
    .eq("user_id", user_id);

  if (existing && existing.length > 0) {
    toast.error("You already reviewed this product");
    return;
  }

  const { error } = await supabase.from("product_reviews").insert({
    product_id: reviewProduct?.productId,
    user_id,
    rating,
    comment,
  });

  if (error) {
    toast.error("Failed to submit review");
    return;
  }

  toast.success("Review submitted successfully");
  setReviewModal(false);
  setRating(0);
  setComment("");
};

  const renderStatusTimeline = (currentStatus: string) => {
    const currentIndex = statusFlow.indexOf(currentStatus.toLowerCase());
    


    return (
      <div className="relative pl-10">
        {statusFlow.map((status, idx) => {
          const active = idx <= currentIndex;
          const isLast = idx === statusFlow.length - 1;

          return (
            <div key={status} className="flex items-start mb-8 relative">
              {/* Vertical line and dot */}
              <div className="absolute left-0 top-0 flex flex-col items-center">
                <div
                  className={`w-5 h-5 rounded-full border-4 transition-colors duration-300 ${
                    active ? "border-green-500 bg-green-500" : "border-gray-300 bg-white"
                  }`}
                />
                {!isLast && (
                  <div
                    className={`w-1 flex-1 mt-1 transition-colors duration-300 ${
                      active ? "bg-green-500" : "bg-gray-300"
                    }`}
                    style={{ minHeight: "50px" }}
                  />
                )}
              </div>

              {/* Status content */}
              <div className="ml-8">
                <div
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    active ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {statusLabels[status]}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Function to download professional PDF invoice
  const downloadInvoice = (order: Order) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Invoice", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, 14, 35);
    doc.text(`Order Date: ${new Date(order.order_date).toLocaleDateString()}`, 14, 43);
    doc.text(`Name: ${order.full_name}`, 14, 51);
    doc.text(`Phone: ${order.phone_number}`, 14, 59);
    doc.text(
      `Address: ${order.house_number}, ${order.street}, ${order.city}, ${order.state} - ${order.pincode}`,
      14,
      67
    );
    doc.text(`Payment Method: ${order.payment_method}`, 14, 75);
    doc.text(`Payment Status: ${order.payment_status || "PENDING"}`, 14, 83);

    // Products Table
    const tableColumn = ["Product", "Qty", "Price", "Subtotal"];
    const tableRows: any[] = [];

    order.cart_items.forEach((item) => {
      const itemData = [
        item.variationName ? `${item.name} (${item.variationName})` : item.name,
        item.quantity.toString(),
        `₹${item.price.toFixed(2)}`,
        `₹${(item.price * item.quantity).toFixed(2)}`,
      ];
      tableRows.push(itemData);
    });

    autoTable(doc, {
      startY: 95,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 3 },
    });

    // Totals
  const finalY = (doc as any).lastAutoTable.finalY || 110;

// Set positions closer to the left (e.g., 14)
doc.setFontSize(12);
doc.setFont( "normal");
doc.text(`Shipping: ₹${order.shipping_cost.toFixed(2)}`, 14, finalY + 10);

doc.setFontSize(14);
doc.setFont( "bold");
doc.text(`Grand Total: ₹${order.grand_total.toFixed(2)}`, 14, finalY + 20);

// Save the PDF
doc.save(`Invoice-${order.id}.pdf`);

  };

  return (
    <div className="min-h-screen bg-white relative">
      <Toaster position="top-right" />

      {/* Orders list */}
      <div className="p-6 w-full mx-auto">
<h1 className="text-3xl font-bold mb-8 w-[800px]">My Orders</h1>
<div className="w-full min-h-screen bg-white-50 p-6">

  <div className="space-y-6">
    {orders.map((order) => (
      <div
        key={order.id}
        className="w-full flex flex-col md:flex-row items-start md:items-center justify-between w-full bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition p-6 cursor-pointer"
        onClick={() => setSelectedOrderId(order.id)}
      >
        {/* Products preview */}
        <div className="flex space-x-4 overflow-x-auto w-full md:w-2/3">
          {order.cart_items.map((item) => (
  <div
    key={item.productId}
    className="flex flex-col items-center min-w-[120px] bg-gray-50 p-2 rounded-lg"
  >
    <img
      src={item.image_url || "/placeholder.png"}
      alt={item.name}
      className="w-20 h-20 object-cover rounded-lg mb-2"
      loading="lazy"
    />
    <p className="text-xs text-center truncate max-w-[100px] font-medium">
      {item.name} {item.variationName ? `(${item.variationName})` : ""}
    </p>
    <p className="text-xs font-semibold mt-1">
      {item.quantity} × ₹{item.price.toFixed(2)}
    </p>

    {order.status === "delivered" && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      setReviewProduct({ productId: item.productId, name: item.name });
      setReviewModal(true);
    }}
    className="bg-orange-600 text-white px-4 py-1 mt-2 rounded hover:bg-orange-700 transition w-full text-xs"
  >
    Write Review
  </button>
)}

  </div>
))}

        </div>

        {/* Order status & total */}
        <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end">
          <span
            className={`px-4 py-1 rounded-full font-semibold text-sm whitespace-nowrap ${
              statusColors[order.status.toLowerCase()] || "bg-gray-400 text-white"
            }`}
          >
            {statusLabels[order.status.toLowerCase()] || order.status.toUpperCase()}
          </span>
          <p className="mt-2 text-gray-700 font-medium">
            Total: ₹{order.grand_total.toFixed(2)}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {new Date(order.order_date).toLocaleDateString()}
          </p>
        </div>
      </div>
    ))}
  </div>
</div>
</div>


      {/* Drawer + Overlay */}
      {selectedOrderId && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setSelectedOrderId(null)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-lg overflow-y-auto z-50 animate-slide-in">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Order Details</h2>
                <div className="flex space-x-2">
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    onClick={() => downloadInvoice(selectedOrder!)}
                  >
                    Download Invoice
                  </button>
                  <button
                    className="text-gray-500 hover:text-gray-800"
                    onClick={() => setSelectedOrderId(null)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Shipping & Billing */}
              <div className="space-y-2 mb-6 text-gray-700 text-sm">
                <h3 className="font-semibold">Shipping & Billing</h3>
                <p>
                  <strong>Full Name:</strong> {selectedOrder?.full_name}
                </p>
                <p>
                  <strong>Phone:</strong> {selectedOrder?.phone_number}
                </p>
                <p>
                  <strong>Address:</strong>{" "}
                  {`${selectedOrder?.house_number}, ${selectedOrder?.street}, ${selectedOrder?.city}, ${selectedOrder?.state} - ${selectedOrder?.pincode}`}
                </p>
                <p>
                  <strong>Payment Method:</strong> {selectedOrder?.payment_method}
                </p>
                <p>
                  <strong>Payment Status:</strong> {selectedOrder?.payment_status || "PENDING"}
                </p>
              </div>

              {/* Products & Billing */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-4">Products & Billing</h3>
                <div className="border rounded-md overflow-hidden">
                  <div className="grid grid-cols-4 gap-4 bg-gray-100 p-2 font-semibold text-sm">
                    <div className="col-span-2">Product</div>
                    <div className="text-center">Qty</div>
                    <div className="text-right">Subtotal</div>
                  </div>

                  {selectedOrder?.cart_items.map((item) => (
                    <div
                      key={item.productId}
                      className="grid grid-cols-4 gap-4 p-2 items-center border-t text-sm"
                    >
                      <div className="col-span-2">
                        <p className="font-medium">{item.name}</p>
                        {item.variationName && (
                          <p className="text-xs text-gray-500">({item.variationName})</p>
                        )}
                        <p className="text-xs text-gray-500">₹{item.price.toFixed(2)} each</p>
                      </div>
                      <div className="text-center">{item.quantity}</div>
                      <div className="text-right font-semibold">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}

                  <div className="border-t p-2 space-y-1 text-sm text-right">
                    <p>Shipping: ₹{selectedOrder?.shipping_cost.toFixed(2)}</p>
                    <p className="font-semibold text-base">
                      Grand Total: ₹{selectedOrder?.grand_total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Status */}
              <div>
                <h3 className="font-semibold mb-3">Order Status</h3>
                {renderStatusTimeline(selectedOrder?.status || "pending")}
              </div>
            </div>
          </div>
        </>
        
      )}
      {reviewModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white w-full max-w-md rounded-lg p-6 shadow-xl">
      <h2 className="text-xl font-bold mb-4">Review {reviewProduct?.name}</h2>

      {/* Rating Stars */}
      <div className="flex space-x-2 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`text-2xl ${rating >= star ? "text-yellow-400" : "text-gray-300"}`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Comment */}
      <textarea
        className="w-full border rounded p-3 text-sm"
        placeholder="Write your feedback..."
        rows={4}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={() => setReviewModal(false)}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={submitReview}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Submit
        </button>
      </div>
    </div>
  </div>
)}


      <style jsx>{`
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
        @keyframes slide-in {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(0%);
          }
        }
      `}</style>
    </div>
  );
}
