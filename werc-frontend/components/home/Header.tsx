"use client";

import React from "react";
import { FileCode, Database, RefreshCw, Play, ChevronDown, User, LogOut, Settings } from "lucide-react";

interface HeaderProps {
  language: string;
  setLanguage: (lang: string) => void;
  activeFilePath: string;
  entrypoint: string;
  isRunning: boolean;
  handleRun: () => void;
  getThemeClass: (light: string, dark: string) => string;
  triggerAlert: (title: string, message: string) => void;
}

export default function Header({
  language,
  setLanguage,
  activeFilePath,
  entrypoint,
  isRunning,
  handleRun,
  getThemeClass,
  triggerAlert
}: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const profileContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        showProfileMenu &&
        profileContainerRef.current &&
        !profileContainerRef.current.contains(e.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showProfileMenu]);

  return (
    <header className={`flex items-center justify-between px-5 h-14 border-b z-50 transition-colors ${
      getThemeClass("border-zinc-200 bg-zinc-100/80", "border-zinc-900 bg-zinc-950/80")
    }`}>
      
      {/* Left Side: Brand Logo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`h-6 w-6 rounded border flex items-center justify-center font-bold text-xs transition-colors ${
            getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-900", "bg-zinc-900 border-zinc-800 text-white")
          }`}>
            W
          </div>
          <span className="text-sm font-semibold tracking-tight">WeRC</span>
        </div>
        <div className={`h-4 w-px ${getThemeClass("bg-zinc-200", "bg-zinc-900")}`} />

      </div>

      {/* Center: Session Tab */}
      <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
        getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-700", "bg-zinc-900 border-zinc-800/65 text-zinc-300")
      }`}>
        <FileCode className="h-3.5 w-3.5 text-zinc-400" />
        <span>Active: {activeFilePath}</span>
        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          Entry: {entrypoint}
        </span>
      </div>

      {/* Right Side: Language select, Run Button, Profile Dropdown */}
      <div className="flex items-center gap-3">
        {/* Minimal Language Select */}
        <div className="relative">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={`appearance-none border px-3 py-1.5 pr-8 rounded-lg text-sm font-medium focus:outline-none cursor-pointer ${
              getThemeClass("bg-white border-zinc-300 text-zinc-700 focus:border-zinc-400", "bg-zinc-900 border-zinc-800 text-zinc-300 focus:border-zinc-700")
            }`}
          >
            <option value="python">Python 3</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 h-3 w-3 text-zinc-500 pointer-events-none" />
        </div>

        <div className={`h-4 w-px ${getThemeClass("bg-zinc-200", "bg-zinc-900")}`} />

        {/* Run Code Button */}
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={`flex items-center gap-1.5 px-4 h-8.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
            isRunning
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-800"
              : getThemeClass("bg-zinc-900 text-white hover:bg-zinc-800", "bg-white text-zinc-950 hover:bg-zinc-200") + " border border-transparent shadow active:scale-[0.98]"
          }`}
        >
          {isRunning ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
          {isRunning ? "Running" : "Run Code"}
        </button>

        <div className={`h-4 w-px ${getThemeClass("bg-zinc-200", "bg-zinc-900")}`} />

        {/* Profile Dropdown Container */}
        <div className="relative" ref={profileContainerRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all border ${
              showProfileMenu 
                ? getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-900", "bg-zinc-900 border-zinc-800 text-white") 
                : getThemeClass("bg-transparent border-transparent text-zinc-650 hover:bg-zinc-200", "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900")
            }`}
            title="Profile Management"
          >
            <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs shadow-sm border ${
              getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-850", "bg-indigo-650 border-indigo-500/30 text-white")
            }`}>
              U
            </div>
            <span className="text-sm font-semibold select-none hidden md:inline">Hi User</span>
            <ChevronDown className="h-3 w-3 text-zinc-500 hidden md:block" />
          </button>

          {/* Profile Menu Popover */}
          {showProfileMenu && (
            <div className={`absolute right-0 mt-2 z-[100] w-52 py-1.5 rounded-lg border shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 ${
              getThemeClass("bg-white border-zinc-200 text-zinc-700", "bg-zinc-900 border-zinc-800 text-zinc-300")
            }`}>
              <div className={`px-3 py-2 border-b select-none ${getThemeClass("border-zinc-200", "border-zinc-800")}`}>
                <p className={`text-sm font-semibold ${getThemeClass("text-zinc-900", "text-white")}`}>Hi User</p>
                <p className="text-[11px] text-zinc-500 truncate">user@werc.io</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => triggerAlert("Profile Info", "Profile Settings are not wired up yet.")}
                  className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors ${
                    getThemeClass("hover:bg-zinc-100 text-zinc-755", "hover:bg-zinc-800 text-zinc-300")
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  My Profile
                </button>

                <button
                  onClick={() => triggerAlert("Account Settings", "Account Settings are not wired up yet.")}
                  className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors ${
                    getThemeClass("hover:bg-zinc-100 text-zinc-755", "hover:bg-zinc-800 text-zinc-300")
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Account Settings
                </button>

                <div className={`my-1 border-t ${getThemeClass("border-zinc-200", "border-zinc-800")}`} />

                <button
                  onClick={() => triggerAlert("Sign Out", "Logout is not wired up yet.")}
                  className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 text-rose-500 transition-colors ${
                    getThemeClass("hover:bg-zinc-100", "hover:bg-zinc-800")
                  }`}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
