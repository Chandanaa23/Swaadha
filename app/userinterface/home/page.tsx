"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Session } from "@supabase/supabase-js";

import { Instagram } from "lucide-react";
import {
  ShoppingCart,
  Star,
  TrendingUp,
  Heart,
  Shield,
  Leaf,
  Eye,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { createClient } from "@supabase/supabase-js";
import HeroSlider from "../components/HeroSlider";
import { useRouter } from "next/navigation"; // not 'next/router'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Banner {
  id: string;
  image_url: string;
  active: boolean;
  created_at: string;
}

interface Hero {
  id: string;
  images: string[];
  active: boolean;
  created_at: string;
}

interface InstagramLink {
  id: number;
  url: string;
}
interface ProductVariation {
  id: number;
  price: number;
  unit_type: string;
  stock: number;
}


interface ProductImage {
  image_url: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  unit: string;
  image: string;
  category_id: number | null;
  rating?: number; // You can add rating if available later
  discount?: number; // Optional discount
  variation_id?: number; // ADD THIS
}


export default function HomePage({ images }: { images: string[] }) {
  const [instagramLinks, setInstagramLinks] = useState<InstagramLink[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [index, setIndex] = useState(0);
  const [hero, setHero] = useState<Hero | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userSession, setUserSession] = useState<Session | null>(null);

  // --------------------------
  // AUTH SESSION LISTEN
  // --------------------------
  useEffect(() => {
    async function fetchSession() {
      const { data } = await supabase.auth.getSession();
      setUserSession(data.session);
    }
    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUserSession(session)
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data.user);
    });
  }, []);


  const handleViewDetails = (productId: number) => {
    router.push(`/userinterface/product/${productId}`);
  };


  const fetchTopProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`
      id,
      name,
      category_id,
      created_at,
      product_variations:product_variations (
  id,
  price,
  unit_type,
  stock
),

      product_images:product_images (
        image_url
      ),
      product_reviews:product_reviews (
        rating
      )
    `)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(4);

    if (error) {
      console.error("Error fetching products:", error);
      return [];
    }

    if (!data) return [];

    return data
      .map((product) => {
        // Filter out variations with 0 stock
        const inStockVariations = product.product_variations?.filter(
          (v: ProductVariation & { stock: number }) => v.stock > 0
        );

        if (!inStockVariations || inStockVariations.length === 0) {
          // No stock, skip this product
          return null;
        }

        const firstImage = product.product_images?.[0]?.image_url || "/placeholder.png";

        // Get the lowest price variation that has stock
        const lowestPriceVariation = inStockVariations.reduce(
          (prev: ProductVariation, curr: ProductVariation) =>
            curr.price < prev.price ? curr : prev,
          inStockVariations[0]
        );

        const ratings = product.product_reviews?.map((r) => r.rating) || [];
        const avgRating =
          ratings.length > 0
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : 0;

        return {
          id: product.id,
          name: product.name,
          price: lowestPriceVariation?.price || 0,
          unit: lowestPriceVariation?.unit_type || "",
          image: firstImage,
          category_id: product.category_id,
          rating: avgRating.toFixed(1),
          variation_id: lowestPriceVariation?.id // ADD THIS
        };
      })
      .filter((p) => p !== null); // Remove out-of-stock products
  };



  useEffect(() => {
    fetchTopProducts().then(setProducts);
  }, []);


  const addToCart = async (product: Product) => {
    const userId = userSession?.user?.id;
    if (!userId) {
      toast.error("Please sign in to add items to cart");
      router.push("/login");
      return;
    }

    if (!product.variation_id) {
      toast.error("Product variation missing");
      return;
    }

    // Check if product already exists in cart
    const { data: existing } = await supabase
      .from("cart")
      .select("*")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .eq("variation_id", product.variation_id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("cart")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id);

      toast.success("Quantity updated in cart");
    } else {
      await supabase.from("cart").insert([
        {
          user_id: userId,
          product_id: product.id,
          variation_id: product.variation_id,
          price: product.price,
          unit: product.unit,
          quantity: 1,
        },
      ]);

      toast.success("Added to cart");
    }

    // Trigger cart refresh on other pages
    window.dispatchEvent(new Event("cartUpdated"));
  };





  useEffect(() => {
    if (!hero?.images?.length) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % hero.images.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [hero?.images?.length]);


  // Fetch Instagram links
  useEffect(() => {
    const fetchInstagramLinks = async () => {
      const { data, error } = await supabase
        .from("instagram_links")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      else setInstagramLinks(data);
    };
    fetchInstagramLinks();
  }, []);


  useEffect(() => {
    if (!instagramLinks.length) return;

    if ((window as any).instgrm) {
      (window as any).instgrm.Embeds.process(); // Reparse dynamically added blockquotes
    } else {
      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.onload = () => {
        (window as any).instgrm.Embeds.process();
      };
      document.body.appendChild(script);
    }
  }, [instagramLinks]);



  // Fetch banner
  useEffect(() => {
    const fetchBanner = async () => {
      const { data, error } = await supabase
        .from("notification_banner")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setBanner(data);
        setShowBanner(true);
      }
    };
    fetchBanner();
  }, []);

  // Fetch hero section
  useEffect(() => {
    const fetchHero = async () => {
      const { data, error } = await supabase
        .from("hero_section")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setHero(data);
      }
    };
    fetchHero();
  }, []);

  const closeBanner = () => setShowBanner(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" richColors />

      {/* Banner Popup */}
      {showBanner && banner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-3xl w-full relative overflow-hidden">
            <button
              onClick={closeBanner}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              &times;
            </button>
            <img
              src={banner.image_url}
              alt="Notification Banner"
              className="w-full h-auto rounded-t-3xl object-cover"
            />
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative w-full h-[280px] sm:h-[350px] md:h-[450px] overflow-hidden">
        <div
          className="flex w-full h-full transition-transform duration-[700ms] ease-in-out"
          style={{
            transform: `translateX(-${index * 100}%)`,
          }}
        >
          {(hero?.images || []).map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`Hero ${i}`}
              className="w-full h-full object-cover flex-shrink-0"
            />
          ))}
        </div>
      </div>


      {/* Our Promise Section */}
      <section className="w-full h-screen px-6 sm:px-8 lg:px-12 py-24 bg-gradient-to-b from-orange-50 to-orange-100 rounded-3xl">
        <div className="text-center max-w-4xl mx-auto mb-16 space-y-4">
          <span className="inline-block bg-orange-200 text-orange-800 rounded-full px-5 py-2 text-sm font-semibold tracking-wide uppercase shadow-sm">
            Our Promise
          </span>
          <h2 className="text-5xl font-extrabold text-orange-900 leading-tight">
            100% Natural, Chemical-Free, No Compromise on Quality
          </h2>
          <p className="text-gray-700 text-xl max-w-3xl mx-auto">
            Every product is made with the finest ingredients, care, and the
            warmth of family traditions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {[
            {
              Icon: Leaf,
              title: "100% Natural",
              description:
                "No artificial colors, flavors, or preservatives. Just pure, natural goodness.",
              bgColor: "bg-green-200",
              iconColor: "text-green-600",
            },
            {
              Icon: Shield,
              title: "Chemical-Free",
              description:
                "Carefully crafted without any harmful chemicals or additives.",
              bgColor: "bg-blue-200",
              iconColor: "text-blue-600",
            },
            {
              Icon: Heart,
              title: "Made with Love",
              description:
                "Every product carries the warmth of traditional family recipes.",
              bgColor: "bg-orange-200",
              iconColor: "text-orange-600",
            },
          ].map(({ Icon, title, description, bgColor, iconColor }) => (
            <div
              key={title}
              className="bg-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-shadow duration-300 text-center flex flex-col items-center gap-6"
            >
              <div
                className={`mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full ${bgColor} bg-gradient-to-tr from-white/70 to-white/30`}
              >
                <Icon className={`${iconColor} w-9 h-9`} />
              </div>
              <h3 className="font-bold text-2xl text-gray-900">{title}</h3>
              <p className="text-gray-600 text-base max-w-sm">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Top Rated Products */}
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" richColors />

        {/* Top Rated Products Section */}
        <section className="w-full mx-auto px-6 sm:px-8 lg:px-12 py-28 bg-white">
          <div className="flex items-center gap-4 mb-12">
            <TrendingUp className="w-10 h-10 text-orange-600" />
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              New Arrival
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {products.length === 0 ? (
              <p>Loading products...</p>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-2xl transition transform hover:-translate-y-2 duration-300"
                >
                  <div className="relative h-56 sm:h-64 overflow-hidden bg-gray-100 rounded-t-3xl">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-5 left-5 bg-white/90 backdrop-blur-sm px-4 py-1 rounded-full text-sm text-gray-700 font-medium shadow">
                      Category: {product.category_id || "N/A"}
                    </div>
                  </div>


                  <div className="p-4 sm:p-5 space-y-3">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {product.name}
                    </h3>

                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-600 font-semibold">
                        {product.rating || "N/A"}
                      </span>
                    </div>


                    <div className="flex items-center justify-between font-semibold mb-2">
                      <div>
                        <span className="text-2xl text-gray-900">₹{product.price}</span>
                        {product.unit && (
                          <span className="ml-2 text-gray-600 font-medium text-sm">
                            ({product.unit})
                          </span>
                        )}
                      </div>
                    </div>


                    <button
                      onClick={() => handleViewDetails(product.id)}
                      className="w-full border-2 border-orange-600 text-orange-600 py-3 rounded-lg hover:bg-orange-50 transition-all flex items-center justify-center gap-3 font-semibold group shadow-sm hover:shadow-md transform hover:scale-[1.03]"
                    >
                      <Eye className="w-6 h-6" />
                      <span>View Details</span>
                    </button>

                    {/*
                   <button
  onClick={() => addToCart(product)}
  className={`w-full py-3 rounded-lg transition-all flex items-center justify-center gap-3 font-semibold shadow-sm ${
    userSession?.user?.id
      ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover:shadow-lg hover:scale-[1.03]"
      : "bg-gray-300 text-gray-500 cursor-not-allowed"
  }`}
  disabled={!userSession?.user?.id}
>
  <ShoppingCart className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
  <span>
    {userSession?.user?.id ? "Add to Cart" : "Sign In to Add to Cart"}
  </span>
</button> */}

                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Instagram Section */}
      {/* Instagram Section */}
      {/* Auto-scrolling Instagram Section */}
      <section className="w-full py-18 bg-white">
        <div className="text-center mb-14 space-y-3 px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-center">
            <Instagram className="w-10 h-10 text-pink-500" />
          </div>

          <h2 className="text-4xl font-extrabold mb-2 tracking-tight">

            Follow Us on Instagram
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            See Our Products in Action
            <br />
            Watch how we prepare our authentic products with love and care
          </p>
        </div>

        {/* Auto-scrolling container */}
        <div className="relative overflow-hidden">
          <div className="flex gap-6 animate-marquee">
            {instagramLinks.concat(instagramLinks).map((link, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-72 rounded-2xl shadow-lg overflow-hidden"
              >
                <blockquote
                  className="instagram-media"
                  data-instgrm-permalink={link.url}
                  data-instgrm-version="14"
                ></blockquote>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-gray-600 text-lg tracking-wide mt-10 flex items-center justify-center gap-2">
          <Instagram className="w-6 h-6 text-pink-500" />
          @swaadha_homemade
        </p>

        <style jsx>{`
    .animate-marquee {
      display: flex;
      gap: 1.5rem;
      animation: marquee 30s linear infinite;
    }
    @keyframes marquee {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(-50%);
      }
    }

    /* Hide scrollbar */
    .overflow-hidden::-webkit-scrollbar {
      display: none;
    }
    .overflow-hidden {
      -ms-overflow-style: none; /* IE and Edge */
      scrollbar-width: none; /* Firefox */
    }
  `}</style>
      </section>


      <section className="w-full  bg-white mx-auto px-6 sm:px-8 lg:px-12 py-28 flex flex-col md:flex-row items-center gap-16">
        <div className="md:w-1/2">
          <span className="inline-block bg-yellow-100 text-yellow-700 rounded-full px-6 py-2 text-base font-semibold mb-6 shadow-sm"> Our Story </span>
          <h2 className="text-4xl font-extrabold mb-8 max-w-xl leading-snug"> A Family Tradition Passed Down with Love </h2>
          <p className="text-gray-700 mb-6 max-w-xl text-lg leading-relaxed">
            We are a mother and daughter duo, committed to bringing you the authentic flavors of homemade food.
            What started with making chutney powders using our family’s traditional recipes has now expanded into a wide variety of products,
            including masala powders, sweets, instant powders, and festival specials for every occasion. </p>
          <p className="text-gray-700 max-w-xl text-lg leading-relaxed">
            Every product we create carries generations of culinary wisdom and the same care we’d put into cooking for our own family.
            We believe in preserving traditions while bringing the authentic taste of home to yours. </p>
        </div>
        <div className="md:w-1/2 relative rounded-3xl shadow-2xl hover:shadow-3xl transition-shadow duration-500 overflow-visible">
          {/* Image */}
          <img src="https://deliciousfoods.in/cdn/shop/articles/spices_1100x.jpg?v=1742457010"
            alt="Spices image"
            className="w-full h-[250px] md:h-[300px] lg:h-[350px] object-cover rounded-3xl" />
          {/* Overlay badge */}
          <div className="absolute -bottom-6 right-6 bg-gradient-to-tr from-orange-500 to-yellow-400 text-white rounded-xl px-6 py-3 shadow-lg text-center font-bold tracking-wide select-none text-xl leading-snug">
            <span className="block">15+</span>
            <span className="block text-sm font-normal mt-1"> Years of Experience </span>
          </div>
        </div>
      </section>
      {/* Easy Ordering Process Section */}
      <section className="bg-orange-50 py-28">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 text-center mb-20">
          <span className="inline-block bg-orange-200 text-orange-800 rounded-full px-6 py-2 text-base font-semibold tracking-wide mb-6 shadow-sm uppercase"> How to Order </span>
          <h2 className="text-5xl font-extrabold">Easy Ordering Process</h2>
        </div> <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 grid grid-cols-1 sm:grid-cols-2 gap-10">
          {/* Contact Us */} <div className="bg-white p-8 rounded-3xl shadow-lg text-left flex items-start gap-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer group">
            <div className="bg-orange-100 p-4 rounded-full group-hover:bg-orange-200 transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-pink-600 group-hover:text-pink-700 transition-colors duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor" >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 8.5A6.5 6.5 0 018.5 2h7A6.5 6.5 0 0122 8.5v7a6.5 6.5 0 01-6.5 6.5h-7A6.5 6.5 0 012 15.5v-7zM8.5 2v6.5h6.5" /> </svg> </div> <div> <h3 className="font-bold text-xl mb-2">Contact Us</h3> <p className="text-gray-700 text-sm leading-relaxed"> Call or WhatsApp us at: <br /> <a href="tel:+918296295658" className="text-blue-600 hover:underline"> +91 8296295658 </a> </p> </div> </div> {/* Advance Orders */} <div className="bg-white p-8 rounded-3xl shadow-lg text-left flex items-start gap-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer group"> <div className="bg-green-100 p-4 rounded-full group-hover:bg-green-200 transition-colors duration-300"> <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 group-hover:text-green-700 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" > <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 11v10h14V11" /> </svg> </div> <div> <h3 className="font-bold text-xl mb-2">Advance Orders</h3> <p className="text-gray-700 text-sm leading-relaxed"> Place your orders 6-7 days in advance for the freshest products. </p> </div> </div> {/* Delivery Time */} <div className="bg-white p-8 rounded-3xl shadow-lg text-left flex items-start gap-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer group"> <div className="bg-yellow-100 p-4 rounded-full group-hover:bg-yellow-200 transition-colors duration-300"> <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600 group-hover:text-yellow-700 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" > <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6 0a9 9 0 11-18 0 9 9 0 0118 0z" /> </svg> </div> <div> <h3 className="font-bold text-xl mb-2">Delivery Time</h3> <p className="text-gray-700 text-sm leading-relaxed"> • Bangalore: Within 24 hours<br /> • Outside Bangalore: 4-10 days </p> </div> </div> {/* Special Orders */} <div className="bg-white p-8 rounded-3xl shadow-lg text-left flex items-start gap-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer group"> <div className="bg-purple-100 p-4 rounded-full group-hover:bg-purple-200 transition-colors duration-300"> <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600 group-hover:text-purple-700 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" > <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> </svg> </div> <div> <h3 className="font-bold text-xl mb-2">Special Orders</h3> <p className="text-gray-700 text-sm leading-relaxed"> We take orders for marriages and festivals (minimum 100 people). Contact us for more details. </p> </div> </div> </div> </section>
      {/* Our Story & Easy Ordering sections remain same */}
      {/* ...rest of the code */}
    </div>
  );
}
