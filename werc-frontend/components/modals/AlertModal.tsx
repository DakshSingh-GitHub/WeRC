"use client";

import React from "react";
import BaseModal from "./BaseModal";
import { AlertCircle } from "lucide-react";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  getThemeClass: (light: string, dark: string) => string;
}

export default function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  getThemeClass
}: AlertModalProps) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} getThemeClass={getThemeClass}>
      <div className="flex flex-col items-center text-center gap-4 py-3 select-none">
        <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500">
          <AlertCircle className="h-5 w-5" />
        </div>
        <p className={`text-sm ${getThemeClass("text-zinc-650", "text-zinc-400")}`}>{message}</p>
        <button
          onClick={onClose}
          className={`w-full py-2 rounded-lg font-semibold text-xs transition-all active:scale-[0.98] ${
            getThemeClass("bg-zinc-900 hover:bg-zinc-800 text-white", "bg-white hover:bg-zinc-200 text-zinc-950")
          }`}
        >
          Confirm
        </button>
      </div>
    </BaseModal>
  );
}
