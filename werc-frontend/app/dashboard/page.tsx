"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../config/supabase";
import { 
  ArrowLeft, User as UserIcon, Settings, Calendar, Code, Save, Key, LogOut, CheckCircle, AlertCircle, RefreshCw, Sparkles, Trash2, Camera, Upload, RotateCcw, ChevronDown
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
  avatar_url?: string | null;
  username_changed?: boolean;
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
  notes?: string;
}

interface CodeHistory {
  id: string;
  user_id: string;
  filename: string;
  code: string;
  status: string;
  created_at: string;
}

const compressImage = (file: File, maxWidth = 300, maxHeight = 300, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context creation failed"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob conversion failed"));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "account" | "interviews" | "taken" | "code">("profile");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Helper to extract google identity
  const getGoogleAvatarUrl = () => {
    if (!user) return null;
    const googleIdentity = user.identities?.find((id: any) => id.provider === "google");
    return googleIdentity?.identity_data?.avatar_url || googleIdentity?.identity_data?.picture || null;
  };

  const isGoogleUser = user?.app_metadata?.provider === "google" || 
    user?.app_metadata?.providers?.includes("google") || 
    user?.identities?.some((id: any) => id.provider === "google");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user || !profile) return;

    setAvatarUploading(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const file = e.target.files[0];
      const compressedBlob = await compressImage(file);
      const filePath = `public/${user.id}/avatar.jpg`;

      // Upload/replace file in the bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressedBlob, {
          contentType: "image/jpeg",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Update Database profiles table
      if (profile.hasOwnProperty("avatar_url")) {
        const { error: dbError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", user.id);
        if (dbError) console.warn("Failed to update database profile avatar_url:", dbError);
      }

      // Update state
      setProfile({
        ...profile,
        avatar_url: publicUrl
      });

      // Update User Metadata in Auth
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      setProfileSuccess(true);
    } catch (err: any) {
      setProfileError(err.message || "Failed to upload avatar image.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!user || !profile) return;

    setAvatarUploading(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const filePath = `public/${user.id}/avatar.jpg`;

      // Attempt to delete from Storage (might fail if file not present, ignore if so)
      await supabase.storage.from("avatars").remove([filePath]);

      // Update Database profiles table
      if (profile.hasOwnProperty("avatar_url")) {
        const { error: dbError } = await supabase
          .from("profiles")
          .update({ avatar_url: null })
          .eq("id", user.id);
        if (dbError) console.warn("Failed to update database profile avatar_url:", dbError);
      }

      // Update state to null
      setProfile({
        ...profile,
        avatar_url: null
      });

      // Update user auth metadata
      await supabase.auth.updateUser({
        data: { avatar_url: null }
      });

      setProfileSuccess(true);
    } catch (err: any) {
      setProfileError(err.message || "Failed to delete avatar image.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarResetToGoogle = async () => {
    if (!user || !profile) return;

    const googleAvatar = getGoogleAvatarUrl();
    if (!googleAvatar) {
      setProfileError("No default Google profile picture found.");
      return;
    }

    setAvatarUploading(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      // Update Database profiles table
      if (profile.hasOwnProperty("avatar_url")) {
        const { error: dbError } = await supabase
          .from("profiles")
          .update({ avatar_url: googleAvatar })
          .eq("id", user.id);
        if (dbError) console.warn("Failed to update database profile avatar_url:", dbError);
      }

      setProfile({
        ...profile,
        avatar_url: googleAvatar
      });

      // Update user auth metadata
      await supabase.auth.updateUser({
        data: { avatar_url: googleAvatar }
      });

      setProfileSuccess(true);
    } catch (err: any) {
      setProfileError(err.message || "Failed to reset to Google avatar.");
    } finally {
      setAvatarUploading(false);
    }
  };
  
  // Real database records
  const [interviewHistory, setInterviewHistory] = useState<InterviewHistory[]>([]);
  const [interviewsTaken, setInterviewsTaken] = useState<InterviewTaken[]>([]);
  const [codeHistory, setCodeHistory] = useState<CodeHistory[]>([]);

  // Deletion modal configuration
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Country Dropdown configuration
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        showCountryDropdown &&
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(e.target as Node)
      ) {
        setShowCountryDropdown(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showCountryDropdown]);

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
        
        // Try to load from cache
        const cacheKey = `werc_dashboard_cache_${session.user.id}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.profile) setProfile(parsed.profile);
            if (parsed.interviewHistory) setInterviewHistory(parsed.interviewHistory);
            if (parsed.interviewsTaken) setInterviewsTaken(parsed.interviewsTaken);
            if (parsed.codeHistory) setCodeHistory(parsed.codeHistory);
            setPageLoading(false); // Disable loading bar immediately!
          } catch (e) {
            console.error("Failed to parse dashboard cache", e);
          }
        }
        
        fetchDashboardData(session.user.id, session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push("/accounts");
      } else {
        setUser(session.user);
        if (event !== "USER_UPDATED") {
          fetchDashboardData(session.user.id, session.user);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      // Clean up realtime channel if set up
    };
  }, [router]);

  // Realtime subscription: auto-update interview_history if host patches a row live
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`interview_history_${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "interview_history", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setInterviewHistory(prev =>
            prev.map(row => row.id === payload.new.id ? { ...row, ...payload.new } : row)
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchDashboardData = async (userId: string, activeUser?: any) => {
    try {
      const currentUser = activeUser || user;
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        try {
          await fetch("/api/interview-history/reconcile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`
            }
          });
        } catch (reconcileErr) {
          console.warn("Failed to reconcile interview history rows:", reconcileErr);
        }
      }

      // 1. Fetch profile
      let pData: any = null;
      let pError = null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, country, bio, avatar_url, username_changed")
        .eq("id", userId)
        .maybeSingle();

      pData = data;
      pError = error;

      if (pError && pError.message.includes("column")) {
        // Fall back if column doesn't exist
        const fallback = await supabase
          .from("profiles")
          .select("id, full_name, username, country, bio, avatar_url")
          .eq("id", userId)
          .maybeSingle();
        if (fallback.error && fallback.error.message.includes("column")) {
          const fallbackDouble = await supabase
            .from("profiles")
            .select("id, full_name, username, country, bio")
            .eq("id", userId)
            .maybeSingle();
          pData = fallbackDouble.data;
          pError = fallbackDouble.error;
        } else {
          pData = fallback.data;
          pError = fallback.error;
        }
      }

      if (pError) throw pError;

      let currentProfile = pData;
      if (!currentProfile) {
        // Create default profile
        currentProfile = {
          id: userId,
          full_name: currentUser?.user_metadata?.full_name || "New User",
          username: currentUser?.user_metadata?.username?.replace(/\./g, "_") || currentUser?.email?.split("@")[0]?.replace(/\./g, "_") || "user",
          country: currentUser?.user_metadata?.country || "United States",
          bio: "",
          avatar_url: currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null,
          username_changed: false
        };
      } else {
        if (!currentProfile.hasOwnProperty("avatar_url")) {
          currentProfile.avatar_url = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null;
        } else if (!currentProfile.avatar_url) {
          currentProfile.avatar_url = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null;
        }
        
        if (!currentProfile.hasOwnProperty("username_changed")) {
          currentProfile.username_changed = false;
        }
      }
      setProfile(currentProfile);

      // 2. Fetch interview history
      const { data: intHistory, error: intError } = await supabase
        .from("interview_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const finalIntHistory = (!intError && intHistory) ? intHistory : [];
      let resolvedInterviewHistory = finalIntHistory;

      resolvedInterviewHistory = finalIntHistory;
      setInterviewHistory(finalIntHistory);

      // 3. Fetch interviews taken
      const { data: intTaken, error: takenError } = await supabase
        .from("interviews_taken")
        .select("*")
        .eq("interviewer_id", userId)
        .order("created_at", { ascending: false });

      const finalIntTaken = (!takenError && intTaken) ? intTaken : [];
      setInterviewsTaken(finalIntTaken);

      // 4. Fetch code history
      const { data: codeHist, error: codeError } = await supabase
        .from("code_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const finalCodeHist = (!codeError && codeHist) ? codeHist : [];
      setCodeHistory(finalCodeHist);

      // Write to localStorage cache
      const cacheData = {
        profile: currentProfile,
        interviewHistory: resolvedInterviewHistory,
        interviewsTaken: finalIntTaken,
        codeHistory: finalCodeHist
      };
      localStorage.setItem(`werc_dashboard_cache_${userId}`, JSON.stringify(cacheData));

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
      // Update user metadata in Auth so the header and other sessions display the new profile image and username
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          avatar_url: profile.avatar_url,
          display_name: profile.username
        }
      });
      if (metaError) console.warn("Failed to update auth user metadata:", metaError);

      // Update existing profile record (user row always exists after signup)
      const updatePayload: any = {
        full_name: profile.full_name,
        country: profile.country,
        bio: profile.bio
      };
      if (profile.hasOwnProperty("avatar_url")) {
        updatePayload.avatar_url = profile.avatar_url;
      }

      const cacheKey = `werc_dashboard_cache_${profile.id}`;
      const cached = localStorage.getItem(cacheKey);
      let originalProfile: any = null;
      if (cached) {
        try {
          originalProfile = JSON.parse(cached).profile;
        } catch (e) {
          console.error(e);
        }
      }

      // Check if username was updated (only allowed once for Google users)
      if (isGoogleUser && !originalProfile?.username_changed && profile.username !== originalProfile?.username) {
        updatePayload.username = profile.username;
        if (profile.hasOwnProperty("username_changed")) {
          updatePayload.username_changed = true;
          setProfile(prev => prev ? { ...prev, username_changed: true } : null);
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", profile.id);

      if (error) {
        // If it failed because of missing column, retry without it
        if (error.message.includes("column") || error.message.includes("username_changed")) {
          delete updatePayload.avatar_url;
          delete updatePayload.username_changed;
          // Retain updatePayload.username so the username is successfully saved!
          const { error: fallbackError } = await supabase
            .from("profiles")
            .update(updatePayload)
            .eq("id", profile.id);
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }
      setProfileSuccess(true);

      // Update cache
      const latestCached = localStorage.getItem(cacheKey);
      if (latestCached) {
        const parsed = JSON.parse(latestCached);
        parsed.profile = profile;
        localStorage.setItem(cacheKey, JSON.stringify(parsed));
      }
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
    if (user) {
      localStorage.removeItem(`werc_dashboard_cache_${user.id}`);
    }
    await supabase.auth.signOut({ scope: "local" });
    router.push("/accounts");
  };

  const handleVerdictUpdate = async (id: string, itemTitle: string, verdict: "Accepted" | "Rejected") => {
    try {
      const { error: error1 } = await supabase
        .from("interviews_taken")
        .update({ status: verdict })
        .eq("id", id);

      if (error1) throw error1;

      let updatedTaken: InterviewTaken[] = [];
      setInterviewsTaken(prev => {
        const next = prev.map(item => (item.id === id ? { ...item, status: verdict } : item));
        updatedTaken = next;
        return next;
      });

      const roomCodeMatch = itemTitle.match(/\((WERC-[A-Z0-9]+)\)/);
      if (roomCodeMatch) {
        const code = roomCodeMatch[1];
        const response = await fetch("/api/verdict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode: code, verdict }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || "Failed to sync verdict to candidate history.");
        }
      }

      // Update cache
      if (user) {
        const cacheKey = `werc_dashboard_cache_${user.id}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.interviewsTaken = updatedTaken;
          localStorage.setItem(cacheKey, JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.error("Failed to update candidate verdict:", err);
    }
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
    <div className="h-screen w-full overflow-hidden bg-zinc-950 text-zinc-300 flex flex-col font-mono text-xs select-none text-left">
      
      {/* Top Header Row */}
      <header className="h-14 px-6 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer bg-transparent border-none p-0 focus:outline-none"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>workspace</span>
          </button>
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
        <aside className="w-60 border-r border-zinc-900 p-6 flex flex-col gap-1.5 bg-zinc-950 shrink-0 overflow-y-auto">
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

                  {/* Profile Picture Display and Customization */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 p-4 border border-zinc-900 bg-zinc-900/10 rounded">
                    <div className="relative h-20 w-20 rounded-full flex items-center justify-center overflow-hidden border border-zinc-800 bg-zinc-950 shrink-0">
                      {avatarUploading ? (
                        <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center z-10">
                          <RefreshCw className="h-5 w-5 animate-spin text-zinc-550" />
                        </div>
                      ) : null}
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt="Avatar Preview" 
                          className="h-full w-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="font-bold text-2xl uppercase text-zinc-500">
                          {profile.full_name?.[0] || user?.email?.[0] || "U"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col gap-2 w-full">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Profile Picture Source</label>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {/* File Upload Button */}
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white font-bold transition-all text-xs cursor-pointer select-none disabled:opacity-50">
                          <Upload className="h-3.5 w-3.5" />
                          <span>Upload File</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleAvatarUpload}
                            className="hidden" 
                            disabled={avatarUploading}
                          />
                        </label>

                        {/* Reset to Google (only for Google accounts) */}
                        {isGoogleUser && (
                          <button
                            type="button"
                            onClick={handleAvatarResetToGoogle}
                            disabled={avatarUploading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white font-bold transition-all text-xs cursor-pointer select-none disabled:opacity-50"
                            title="Reset to Google Profile Picture"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Reset to Google</span>
                          </button>
                        )}

                        {/* Delete Picture Button */}
                        {profile.avatar_url && (
                          <button
                            type="button"
                            onClick={handleAvatarDelete}
                            disabled={avatarUploading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/30 text-rose-450 hover:text-rose-400 font-bold transition-all text-xs cursor-pointer select-none disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove Picture</span>
                          </button>
                        )}
                      </div>
                      
                      <p className="text-[9px] text-zinc-650 leading-relaxed mt-1 font-mono">
                        {isGoogleUser 
                          ? "// customizable custom upload, reset to google provider default, or remove entirely" 
                          : "// images are scaled and compressed before uploading as profile image"
                        }
                      </p>
                    </div>
                  </div>

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
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Username</label>
                      <span className="text-[9px] text-zinc-650 font-mono">
                        {isGoogleUser && !profile.username_changed 
                          ? "// customizable once for Google users" 
                          : "// non-editable"
                        }
                      </span>
                    </div>
                    {isGoogleUser && !profile.username_changed ? (
                      <input
                        type="text"
                        required
                        value={profile.username}
                        onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "") })}
                        className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-4 py-2.5 text-zinc-200 placeholder-zinc-750 focus:outline-none transition-all"
                      />
                    ) : (
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={profile.username}
                        className="w-full bg-zinc-900/40 border border-zinc-900 rounded px-4 py-2.5 text-zinc-500 cursor-not-allowed select-none focus:outline-none"
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 relative" ref={countryDropdownRef}>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Country Location</label>
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-800 focus:border-zinc-700 rounded px-4 py-2.5 text-zinc-200 flex items-center justify-between transition-all cursor-pointer text-left focus:outline-none"
                    >
                      <span>{profile.country || "Select Country"}</span>
                      <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${showCountryDropdown ? "rotate-180" : ""}`} />
                    </button>

                    {showCountryDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-[100] max-h-48 overflow-y-auto rounded bg-zinc-900 border border-zinc-800 shadow-2xl py-1 font-mono text-[11px]">
                        {COUNTRY_OPTIONS.map((c) => (
                          <div
                            key={c}
                            onClick={() => {
                              setProfile({ ...profile, country: c });
                              setShowCountryDropdown(false);
                            }}
                            className={`px-4 py-2 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer flex items-center justify-between ${
                              profile.country === c ? "bg-zinc-850 text-white font-bold" : "text-zinc-400"
                            }`}
                          >
                            <span>{c}</span>
                            {profile.country === c && <span className="text-indigo-400">✓</span>}
                          </div>
                        ))}
                      </div>
                    )}
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
                      <div key={item.id} className="border border-zinc-900 rounded p-4 flex flex-col gap-3 bg-zinc-900/10">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-white text-xs">{item.title}</div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                              Date: {new Date(item.created_at).toLocaleDateString()} | Candidate: {item.candidate_name}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {item.status === "Pending" && (
                              <div className="flex items-center gap-1.5 shrink-0 select-none">
                                <button
                                  onClick={() => handleVerdictUpdate(item.id, item.title, "Accepted")}
                                  className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-white transition-all text-[9px] font-bold uppercase cursor-pointer"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleVerdictUpdate(item.id, item.title, "Rejected")}
                                  className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-450 hover:bg-rose-500/20 hover:text-white transition-all text-[9px] font-bold uppercase cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              item.status === "Accepted"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : item.status === "Rejected"
                                ? "bg-rose-500/10 text-rose-450 border-rose-500/20"
                                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        </div>

                        {item.notes && (
                          <div className="text-[10px] text-zinc-400 border-t border-zinc-900/50 pt-2 font-sans leading-relaxed">
                            <span className="font-bold text-zinc-500 select-none uppercase text-[8px] tracking-wide block mb-0.5">Interviewer Notes</span>
                            <span className="italic">"{item.notes}"</span>
                          </div>
                        )}
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
