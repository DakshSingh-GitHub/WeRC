"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../config/supabase";
import { ArrowLeft, UserPlus, LogIn, RefreshCw, AlertCircle, Eye, EyeOff } from "lucide-react";
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

  // Password visibility states
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Vlyxir Auth states
  const [vlyxirUsernameOrEmail, setVlyxirUsernameOrEmail] = useState("");
  const [vlyxirPassword, setVlyxirPassword] = useState("");
  const [vlyxirLoading, setVlyxirLoading] = useState(false);
  const [vlyxirError, setVlyxirError] = useState<string | null>(null);
  const [showVlyxirForm, setShowVlyxirForm] = useState(false);
  const [showVlyxirPassword, setShowVlyxirPassword] = useState(false);

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
        setUsernameStatus("idle");
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

    if (signupPassword.length < 8) {
      setSignupError("Password must be at least 8 characters long.");
      setSignupLoading(false);
      return;
    }

    if (!/[A-Z]/.test(signupPassword) || !/[0-9]/.test(signupPassword)) {
      setSignupError("Password must contain at least one uppercase letter and one number.");
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
      let email = loginEmail.trim();

      if (!email.includes("@")) {
        // Resolve username to email
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", email.toLowerCase())
          .maybeSingle();

        if (profileError) {
          throw new Error("Database query failed: " + profileError.message);
        }

        if (!profile || !profile.email) {
          throw new Error("Username not found. Please use your email address.");
        }

        email = profile.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
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

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      if (activeTab === "signup") {
        setSignupError(err.message || "An error occurred signing up with Google.");
      } else {
        setLoginError(err.message || "An error occurred signing in with Google.");
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const handleVlyxirSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVlyxirLoading(true);
    setVlyxirError(null);

    try {
      const res = await fetch("/api/auth/vlyxir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOrUsername: vlyxirUsernameOrEmail,
          password: vlyxirPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      if (data.redirectUrl) {
        // HIGH-1 fix: Validate redirect URL to prevent open redirect attacks.
        // Supabase generateLink URLs point to the Supabase database origin.
        try {
          const redirectUrl = new URL(data.redirectUrl);
          const allowedOrigins = [window.location.origin];

          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (supabaseUrl) allowedOrigins.push(new URL(supabaseUrl).origin);

          const vlyxirSupabaseUrl = process.env.NEXT_PUBLIC_VLYXIR_SUPABASE_URL;
          if (vlyxirSupabaseUrl) allowedOrigins.push(new URL(vlyxirSupabaseUrl).origin);

          if (!allowedOrigins.includes(redirectUrl.origin)) {
            throw new Error("Invalid redirect URL.");
          }
          window.location.href = data.redirectUrl;
        } catch (err) {
          console.error("Redirect validation error:", err);
          throw new Error("Invalid redirect URL received.");
        }
      } else {
        throw new Error("No redirect link returned.");
      }
    } catch (err: any) {
      setVlyxirError(err.message || "An error occurred checking Vlyxir database.");
    } finally {
      setVlyxirLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-zinc-950 text-zinc-300 flex flex-col items-center justify-start sm:justify-center p-4 py-8 relative font-mono text-sm select-none">
      
      {/* Top Left Navigation Link */}
      <Link
        href="/"
        className="absolute top-4 left-4 flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors py-1"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>back_to_workspace</span>
      </Link>

      {/* Main Minimalist Box Container */}
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-900 p-5 flex flex-col gap-4 my-auto">
        
        {/* Workspace Brand Block */}
        <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-900">
          <img src="/logo/logo.png" alt="WeRC Logo" className="h-5 w-5 object-contain rounded" />
          <span className="text-sm font-semibold tracking-tight text-white">WeRC Workspace</span>
        </div>

        {showVlyxirForm ? (
          /* VLYXIR CREDENTIAL AUTH PANEL */
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-900">
              <span className="text-xs font-semibold text-zinc-550 tracking-wider uppercase">// vlyxir_database_auth</span>
              <button
                type="button"
                onClick={() => {
                  setShowVlyxirForm(false);
                  setVlyxirError(null);
                }}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider font-bold"
              >
                [Cancel]
              </button>
            </div>

            <form onSubmit={handleVlyxirSubmit} className="flex flex-col gap-3">
              {vlyxirError && (
                <div className="border border-red-950/30 bg-red-950/10 p-2.5 rounded flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{vlyxirError}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-550 font-semibold tracking-wider">VLYXIR_USERNAME_OR_EMAIL</label>
                <input
                  type="text"
                  required
                  value={vlyxirUsernameOrEmail}
                  onChange={(e) => setVlyxirUsernameOrEmail(e.target.value)}
                  placeholder="vlyxir username or email"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded px-3 py-1.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-550 font-semibold tracking-wider">VLYXIR_PASSWORD</label>
                <div className="relative w-full flex items-center">
                  <input
                    type={showVlyxirPassword ? "text" : "password"}
                    required
                    value={vlyxirPassword}
                    onChange={(e) => setVlyxirPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded pl-3 pr-10 py-1.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowVlyxirPassword(!showVlyxirPassword)}
                    className="absolute right-3 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                  >
                    {showVlyxirPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={vlyxirLoading}
                className="w-full mt-1 py-2 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 hover:text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50 text-xs"
              >
                {vlyxirLoading ? (
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-4.5 w-4.5" />
                    <span>Verify & Login</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* STANDARD SIGNUP / LOGIN SLIDES */
          <>
            <div className="w-full overflow-hidden relative">
              <div
                className="flex w-[200%] transition-transform duration-300 ease-in-out"
                style={{ transform: activeTab === "signup" ? "translateX(0%)" : "translateX(-50%)" }}
              >
                {/* SIGNUP SLIDE */}
                <div className="w-1/2 pr-4 flex flex-col gap-3">
                  <div className="text-xs font-semibold text-zinc-500 tracking-wider uppercase">
                    // create_new_account
                  </div>

                  {signupSuccess ? (
                    <div className="border border-zinc-800 p-5 rounded bg-zinc-950 flex flex-col gap-3 text-zinc-400">
                      <span className="font-bold text-white">// Registration complete</span>
                      <span className="leading-relaxed text-xs">Confirmation link has been sent to your email address. Please verify your account.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSignup} className="flex flex-col gap-3">
                      {signupError && (
                        <div className="border border-red-950/30 bg-red-950/10 p-2.5 rounded flex items-center gap-2 text-red-400 text-xs">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{signupError}</span>
                        </div>
                      )}

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-550 font-semibold tracking-wider">FULL_NAME</label>
                        <input
                          type="text"
                          required
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded px-3 py-1.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all text-xs"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[10px] text-zinc-550 font-semibold tracking-wider">
                          <span>USERNAME</span>
                          <span className="text-[9px] text-zinc-650 font-normal">a-z, 0-9, - and _ only</span>
                        </div>
                        <div className="relative flex">
                          <input
                            type="text"
                            required
                            value={signupUsername}
                            onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                            placeholder="yourusername"
                            className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded pl-3 pr-24 py-1.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all text-xs"
                          />
                          <div className="absolute right-3 top-2 text-[9px] font-bold select-none tracking-wider flex items-center gap-1.5">
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

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-zinc-550 font-semibold tracking-wider">EMAIL</label>
                          <input
                            type="email"
                            required
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            placeholder="you@domain.com"
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded px-3 py-1.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all text-xs"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-zinc-550 font-semibold tracking-wider">COUNTRY</label>
                          <select
                            value={signupCountry}
                            onChange={(e) => setSignupCountry(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded px-3 py-1.5 text-zinc-200 focus:outline-none transition-all cursor-pointer text-xs"
                          >
                            {COUNTRY_OPTIONS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-550 font-semibold tracking-wider">PASSWORD</label>
                        <div className="relative w-full flex items-center">
                          <input
                            type={showSignupPassword ? "text" : "password"}
                            required
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded pl-3 pr-10 py-1.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            className="absolute right-3 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                          >
                            {showSignupPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-zinc-650 font-semibold mt-0.5">
                          <span>PASSWORD STRENGTH</span>
                          <span className={signupPassword.length >= 8 && /[A-Z]/.test(signupPassword) && /[0-9]/.test(signupPassword) ? "text-emerald-500" : signupPassword.length > 0 ? "text-amber-500" : "text-zinc-600"}>
                            {signupPassword.length >= 8 && /[A-Z]/.test(signupPassword) && /[0-9]/.test(signupPassword) ? "STRONG" : signupPassword.length > 0 ? "WEAK — need 8+ chars, uppercase, number" : "START TYPING"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-550 font-semibold tracking-wider">CONFIRM PASSWORD</label>
                        <div className="relative w-full flex items-center">
                          <input
                            type={showSignupConfirmPassword ? "text" : "password"}
                            required
                            value={signupConfirmPassword}
                            onChange={(e) => setSignupConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded pl-3 pr-10 py-1.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                            className="absolute right-3 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                          >
                            {showSignupConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={signupLoading || oauthLoading}
                        className="w-full mt-1 py-2 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 hover:text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50 text-xs"
                      >
                        {signupLoading ? (
                          <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4.5 w-4.5" />
                            <span>Register</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center my-1 select-none">
                        <div className="flex-1 border-t border-zinc-900"></div>
                        <span className="px-2 text-[10px] text-zinc-650 font-bold uppercase tracking-wider">or</span>
                        <div className="flex-1 border-t border-zinc-900"></div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={signupLoading || oauthLoading}
                        className="w-full py-2 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50 text-xs mb-1"
                      >
                        {oauthLoading ? (
                          <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                          <>
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                            </svg>
                            <span>Continue with Google</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowVlyxirForm(true)}
                        disabled={signupLoading || oauthLoading}
                        className="w-full py-2 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50 text-xs"
                      >
                        <img src="/logo/vlyxir.png" alt="Vlyxir Logo" className="h-4 w-4 object-contain rounded-sm" />
                        <span>Continue with Vlyxir</span>
                      </button>
                    </form>
                  )}
                </div>

                {/* LOGIN SLIDE */}
                <div className="w-1/2 pl-4 flex flex-col gap-3">
                  <div className="text-xs font-semibold text-zinc-500 tracking-wider uppercase">
                    // user_authentication
                  </div>

                  <form onSubmit={handleLogin} className="flex flex-col gap-3">
                    {loginError && (
                      <div className="border border-red-950/30 bg-red-950/10 p-2.5 rounded flex items-center gap-2 text-red-400 text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-550 font-semibold tracking-wider">USERNAME_OR_EMAIL</label>
                      <input
                        type="text"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="username or email"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded px-3 py-1.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all text-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-550 font-semibold tracking-wider">PASSWORD</label>
                      <div className="relative w-full flex items-center">
                        <input
                          type={showLoginPassword ? "text" : "password"}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded pl-3 pr-10 py-1.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                        >
                          {showLoginPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loginLoading || oauthLoading}
                      className="w-full mt-1 py-2 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 hover:text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50 text-xs"
                    >
                      {loginLoading ? (
                        <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                      ) : (
                        <>
                          <LogIn className="h-4.5 w-4.5" />
                          <span>Authenticate</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center my-1 select-none">
                      <div className="flex-1 border-t border-zinc-900"></div>
                      <span className="px-2 text-[10px] text-zinc-650 font-bold uppercase tracking-wider">or</span>
                      <div className="flex-1 border-t border-zinc-900"></div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loginLoading || oauthLoading}
                      className="w-full py-2 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50 text-xs mb-1"
                    >
                      {oauthLoading ? (
                        <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                      ) : (
                        <>
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                          </svg>
                          <span>Continue with Google</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowVlyxirForm(true)}
                      disabled={loginLoading || oauthLoading}
                      className="w-full py-2 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50 text-xs"
                    >
                      <img src="/logo/vlyxir.png" alt="Vlyxir Logo" className="h-4 w-4 object-contain rounded-sm" />
                      <span>Continue with Vlyxir</span>
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
          </>
        )}

      </div>
    </div>
  );
}

