"use client";

import React, { useState, useEffect } from "react";
import BaseModal from "./BaseModal";

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
  getThemeClass: (light: string, dark: string) => string;
}

export default function PromptModal({
  isOpen,
  onClose,
  title,
  placeholder,
  defaultValue = "",
  onSubmit,
  getThemeClass
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue("");
      onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} getThemeClass={getThemeClass}>
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${
            getThemeClass("bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400", "bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-zinc-700")
          }`}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              getThemeClass("bg-zinc-150 hover:bg-zinc-200 text-zinc-700", "bg-zinc-900 hover:bg-zinc-800 text-zinc-400")
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] ${
              getThemeClass("bg-zinc-900 hover:bg-zinc-800 text-white", "bg-white hover:bg-zinc-200 text-zinc-950")
            }`}
          >
            Submit
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
