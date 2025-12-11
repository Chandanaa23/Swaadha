"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function generateCaptcha(length = 5) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState("");
  const [captchaValue, setCaptchaValue] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // Generate captcha on mount
  useEffect(() => setCaptchaValue(generateCaptcha()), []);

  const refreshCaptcha = () => {
    setCaptchaValue(generateCaptcha());
    setCaptcha("");
  };

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password: string) =>
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{7,}$/.test(
      password
    );

  const handleForgotPassword = async () => {
    if (!validateEmail(email)) {
      toast.error("Please enter a valid email first!");
      return;
    }
    toast("Password reset is not implemented for subadmins table!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) return toast.error("Invalid email format!");
    if (!validatePassword(password))
      return toast.error("Password must meet requirements");
    if (captcha !== captchaValue) {
      toast.error("Captcha does not match");
      refreshCaptcha();
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("subadmins")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !data) {
        toast.error("Invalid credentials");
        return;
      }

      if (data.password !== password) {
        toast.error("Incorrect password");
        return;
      }

      // Save role and session (do NOT store password!)
      localStorage.setItem("role", data.role || "subadmin");
      localStorage.setItem("email", data.email);
      localStorage.setItem("isLoggedIn", "true");

      toast.success("Login successful!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const passwordRules = [
    { label: "At least 7 characters", valid: password.length >= 7 },
    { label: "At least one uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "At least one number", valid: /\d/.test(password) },
    {
      label: "At least one special character",
      valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Toaster position="top-right" />
      <div className="flex flex-col lg:flex-row w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">

        {/* Branding */}
        <div className="hidden lg:flex flex-col justify-center items-center bg-white p-16 w-1/2">
          <img src="/logo.png" alt="Logo" className="w-80 mb-6" />
          <h2 className="text-4xl font-bold text-gray-800 text-center mb-4">
            Expert Oversight for Business <span className="text-orange-600">Success</span>
          </h2>
          <p className="text-gray-600 text-center">
            Manage products, orders, and customers efficiently.
          </p>
        </div>

        {/* Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              Admin Login
            </h1>
            <p className="text-gray-600 mb-8">
              Enter your credentials to access the dashboard
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded-md border px-4 py-3 shadow-sm"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative">
                <label className="text-sm font-medium">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="mt-1 w-full rounded-md border px-4 py-3 shadow-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-10 text-gray-500"
                >
                  👁️
                </button>
                {password.length > 0 && (
                  <ul className="mt-2 text-sm space-y-1">
                    {passwordRules.map((rule, index) => (
                      <li
                        key={index}
                        className={`flex gap-2 ${
                          rule.valid ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {rule.valid ? "✔️" : "❌"} {rule.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label className="ml-2 text-sm">Remember me</label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Captcha</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    required
                    className="flex-grow rounded-md border px-4 py-3"
                    placeholder="Enter captcha"
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-200 text-purple-900 px-4 py-2 rounded font-mono tracking-widest select-none">
                      {captchaValue}
                    </div>
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="p-2 bg-gray-200 rounded"
                    >
                      🔄
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-orange-600 text-white font-semibold rounded-lg"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
