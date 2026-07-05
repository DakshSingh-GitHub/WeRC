"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { ArrowLeft, Search, ChevronLeft, ChevronRight, User as UserIcon, RefreshCw, MapPin } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  country: string | null;
  bio: string | null;
}

const ITEMS_PER_PAGE = 20;

export default function DiscoverPage() {
  const router = useRouter();
  const { theme } = useTheme();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const getThemeClass = (light: string, dark: string) => {
    return theme === "light" ? light : dark;
  };

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let query = supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, country, bio", { count: "exact" });

        if (searchQuery.trim()) {
          query = query.or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
        }

        const { data, count, error } = await query
          .order("full_name", { ascending: true })
          .range(from, to);

        if (error) throw error;

        setProfiles(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error("Error fetching profiles:", err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchProfiles();
    }, searchQuery ? 300 : 0);

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchQuery]);

  // Reset to page 1 on new search query
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className={`min-h-screen w-full flex flex-col font-mono text-xs select-none transition-colors duration-250 ${
      getThemeClass("bg-zinc-50 text-zinc-650", "bg-zinc-950 text-zinc-300")
    }`}>
      
      {/* Header bar */}
      <header className={`h-14 px-4 sm:px-6 border-b flex items-center justify-between transition-colors duration-250 ${
        getThemeClass("border-zinc-200 bg-white", "border-zinc-900 bg-zinc-950")
      }`}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-2 transition-colors cursor-pointer bg-transparent border-none p-0 focus:outline-none shrink-0 ${
              getThemeClass("text-zinc-500 hover:text-zinc-800", "text-zinc-500 hover:text-zinc-300")
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">back</span>
          </button>
          <div className={`h-4 w-px shrink-0 ${getThemeClass("bg-zinc-200", "bg-zinc-900")}`} />
          <span className={`font-bold uppercase tracking-wider text-[10px] sm:text-[11px] truncate ${getThemeClass("text-zinc-800", "text-zinc-200")}`}>// discover_developers</span>
        </div>
      </header>

      {/* Main body area */}
      <main className="flex-1 p-6 sm:p-10 flex flex-col items-center select-text">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          
          {/* Page intro & search bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-zinc-800">
            <div className="flex flex-col gap-1 select-none">
              <h2 className={`text-sm font-bold uppercase tracking-wider ${getThemeClass("text-zinc-900", "text-white")}`}>// active_directory</h2>
              <p className="text-[10px] text-zinc-500">Discover and view profiles of developer participants on the WeRC network.</p>
            </div>
            
            {/* Search Input Box */}
            <div className="relative w-full sm:w-72 flex items-center">
              <Search className="absolute left-3 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="search by name or username..."
                value={searchQuery}
                onChange={handleSearchChange}
                className={`w-full pl-9 pr-4 py-2 border rounded focus:outline-none transition-all ${
                  getThemeClass("bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-zinc-400", "bg-zinc-900 border-zinc-850 text-zinc-200 placeholder-zinc-700 focus:border-zinc-700")
                }`}
              />
            </div>
          </div>

          {/* User grid listing */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-zinc-500" />
              <span className="text-[10px] text-zinc-500">searching_directory...</span>
            </div>
          ) : profiles.length === 0 ? (
            <div className={`py-20 border border-dashed rounded text-center text-zinc-500 ${
              getThemeClass("border-zinc-200 bg-zinc-50/50", "border-zinc-900 bg-zinc-900/5")
            }`}>
              // no_developers_found
            </div>
          ) : (
            <div className={`flex flex-col rounded-lg border divide-y overflow-hidden shadow-sm transition-colors duration-250 ${
              getThemeClass("border-zinc-200 divide-zinc-200 bg-white", "border-zinc-900 divide-zinc-900 bg-zinc-900/10")
            }`}>
              {profiles.map((p) => (
                <Link
                  key={p.id}
                  href={`/user/${p.username}`}
                  className={`p-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-zinc-100/50 ${
                    getThemeClass("text-zinc-700 hover:bg-zinc-50/50", "text-zinc-300 hover:bg-zinc-900/30")
                  }`}
                >
                  {/* Left Column: Avatar + Names */}
                  <div className="flex items-center gap-3.5 min-w-0 max-w-[75%] sm:max-w-[40%]">
                    {/* User Avatar */}
                    <div className={`h-8 w-8 rounded-full overflow-hidden border shrink-0 bg-zinc-950 flex items-center justify-center ${
                      getThemeClass("border-zinc-200", "border-zinc-800")
                    }`}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.full_name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className={`h-4 w-4 ${getThemeClass("text-zinc-400", "text-zinc-650")}`} />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`font-bold truncate text-xs uppercase ${getThemeClass("text-zinc-850", "text-white")}`}>{p.full_name}</span>
                      <span className="text-[9px] text-indigo-500 font-semibold truncate mt-0.5">@{p.username}</span>
                    </div>
                  </div>

                  {/* Middle Column: Bio snippet */}
                  <div className="flex-1 min-w-0 hidden sm:block">
                    <p className={`text-[10px] truncate font-sans ${getThemeClass("text-zinc-500", "text-zinc-500")}`}>
                      {p.bio || "No biography provided."}
                    </p>
                  </div>

                  {/* Right Column: Location */}
                  <div className="shrink-0 flex items-center justify-end">
                    {p.country ? (
                      <div className={`flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider ${getThemeClass("text-zinc-500", "text-zinc-500")}`}>
                        <MapPin className="h-2.5 w-2.5 text-zinc-400" />
                        <span>{p.country}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-zinc-600">// n/a</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Dynamic pagination bar */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4 select-none">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className={`p-1.5 rounded border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  getThemeClass("bg-white border-zinc-200 hover:bg-zinc-100 text-zinc-700", "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300")
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="text-[10px] text-zinc-500 font-bold">
                PAGE {currentPage} OF {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className={`p-1.5 rounded border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  getThemeClass("bg-white border-zinc-200 hover:bg-zinc-100 text-zinc-700", "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300")
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
