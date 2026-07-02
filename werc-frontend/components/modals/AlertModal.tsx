"use client";

import React from "react";
import BaseModal from "./BaseModal";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  getThemeClass: (light: string, dark: string) => string;
  type?: "info" | "success" | "error";
}

export default function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  getThemeClass,
  type = "error"
}: AlertModalProps) {
  const isSuccess = type === "success";

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} getThemeClass={getThemeClass}>
      <div className="flex flex-col items-center text-center gap-4 py-3 select-none">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${
          isSuccess 
            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-500" 
            : "bg-rose-500/10 border-rose-500/25 text-rose-500"
        }`}>
          {isSuccess ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
        </div>
        <p className={`text-sm ${getThemeClass("text-zinc-650", "text-zinc-400")}`}>{message}</p>
        <button
          onClick={onClose}
          className={`w-full py-2 rounded-lg font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer ${
            isSuccess
              ? getThemeClass("bg-emerald-600 hover:bg-emerald-700 text-white", "bg-emerald-500 hover:bg-emerald-600 text-white")
              : getThemeClass("bg-zinc-900 hover:bg-zinc-800 text-white", "bg-white hover:bg-zinc-200 text-zinc-950")
          }`}
        >
          Confirm
        </button>
      </div>
    </BaseModal>
  );
}
