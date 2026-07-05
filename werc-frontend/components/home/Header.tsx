"use client";

import React from "react";
import { FileCode, Database, RefreshCw, Play, Lock, Unlock, ChevronDown, User, LogOut, Settings, LogIn, Video, Plus, X, MessageSquare, Info, Activity, Sun, Moon } from "lucide-react";

import Link from "next/link";
import { supabase } from "../../app/config/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { switchSavedAccount, type SavedAccountSession } from "../../app/lib/auth/switch-account";
import { setSessionCookie } from "../../app/lib/auth/session-cookie";
import { useTheme } from "../../app/context/ThemeContext";

interface HeaderProps {
  language: string;
  setLanguage: (lang: string) => void;
  activeFilePath: string;
  entrypoint: string;
  isRunning: boolean;
  handleRun: () => void;
  getThemeClass: (light: string, dark: string) => string;
  triggerAlert: (title: string, message: string) => void;
  user: SupabaseUser | null;
  activeRoomCode: string | null;
  isHost: boolean;
  onHostSession: () => void;
  onJoinSession: () => void;
  onLeaveSession: () => void;
  onEndSession: () => void;
  showRightSidebar?: boolean;
  onToggleRightSidebar?: () => void;
  onShowMeetingDetails?: () => void;
  activeParticipants?: { id: string; name: string; avatar_url: string | null }[];
  executionEnabled?: boolean;
  setExecutionEnabled?: (val: boolean) => void;
}

export default function Header({
  language,
  setLanguage,
  activeFilePath,
  entrypoint,
  isRunning,
  handleRun,
  getThemeClass,
  triggerAlert,
  user,
  activeRoomCode,
  isHost,
  onHostSession,
  onJoinSession,
  onLeaveSession,
  onEndSession,
  showRightSidebar = false,
  onToggleRightSidebar,
  onShowMeetingDetails,
  activeParticipants = [],
  executionEnabled = true,
  setExecutionEnabled
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [joinCodeInput, setJoinCodeInput] = React.useState("");
  const profileContainerRef = React.useRef<HTMLDivElement>(null);

  const [showOngoingDropdown, setShowOngoingDropdown] = React.useState(false);
  const [ongoingSessions, setOngoingSessions] = React.useState<any[]>([]);
  const ongoingContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!user) {
      setOngoingSessions([]);
      return;
    }

    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from("interview_sessions")
          .select("code, created_at")
          .eq("host_id", user.id)
          .eq("status", "active");

        if (!error && data) {
          setOngoingSessions(data);
        }
      } catch (err) {
        console.warn("Failed to fetch ongoing sessions:", err);
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, [user]);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        showOngoingDropdown &&
        ongoingContainerRef.current &&
        !ongoingContainerRef.current.contains(e.target as Node)
      ) {
        setShowOngoingDropdown(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showOngoingDropdown]);
  
  const handleEndSessionFromDropdown = async (code: string) => {
    try {
      const { error } = await supabase
        .from("interview_sessions")
        .update({ status: "expired" })
        .eq("code", code);

      if (!error) {
        setOngoingSessions((prev) => prev.filter((s) => s.code !== code));
      }
    } catch (err) {
      console.error("Failed to end session from dropdown:", err);
    }
  };

  const [savedAccounts, setSavedAccounts] = React.useState<SavedAccountSession[]>([]);

  React.useEffect(() => {
    if (showProfileMenu) {
      const saved = localStorage.getItem("werc_saved_accounts");
      if (saved) {
        try {
          setSavedAccounts(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse saved accounts", e);
        }
      }
    }
  }, [showProfileMenu]);

  const handleSwitchAccount = async (account: SavedAccountSession) => {
    try {
      setShowProfileMenu(false);
      const result = await switchSavedAccount(supabase, account);

      if (!result.ok) {
        // Remove stale saved sessions without logging the active browser session out.
        if (result.reason === "stale_session") {
          console.warn("Stale tokens for account, removing from saved list:", account.email);
          const updated = savedAccounts.filter((acc) => acc.id !== account.id);
          setSavedAccounts(updated);
          localStorage.setItem("werc_saved_accounts", JSON.stringify(updated));
          triggerAlert("Saved Session Expired", "That saved account session has expired. Please add it again from the accounts page.");
          return;
        }

        triggerAlert("Account Switch Failed", "We couldn't switch to that saved account. Your current session is still active.");
        return;
      }

      if (result.session) {
        await setSessionCookie(result.session);
      }
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch account:", err);
      triggerAlert("Account Switch Failed", "We couldn't switch to that saved account. Your current session is still active.");
    }
  };

  const handleRemoveSavedAccount = (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedAccounts.filter((acc) => acc.id !== accountId);
    setSavedAccounts(updated);
    localStorage.setItem("werc_saved_accounts", JSON.stringify(updated));
  };

  const handleAddNewAccount = async () => {
    setShowProfileMenu(false);
    await supabase.auth.signOut({ scope: "local" });
    window.location.href = "/accounts";
  };

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
        <Link href={"/"}>
          <div className="flex items-center gap-2">
            <img 
              src="/logo/logo.png" 
              alt="WeRC Logo" 
              className="h-6 w-6 object-contain rounded"
            />
            <span className="text-sm font-semibold tracking-tight">WeRC</span>
          </div>
        </Link>
        <div className={`h-4 w-px ${getThemeClass("bg-zinc-200", "bg-zinc-900")}`} />
        {activeRoomCode && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold tracking-wider uppercase animate-pulse select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Live Call: {activeRoomCode} ({isHost ? "Host" : "Applicant"})</span>
            </div>
            
            <button
              onClick={onToggleRightSidebar}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                showRightSidebar 
                  ? getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-950", "bg-zinc-800 border-zinc-700 text-white") 
                  : getThemeClass("bg-zinc-150 hover:bg-zinc-200 border-zinc-200 text-zinc-500", "bg-zinc-900/50 hover:bg-zinc-900 border-zinc-850 text-zinc-400")
              }`}
              title="Toggle Chat & Participants"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

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
        <div className="hidden md:block relative">
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

        <div className={`hidden md:block h-4 w-px ${getThemeClass("bg-zinc-200", "bg-zinc-900")}`} />

        {/* Run Code Button */}
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={`flex items-center gap-1.5 px-3 md:px-4 h-8.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
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
          <span className="hidden sm:inline">{isRunning ? "Running" : "Run Code"}</span>
        </button>

        {isHost && activeRoomCode && (
          <button
            onClick={() => setExecutionEnabled?.(!executionEnabled)}
            className={`flex items-center justify-center h-8.5 w-8.5 rounded-lg border transition-all cursor-pointer ${
              executionEnabled
                ? getThemeClass("bg-indigo-500/10 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/20", "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20")
                : getThemeClass("bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20", "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-550/20")
            }`}
            title={executionEnabled ? "Disable Candidate Code Running" : "Enable Candidate Code Running"}
          >
            {executionEnabled ? (
              <Unlock className="h-4 w-4 text-emerald-500" />
            ) : (
              <Lock className="h-4 w-4 text-rose-500" />
            )}
          </button>
        )}

        <div className={`h-4 w-px ${getThemeClass("bg-zinc-200", "bg-zinc-900")}`} />

        {/* Profile Dropdown Container / Login Button */}
        {!user ? (
          <Link
            href="/accounts"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
              getThemeClass(
                "bg-zinc-200 border-zinc-300 text-zinc-900 hover:bg-zinc-300", 
                "bg-zinc-900 border-zinc-800 text-zinc-355 hover:bg-zinc-800 hover:text-white"
              )
            }`}
          >
            <LogIn className="h-4 w-4" />
            <span>Login/Signup</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2.5">
            {/* Ongoing Sessions Dropdown for Hosts */}
            {ongoingSessions.length > 0 && (
              <div className="relative" ref={ongoingContainerRef}>
                <button
                  onClick={() => setShowOngoingDropdown(!showOngoingDropdown)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                    showOngoingDropdown
                      ? getThemeClass("bg-indigo-100 border-indigo-200 text-indigo-700", "bg-indigo-650/20 border-indigo-500/30 text-indigo-400")
                      : getThemeClass("bg-zinc-150 hover:bg-zinc-200 border-zinc-200 text-zinc-650", "bg-zinc-900 border-zinc-800 hover:bg-zinc-850 text-zinc-400")
                  }`}
                >
                  <Activity className="h-3.5 w-3.5 animate-pulse text-indigo-500" />
                  <span>Ongoing ({ongoingSessions.length})</span>
                  <ChevronDown className="h-3 w-3 text-zinc-550" />
                </button>

                {showOngoingDropdown && (
                  <div className={`absolute right-0 mt-2 z-[100] w-64 p-3 rounded-lg border shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 ${
                    getThemeClass("bg-white border-zinc-200 text-zinc-700", "bg-zinc-900 border-zinc-800 text-zinc-300")
                  }`}>
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Hosted Sessions</h4>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {ongoingSessions.map((session) => (
                        <div
                          key={session.code}
                          className={`flex items-center justify-between p-2 rounded border ${
                            getThemeClass("bg-zinc-50 border-zinc-200", "bg-zinc-950 border-zinc-850")
                          }`}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-mono font-bold text-indigo-400">{session.code}</span>
                            <span className="text-[9px] text-zinc-505 truncate mt-0.5">
                              {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Link
                              href={`/we-rc?room=${session.code}`}
                              onClick={() => setShowOngoingDropdown(false)}
                              className="px-2.5 py-1 rounded bg-indigo-500 text-white text-[10px] font-bold hover:bg-indigo-650 transition-colors"
                            >
                              Join
                            </Link>
                            <button
                              onClick={() => handleEndSessionFromDropdown(session.code)}
                              className={`p-1 rounded border transition-colors cursor-pointer ${
                                getThemeClass("bg-zinc-100 hover:bg-rose-50 border-zinc-300 text-zinc-400 hover:text-rose-500", "bg-zinc-900 border-zinc-800 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-500")
                              }`}
                              title="End Session"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stacked active collaborative avatars */}
            {activeRoomCode && activeParticipants.length > 0 && (
              <div 
                onClick={onToggleRightSidebar}
                className="flex items-center -space-x-1.5 overflow-hidden mr-1 cursor-pointer"
              >
                {activeParticipants.map((p, idx) => (
                  <div 
                    key={p.id + idx}
                    className={`h-6.5 w-6.5 rounded-full ring-2 shrink-0 overflow-hidden flex items-center justify-center border ${
                      getThemeClass("ring-zinc-100 bg-white border-zinc-200", "ring-zinc-950 bg-zinc-900 border-zinc-800")
                    }`}
                    title={p.name}
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-bold text-[9px] uppercase text-zinc-400">{p.name?.[0]}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="relative" ref={profileContainerRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all border cursor-pointer ${
                  showProfileMenu 
                    ? getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-900", "bg-zinc-900 border-zinc-800 text-white") 
                    : getThemeClass("bg-transparent border-transparent text-zinc-650 hover:bg-zinc-200", "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900")
                }`}
                title="Profile Management"
              >
                <div className={`h-6 w-6 rounded-full flex items-center justify-center overflow-hidden shadow-sm border ${
                  getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-850", "bg-indigo-650 border-indigo-500/30 text-white")
                }`}>
                  {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                    <img
                      src={user.user_metadata.avatar_url || user.user_metadata.picture}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="font-bold text-xs uppercase">
                      {user.user_metadata?.display_name?.[0] || user.email?.[0] || "U"}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold select-none hidden md:inline">
                  Hi {user.user_metadata?.display_name || user.email?.split("@")[0] || "User"}
                </span>
                <ChevronDown className="h-3 w-3 text-zinc-500 hidden md:block" />
              </button>

            {/* Profile Menu Popover */}
            {showProfileMenu && (
              <div className={`absolute right-0 mt-2 z-[100] w-52 py-1.5 rounded-lg border shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 ${
                getThemeClass("bg-white border-zinc-200 text-zinc-700", "bg-zinc-900 border-zinc-800 text-zinc-300")
              }`}>
                <div className={`px-3 py-2 border-b select-none flex items-center gap-2.5 ${getThemeClass("border-zinc-200", "border-zinc-800")}`}>
                  {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                    <img
                      src={user.user_metadata.avatar_url || user.user_metadata.picture}
                      alt="Profile"
                      className="h-8 w-8 rounded-full object-cover border border-zinc-800"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs uppercase border ${
                      getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-850", "bg-indigo-650 border-indigo-500/30 text-white")
                    }`}>
                      {user.user_metadata?.display_name?.[0] || user.email?.[0] || "U"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold uppercase truncate ${getThemeClass("text-zinc-900", "text-white")}`}>
                      {user.user_metadata?.display_name || user.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-[11px] text-zinc-550 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="py-1">
                  {activeRoomCode ? (
                    <div 
                      className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 text-zinc-500 cursor-not-allowed select-none opacity-50`}
                      title="Disabled during active session"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>My Profile</span>
                    </div>
                  ) : (
                    <Link
                      href="/dashboard"
                      onClick={() => setShowProfileMenu(false)}
                      className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors ${
                        getThemeClass("hover:bg-zinc-100 text-zinc-755", "hover:bg-zinc-800 text-zinc-300")
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      My Profile
                    </Link>
                  )}

                  {activeRoomCode ? (
                    <div 
                      className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 text-zinc-500 cursor-not-allowed select-none opacity-50`}
                      title="Disabled during active session"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Account Settings</span>
                    </div>
                  ) : (
                    <Link
                      href="/dashboard"
                      onClick={() => setShowProfileMenu(false)}
                      className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors ${
                        getThemeClass("hover:bg-zinc-100 text-zinc-755", "hover:bg-zinc-800 text-zinc-300")
                      }`}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Account Settings
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      toggleTheme();
                    }}
                    className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                      getThemeClass("hover:bg-zinc-100 text-zinc-700", "hover:bg-zinc-800 text-zinc-300")
                    }`}
                  >
                    {theme === "light" ? (
                      <>
                        <Moon className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Dark Mode</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-3.5 w-3.5 text-amber-500" />
                        <span>Light Mode</span>
                      </>
                    )}
                  </button>

                  <div className={`my-1 border-t ${getThemeClass("border-zinc-200", "border-zinc-800")}`} />

                  {activeRoomCode ? (
                    <div className="px-3 py-2 flex flex-col gap-1.5">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onShowMeetingDetails?.();
                        }}
                        className={`w-full px-2 py-1.5 rounded text-left text-xs flex items-center gap-2 transition-all cursor-pointer bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20`}
                      >
                        <Info className="h-3.5 w-3.5" />
                        <span>Show meeting details</span>
                      </button>

                      <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-400 mt-1 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Live Session: {activeRoomCode} ({isHost ? "Host" : "Applicant"})</span>
                      </div>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          if (isHost) {
                            onEndSession();
                          } else {
                            onLeaveSession();
                          }
                        }}
                        className="w-full py-1.5 rounded text-center text-xs font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
                      >
                        {isHost ? "End Interview" : "Leave Session"}
                      </button>
                    </div>
                  ) : (
                    <div className="px-3 py-2 flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onHostSession();
                        }}
                        className={`w-full px-2 py-1.5 rounded text-left text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                          getThemeClass("hover:bg-zinc-100 text-zinc-700", "hover:bg-zinc-800 text-zinc-300")
                        }`}
                      >
                        <Video className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Host Interview</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onJoinSession();
                        }}
                        className={`w-full px-2 py-1.5 rounded text-left text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                          getThemeClass("hover:bg-zinc-100 text-zinc-700", "hover:bg-zinc-800 text-zinc-300")
                        }`}
                      >
                        <FileCode className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Join Interview</span>
                      </button>
                    </div>
                  )}

                  {!activeRoomCode && (
                    <>
                      <div className={`my-1 border-t ${getThemeClass("border-zinc-200", "border-zinc-800")}`} />

                      {/* Switch Accounts Section */}
                      <div className="px-3 py-1.5 flex flex-col gap-1.5 select-none font-mono">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          <span>Switch Accounts</span>
                          <button
                            onClick={handleAddNewAccount}
                            className={`p-0.5 rounded transition-colors cursor-pointer hover:bg-zinc-800 hover:text-white ${getThemeClass("text-zinc-700", "text-zinc-400")}`}
                            type="button"
                            title="Add account"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
                          {savedAccounts.filter((acc) => acc.id !== user?.id).length === 0 ? (
                            <span className="text-[9px] text-zinc-600 font-mono">// no other accounts saved</span>
                          ) : (
                            savedAccounts
                              .filter((acc) => acc.id !== user?.id)
                              .map((acc) => (
                                <div
                                  key={acc.id}
                                  onClick={() => handleSwitchAccount(acc)}
                                  className={`flex items-center justify-between p-1.5 rounded transition-all cursor-pointer ${
                                    getThemeClass("hover:bg-zinc-150 text-zinc-800", "hover:bg-zinc-850 text-zinc-350")
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-5 w-5 rounded-full overflow-hidden border border-zinc-800 shrink-0 flex items-center justify-center bg-zinc-950">
                                      {acc.avatar_url ? (
                                        <img src={acc.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                                      ) : (
                                        <span className="font-bold text-[9px] uppercase text-zinc-550">{acc.display_name?.[0]}</span>
                                      )}
                                    </div>
                                    <span className="text-xs truncate font-sans">{acc.display_name}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {acc.provider === "google" && (
                                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                                      </svg>
                                    )}
                                    <button
                                      onClick={(e) => handleRemoveSavedAccount(acc.id, e)}
                                      className={`p-0.5 rounded hover:bg-zinc-800 transition-colors ${getThemeClass("text-zinc-450 hover:text-zinc-650", "text-zinc-550 hover:text-rose-450")}`}
                                      type="button"
                                      title="Remove account"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </div>

                      <div className={`my-1 border-t ${getThemeClass("border-zinc-200", "border-zinc-800")}`} />

                      <button
                        onClick={async () => {
                          setShowProfileMenu(false);
                          await supabase.auth.signOut({ scope: "local" });
                        }}
                        className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 text-rose-500 transition-colors ${
                          getThemeClass("hover:bg-zinc-100", "hover:bg-zinc-800")
                        }`}
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Log Out
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      </div>
    </header>
  );
}
