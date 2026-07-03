"use client";

import React, { useState } from "react";
import BaseModal from "./BaseModal";
import { Link2, Copy, Check, Video } from "lucide-react";

interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  getThemeClass: (light: string, dark: string) => string;
}

export default function InterviewModal({
  isOpen,
  onClose,
  code,
  getThemeClass
}: InterviewModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareableLink = typeof window !== "undefined"
    ? `${window.location.origin}/we-rc?room=${code}`
    : `/we-rc?room=${code}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Interview Session Hosted" getThemeClass={getThemeClass}>
      <div className="flex flex-col gap-5 py-2">
        {/* Icon & Live indicator */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shrink-0">
            <Video className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Session is Live</h4>
            <p className={`text-xs ${getThemeClass("text-zinc-500", "text-zinc-400")}`}>
              Share the code or invitation link to collaborate in real-time.
            </p>
          </div>
        </div>

        {/* Room Code block */}
        <div className={`p-4 rounded-lg border flex flex-col gap-2 ${
          getThemeClass("bg-zinc-50 border-zinc-200", "bg-zinc-900/50 border-zinc-800")
        }`}>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Session Code</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold tracking-widest text-emerald-400 font-mono">{code}</span>
            <button
              onClick={handleCopyCode}
              className={`p-2 rounded-lg border flex items-center gap-1.5 transition-all text-xs font-medium cursor-pointer ${
                copiedCode
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : getThemeClass("bg-white border-zinc-305 text-zinc-700 hover:bg-zinc-100", "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800")
              }`}
            >
              {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode ? "Copied" : "Copy Code"}</span>
            </button>
          </div>
        </div>

        {/* Shareable Link block */}
        <div className={`p-4 rounded-lg border flex flex-col gap-2 ${
          getThemeClass("bg-zinc-50 border-zinc-200", "bg-zinc-900/50 border-zinc-800")
        }`}>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sharable Link</span>
          <div className="flex items-center gap-2">
            <div className={`flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-mono py-2 px-3 rounded border select-all ${
              getThemeClass("bg-white border-zinc-200 text-zinc-650", "bg-zinc-950 border-zinc-900 text-zinc-400")
            }`}>
              {shareableLink}
            </div>
            <button
              onClick={handleCopyLink}
              className={`p-2 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                copiedLink
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : getThemeClass("bg-white border-zinc-305 text-zinc-700 hover:bg-zinc-100", "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800")
              }`}
              title="Copy Link"
            >
              {copiedLink ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`w-full py-2.5 mt-2 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] cursor-pointer ${
            getThemeClass("bg-emerald-600 hover:bg-emerald-700 text-white", "bg-emerald-500 hover:bg-emerald-600 text-white")
          }`}
        >
          Got it
        </button>
      </div>
    </BaseModal>
  );
}
