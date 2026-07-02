"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../config/supabase";
import { 
  ArrowLeft, User as UserIcon, Settings, Calendar, Code, Save, Key, LogOut, CheckCircle, AlertCircle, RefreshCw, Sparkles, Trash2
} from "lucide-react";
import Link from "next/link";
import { COUNTRY_OPTIONS } from "../lib/utils/country-options";
import ConfirmModal from "../../components/modals/ConfirmModal";

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  country: string;
  bio: string | null;
}

interface InterviewHistory {
  id: string;
  user_id: string;
  title: string;
  interviewer_name: string;
  status: string;
  created_at: string;
}

interface InterviewTaken {
  id: string;
  interviewer_id: string;
  candidate_name: string;
  title: string;
  status: string;
  created_at: string;
}

interface CodeHistory {
  id: string;
  user_id: string;
  filename: string;
  code: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "account" | "interviews" | "taken" | "code">("profile");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Real database records
  const [interviewHistory, setInterviewHistory] = useState<InterviewHistory[]>([]);
  const [interviewsTaken, setInterviewsTaken] = useState<InterviewTaken[]>([]);
  const [codeHistory, setCodeHistory] = useState<CodeHistory[]>([]);

  // Deletion modal configuration
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Loading & status states
  const [pageLoading, setPageLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password update states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/accounts");
      } else {
        setUser(session.user);
        fetchDashboardData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/accounts");
      } else {
        setUser(session.user);
        fetchDashboardData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchDashboardData = async (userId: string) => {
    try {
      // 1. Fetch profile
      const { data: pData, error: pError } = await supabase
        .from("profiles")
        .select("id, full_name, username, country, bio")
        .eq("id", userId)
        .maybeSingle();

      if (pError) throw pError;

      if (pData) {
        setProfile(pData);
      } else {
        // Create default profile
        const defaultProfile: UserProfile = {
          id: userId,
          full_name: user?.user_metadata?.full_name || "New User",
          username: user?.user_metadata?.username || user?.email?.split("@")[0] || "user",
          country: user?.user_metadata?.country || "United States",
          bio: ""
        };
        setProfile(defaultProfile);
      }

      // 2. Fetch interview history
      const { data: intHistory, error: intError } = await supabase
        .from("interview_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!intError && intHistory) {
        setInterviewHistory(intHistory);
      }

      // 3. Fetch interviews taken
      const { data: intTaken, error: takenError } = await supabase
        .from("interviews_taken")
        .select("*")
        .eq("interviewer_id", userId)
        .order("created_at", { ascending: false });

      if (!takenError && intTaken) {
        setInterviewsTaken(intTaken);
      }

      // 4. Fetch code history
      const { data: codeHist, error: codeError } = await supabase
        .from("code_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!codeError && codeHist) {
        setCodeHistory(codeHist);
      }

    } catch (err: any) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setPageLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setProfileSaving(true);
    setProfileSuccess(false);
    setProfileError(null);

    try {
      // Upsert profile record
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: profile.id,
          full_name: profile.full_name,
          username: profile.username,
          country: profile.country,
          bio: profile.bio
        });

      if (error) throw error;
      setProfileSuccess(true);
    } catch (err: any) {
      setProfileError(err.message || "Could not save profile changes.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    setPasswordSuccess(false);
    setPasswordError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/accounts");
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />
          <span>loading_user_dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-zinc-950 text-zinc-300 flex flex-col font-mono text-xs select-none">
      
      {/* Top Header Row */}
      <header className="h-14 px-6 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>workspace</span>
          </Link>
          <div className="h-4 w-px bg-zinc-900" />
          <span className="text-zinc-200 font-bold uppercase tracking-wider text-[11px]">// user_dashboard</span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-900 hover:bg-rose-950/20 hover:text-rose-400 border border-zinc-800 hover:border-rose-900/30 transition-all text-zinc-400 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>sign_out</span>
        </button>
      </header>

      {/* Workspace Split Body */}
      <div className="flex flex-1 min-h-0">
        
        {/* Left Options Navigation List */}
        <aside className="w-60 border-r border-zinc-900 p-6 flex flex-col gap-1.5 bg-zinc-950 shrink-0">
          <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mb-2">Options</div>
          
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full px-3 py-2.5 rounded text-left flex items-center gap-2 transition-all ${
              activeTab === "profile" 
                ? "bg-zinc-900 text-white font-bold" 
                : "text-zinc-505 hover:bg-zinc-900/50 hover:text-zinc-300"
            }`}
          >
            <UserIcon className="h-4 w-4 shrink-0" />
            <span>User Profile</span>
          </button>

          <button
            onClick={() => setActiveTab("account")}
            className={`w-full px-3 py-2.5 rounded text-left flex items-center gap-2 transition-all ${
              activeTab === "account" 
                ? "bg-zinc-900 text-white font-bold" 
                : "text-zinc-550 hover:bg-zinc-900/50 hover:text-zinc-300"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Account Management</span>
          </button>

          <button
            onClick={() => setActiveTab("interviews")}
            className={`w-full px-3 py-2.5 rounded text-left flex items-center gap-2 transition-all ${
              activeTab === "interviews" 
                ? "bg-zinc-900 text-white font-bold" 
                : "text-zinc-550 hover:bg-zinc-900/50 hover:text-zinc-300"
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Interview History</span>
          </button>

          <button
            onClick={() => setActiveTab("taken")}
            className={`w-full px-3 py-2.5 rounded text-left flex items-center gap-2 transition-all ${
              activeTab === "taken" 
                ? "bg-zinc-900 text-white font-bold" 
                : "text-zinc-550 hover:bg-zinc-900/50 hover:text-zinc-300"
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Interviews Taken</span>
          </button>

          <button
            onClick={() => setActiveTab("code")}
            className={`w-full px-3 py-2.5 rounded text-left flex items-center gap-2 transition-all ${
              activeTab === "code" 
                ? "bg-zinc-900 text-white font-bold" 
                : "text-zinc-550 hover:bg-zinc-900/50 hover:text-zinc-300"
            }`}
          >
            <Code className="h-4 w-4 shrink-0" />
            <span>Code History</span>
          </button>
        </aside>

        {/* Right Tab Content Body */}
        <main className="flex-1 p-10 overflow-y-auto bg-zinc-950 flex justify-center">
          <div className="w-full max-w-2xl flex flex-col gap-6 select-text">
            
            {/* USER PROFILE TAB */}
            {activeTab === "profile" && profile && (
              <div className="flex flex-col gap-6">
                <div className="pb-3 border-b border-zinc-900">
                  <h2 className="text-sm font-bold text-white tracking-wider uppercase">// edit_user_profile</h2>
                  <p className="text-[11px] text-zinc-550 mt-1">Configure profile details and bio information displayed to other interviewers.</p>
                </div>

                <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
                  {profileSuccess && (
                    <div className="border border-emerald-950/30 bg-emerald-950/10 p-4 rounded text-emerald-400 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>Profile changes saved successfully.</span>
                    </div>
                  )}

                  {profileError && (
                    <div className="border border-red-950/30 bg-red-950/10 p-4 rounded text-red-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Username</label>
                    <input
                      type="text"
                      required
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "") })}
                      className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Country Location</label>
                    <select
                      value={profile.country}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 focus:outline-none transition-all cursor-pointer"
                    >
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Bio Information</label>
                    <textarea
                      value={profile.bio || ""}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Write something about your coding experience..."
                      className="w-full h-28 bg-zinc-900 border border-zinc-900 hover:border-zinc-855 focus:border-zinc-800 rounded px-4 py-3 text-zinc-200 placeholder-zinc-700 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="self-start py-2.5 px-4 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 hover:text-white font-bold transition-all flex items-center gap-1.5 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {profileSaving ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ACCOUNT MANAGEMENT TAB */}
            {activeTab === "account" && (
              <div className="flex flex-col gap-6">
                <div className="pb-3 border-b border-zinc-900">
                  <h2 className="text-sm font-bold text-white tracking-wider uppercase">// account_settings</h2>
                  <p className="text-[11px] text-zinc-550 mt-1">Configure workspace passwords and security preferences.</p>
                </div>

                <div className="flex flex-col gap-3 border border-zinc-900 p-4 rounded bg-zinc-950/40">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">User Account Email</span>
                  <span className="text-white font-semibold text-xs">{user?.email}</span>
                  <span className="text-[10px] text-zinc-600">// supabase_auth_id: {user?.id}</span>
                </div>

                <form onSubmit={handleUpdatePassword} className="flex flex-col gap-5 mt-2">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-900 pb-2">Change Password</div>

                  {passwordSuccess && (
                    <div className="border border-emerald-950/30 bg-emerald-950/10 p-4 rounded text-emerald-400 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>Security password changed successfully.</span>
                    </div>
                  )}

                  {passwordError && (
                    <div className="border border-red-950/30 bg-red-950/10 p-4 rounded text-red-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-855 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="self-start py-2.5 px-4 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 hover:text-white font-bold transition-all flex items-center gap-1.5 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {passwordLoading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Key className="h-3.5 w-3.5" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* INTERVIEW HISTORY TAB */}
            {activeTab === "interviews" && (
              <div className="flex flex-col gap-6">
                <div className="pb-3 border-b border-zinc-900">
                  <h2 className="text-sm font-bold text-white tracking-wider uppercase">// interview_history</h2>
                  <p className="text-[11px] text-zinc-550 mt-1">Review real-time collaborative code reviews and past session reports.</p>
                </div>

                <div className="flex flex-col gap-3">
                  {interviewHistory.length === 0 ? (
                    <div className="border border-zinc-900 border-dashed rounded p-8 text-center text-zinc-600">
                      No records found
                    </div>
                  ) : (
                    interviewHistory.map((item) => (
                      <div key={item.id} className="border border-zinc-900 rounded p-4 flex justify-between items-center bg-zinc-900/10">
                        <div>
                          <div className="font-bold text-white text-xs">{item.title}</div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            Date: {new Date(item.created_at).toLocaleDateString()} | Interviewer: {item.interviewer_name}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                          {item.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* INTERVIEWS TAKEN TAB */}
            {activeTab === "taken" && (
              <div className="flex flex-col gap-6">
                <div className="pb-3 border-b border-zinc-900">
                  <h2 className="text-sm font-bold text-white tracking-wider uppercase">// interviews_taken</h2>
                  <p className="text-[11px] text-zinc-550 mt-1">List of sessions conducted by you as the interviewer.</p>
                </div>

                <div className="flex flex-col gap-3">
                  {interviewsTaken.length === 0 ? (
                    <div className="border border-zinc-900 border-dashed rounded p-8 text-center text-zinc-600 font-mono">
                      No records found
                    </div>
                  ) : (
                    interviewsTaken.map((item) => (
                      <div key={item.id} className="border border-zinc-900 rounded p-4 flex justify-between items-center bg-zinc-900/10">
                        <div>
                          <div className="font-bold text-white text-xs">{item.title}</div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            Date: {new Date(item.created_at).toLocaleDateString()} | Candidate: {item.candidate_name}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                          {item.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* CODE HISTORY TAB */}
            {activeTab === "code" && (
              <div className="flex flex-col gap-6">
                <div className="pb-3 border-b border-zinc-900">
                  <h2 className="text-sm font-bold text-white tracking-wider uppercase">// executed_code_history</h2>
                  <p className="text-[11px] text-zinc-550 mt-1">Log files of compilation codes executed against the code-judge microservice.</p>
                </div>

                <div className="flex flex-col gap-3 font-sans">
                  {codeHistory.length === 0 ? (
                    <div className="border border-zinc-900 border-dashed rounded p-8 text-center text-zinc-600 font-mono">
                      No records found
                    </div>
                  ) : (
                    codeHistory.map((item) => (
                      <div key={item.id} className="border border-zinc-900 rounded p-4 bg-zinc-950 flex flex-col gap-2 font-mono text-[11px]">
                        <div className="flex justify-between text-zinc-500 text-[10px] border-b border-zinc-900 pb-1.5 font-sans items-center">
                          <span>
                            File: <strong className="text-zinc-400">{item.filename}</strong> | Executed: {new Date(item.created_at).toLocaleString()}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className={item.status.toLowerCase().includes("error") ? "text-rose-500" : "text-emerald-500"}>
                              {item.status}
                            </span>
                            <button
                              onClick={() => {
                                setIdToDelete(item.id);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-zinc-600 hover:text-rose-500 transition-colors p-1 rounded hover:bg-rose-950/20 cursor-pointer"
                              title="Delete log"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <pre className="text-zinc-300 overflow-x-auto whitespace-pre p-2 rounded bg-zinc-900/50">
                          {item.code}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </main>

      </div>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setIdToDelete(null);
        }}
        title="Delete Code Log"
        message="Are you sure you want to delete this code execution log? This action cannot be undone."
        onConfirm={async () => {
          if (!idToDelete) return;
          try {
            const { error } = await supabase
              .from("code_history")
              .delete()
              .eq("id", idToDelete);

            if (error) throw error;
            setCodeHistory(prev => prev.filter((item) => item.id !== idToDelete));
          } catch (err) {
            console.error("Error deleting code log:", err);
          } finally {
            setIdToDelete(null);
            setDeleteConfirmOpen(false);
          }
        }}
        confirmLabel="Delete"
        getThemeClass={(light: string, dark: string) => dark}
      />
    </div>
  );
}
