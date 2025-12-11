"use client"; // if using client-side code

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login"); // redirects without adding to history
  }, [router]);

  return (
    <div className="w-screen h-screen bg-white flex items-center justify-center">
      <p className="text-gray-600">Redirecting...</p>
    </div>
  );
}
