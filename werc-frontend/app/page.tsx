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
  X
} from "lucide-react";
import { supabase } from "./config/supabase";
import { User } from "@supabase/supabase-js";

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileContainerRef = useRef<HTMLDivElement>(null);
  
  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);

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

  const handleSwitchAccount = async (account: any) => {
    try {
      setShowProfileMenu(false);
      const { error } = await supabase.auth.setSession({
        access_token: account.access_token,
        refresh_token: account.refresh_token
      });
      if (error) throw error;
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
    await supabase.auth.signOut();
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

    window.addEventListener("focus", refreshSession);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", refreshSession);
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
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-350 font-sans selection:bg-zinc-800 selection:text-white overflow-x-hidden antialiased">
      
      {/* Navigation Header - Matches we-rc header styling */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-[#0a0a0a]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo image from public/logo/logo.png */}
            <img 
              src="/logo/logo.png" 
              alt="WeRC Logo" 
              className="h-6 w-6 object-contain rounded"
            />
            <span className="text-sm font-semibold tracking-tight text-white">WeRC</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
            <a href="#features" className="hover:text-zinc-100 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-zinc-100 transition-colors">Workflow</a>
            <Link href={user ? "/we-rc" : "/accounts"} className="hover:text-zinc-100 transition-colors">Sandbox</Link>
            {user && (
              <Link href="/dashboard" className="hover:text-zinc-100 transition-colors">Dashboard</Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {!user ? (
              <Link 
                href="/accounts" 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-transparent text-xs font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all"
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
                      ? "bg-zinc-900 border-zinc-800 text-white" 
                      : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900"
                  }`}
                  title="Profile Management"
                >
                  <div className="h-5 w-5 rounded-full flex items-center justify-center overflow-hidden border border-indigo-900 bg-indigo-950 text-white font-bold text-[10px] uppercase">
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
                  <div className="absolute right-0 mt-2 z-[100] w-48 py-1.5 rounded bg-zinc-900 border border-zinc-800 shadow-xl font-mono text-[11px]">
                    <div className="px-3 py-2 border-b border-zinc-800 select-none flex items-center gap-2">
                      {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                        <img
                          src={user.user_metadata.avatar_url || user.user_metadata.picture}
                          alt="Profile"
                          className="h-7 w-7 rounded-full object-cover border border-zinc-850"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-indigo-950 border border-indigo-900 flex items-center justify-center font-bold text-[9px] uppercase text-white">
                          {user.user_metadata?.display_name?.[0] || user.email?.[0] || "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold uppercase text-white truncate">
                          {user.user_metadata?.display_name || user.email?.split("@")[0] || "User"}
                        </p>
                        <p className="text-[9px] text-zinc-500 truncate mt-0.5">{user.email}</p>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 text-zinc-300 transition-colors"
                      >
                        <UserIcon className="h-3.5 w-3.5" />
                        My Profile
                      </Link>

                      <Link
                        href="/dashboard"
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 text-zinc-300 transition-colors"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Account Settings
                      </Link>

                      <div className="my-1 border-t border-zinc-800" />

                      {/* Switch Accounts Section */}
                      <div className="px-3 py-1.5 flex flex-col gap-1.5 select-none font-mono">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          <span>Switch Accounts</span>
                          <button
                            onClick={handleAddNewAccount}
                            className="p-0.5 rounded transition-colors cursor-pointer hover:bg-zinc-800 text-zinc-400 hover:text-white"
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
                                  className="flex items-center justify-between p-1.5 rounded transition-all cursor-pointer hover:bg-zinc-800 text-zinc-305"
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

                      <div className="my-1 border-t border-zinc-800" />

                      <button
                        onClick={async () => {
                          setShowProfileMenu(false);
                          await supabase.auth.signOut();
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-rose-500 hover:bg-zinc-800 transition-colors cursor-pointer"
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
          <div className="text-xs font-semibold tracking-wider text-zinc-550 uppercase">
            Collaborative Interview Platform
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            Developer sandbox for coding interviews.
          </h1>

          <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
            An IDE-first workspace designed to evaluate engineering candidates. Featuring multi-file editing, real-time workspace sync, and candidate dashboard metrics.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-2">
            <Link 
              href={user ? "/we-rc" : "/accounts"} 
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-[#0a0a0a] text-xs font-bold hover:bg-zinc-200 transition-all"
            >
              <span>Launch Sandbox</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Side: Exact Replica mockup of we-rc IDE workspace */}
        <div className="lg:col-span-7 w-full">
          <div className="w-full rounded-lg border border-zinc-900 bg-[#0a0a0a] shadow-2xl overflow-hidden aspect-[16/10] flex flex-col font-mono text-xs select-none">
            
            {/* Top Workspace Header Bar */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-900 bg-[#0a0a0a]">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-zinc-900 rounded border border-zinc-850 text-[10px] font-bold text-zinc-400">
                  WR
                </div>
                <span className="text-xs font-bold text-zinc-300">WeRC</span>
              </div>

              {/* Status Pill in middle */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#121214] border border-zinc-850 text-[11px] font-medium text-zinc-400">
                <span className="text-zinc-500">Active:</span>
                <span className="text-zinc-300">main.py</span>
                <span className="text-[10px] bg-indigo-950/50 text-indigo-400 border border-indigo-900/35 px-1 py-0.2 rounded font-semibold ml-1">
                  Entry: main.py
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-[11px] text-zinc-400 border border-zinc-850 px-2 py-1 rounded bg-zinc-900/30">
                  Python 3
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-white text-zinc-950 text-[11px] font-bold">
                  <Play className="h-3 w-3 fill-current" />
                  <span>Run Code</span>
                </div>
              </div>
            </div>

            {/* Content Pane: Sidebar + Editor Container */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Sidebar */}
              <div className="w-44 border-r border-zinc-900 bg-[#0a0a0a] flex flex-col p-3">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-550 tracking-wider mb-3">
                  <span>WORKSPACE FILES</span>
                  <div className="flex gap-1.5 text-zinc-500">
                    <FilePlus className="h-3.5 w-3.5 hover:text-zinc-300 cursor-pointer" />
                    <FolderPlus className="h-3.5 w-3.5 hover:text-zinc-300 cursor-pointer" />
                  </div>
                </div>

                {/* Selected File Tab */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-zinc-900/60 border border-zinc-850 text-zinc-200 text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>main.py</span>
                  </span>
                  <span className="text-[9px] bg-indigo-950/45 text-indigo-400 border border-indigo-900/30 px-1 py-0.2 rounded">Entry</span>
                </div>
              </div>

              {/* Editor + Console split */}
              <div className="flex-1 flex flex-col bg-[#0a0a0a]">
                {/* Editor code area */}
                <div className="flex-1 p-4 bg-[#0a0a0a] relative flex font-mono text-[11px]">
                  {/* Line Numbers */}
                  <div className="w-6 text-zinc-600 flex flex-col select-none pr-2 text-right border-r border-zinc-900 mr-3">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                  </div>
                  {/* Code */}
                  <div className="flex-1 flex flex-col text-zinc-300">
                    <span className="text-zinc-550"># Write your code here</span>
                    <span>print("Hello, World!")</span>
                    <span className="h-4 w-1.5 bg-zinc-500 animate-pulse mt-0.5" />
                  </div>
                </div>

                {/* Console Output Drawer */}
                <div className="h-28 border-t border-zinc-900 bg-[#0a0a0a] flex flex-col">
                  {/* Tabs */}
                  <div className="flex items-center gap-4 px-4 border-b border-zinc-900 text-[10px] text-zinc-500 h-8">
                    <span className="text-zinc-200 border-b border-white pb-2.5 pt-2.5 font-semibold cursor-pointer">
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
      <section id="features" className="border-t border-zinc-900 bg-[#0a0a0a] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <div className="text-xs font-semibold tracking-wider text-zinc-550 uppercase mb-3">Capabilities</div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Minimalist workspace. Zero configuration.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-5 rounded-lg border border-zinc-900 bg-[#0a0a0a] hover:border-zinc-800 transition-colors">
              <div className="text-zinc-400 mb-4">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Real-time Collaboration</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Watch candidate keyboard inputs, tab focus switches, and updates instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-lg border border-zinc-900 bg-[#0a0a0a] hover:border-zinc-800 transition-colors">
              <div className="text-zinc-400 mb-4">
                <FolderTree className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Multi-File Workspace</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Supports folder setups. Create file dependencies and define the run entrypoint.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-lg border border-zinc-900 bg-[#0a0a0a] hover:border-zinc-800 transition-colors">
              <div className="text-zinc-400 mb-4">
                <Code className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Sandbox Sandbox</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Run script code directly on remote machines with stdin parameters.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-lg border border-zinc-900 bg-[#0a0a0a] hover:border-zinc-800 transition-colors">
              <div className="text-zinc-400 mb-4">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Interviewer Decisions</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Document session notes and log Accepted/Rejected states directly to candidate logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="border-t border-zinc-900 bg-[#0a0a0a] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <div className="text-xs font-semibold tracking-wider text-zinc-550 uppercase mb-3">Workflow</div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Evaluate in four simple steps.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-650">01 / ROOM CREATION</div>
              <h4 className="text-sm font-bold text-white">Spin up sandbox</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Click "Host Session" to immediately configure a new collaborative coding environment.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-650">02 / INVITE APPLICANT</div>
              <h4 className="text-sm font-bold text-white">Share code</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Copy and dispatch the session room token link directly to candidate participants.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-650">03 / WRITE & COMPILE</div>
              <h4 className="text-sm font-bold text-white">Evaluate capability</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Review design choices, run syntax tests, and analyze performance capabilities in real-time.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-650">04 / DISPATCH LOGS</div>
              <h4 className="text-sm font-bold text-white">Grade candidate</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Log feedback and record grading decisions immediately inside dashboard databases.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="border-t border-zinc-900 py-20 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Ready to start developer evaluations?
          </h2>
          <p className="text-zinc-500 text-xs max-w-md mx-auto leading-relaxed">
            Create an interview sandbox instantly. Clean workspace, zero-lag sync, direct evaluation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
            <Link 
              href={user ? "/we-rc" : "/accounts"} 
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white text-[#0a0a0a] text-xs font-bold hover:bg-zinc-200 transition-all"
            >
              Launch Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-[#0a0a0a] py-10 text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-zinc-900 rounded border border-zinc-850 text-[9px] font-bold text-zinc-500 flex items-center justify-center">
              WR
            </div>
            <span className="font-semibold text-zinc-400">WeRC</span>
            <span>© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href={user ? "/we-rc" : "/accounts"} className="hover:text-zinc-400 transition-colors">Sandbox</Link>
            <Link href="/accounts" className="hover:text-zinc-400 transition-colors">Portal</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
