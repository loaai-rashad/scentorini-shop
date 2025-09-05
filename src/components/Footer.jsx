import React from "react";

export default function Footer() {
  return (
    <footer className="bg-[#1C3C85] text-white py-6 mt-8">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Logo / Brand */}
        <div className="text-lg font-bold tracking-wide">
          Scentorini
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col sm:flex-row gap-4 text-sm">
          <a href="/" className="hover:underline">
            Home
          </a>

          <a href="/about" className="hover:underline">
            About
          </a>

          {/* Admin link */}
          <a href="/admin-login" className="hover:underline text-gray-300">
            Admin
          </a>
        </div>

        {/* Contact Info */}
        <div className="text-sm flex flex-col items-center md:items-end gap-1">
          <span>📞 +20 1553883588</span>
          <a
            href="https://www.instagram.com/scentorini.eg?utm_source=qr&igsh=OWQ4MTF3N2hqNzN5"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            📸 scentorini.eg
          </a>
        </div>
      </div>

      {/* Bottom Line */}
      <div className="mt-4 text-center text-xs text-gray-300">
        &copy; {new Date().getFullYear()} Scentorini. All rights reserved.
      </div>
    </footer>
  );
}
