"use client";

import React, { ReactNode } from "react";
import { X } from "lucide-react";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  getThemeClass: (light: string, dark: string) => string;
}

export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  getThemeClass
}: BaseModalProps) {
  // Close on Escape key press
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity" 
      />

      {/* Modal Box */}
      <div className={`relative w-full max-w-md p-6 rounded-xl border shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col gap-4 ${
        getThemeClass("bg-white border-zinc-200 text-zinc-900", "bg-zinc-950 border-zinc-800 text-zinc-100")
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between pb-2 border-b ${getThemeClass("border-zinc-200", "border-zinc-800")}`}>
          <h3 className="text-sm font-semibold tracking-tight uppercase text-zinc-500">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
