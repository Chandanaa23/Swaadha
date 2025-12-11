"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [userInfo, setUserInfo] = useState<{ email: string; role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const email = localStorage.getItem("email");
    const role = localStorage.getItem("role");

    if (isLoggedIn !== "true" || !email || !role) {
      router.push("/login");
      return;
    }

    setUserInfo({ email, role });
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  return (
    <div className="w-full bg-white border-b border-gray-200 px-6 py-4 flex justify-end items-center">
      {!userInfo ? (
        <div className="animate-pulse bg-gray-200 w-32 h-5 rounded"></div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="text-right text-gray-800 font-medium text-sm leading-snug">
            <div>{userInfo.role}</div>
            <div className="text-xs text-gray-500">{userInfo.email}</div>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
