"use client";


import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import toast, { Toaster } from "react-hot-toast";
import "swiper/css";
import "swiper/css/navigation"; // <-- important for navigation buttons
const SwiperNoSSR = dynamic(() => import("swiper/react").then(mod => mod.Swiper), { ssr: false });
const SwiperSlideNoSSR = dynamic(() => import("swiper/react").then(mod => mod.SwiperSlide), { ssr: false });



const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ProductVariation {
  id: number;
  unit_type: string | null;
  price: number;
  stock: number;
}

interface ProductImage {
  id: number;
  image_url: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  description: string;
  ingredients: string | null;
  taste_id: number | null;
  pack_of: string | null;
  max_shelf_life: string | null;
  has_variation: boolean;
  shipping_charge: number;
}

export default function ProductDetailsPage() {
  const params = useParams();
  const productId = params.productId;
  const [avgRating, setAvgRating] = useState<number>(0);

  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [user, setUser] = useState<any>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const [isWishlisted, setIsWishlisted] = useState(false);

  const [product, setProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [tasteName, setTasteName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"description" | "specs">("description");
  const prevRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);

  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState<string>("");

  const fixUrl = (url?: string) => url || "/default.png";


  const [scrollOffset, setScrollOffset] = useState(0);
  const cardWidth = 286; // 280px + 6px gap
  const visibleWidth = 3 * cardWidth; // number of visible cards * cardWidth
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);






  useEffect(() => {
    if (reviews.length === 0) return;

    const totalWidth = reviews.length * cardWidth;

    const interval = setInterval(() => {
      setScrollOffset((prev) => (prev + cardWidth >= totalWidth ? 0 : prev + cardWidth));
    }, 3000); // scroll every 3 seconds

    return () => clearInterval(interval);
  }, [reviews]);


  const fetchReviews = async () => {
    const { data: reviewData, error } = await supabase
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId);

    if (error) {
      console.error("Failed to fetch reviews:", error);
      return;
    }

    // Calculate average rating safely
    const avg =
      reviewData && reviewData.length > 0
        ? reviewData.reduce((sum, r) => sum + (r.rating || 0), 0) /
        reviewData.length
        : 0;

    setAvgRating(avg);
  };




  async function addToCart() {
    if (!user) return alert("Login required to add items to cart");

    const item = {
      user_id: user.id,
      product_id: product?.id,
      variation_id: selectedVariation?.id || null,
      quantity,
    };

    // Insert into cart table in Supabase
    const { error } = await supabase.from("cart").insert([item]);

    if (error) {
      console.error("Failed to add to cart:", error);
      toast.error("Failed to add to cart");
    } else {
      toast.success("Product added to cart!");
    }
  }



  useEffect(() => {
    if (!productId) return;

    async function fetchDetails() {
      setLoading(true);

      // --- Fetch product, variations, images in parallel ---
      const [productRes, variationRes, imageRes] = await Promise.all([
        supabase.from("products").select("*").eq("id", productId).single(),
        supabase.from("product_variations").select("*").eq("product_id", productId),
        supabase.from("product_images").select("*").eq("product_id", productId),
      ]);

      const productData = productRes.data;
      const variationData = variationRes.data || [];
      const imageData = imageRes.data || [];

      if (!productData) {
        console.error("Product not found");
        setLoading(false);
        return;
      }

      setProduct(productData);
      setVariations(variationData);
      setImages(imageData);

      // Set main image
      setMainImage(imageData[0]?.image_url ? fixUrl(imageData[0].image_url) : "/default.png");

      // Set selected variation
      setSelectedVariation(
        variationData[0] || {
          id: 0,
          unit_type: productData.unit_type || "1 Unit",
          price: productData.price || 0,
          stock: productData.stock || 50,
        }
      );

      // Fetch taste name if available
      if (productData.taste_id) {
        const { data: taste } = await supabase
          .from("attributes")
          .select("name")
          .eq("id", productData.taste_id)
          .single();
        setTasteName(taste?.name || "");
      }

      // Fetch logged-in user
      const { data: authUser } = await supabase.auth.getUser();
      const user = authUser?.user || null;
      setUser(user);

      // Check wishlist status
      if (user) {
        const { data: wishlistData } = await supabase
          .from("wishlists")
          .select("*")
          .eq("product_id", productId)
          .eq("user_id", user.id)
          .single();
        setIsWishlisted(!!wishlistData);
      }

      // Fetch reviews and attach user names
      const { data: reviewData, error: reviewError } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId);

      if (reviewError) {
        console.error("Failed to fetch reviews:", reviewError);
        setReviews([]);
        setAvgRating(0);
      } else {
        const reviewsWithUser = await Promise.all(
          (reviewData || []).map(async (rev) => {
            const { data: userData } = await supabase
              .from("auth.users")
              .select("id, email, user_metadata")
              .eq("id", rev.user_id)
              .single();

            const name = userData?.user_metadata?.name || null;
            return {
              ...rev,
              auth_users: {
                id: userData?.id,
                email: userData?.email,
              },
            };

          })
        );

        setReviews(reviewsWithUser);

        // Calculate average rating
        const avg = reviewsWithUser.length
          ? reviewsWithUser.reduce((sum, r) => sum + r.rating, 0) / reviewsWithUser.length
          : 0;
        setAvgRating(avg);
      }

      setLoading(false);
    }

    fetchDetails();
  }, [productId]);



  async function toggleWishlist() {
    if (!user) return toast.error("Login required to add to wishlist");

    if (isWishlisted) {
      // Remove from wishlist
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("product_id", productId)
        .eq("user_id", user.id);

      if (error) {
        toast.error("Failed to remove from wishlist");
      } else {
        setIsWishlisted(false);
        toast.success("Removed from wishlist");
      }
    } else {
      // Add to wishlist
      const { error } = await supabase.from("wishlists").insert([
        { product_id: productId, user_id: user.id }
      ]);

      if (error) {
        toast.error("Failed to add to wishlist");
      } else {
        setIsWishlisted(true);
        toast.success("Added to wishlist");
      }
    }
  }


  // Check logged-in user

  async function submitReview() {
    if (!rating || !comment) return toast.error("Give rating & comment");

    if (!user) return toast.error("Login required");

    const { data: authUser } = await supabase.auth.getUser();
    const profileName = authUser?.user?.user_metadata?.name || "Customer";

    const { error } = await supabase.from("product_reviews").insert([
      {
        product_id: productId,
        user_id: user.id,
        rating,
        comment,
        user_name: profileName
      }
    ]);

    if (!error) {
      toast.success("Review added!");
      setRating(0);
      setComment("");

      const { data: refreshed } = await supabase
        .from("product_reviews")
        .select("*, auth_users:auth.users(name, email, avatar_url)")
        .eq("product_id", productId);

      setReviews(refreshed || []);
    } else {
      toast.error("Failed to add review");
    }
  }



  if (loading) return <p className="text-center mt-12">Loading...</p>;
  if (!product) return <p className="text-center mt-12">Product not found</p>;


  return (
    <div className="min-h-screen bg-white  px-6 lg:px-24 py-12">
      <Toaster position="top-right" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

        {/* LEFT: Images */}
        <div>
          {/* MAIN IMAGE */}
          <div className="w-[600px] h-[350px] overflow-hidden rounded-xl shadow-lg flex items-center justify-center bg-gray-100">
            <Image
              src={mainImage}
              alt={product.name}
              width={500}
              height={350}
              className="max-w-full max-h-full object-cover"
            />
          </div>


          {/* THUMBNAILS */}
          <div className="flex gap-3 mt-4 overflow-x-auto">
            {images.map((img) => (
              <div
                key={img.id}
                className={`border rounded-lg cursor-pointer overflow-hidden w-[120px] h-[80px] hover:scale-105 transition ${fixUrl(img.image_url) === mainImage ? "border-orange-600" : "border-gray-200"
                  }`}
                onClick={() => setMainImage(fixUrl(img.image_url))}
              >
                <Image
                  src={fixUrl(img.image_url)}
                  alt={product.name}
                  width={120}
                  height={80}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT: Details */}
        <div className="space-y-4 gap-15">
          <h1 className="text-4xl font-extrabold text-orange-900 flex items-center gap-4">
            {product.name}

            {/* Stock Badge */}
            {selectedVariation && (
              selectedVariation.stock === 0 ? (
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                  Out of Stock
                </span>
              ) : selectedVariation.stock <= 10 ? (
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                  Limited Stock
                </span>
              ) : null
            )}
          </h1>


          {/* ⭐ Average Rating */}
          <div className="flex items-center gap-2 mt-1">
            <div className="text-yellow-400 text-xl">
              {"★".repeat(Math.round(avgRating))}
              <span className="text-gray-300">
                {"★".repeat(5 - Math.round(avgRating))}
              </span>
            </div>

            <span className="text-gray-600 text-sm">
              {avgRating.toFixed(1)} / 5
            </span>

            <span className="text-gray-400 text-sm">
              ({reviews.length} reviews)
            </span>
          </div>



          <p className="text-gray-700 line-clamp-3">
            {product.description}
          </p>

          {/* Price + Shipping Display */}
          {/* Price + Shipping Display */}
          <div className="flex items-center gap-4">
            <p className="text-3xl font-bold text-orange-700">₹{selectedVariation?.price}</p>

            {/* Shipping Badge */}
            {product.shipping_charge === 0 ? (
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                Free Shipping
              </span>
            ) : (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                Shipping: ₹{product.shipping_charge}
              </span>
            )}


          </div>



          {/* Variations */}
          {product.has_variation && variations.length > 0 && (
            <div>
              <p className="font-semibold">Choose Option:</p>
              <div className="flex gap-3 mt-2 flex-wrap">
                {variations.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariation(v)}
                    className={`px-5 py-2 rounded-full border font-semibold transition ${selectedVariation?.id === v.id
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-white text-orange-600 border-orange-400 hover:bg-orange-50"
                      }`}
                  >
                    {v.unit_type}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Show unit type when product has NO variations */}
          {!product.has_variation && selectedVariation && (
            <div>
              <p className="font-semibold text-orange-800">Unit</p>
              <div className="px-5 py-2 rounded-full bg-orange-100 text-orange-700 font-semibold inline-block mt-2">
                {selectedVariation.unit_type}
              </div>
            </div>
          )}


          <div className="flex items-center gap-2">
            <p className="font-semibold text-orange-800">Qty</p>

            <div className="flex items-center border-2 border-yellow-400 rounded-xl overflow-hidden">
              {/* Decrement Button */}
              <button
                className="w-12 h-12 flex items-center justify-center text-xl font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                onClick={() => quantity > 1 && setQuantity(quantity - 1)}
              >
                −
              </button>

              {/* Quantity Display */}
              <span className="w-12 h-12 flex items-center justify-center text-lg font-bold text-orange-800 bg-orange-50">
                {quantity}
              </span>

              {/* Increment Button */}
              <button
                className="w-12 h-12 flex items-center justify-center text-xl font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                onClick={() => quantity < (selectedVariation?.stock ?? 50) && setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
          </div>





          <div className="flex gap-4 mt-4">
            {/* Add To Cart */}
            <button
              onClick={addToCart}
              disabled={selectedVariation?.stock === 0}
              className={`flex-1 text-white py-3 rounded-xl text-lg font-semibold transition duration-300 shadow-md hover:shadow-lg 
    ${selectedVariation?.stock === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"}
  `}
            >
              Add To Cart
            </button>



            {/* Wishlist Button */}
            <button
              onClick={toggleWishlist}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-lg font-semibold transition duration-300 shadow-md hover:shadow-lg ${isWishlisted
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              <span className="inline-block transition-transform duration-300 hover:scale-110">
                {isWishlisted ? "♥" : "♡"}
              </span>
              {isWishlisted ? "Wishlisted" : "Add to Wishlist"}
            </button>
          </div>





        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mt-6 flex gap-6 text-lg font-semibold">
        <button
          onClick={() => setActiveTab("description")}
          className={`pb-2 ${activeTab === "description"
            ? "text-orange-600 border-b-2 border-orange-600"
            : "text-gray-500"
            }`}
        >
          Description
        </button>

        <button
          onClick={() => setActiveTab("specs")}
          className={`pb-2 ${activeTab === "specs"
            ? "text-orange-600 border-b-2 border-orange-600"
            : "text-gray-500"
            }`}
        >
          Specifications
        </button>
      </div>
      {/* Tab Content */}
      <div className="mt-4 text-gray-700">
        {activeTab === "description" && (
          <div>
            <p>{product.description}</p>
          </div>
        )}

        {activeTab === "specs" && (
          <div>
            <table className="w-full bg-white border rounded-lg overflow-hidden shadow-sm">
              <tbody>
                {product.max_shelf_life && (
                  <tr className="border-b hover:bg-orange-50 transition">
                    <td className="p-3 font-semibold w-1/3">Max Shelf Life</td>
                    <td className="p-3">{product.max_shelf_life}</td>
                  </tr>
                )}

                {tasteName && (
                  <tr className="border-b hover:bg-orange-50 transition">
                    <td className="p-3 font-semibold">Taste</td>
                    <td className="p-3">{tasteName}</td>
                  </tr>
                )}

                {product.pack_of && (
                  <tr className="border-b hover:bg-orange-50 transition">
                    <td className="p-3 font-semibold">Pack Of</td>
                    <td className="p-3">{product.pack_of}</td>
                  </tr>
                )}

                {product.ingredients && (
                  <tr className="hover:bg-orange-50 transition">
                    <td className="p-3 font-semibold">Ingredients</td>
                    <td className="p-3">{product.ingredients}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}


        {/* ⭐ CUSTOMER REVIEW SECTION */}

        <div className="mt-20 text-center  py-8">
          <h2 className="text-3xl font-extrabold text-orange-900 mb-2">
            Customer Review
          </h2>
          <p className="text-gray-600 mb-10 max-w-xl mx-auto">
            What our customers say about this product
          </p>

          <div className="overflow-hidden w-full relative">
            <div
              className="flex gap-6"
              style={{ transform: `translateX(-${scrollOffset}px)`, transition: "transform 0.5s linear" }}
            >
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white p-6 rounded-xl shadow-md text-center min-w-[280px] flex-shrink-0 border-2 border-orange-200"
                >
                  <h3 className="font-bold text-orange-800">
                    {rev.auth_users?.email || "Customer"}
                  </h3>



                  <p className="text-gray-600 mt-2">{rev.comment}</p>
                  <p className="text-yellow-400 text-xl mt-4">
                    {"★".repeat(rev.rating)}
                    <span className="text-gray-300">{"★".repeat(5 - rev.rating)}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
