"use client";

import React from "react";
import { Files, Sliders, BookOpen, Users } from "lucide-react";

interface SidebarTabsProps {
  activeSidebarTab: "files" | "settings" | "notes";
  isSidebarExpanded: boolean;
  toggleSidebarTab: (tab: "files" | "settings" | "notes") => void;
  getThemeClass: (light: string, dark: string) => string;
  triggerAlert: (title: string, message: string) => void;
}

export default function SidebarTabs({
  activeSidebarTab,
  isSidebarExpanded,
  toggleSidebarTab,
  getThemeClass,
  triggerAlert
}: SidebarTabsProps) {
  const [showSessionPopup, setShowSessionPopup] = React.useState(false);
  const popupContainerRef = React.useRef<HTMLDivElement>(null);

  // Close popup when clicked anywhere outside the container
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        showSessionPopup && 
        popupContainerRef.current && 
        !popupContainerRef.current.contains(e.target as Node)
      ) {
        setShowSessionPopup(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showSessionPopup]);

  return (
    <div className={`w-12 h-full border-r flex flex-col items-center py-4 justify-between transition-colors ${
      getThemeClass("bg-zinc-100 border-zinc-200", "bg-zinc-950 border-zinc-900")
    }`}>
      <div className="flex flex-col gap-5 items-center w-full">
        <button
          onClick={() => toggleSidebarTab("files")}
          className={`p-2 rounded-lg transition-all ${
            activeSidebarTab === "files" && isSidebarExpanded 
              ? getThemeClass("text-zinc-900 bg-zinc-200", "text-white bg-zinc-900") 
              : "text-zinc-500 hover:text-zinc-400"
          }`}
          title="File Manager"
        >
          <Files className="h-4 w-4" />
        </button>
        <button
          onClick={() => toggleSidebarTab("settings")}
          className={`p-2 rounded-lg transition-all ${
            activeSidebarTab === "settings" && isSidebarExpanded 
              ? getThemeClass("text-zinc-900 bg-zinc-200", "text-white bg-zinc-900") 
              : "text-zinc-500 hover:text-zinc-400"
          }`}
          title="User Settings"
        >
          <Sliders className="h-4 w-4" />
        </button>
        <button
          onClick={() => toggleSidebarTab("notes")}
          className={`p-2 rounded-lg transition-all ${
            activeSidebarTab === "notes" && isSidebarExpanded 
              ? getThemeClass("text-zinc-900 bg-zinc-200", "text-white bg-zinc-900") 
              : "text-zinc-500 hover:text-zinc-400"
          }`}
          title="Interviewer Notes"
        >
          <BookOpen className="h-4 w-4" />
        </button>
      </div>

      {/* Session Management Popup and Trigger */}
      <div className="relative" ref={popupContainerRef}>
        <button
          onClick={() => setShowSessionPopup(!showSessionPopup)}
          className={`p-2 rounded-lg transition-all ${
            showSessionPopup ? getThemeClass("text-zinc-900 bg-zinc-200", "text-white bg-zinc-900") : "text-zinc-500 hover:text-zinc-350"
          }`}
          title="Session Actions"
        >
          <Users className="h-4 w-4" />
        </button>

        {showSessionPopup && (
          <div className={`absolute bottom-0 left-14 z-[100] w-64 p-4 rounded-xl border shadow-2xl animate-in fade-in slide-in-from-left-2 duration-200 ${
            getThemeClass("bg-white border-zinc-200 text-zinc-700", "bg-zinc-900 border-zinc-800 text-zinc-300")
          }`}>
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Session</h4>
            
            <div className="space-y-3">
              {/* Join Session */}
              <button 
                onClick={() => triggerAlert("Session Integration", "Joining sessions is not wired up yet.")}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors ${
                  getThemeClass("bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800", "bg-zinc-950 border-zinc-800 hover:bg-zinc-850 text-zinc-300")
                }`}
              >
                Join Session with Code
              </button>

              {/* Leave Session */}
              <button 
                onClick={() => triggerAlert("Session Integration", "Leaving sessions is not wired up yet.")}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors ${
                  getThemeClass("bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-rose-600", "bg-zinc-950 border-zinc-800 hover:bg-zinc-850 text-rose-450")
                }`}
              >
                Leave Session
              </button>

              <div className={`border-t my-2 ${getThemeClass("border-zinc-200", "border-zinc-800")}`} />

              {/* Session Metrics */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Metrics</span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Duration</span>
                  <span className="font-mono text-zinc-400">--:--:--</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Participants</span>
                  <span className="text-zinc-400">-</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
