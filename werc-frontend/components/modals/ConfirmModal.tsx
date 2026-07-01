"use client";

import React from "react";
import BaseModal from "./BaseModal";
import { Trash2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  getThemeClass: (light: string, dark: string) => string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
  confirmLabel = "Confirm",
  getThemeClass
}: ConfirmModalProps) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} getThemeClass={getThemeClass}>
      <div className="flex flex-col items-center text-center gap-4 py-3 select-none">
        <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500">
          <Trash2 className="h-5 w-5" />
        </div>
        <p className={`text-sm ${getThemeClass("text-zinc-650", "text-zinc-400")}`}>{message}</p>
        <div className="flex gap-2 w-full mt-2">
          <button
            onClick={onClose}
            className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-all ${
              getThemeClass("bg-zinc-150 hover:bg-zinc-200 text-zinc-700", "bg-zinc-900 hover:bg-zinc-800 text-zinc-400")
            }`}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2 rounded-lg font-semibold text-xs text-white bg-rose-600 hover:bg-rose-500 transition-all active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
