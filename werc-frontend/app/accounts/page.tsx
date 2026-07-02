"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../config/supabase";
import { ArrowLeft, UserPlus, LogIn, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";
import { COUNTRY_OPTIONS } from "../lib/utils/country-options";

export default function AccountsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"signup" | "login">("signup");
  
  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupCountry, setSignupCountry] = useState<string>("United States");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  // Realtime username check status
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Redirect if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
      }
    });
  }, [router]);

  // Debounced Realtime Username Check
  useEffect(() => {
    const cleanUsername = signupUsername.trim();
    if (!cleanUsername) {
      setUsernameStatus("idle");
      return;
    }

    if (cleanUsername.length < 3) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");

    const delayDebounceFn = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", cleanUsername)
          .maybeSingle();

        if (error) {
          // Fallback if table doesn't exist or offline
          console.warn("Supabase username check error:", error);
          setUsernameStatus("available");
          return;
        }

        if (data) {
          setUsernameStatus("taken");
        } else {
          setUsernameStatus("available");
        }
      } catch (err) {
        console.error(err);
        setUsernameStatus("available");
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [signupUsername]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError(null);
    setSignupSuccess(false);

    if (usernameStatus === "taken") {
      setSignupError("This username is already taken.");
      setSignupLoading(false);
      return;
    }

    if (usernameStatus === "invalid") {
      setSignupError("Username must be at least 3 characters.");
      setSignupLoading(false);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match.");
      setSignupLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            full_name: signupName,
            username: signupUsername,
            country: signupCountry,
            display_name: signupName
          },
        },
      });

      if (error) throw error;
      
      setSignupSuccess(true);
    } catch (err: any) {
      setSignupError(err.message || "An error occurred during sign up.");
    } finally {
      setSignupLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      router.push("/");
    } catch (err: any) {
      setLoginError(err.message || "Invalid login credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-zinc-950 text-zinc-300 flex flex-col items-center justify-center p-4 relative font-mono text-sm select-none">
      
      {/* Top Left Navigation Link */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-zinc-505 hover:text-zinc-300 transition-colors py-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>back_to_workspace</span>
      </Link>

      {/* Main Minimalist Box Container */}
      <div className="w-[90%] md:w-[60%] max-w-4xl bg-zinc-950 border border-zinc-900 p-10 flex flex-col gap-8">
        
        {/* Workspace Brand Block */}
        <div className="flex items-center gap-2.5 pb-5 border-b border-zinc-900">
          <img src="/logo/logo.png" alt="WeRC Logo" className="h-6 w-6 object-contain rounded" />
          <span className="text-base font-semibold tracking-tight text-white">WeRC Workspace</span>
          <span className="text-xs text-zinc-600">v1.0</span>
        </div>

        {/* Dynamic Horizontal Sliding Panel */}
        <div className="w-full overflow-hidden relative">
          <div
            className="flex w-[200%] transition-transform duration-300 ease-in-out"
            style={{ transform: activeTab === "signup" ? "translateX(0%)" : "translateX(-50%)" }}
          >
            {/* SIGNUP SLIDE */}
            <div className="w-1/2 pr-4 flex flex-col gap-5">
              <div className="text-xs font-semibold text-zinc-500 tracking-wider uppercase">
                // create_new_account
              </div>

              {signupSuccess ? (
                <div className="border border-zinc-800 p-5 rounded bg-zinc-950 flex flex-col gap-3.5 text-zinc-400">
                  <span className="font-bold text-white">// Registration complete</span>
                  <span className="leading-relaxed">Confirmation link has been sent to your email address. Please verify your account.</span>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                  {signupError && (
                    <div className="border border-red-950/30 bg-red-950/10 p-3.5 rounded flex items-center gap-2.5 text-red-400 text-xs">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                      <span>{signupError}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-500 font-semibold tracking-wider">FULL_NAME</label>
                    <input
                      type="text"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs text-zinc-500 font-semibold tracking-wider">
                      <span>USERNAME</span>
                      <span className="text-[10px] text-zinc-600 font-normal">a-z, 0-9, - and _ only</span>
                    </div>
                    <div className="relative flex">
                      <input
                        type="text"
                        required
                        value={signupUsername}
                        onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                        placeholder="yourusername"
                        className="flex-1 bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded pl-4 pr-24 py-2.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all"
                      />
                      <div className="absolute right-4 top-3.5 text-[9px] font-bold select-none tracking-wider flex items-center gap-1.5">
                        {usernameStatus === "checking" && (
                          <span className="text-zinc-500 flex items-center gap-1 font-semibold">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            CHECKING
                          </span>
                        )}
                        {usernameStatus === "available" && <span className="text-emerald-500">✓ AVAILABLE</span>}
                        {usernameStatus === "taken" && <span className="text-rose-500">✗ TAKEN</span>}
                        {usernameStatus === "invalid" && <span className="text-amber-500">TOO SHORT</span>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-500 font-semibold tracking-wider">EMAIL</label>
                      <input
                        type="email"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-500 font-semibold tracking-wider">COUNTRY</label>
                      <select
                        value={signupCountry}
                        onChange={(e) => setSignupCountry(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 focus:outline-none transition-all cursor-pointer"
                      >
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-500 font-semibold tracking-wider">PASSWORD</label>
                    <input
                      type="password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all"
                    />
                    <div className="flex justify-between items-center text-[10px] text-zinc-600 font-semibold mt-1">
                      <span>PASSWORD STRENGTH</span>
                      <span className={signupPassword.length >= 8 ? "text-emerald-500" : signupPassword.length > 0 ? "text-amber-500" : "text-zinc-600"}>
                        {signupPassword.length >= 8 ? "STRONG" : signupPassword.length > 0 ? "WEAK" : "START TYPING"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-500 font-semibold tracking-wider">CONFIRM PASSWORD</label>
                    <input
                      type="password"
                      required
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={signupLoading}
                    className="w-full mt-3 py-2.5 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 hover:text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {signupLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Register</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* LOGIN SLIDE */}
            <div className="w-1/2 pl-4 flex flex-col gap-5">
              <div className="text-xs font-semibold text-zinc-500 tracking-wider uppercase">
                // user_authentication
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                {loginError && (
                  <div className="border border-red-950/30 bg-red-950/10 p-3.5 rounded flex items-center gap-2.5 text-red-400 text-xs">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-500 font-semibold tracking-wider">EMAIL_ADDRESS</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-500 font-semibold tracking-wider">PASSWORD</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full mt-3 py-2.5 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 hover:text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  {loginLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>Authenticate</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Minimal Selection choice bar at the bottom */}
        <div className="w-full h-11 bg-zinc-950 rounded flex select-none border border-zinc-900 p-1 mt-2">
          <button
            onClick={() => setActiveTab("signup")}
            className={`flex-1 text-center font-bold text-sm transition-colors rounded ${
              activeTab === "signup" 
                ? "bg-zinc-900 text-white" 
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            Sign Up
          </button>
          
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 text-center font-bold text-sm transition-colors rounded ${
              activeTab === "login" 
                ? "bg-zinc-900 text-white" 
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            Log In
          </button>
        </div>

      </div>
    </div>
  );
}
