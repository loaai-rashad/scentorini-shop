
import React from "react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">

      {/* Spinner */}
      <div className="w-16 h-16 border-4 border-[#1C3C85] border-t-transparent rounded-full animate-spin"></div>

      {/* Loading text */}
      <p className="mt-4 text-lg font-medium text-gray-700">Loading...</p>
    </div>
  );
}
