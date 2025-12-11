"use client";

import { useState } from "react";
import Image from "next/image";
import { ReactNode } from "react";

import Link from "next/link";
import {
  Home,
  ShoppingCart,
  ClipboardList,
  ListTree,
  Package,
  Megaphone,
  FileText,
  Users,
  Shield,
  Lock,
  UserCircle,
} from "lucide-react";

interface SidebarProps {
  role: "admin" | "subadmin";
}

interface MenuItem {
  label: string;
  icon?: ReactNode;
  href?: string;
  subMenu?: MenuItem[];
}

export default function Sidebar({ role }: SidebarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [active, setActive] = useState<string>("Dashboard");

  const toggle = (menu: string) =>
    setOpenMenu(openMenu === menu ? null : menu);

  const handleClick = (label: string) => setActive(label);

  const menu: MenuItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: <Home size={18} /> },
    { label: "POS", href: "/pos", icon: <ClipboardList size={18} /> },
    { label: "Orders", href: "/orderupdate", icon: <ShoppingCart size={18} /> },
    {
      label: "Brand",
      icon: <Shield size={18} />,
      subMenu: [
        { label: "Add Brands", href: "/brands/newbrands" },
        { label: "List Brands", href: "/brands/listbrands" },
      ],
    },
    {
      label: "Category",
      icon: <ListTree size={18} />,
      subMenu: [
        { label: "Category", href: "/categorysetup/category" },
        { label: "Sub Category", href: "/categorysetup/subcategory" },
        { label: "Sub-Sub Category", href: "/categorysetup/subsubcategory" },
      ],
    },
    {
      label: "In-House Products",
      icon: <Package size={18} />,
      subMenu: [
        { label: "Add Product", href: "/products/addproducts" },
        { label: "View Product", href: "/products/listproducts" },
        { label: "Re-stock Product", href: "/products/restock" },
                { label: "Attribute", href: "/attribute" },

      ],
    },
    {
      label: "Homepage Setup",
      icon: <Megaphone size={18} />,
      subMenu: [
        { label: "Banner", href: "/hero" },
        { label: "Top Section", href: "/banner" },
        { label: "Notification", href: "/notification" },
        { label: "Instagram Feed", href: "/insta" },
      ],
    },
    { label: "Create Credentials", href: "/createsub", icon: <Lock size={18} /> },

    {
      label: "Reports",
      icon: <FileText size={18} />,
      subMenu: [
        { label: "Product Report", href: "/productreport" },
        { label: "Order Report", href: "/orderreport" },
      ],
    },
    { label: "Customers", href: "/customer", icon: <Users size={18} /> },
  ];

  const filteredMenu =
    role === "subadmin"
      ? menu.filter((item) =>
          ["Dashboard", "POS", "Orders", "Category", "In-House Products"].includes(item.label)
        )
      : menu;

  return (
    <aside className="w-64 min-h-screen bg-white text-gray-900 border-r border-gray-200">
      <div className=" flex justify-center ">
        <Image
          src="/logo.png"
          alt="Logo"
          width={140}
          height={60}
          className="object-contain"
        />
      </div>

      <nav className="mt-6 space-y-1">
        {filteredMenu.map((item) => (
          <div key={item.label}>
            {item.subMenu ? (
              <>
                <button
                  onClick={() => toggle(item.label)}
                  className={`flex items-center justify-between w-full px-4 py-2 hover:bg-orange-100 ${
                    openMenu === item.label ? "bg-orange-100 text-orange-600" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </div>
                  <span>{openMenu === item.label ? "▾" : "▸"}</span>
                </button>

                {openMenu === item.label &&
                  item.subMenu.map((sub) => (
                    <Link
                      key={sub.label}
                      href={sub.href!}
                      onClick={() => handleClick(sub.label)}
                      className={`block pl-12 pr-4 py-2 hover:bg-orange-50 ${
                        active === sub.label ? "text-orange-600 bg-orange-100" : ""
                      }`}
                    >
                      {sub.label}
                    </Link>
                  ))}
              </>
            ) : (
              <Link
                href={item.href!}
                onClick={() => handleClick(item.label)}
                className={`flex items-center gap-3 px-4 py-2 hover:bg-orange-100 ${
                  active === item.label ? "bg-orange-100 text-orange-600 font-semibold" : ""
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )}
          </div>
        ))}

        <button
          onClick={() => (window.location.href = "/login")}
          className="flex items-center gap-3 px-4 py-2 hover:bg-orange-600 text-orange-500 mt-6"
        >
          <UserCircle size={18} />
          Logout
        </button>
      </nav>
    </aside>
  );
}
