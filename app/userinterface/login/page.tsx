"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import toast,{Toaster} from "react-hot-toast";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginSignupPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tempErrors: { [key: string]: string } = {};
    const phoneRegex = /^[6-9]\d{9}$/;

    if (!email) tempErrors.email = "Email is required.";
    if (!password) tempErrors.password = "Password is required.";

    if (!isLogin) {
      if (!phoneRegex.test(phone)) tempErrors.phone = "Enter a valid 10-digit Indian phone number.";
      if (password !== confirmPassword) tempErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(tempErrors);
    if (Object.keys(tempErrors).length > 0) return;

    try {
      if (isLogin) {
        // LOGIN
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.session) {
          setErrors({ login: "Invalid email or password." });
          return;
        }

        // Check if user is blocked
        const user = data.user;
        if (user.user_metadata?.is_blocked) {
          await supabase.auth.signOut(); // log them out
          setErrors({ login: "Your account is blocked. Please contact." });
          return;
        }

        toast.success("Login successful!");
        router.push("/userinterface/home"); // redirect after login
      } else {
        // SIGNUP
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { phone, is_blocked: false }, // default: not blocked
          },
        });

        if (error) {
          if (error.message.includes("duplicate key value")) {
            setErrors({ signup: "Email already registered. Please login." });
          } else {
            setErrors({ signup: error.message });
          }
          return;
        }

        if (!data.user?.confirmed_at) {
          toast.success("Signup successful! Please login to continue.");
          setIsLogin(true);  // switch to login tab
          setPassword("");   
          setConfirmPassword("");
        } else {
          toast.success("Signup & login successful!");
          router.push("/userinterface/home");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error({ login: "Something went wrong. Please try again." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Toaster position="top-right" />

      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8">
        {/* Tabs */}
        <div className="flex mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 font-semibold rounded-lg ${isLogin ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 font-semibold rounded-lg ${!isLogin ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Signup
          </button>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {isLogin ? "Login to your account" : "Create a new account"}
        </h2>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Phone (Signup only) */}
          {!isLogin && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your 10-digit Indian phone number"
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          {!isLogin && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>
          )}

          {/* General errors */}
          {errors.login && <p className="text-red-500 text-sm">{errors.login}</p>}
          {errors.signup && <p className="text-red-500 text-sm">{errors.signup}</p>}

          <button
            type="submit"
            className="w-full py-3 mt-4 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 transition"
          >
            {isLogin ? "Login" : "Signup"}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600 text-sm">
          {isLogin ? (
            <>
              Don't have an account?{" "}
              <button onClick={() => setIsLogin(false)} className="text-orange-600 font-semibold hover:underline">
                Signup
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => setIsLogin(true)} className="text-orange-600 font-semibold hover:underline">
                Login
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
