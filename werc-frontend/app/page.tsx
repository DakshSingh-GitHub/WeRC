"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Code, 
  Terminal, 
  Users, 
  FolderTree, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  Video, 
  Activity,
  LogIn,
  FolderPlus,
  FilePlus,
  User as UserIcon,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  X,
  Sun,
  Moon
} from "lucide-react";
import { supabase } from "./config/supabase";
import { User } from "@supabase/supabase-js";
import { switchSavedAccount, type SavedAccountSession } from "./lib/auth/switch-account";
import { setSessionCookie } from "./lib/auth/session-cookie";
import { useTheme } from "./context/ThemeContext";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileContainerRef = useRef<HTMLDivElement>(null);
  
  const [savedAccounts, setSavedAccounts] = useState<SavedAccountSession[]>([]);

  const [showOngoingDropdown, setShowOngoingDropdown] = useState(false);
  
  const getThemeClass = (light: string, dark: string) => {
    return theme === "light" ? light : dark;
  };
  const [ongoingSessions, setOngoingSessions] = useState<any[]>([]);
  const ongoingContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  useEffect(() => {
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

  useEffect(() => {
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
        // Remove stale saved sessions without disturbing the current signed-in account.
        if (result.reason === "stale_session") {
          console.warn("Stale tokens for account, removing from saved list:", account.email);
          const updated = savedAccounts.filter((acc) => acc.id !== account.id);
          setSavedAccounts(updated);
          localStorage.setItem("werc_saved_accounts", JSON.stringify(updated));
        }
        return;
      }

      if (result.session) {
        await setSessionCookie(result.session);
      }
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch account:", err);
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

  // Check auth state
  useEffect(() => {
    const refreshSession = async () => {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (freshUser) {
        setUser(freshUser);
      }
    };

    refreshSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle outside click to close profile popover
  useEffect(() => {
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
    <div className={`min-h-screen transition-colors duration-250 ${getThemeClass("bg-zinc-50 text-zinc-650", "bg-[#0a0a0a] text-zinc-350")} font-sans selection:bg-zinc-800 selection:text-white overflow-x-hidden antialiased`}>
      
      {/* Navigation Header - Matches we-rc header styling */}
      <header className={`sticky top-0 z-50 w-full border-b transition-colors duration-250 ${getThemeClass("border-zinc-200 bg-white/90", "border-zinc-900 bg-[#0a0a0a]/90")} backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo image from public/logo/logo.png */}
            <img 
              src="/logo/logo.png" 
              alt="WeRC Logo" 
              className="h-6 w-6 object-contain rounded"
            />
            <span className={`text-sm font-semibold tracking-tight ${getThemeClass("text-zinc-900", "text-white")}`}>WeRC</span>
          </div>

          <nav className={`hidden md:flex items-center gap-8 text-xs font-medium ${getThemeClass("text-zinc-600", "text-zinc-400")}`}>
            <a href="#features" className={`transition-colors ${getThemeClass("hover:text-zinc-900", "hover:text-zinc-100")}`}>Features</a>
            <a href="#how-it-works" className={`transition-colors ${getThemeClass("hover:text-zinc-900", "hover:text-zinc-100")}`}>Workflow</a>
            <Link href={user ? "/we-rc" : "/accounts"} className={`transition-colors ${getThemeClass("hover:text-zinc-900", "hover:text-zinc-100")}`}>Sandbox</Link>
            {user && (
              <>
                <Link href="/dashboard" className={`transition-colors ${getThemeClass("hover:text-zinc-900", "hover:text-zinc-100")}`}>Dashboard</Link>
                <Link href="/discover" className={`transition-colors ${getThemeClass("hover:text-zinc-900", "hover:text-zinc-100")}`}>Discover</Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {user && ongoingSessions.length > 0 && (
              <div className="relative" ref={ongoingContainerRef}>
                <button
                  onClick={() => setShowOngoingDropdown(!showOngoingDropdown)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                    showOngoingDropdown
                      ? getThemeClass("bg-indigo-50 border-indigo-200 text-indigo-700", "bg-indigo-950/40 border-indigo-500/30 text-indigo-400")
                      : getThemeClass("border-zinc-200 bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900", "border-zinc-800 bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white")
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
                            getThemeClass("bg-zinc-50 border-zinc-200", "bg-zinc-950 border-zinc-800")
                          }`}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-mono font-bold text-indigo-400">{session.code}</span>
                            <span className="text-[9px] text-zinc-500 truncate mt-0.5">
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
                                getThemeClass("bg-zinc-150 border-zinc-300 text-zinc-400 hover:text-rose-500 hover:bg-rose-50", "bg-zinc-900 border-zinc-800 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-500")
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

            {!user ? (
              <Link 
                href="/accounts" 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-700 hover:bg-zinc-300 hover:text-zinc-950", "bg-transparent border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white")
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Login/Signup</span>
              </Link>
            ) : (
              <div className="relative" ref={profileContainerRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all border cursor-pointer ${
                    showProfileMenu 
                      ? getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-900", "bg-zinc-900 border-zinc-800 text-white") 
                      : getThemeClass("bg-transparent border-transparent text-zinc-500 hover:bg-zinc-100", "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900")
                  }`}
                  title="Profile Management"
                >
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center overflow-hidden border font-bold text-[10px] uppercase ${
                    getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-800", "bg-indigo-950 border-indigo-900 text-white")
                  }`}>
                    {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                      <img
                        src={user.user_metadata.avatar_url || user.user_metadata.picture}
                        alt="Profile"
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>
                        {user.user_metadata?.display_name?.[0] || user.email?.[0] || "U"}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold select-none hidden md:inline">
                    Hi {user.user_metadata?.display_name || user.email?.split("@")[0] || "User"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-zinc-500 hidden md:block" />
                </button>

                {/* Profile Menu Popover */}
                {showProfileMenu && (
                  <div className={`absolute right-0 mt-2 z-[100] w-48 py-1.5 rounded border shadow-xl font-mono text-[11px] ${
                    getThemeClass("bg-white border-zinc-200 text-zinc-700", "bg-zinc-900 border-zinc-800 text-zinc-300")
                  }`}>
                    <div className={`px-3 py-2 border-b select-none flex items-center gap-2 ${
                      getThemeClass("border-zinc-200", "border-zinc-800")
                    }`}>
                      {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                        <img
                          src={user.user_metadata.avatar_url || user.user_metadata.picture}
                          alt="Profile"
                          className="h-7 w-7 rounded-full object-cover border border-zinc-800"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[9px] uppercase border ${
                          getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-800", "bg-indigo-950 border-indigo-900 text-white")
                        }`}>
                          {user.user_metadata?.display_name?.[0] || user.email?.[0] || "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold uppercase truncate ${getThemeClass("text-zinc-900", "text-white")}`}>
                          {user.user_metadata?.display_name || user.email?.split("@")[0] || "User"}
                        </p>
                        <p className="text-[9px] text-zinc-500 truncate mt-0.5">{user.email}</p>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setShowProfileMenu(false)}
                        className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors ${
                          getThemeClass("hover:bg-zinc-100 text-zinc-700", "hover:bg-zinc-800 text-zinc-300")
                        }`}
                      >
                        <UserIcon className="h-3.5 w-3.5" />
                        My Profile
                      </Link>

                      <Link
                        href="/dashboard"
                        onClick={() => setShowProfileMenu(false)}
                        className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors ${
                          getThemeClass("hover:bg-zinc-100 text-zinc-700", "hover:bg-zinc-800 text-zinc-300")
                        }`}
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Account Settings
                      </Link>

                      <button
                        onClick={() => {
                          toggleTheme();
                        }}
                        className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors cursor-pointer ${
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

                      {/* Switch Accounts Section */}
                      <div className="px-3 py-1.5 flex flex-col gap-1.5 select-none font-mono">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          <span>Switch Accounts</span>
                          <button
                            onClick={handleAddNewAccount}
                            className={`p-0.5 rounded transition-colors cursor-pointer ${
                              getThemeClass("text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900", "text-zinc-400 hover:bg-zinc-800 hover:text-white")
                            }`}
                            type="button"
                            title="Add account"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
                          {savedAccounts.filter((acc) => acc.id !== user?.id).length === 0 ? (
                            <span className="text-[9px] text-zinc-650 font-mono">// no other accounts saved</span>
                          ) : (
                            savedAccounts
                              .filter((acc) => acc.id !== user?.id)
                              .map((acc) => (
                                <div
                                  key={acc.id}
                                  onClick={() => handleSwitchAccount(acc)}
                                  className={`flex items-center justify-between p-1.5 rounded transition-all cursor-pointer ${
                                    getThemeClass("hover:bg-zinc-100 text-zinc-800", "hover:bg-zinc-800 text-zinc-300")
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
                                      className="p-0.5 rounded hover:bg-zinc-700 text-zinc-550 hover:text-rose-450"
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
                        className={`w-full px-3 py-1.5 text-left flex items-center gap-2 text-rose-500 transition-colors cursor-pointer ${
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
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Brand Copy */}
        <div className="lg:col-span-5 flex flex-col items-start space-y-6">
          <div className={`text-xs font-semibold tracking-wider uppercase ${getThemeClass("text-indigo-600", "text-zinc-500")}`}>
            Collaborative Interview Platform
          </div>

          <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight ${getThemeClass("text-zinc-900", "text-white")}`}>
            Developer sandbox for coding interviews.
          </h1>

          <p className={`text-sm leading-relaxed max-w-lg ${getThemeClass("text-zinc-600", "text-zinc-400")}`}>
            An IDE-first workspace designed to evaluate engineering candidates. Featuring multi-file editing, real-time workspace sync, and candidate dashboard metrics.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-2">
            <Link 
              href={user ? "/we-rc" : "/accounts"} 
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                getThemeClass("bg-indigo-600 text-white hover:bg-indigo-700", "bg-white text-[#0a0a0a] hover:bg-zinc-200")
              }`}
            >
              <span>Launch Sandbox</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Side: Exact Replica mockup of we-rc IDE workspace */}
        <div className="lg:col-span-7 w-full">
          <div className={`w-full rounded-lg border shadow-2xl overflow-hidden aspect-[16/10] flex flex-col font-mono text-xs select-none transition-colors duration-250 ${
            getThemeClass("border-zinc-200 bg-white", "border-zinc-900 bg-[#0a0a0a]")
          }`}>
            
            {/* Top Workspace Header Bar */}
            <div className={`flex items-center justify-between px-4 h-12 border-b transition-colors duration-250 ${
              getThemeClass("border-zinc-200 bg-zinc-50", "border-zinc-900 bg-[#0a0a0a]")
            }`}>
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-6 h-6 rounded border text-[10px] font-bold ${
                  getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-650", "bg-zinc-900 border-zinc-800 text-zinc-400")
                }`}>
                  WR
                </div>
                <span className={`text-xs font-bold ${getThemeClass("text-zinc-850", "text-zinc-300")}`}>WeRC</span>
              </div>

              {/* Status Pill in middle */}
              <div className={`flex items-center gap-2 px-2.5 py-1 rounded border text-[11px] font-medium transition-colors duration-250 ${
                getThemeClass("bg-zinc-100 border-zinc-200 text-zinc-600", "bg-[#121214] border-zinc-800 text-zinc-400")
              }`}>
                <span className={getThemeClass("text-zinc-450", "text-zinc-500")}>Active:</span>
                <span className={getThemeClass("text-zinc-800", "text-zinc-300")}>main.py</span>
                <span className={`text-[10px] border px-1 py-0.2 rounded font-semibold ml-1 ${
                  getThemeClass("bg-indigo-50 text-indigo-600 border-indigo-200", "bg-indigo-950/50 text-indigo-400 border-indigo-900/35")
                }`}>
                  Entry: main.py
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className={`text-[11px] border px-2 py-1 rounded transition-colors duration-250 ${
                  getThemeClass("bg-zinc-100 border-zinc-200 text-zinc-700", "bg-zinc-900/30 border-zinc-800 text-zinc-400")
                }`}>
                  Python 3
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold ${
                  getThemeClass("bg-zinc-900 text-white hover:bg-zinc-800", "bg-white text-zinc-950 hover:bg-zinc-200")
                }`}>
                  <Play className="h-3 w-3 fill-current" />
                  <span>Run Code</span>
                </div>
              </div>
            </div>

            {/* Content Pane: Sidebar + Editor Container */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Sidebar */}
              <div className={`w-44 border-r flex flex-col p-3 transition-colors duration-250 ${
                getThemeClass("border-zinc-200 bg-zinc-50/50", "border-r border-zinc-900 bg-[#0a0a0a]")
              }`}>
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 tracking-wider mb-3">
                  <span>WORKSPACE FILES</span>
                  <div className="flex gap-1.5 text-zinc-500">
                    <FilePlus className="h-3.5 w-3.5 hover:text-zinc-300 cursor-pointer" />
                    <FolderPlus className="h-3.5 w-3.5 hover:text-zinc-300 cursor-pointer" />
                  </div>
                </div>

                {/* Selected File Tab */}
                <div className={`flex items-center justify-between px-2.5 py-1.5 rounded border text-xs transition-colors duration-250 ${
                  getThemeClass("bg-white border-zinc-200 text-zinc-850", "bg-zinc-900/60 border-zinc-800 text-zinc-200")
                }`}>
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>main.py</span>
                  </span>
                  <span className={`text-[9px] border px-1 py-0.2 rounded ${
                    getThemeClass("bg-indigo-50 text-indigo-600 border-indigo-200", "bg-indigo-950/45 text-indigo-400 border-indigo-900/30")
                  }`}>Entry</span>
                </div>
              </div>

              {/* Editor + Console split */}
              <div className={`flex-1 flex flex-col transition-colors duration-250 ${
                getThemeClass("bg-white", "bg-[#0a0a0a]")
              }`}>
                {/* Editor code area */}
                <div className="flex-1 p-4 relative flex font-mono text-[11px]">
                  {/* Line Numbers */}
                  <div className={`w-6 flex flex-col select-none pr-2 text-right border-r mr-3 ${
                    getThemeClass("border-zinc-150 text-zinc-400", "border-zinc-900 text-zinc-600")
                  }`}>
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                  </div>
                  {/* Code */}
                  <div className={`flex-1 flex flex-col ${getThemeClass("text-zinc-850", "text-zinc-300")}`}>
                    <span className="text-zinc-500"># Write your code here</span>
                    <span>print("Hello, World!")</span>
                    <span className="h-4 w-1.5 bg-zinc-500 animate-pulse mt-0.5" />
                  </div>
                </div>

                {/* Console Output Drawer */}
                <div className={`h-28 border-t flex flex-col transition-colors duration-250 ${
                  getThemeClass("border-zinc-200 bg-zinc-50/50", "border-zinc-900 bg-[#0a0a0a]")
                }`}>
                  {/* Tabs */}
                  <div className={`flex items-center gap-4 px-4 border-b text-[10px] text-zinc-500 h-8 ${
                    getThemeClass("border-zinc-200", "border-zinc-900")
                  }`}>
                    <span className={`pb-2.5 pt-2.5 font-semibold cursor-pointer border-b ${
                      getThemeClass("text-zinc-900 border-zinc-900", "text-zinc-200 border-white")
                    }`}>
                      Console Output
                    </span>
                    <span className="hover:text-zinc-300 cursor-pointer">
                      Custom Input (stdin)
                    </span>
                  </div>
                  {/* Terminal Area */}
                  <div className="flex-1 p-3 text-zinc-500 font-mono text-[10px] flex items-center justify-center">
                    Terminal ready. Run code to display output.
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

      </section>

      {/* Features Grid Section - Clean, borders, no blobs */}
      <section id="features" className={`py-20 border-t transition-colors duration-250 ${getThemeClass("border-zinc-200 bg-zinc-50/50", "border-zinc-900 bg-[#0a0a0a]")}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <div className={`text-xs font-semibold tracking-wider uppercase mb-3 ${getThemeClass("text-indigo-650", "text-zinc-500")}`}>Capabilities</div>
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${getThemeClass("text-zinc-900", "text-white")}`}>
              Minimalist workspace. Zero configuration.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className={`p-5 rounded-lg border transition-colors ${
              getThemeClass("border-zinc-200 bg-white hover:border-zinc-300", "border-zinc-900 bg-[#0a0a0a] hover:border-zinc-800")
            }`}>
              <div className="text-zinc-400 mb-4">
                <Users className="h-5 w-5" />
              </div>
              <h3 className={`text-sm font-bold mb-1.5 ${getThemeClass("text-zinc-900", "text-white")}`}>Real-time Collaboration</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Watch candidate keyboard inputs, tab focus switches, and updates instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={`p-5 rounded-lg border transition-colors ${
              getThemeClass("border-zinc-200 bg-white hover:border-zinc-300", "border-zinc-900 bg-[#0a0a0a] hover:border-zinc-800")
            }`}>
              <div className="text-zinc-400 mb-4">
                <FolderTree className="h-5 w-5" />
              </div>
              <h3 className={`text-sm font-bold mb-1.5 ${getThemeClass("text-zinc-900", "text-white")}`}>Multi-File Workspace</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Supports folder setups. Create file dependencies and define the run entrypoint.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={`p-5 rounded-lg border transition-colors ${
              getThemeClass("border-zinc-200 bg-white hover:border-zinc-300", "border-zinc-900 bg-[#0a0a0a] hover:border-zinc-800")
            }`}>
              <div className="text-zinc-400 mb-4">
                <Code className="h-5 w-5" />
              </div>
              <h3 className={`text-sm font-bold mb-1.5 ${getThemeClass("text-zinc-900", "text-white")}`}>Sandbox Sandbox</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Run script code directly on remote machines with stdin parameters.
              </p>
            </div>

            {/* Feature 4 */}
            <div className={`p-5 rounded-lg border transition-colors ${
              getThemeClass("border-zinc-200 bg-white hover:border-zinc-300", "border-zinc-900 bg-[#0a0a0a] hover:border-zinc-800")
            }`}>
              <div className="text-zinc-400 mb-4">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className={`text-sm font-bold mb-1.5 ${getThemeClass("text-zinc-900", "text-white")}`}>Interviewer Decisions</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Document session notes and log Accepted/Rejected states directly to candidate logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className={`py-20 border-t transition-colors duration-250 ${getThemeClass("border-zinc-200 bg-white", "border-zinc-900 bg-[#0a0a0a]")}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <div className={`text-xs font-semibold tracking-wider uppercase mb-3 ${getThemeClass("text-indigo-650", "text-zinc-500")}`}>Workflow</div>
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${getThemeClass("text-zinc-900", "text-white")}`}>
              Evaluate in four simple steps.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <div className={`text-xs font-bold ${getThemeClass("text-zinc-400", "text-zinc-650")}`}>01 / ROOM CREATION</div>
              <h4 className={`text-sm font-bold ${getThemeClass("text-zinc-900", "text-white")}`}>Spin up sandbox</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Click "Host Session" to immediately configure a new collaborative coding environment.
              </p>
            </div>

            <div className="space-y-2">
              <div className={`text-xs font-bold ${getThemeClass("text-zinc-400", "text-zinc-650")}`}>02 / INVITE APPLICANT</div>
              <h4 className={`text-sm font-bold ${getThemeClass("text-zinc-900", "text-white")}`}>Share code</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Copy and dispatch the session room token link directly to candidate participants.
              </p>
            </div>

            <div className="space-y-2">
              <div className={`text-xs font-bold ${getThemeClass("text-zinc-400", "text-zinc-650")}`}>03 / WRITE & COMPILE</div>
              <h4 className={`text-sm font-bold ${getThemeClass("text-zinc-900", "text-white")}`}>Evaluate capability</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Review design choices, run syntax tests, and analyze performance capabilities in real-time.
              </p>
            </div>

            <div className="space-y-2">
              <div className={`text-xs font-bold ${getThemeClass("text-zinc-400", "text-zinc-650")}`}>04 / DISPATCH LOGS</div>
              <h4 className={`text-sm font-bold ${getThemeClass("text-zinc-900", "text-white")}`}>Grade candidate</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Log feedback and record grading decisions immediately inside dashboard databases.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className={`py-20 border-t transition-colors duration-250 ${getThemeClass("border-zinc-200 bg-zinc-50/50", "border-zinc-900 bg-[#0a0a0a]")}`}>
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className={`text-2xl sm:text-3xl font-bold ${getThemeClass("text-zinc-900", "text-white")}`}>
            Ready to start developer evaluations?
          </h2>
          <p className="text-zinc-500 text-xs max-w-md mx-auto leading-relaxed">
            Create an interview sandbox instantly. Clean workspace, zero-lag sync, direct evaluation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
            <Link 
              href={user ? "/we-rc" : "/accounts"} 
              className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                getThemeClass("bg-indigo-650 text-white hover:bg-indigo-700", "bg-white text-[#0a0a0a] hover:bg-zinc-200")
              }`}
            >
              Launch Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-10 text-xs border-t transition-colors duration-250 ${getThemeClass("border-zinc-200 bg-zinc-50 text-zinc-500", "border-zinc-900 bg-[#0a0a0a] text-zinc-600")}`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded border text-[9px] font-bold flex items-center justify-center ${
              getThemeClass("bg-zinc-200 border-zinc-300 text-zinc-600", "bg-zinc-900 border-zinc-800 text-zinc-500")
            }`}>
              WR
            </div>
            <span className={`font-semibold ${getThemeClass("text-zinc-800", "text-zinc-400")}`}>WeRC</span>
            <span>© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href={user ? "/we-rc" : "/accounts"} className={`transition-colors ${getThemeClass("hover:text-zinc-800", "hover:text-zinc-400")}`}>Sandbox</Link>
            <Link href="/accounts" className={`transition-colors ${getThemeClass("hover:text-zinc-800", "hover:text-zinc-400")}`}>Portal</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
