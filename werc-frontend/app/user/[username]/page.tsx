"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../config/supabase";
import { useTheme } from "../../context/ThemeContext";
import { ArrowLeft, MapPin, Award, CheckCircle, RefreshCw, AlertCircle, Calendar } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  country: string;
  bio: string | null;
  avatar_url?: string | null;
}

interface InterviewHistory {
  id: string;
  status: string;
}

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const router = useRouter();
  const { theme } = useTheme();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interviewsTakenCount, setInterviewsTakenCount] = useState<number>(0);
  const [acceptanceRate, setAcceptanceRate] = useState<{ percentage: number | null; total: number; accepted: number }>({
    percentage: null,
    total: 0,
    accepted: 0
  });

  const getThemeClass = (light: string, dark: string) => {
    return theme === "light" ? light : dark;
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch profile details by username
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .select("id, full_name, username, country, bio, avatar_url")
          .eq("username", username)
          .single();

        if (profileErr || !profileData) {
          setError("User not found.");
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // 2. Fetch interviews taken count (Interviews hosted by this user)
        const { count: takenCount, error: takenErr } = await supabase
          .from("interviews_taken")
          .select("id", { count: "exact", head: true })
          .eq("interviewer_id", profileData.id);

        if (!takenErr && takenCount !== null) {
          setInterviewsTakenCount(takenCount);
        }

        // 3. Fetch interview history status only to compute acceptance percentage (as a candidate)
        const { data: historyData, error: historyErr } = await supabase
          .from("interview_history")
          .select("id, status")
          .eq("user_id", profileData.id);

        if (!historyErr && historyData) {
          const total = historyData.length;
          const accepted = historyData.filter((item: InterviewHistory) => item.status === "Accepted").length;
          const percentage = total > 0 ? Math.round((accepted / total) * 100) : null;
          
          setAcceptanceRate({
            percentage,
            total,
            accepted
          });
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
        setError("An error occurred loading the profile.");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserProfile();
    }
  }, [username]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-mono text-xs transition-colors duration-250 ${
        getThemeClass("bg-zinc-50 text-zinc-600", "bg-zinc-950 text-zinc-400")
      }`}>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />
          <span>loading_profile...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative font-mono text-xs transition-colors duration-250 ${
        getThemeClass("bg-zinc-50 text-zinc-650", "bg-zinc-950 text-zinc-400")
      }`}>
        <Link
          href="/"
          className={`absolute top-6 left-6 flex items-center gap-2 transition-colors ${
            getThemeClass("text-zinc-550 hover:text-zinc-900", "text-zinc-500 hover:text-zinc-300")
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>back_to_workspace</span>
        </Link>

        <div className={`w-full max-w-md p-6 border rounded text-center flex flex-col items-center gap-3 ${
          getThemeClass("bg-white border-zinc-200", "bg-zinc-900/10 border-zinc-900")
        }`}>
          <AlertCircle className="h-8 w-8 text-rose-500" />
          <h2 className={`text-sm font-bold uppercase tracking-wider ${getThemeClass("text-zinc-900", "text-white")}`}>
            {error || "Profile Error"}
          </h2>
          <p className="text-zinc-500 leading-relaxed">
            The requested username does not exist or has not initialized their profile yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 relative font-mono text-xs select-none transition-colors duration-250 ${
      getThemeClass("bg-zinc-50 text-zinc-650", "bg-zinc-950 text-zinc-300")
    }`}>
      
      {/* Top Left Navigation Link */}
      <Link
        href="/"
        className={`absolute top-6 left-6 flex items-center gap-2 transition-colors ${
          getThemeClass("text-zinc-550 hover:text-zinc-950", "text-zinc-500 hover:text-zinc-300")
        }`}
      >
        <ArrowLeft className="h-4 w-4" />
        <span>back_to_workspace</span>
      </Link>

      {/* Profile Card Wrapper */}
      <div className={`w-full max-w-md border p-6 flex flex-col gap-6 rounded-lg shadow-sm transition-colors duration-250 ${
        getThemeClass("bg-white border-zinc-200", "bg-zinc-900/10 border-zinc-900")
      }`}>
        
        {/* Profile Card Header Info */}
        <div className="flex flex-col items-center text-center gap-4">
          
          {/* User Large Avatar Display */}
          <div className={`h-24 w-24 rounded-full flex items-center justify-center overflow-hidden border shrink-0 bg-zinc-950 relative ${
            getThemeClass("border-zinc-200 shadow-sm", "border-zinc-800")
          }`}>
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name} 
                className="h-full w-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className={`font-bold text-3xl uppercase ${getThemeClass("text-zinc-600", "text-zinc-500")}`}>
                {profile.full_name?.[0] || profile.username?.[0] || "?"}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <h1 className={`text-base font-bold tracking-tight uppercase ${getThemeClass("text-zinc-900", "text-white")}`}>
              {profile.full_name}
            </h1>
            <span className="text-[10px] text-indigo-500 font-semibold tracking-wider">
              @{profile.username}
            </span>
          </div>

          {/* User Location indicator */}
          {profile.country && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] uppercase font-bold tracking-wider ${
              getThemeClass("bg-zinc-100 border-zinc-200 text-zinc-600", "bg-zinc-900 border-zinc-850 text-zinc-500")
            }`}>
              <MapPin className="h-3 w-3 text-zinc-450" />
              <span>{profile.country}</span>
            </div>
          )}
        </div>

        {/* Dynamic Bio Paragraph Block */}
        {profile.bio ? (
          <div className={`p-4 border rounded font-sans leading-relaxed text-xs ${
            getThemeClass("bg-zinc-50/50 border-zinc-200 text-zinc-700", "bg-zinc-900/20 border-zinc-900 text-zinc-400")
          }`}>
            {profile.bio}
          </div>
        ) : (
          <div className={`p-4 border rounded border-dashed text-center font-mono leading-relaxed text-[11px] ${
            getThemeClass("bg-zinc-50/20 border-zinc-200 text-zinc-400", "bg-zinc-900/10 border-zinc-900/50 text-zinc-600")
          }`}>
            // bio_not_configured
          </div>
        )}

        {/* Dynamic Metrics Section */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Acceptance Score / Metric Section */}
          <div className={`border p-4 rounded flex flex-col gap-2.5 ${
            getThemeClass("border-zinc-200 bg-zinc-50/30", "border-zinc-900 bg-zinc-900/5")
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Acceptance</span>
              <Award className="h-3.5 w-3.5 text-indigo-500" />
            </div>

            <div className="flex flex-col gap-0.5">
              <span className={`text-xl font-bold tracking-tight ${getThemeClass("text-zinc-900", "text-white")}`}>
                {acceptanceRate.percentage !== null ? `${acceptanceRate.percentage}%` : "N/A"}
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">
                {acceptanceRate.total} {acceptanceRate.total === 1 ? "interview" : "interviews"} candidate
              </span>
            </div>
          </div>

          {/* Interviews Taken (Hosted) Metric Section */}
          <div className={`border p-4 rounded flex flex-col gap-2.5 ${
            getThemeClass("border-zinc-200 bg-zinc-50/30", "border-zinc-900 bg-zinc-900/5")
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Sessions Hosted</span>
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
            </div>

            <div className="flex flex-col gap-0.5">
              <span className={`text-xl font-bold tracking-tight ${getThemeClass("text-zinc-900", "text-white")}`}>
                {interviewsTakenCount}
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">
                interviews taken as host
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
