"use client";

import { usePathname } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "../globals.css";

export default function UserInterfaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Pages where header/footer should be hidden
  const hideLayout = pathname === "/userinterface" || pathname === "/userinterface/login" ; // add /login here

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {!hideLayout && <Header />} {/* Hide header on login/root page */}

      <main className="flex-1 pt-2">{children}</main>

      {!hideLayout && <Footer />} {/* Hide footer on login/root page */}
    </div>
  );
}
