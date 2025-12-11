"use client";

import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* About */}
        <div className="space-y-4">
          <h2 className="text-2xl font-extrabold">Swaadha Homemade</h2>
          <p className="text-gray-100 text-sm leading-relaxed">
            Bringing authentic flavors and fresh ingredients from our family kitchen to yours.
          </p>
          <div className="flex gap-3">
            <a href="#" className="hover:text-gray-200 transition text-sm">Instagram</a>
            <a href="#" className="hover:text-gray-200 transition text-sm">Facebook</a>
            <a href="#" className="hover:text-gray-200 transition text-sm">Twitter</a>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Contact Us</h3>
          <p className="text-sm">
            Phone: <a href="tel:+918296295658" className="underline">+91 8296295658</a>
          </p>
          <p className="text-sm">
            Email: <a href="mailto:info@swaadha.com" className="underline">info@swaadha.com</a>
          </p>
          <p className="text-sm">Bangalore, India</p>
        </div>

        {/* Newsletter */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Newsletter</h3>
          <p className="text-sm">Get updates, promotions, and recipes in your inbox.</p>
          <form className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="Email address"
              className="px-3 py-2 rounded-lg text-gray-900 flex-1 text-sm focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-white text-orange-600 font-semibold text-sm hover:bg-orange-50 transition"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-white/30 py-4 text-center text-white/80 text-sm">
        © {new Date().getFullYear()} Swaadha Homemade. All rights reserved.
      </div>
    </footer>
  );
}
