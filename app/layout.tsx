"use client";

import "./globals.css";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";
import { usePathname } from "next/navigation";
import { RoleProvider, useRole } from "./context/rolecontext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Pages where sidebar/header should be hidden
  const hideLayout =
    pathname.startsWith("/login") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/userinterface") ||
    pathname.startsWith("/subadmin");

  return (
    <html lang="en">
      <body className="h-screen flex overflow-hidden bg-white">
        {hideLayout ? (
          // Public pages
          <div className="w-full h-full overflow-auto">{children}</div>
        ) : (
          <RoleProvider>
  <SidebarWrapper>{children}</SidebarWrapper>
</RoleProvider>

        )}
      </body>
    </html>
  );
}

// SidebarWrapper reads role from context
function SidebarWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full h-full">
      <SidebarWithRole />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

// Wrapper to pass role from context to Sidebar
function SidebarWithRole() {
  const { role } = useRole();
  if (!role) return null; // optional: show nothing while role is loading
  return <Sidebar role={role} />;
}
