"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Cpu, Info } from "lucide-react";
import { runCode, JUDGE_API_BASE_URL, RunCodeResponse, CodeFile } from "../config/api";

import Header from "../../components/home/Header";
import SidebarTabs from "../../components/home/SidebarTabs";
import SidebarDrawer from "../../components/home/SidebarDrawer";
import ConsoleDrawer from "../../components/home/ConsoleDrawer";
import ContextMenu from "../../components/home/ContextMenu";
import BaseModal from "../../components/modals/BaseModal";
import AlertModal from "../../components/modals/AlertModal";
import PromptModal from "../../components/modals/PromptModal";
import ConfirmModal from "../../components/modals/ConfirmModal";
import InterviewModal from "../../components/modals/InterviewModal";
import { supabase } from "../config/supabase";
import { User } from "@supabase/supabase-js";

const INITIAL_FOLDERS: string[] = [];
const INITIAL_FILES: CodeFile[] = [
  {
    path: "main.py",
    content: `# Write your code here
print("Hello, World!")
`
  }
];

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetPath: string;
  isFolder: boolean;
}

export default function Home() {
  // Theme & Font Settings
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [language, setLanguage] = useState<string>("python");
  const [fontSize, setFontSize] = useState<number>(14);
  const [uiScale, setUiScale] = useState<"sm" | "md" | "lg">("md");

  // Authentication State
  const [user, setUser] = useState<User | null>(null);

  // Live Interview States
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isHostingModalOpen, setIsHostingModalOpen] = useState(false);
  const [verdictModalOpen, setVerdictModalOpen] = useState(false);
  const isUpdatingFromRemoteRef = useRef(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen to changes in auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Multi-file Workspace States
  const [files, setFiles] = useState<CodeFile[]>(INITIAL_FILES);
  const [folders, setFolders] = useState<string[]>(INITIAL_FOLDERS);
  const [activeFilePath, setActiveFilePath] = useState<string>("main.py");
  const [entrypoint, setEntrypoint] = useState<string>("main.py");
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Input creation modes
  const [createTargetDir, setCreateTargetDir] = useState<string>("");
  const [newFileName, setNewFileName] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState<string>("");

  // Rename states
  const [renamePath, setRenamePath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [isRenamingFolder, setIsRenamingFolder] = useState<boolean>(false);

  const [inputData, setInputData] = useState("Developer");

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<RunCodeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Layout & Sidebar States
  const [activeSidebarTab, setActiveSidebarTab] = useState<"files" | "settings" | "notes">("files");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState<boolean>(false);

  const [activeConsoleTab, setActiveConsoleTab] = useState<"output" | "input">("output");
  const [drawerHeight, setDrawerHeight] = useState(260);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const [interviewerNotes, setInterviewerNotes] = useState<string>("");

  // Reusable Modal States
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type?: "info" | "success" | "error" }>({
    isOpen: false,
    title: "",
    message: "",
    type: "error"
  });

  const [promptConfig, setPromptConfig] = useState<{ isOpen: boolean; title: string; placeholder: string; defaultValue: string; onSubmit: (val: string) => void }>({
    isOpen: false,
    title: "",
    placeholder: "",
    defaultValue: "",
    onSubmit: () => { }
  });

  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { }
  });

  const triggerAlert = (title: string, message: string, type?: "info" | "success" | "error") => {
    setAlertConfig({ isOpen: true, title, message, type });
  };

  const triggerPrompt = (title: string, placeholder: string, defaultValue: string, onSubmit: (val: string) => void) => {
    setPromptConfig({ isOpen: true, title, placeholder, defaultValue, onSubmit });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm });
  };

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetPath: "",
    isFolder: false
  });

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on external click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Sidebar drag resizer handling
  const startDraggingSidebar = (e: React.MouseEvent) => {
    setIsDraggingSidebar(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDraggingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX - 48; // offset the slim w-12 bar
      if (newWidth > 180 && newWidth < 450) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSidebar(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSidebar]);

  // Drawer resize event handling
  const startDraggingDrawer = (e: React.MouseEvent) => {
    setIsDraggingDrawer(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDraggingDrawer) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 60 && newHeight < window.innerHeight * 0.7) {
        setDrawerHeight(newHeight);
        if (isDrawerCollapsed) {
          setIsDrawerCollapsed(false);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingDrawer(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingDrawer, isDrawerCollapsed]);

  // Active file content management
  const activeFile = files.find(f => f.path === activeFilePath) || files[0] || { path: "", content: "" };

  const updateActiveFileContent = (newContent: string) => {
    setFiles(prev =>
      prev.map(f => (f.path === activeFilePath ? { ...f, content: newContent } : f))
    );
  };

  // Create file
  const handleCreateFile = (targetDir: string, name: string) => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    const fullPath = targetDir ? `${targetDir}/${cleanName}` : cleanName;

    if (files.some(f => f.path.toLowerCase() === fullPath.toLowerCase())) {
      triggerAlert("Workspace File Error", "File name already exists!");
      return;
    }

    const newFile: CodeFile = {
      path: fullPath,
      content: `# Python file: ${cleanName}\n`
    };

    setFiles(prev => [...prev, newFile]);
    setActiveFilePath(newFile.path);
    setNewFileName("");
    setCreateTargetDir("");
  };

  // Create folder
  const handleCreateFolder = (targetDir: string, name: string) => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    const fullPath = targetDir ? `${targetDir}/${cleanName}` : cleanName;

    if (folders.some(f => f.toLowerCase() === fullPath.toLowerCase())) {
      triggerAlert("Workspace Directory Error", "Folder already exists!");
      return;
    }

    setFolders(prev => [...prev, fullPath]);
    setNewFolderName("");
    setCreateTargetDir("");
  };

  // Delete file
  const handleDeleteFile = (pathToDelete: string) => {
    if (files.length <= 1) {
      triggerAlert("Workspace File Error", "You must keep at least one file in the workspace.");
      return;
    }
    if (pathToDelete === entrypoint) {
      triggerAlert("Workspace File Error", "Cannot delete the entrypoint file. Set another file as entrypoint first.");
      return;
    }

    setFiles(prev => prev.filter(f => f.path !== pathToDelete));
    if (activeFilePath === pathToDelete) {
      const remaining = files.filter(f => f.path !== pathToDelete);
      setActiveFilePath(remaining[0].path);
    }
  };

  // Delete folder
  const handleDeleteFolder = (folderPathToDelete: string) => {
    setFolders(prev => prev.filter(f => f !== folderPathToDelete && !f.startsWith(folderPathToDelete + "/")));

    const filesToDelete = files.filter(f => f.path === folderPathToDelete || f.path.startsWith(folderPathToDelete + "/"));
    if (filesToDelete.some(f => f.path === entrypoint)) {
      triggerAlert("Workspace Directory Error", "Cannot delete this folder because it contains the entrypoint file. Please switch the entrypoint first.");
      return;
    }

    const remainingFiles = files.filter(f => f.path !== folderPathToDelete && !f.path.startsWith(folderPathToDelete + "/"));
    if (remainingFiles.length === 0) {
      triggerAlert("Workspace Directory Error", "Cannot delete folder. A workspace must retain at least one file.");
      return;
    }
    setFiles(remainingFiles);

    if (activeFilePath.startsWith(folderPathToDelete + "/")) {
      setActiveFilePath(remainingFiles[0].path);
    }
  };

  // Rename File/Folder
  const handleRename = () => {
    if (!renamePath || !renameValue.trim()) return;
    const newVal = renameValue.trim();

    if (isRenamingFolder) {
      const oldPrefix = renamePath;
      const newPrefix = renamePath.includes("/")
        ? renamePath.substring(0, renamePath.lastIndexOf("/")) + "/" + newVal
        : newVal;

      setFolders(prev => prev.map(f => {
        if (f === oldPrefix) return newPrefix;
        if (f.startsWith(oldPrefix + "/")) {
          return newPrefix + f.slice(oldPrefix.length);
        }
        return f;
      }));

      setFiles(prev => prev.map(f => {
        if (f.path.startsWith(oldPrefix + "/")) {
          const newPath = newPrefix + f.path.slice(oldPrefix.length);
          if (f.path === activeFilePath) setActiveFilePath(newPath);
          if (f.path === entrypoint) setEntrypoint(newPath);
          return { ...f, path: newPath };
        }
        return f;
      }));
    } else {
      const dir = renamePath.includes("/") ? renamePath.substring(0, renamePath.lastIndexOf("/")) + "/" : "";
      const newPath = dir + newVal;

      if (files.some(f => f.path.toLowerCase() === newPath.toLowerCase() && f.path !== renamePath)) {
        triggerAlert("Rename Error", "File name already exists!");
        return;
      }

      setFiles(prev => prev.map(f => {
        if (f.path === renamePath) {
          if (renamePath === activeFilePath) setActiveFilePath(newPath);
          if (renamePath === entrypoint) setEntrypoint(newPath);
          return { ...f, path: newPath };
        }
        return f;
      }));
    }

    setRenamePath(null);
    setRenameValue("");
  };

  // Right-click event triggers
  const handleContextMenu = (e: React.MouseEvent, path: string, isFolder: boolean) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetPath: path,
      isFolder
    });
  };

  // Clipboard copy helper
  const handleCopyRelativePath = (path: string) => {
    navigator.clipboard.writeText(path);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleRun = async () => {
    setIsRunning(true);
    setResult(null);
    setErrorMsg(null);
    setIsDrawerCollapsed(false);
    setActiveConsoleTab("output");

    try {
      const payload = {
        files,
        entrypoint,
        input: inputData
      };

      const url = `${JUDGE_API_BASE_URL}/run`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      const data: RunCodeResponse = await response.json();
      setResult(data);

      if (user) {
        const activeFile = files.find(f => f.path === activeFilePath);
        const codeContent = activeFile ? activeFile.content : "";
        try {
          await supabase
            .from("code_history")
            .insert({
              user_id: user.id,
              filename: activeFilePath,
              code: codeContent,
              status: data.status || "success"
            });
        } catch (dbErr) {
          console.warn("Failed to write to code_history table:", dbErr);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during execution.");
    } finally {
      setIsRunning(false);
    }
  };

  // Global Ctrl+Enter shortcut key listener to run code
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleRun]);

  // Live Interview Collaborative Helper Functions and Hooks
  const updateUrlRoom = (code: string | null) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (code) {
        url.searchParams.set("room", code);
      } else {
        url.searchParams.delete("room");
      }
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleHostSession = async () => {
    if (!user) {
      triggerAlert("Authentication Required", "Please log in first to host a live interview session.");
      return;
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomCode = "WERC-";
    for (let i = 0; i < 6; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      const { error } = await supabase
        .from("interview_sessions")
        .insert({
          code: randomCode,
          host_id: user.id,
          files: files,
          active_file_path: activeFilePath,
          entrypoint: entrypoint,
          language: language,
          input_data: inputData
        });

      if (error) throw error;

      setIsHost(true);
      setRoomCode(randomCode);
      updateUrlRoom(randomCode);
      setIsHostingModalOpen(true);
    } catch (err: any) {
      console.error(err);
      triggerAlert("Host Error", err.message || "Failed to create an interview session.");
    }
  };

  const handleJoinSession = async (code: string) => {
    const formattedCode = code.trim().toUpperCase();
    if (!formattedCode) return;

    try {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("code", formattedCode)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        triggerAlert("Session Not Found", `No active session found with code "${formattedCode}".`);
        return;
      }

      isUpdatingFromRemoteRef.current = true;
      if (data.files) setFiles(data.files);
      if (data.active_file_path) setActiveFilePath(data.active_file_path);
      if (data.entrypoint) setEntrypoint(data.entrypoint);
      if (data.language) setLanguage(data.language);
      if (data.input_data) setInputData(data.input_data);
      setTimeout(() => {
        isUpdatingFromRemoteRef.current = false;
      }, 100);

      const userIsHost = user ? data.host_id === user.id : false;
      setIsHost(userIsHost);
      if (!userIsHost && activeSidebarTab === "notes") {
        setActiveSidebarTab("files");
      }

      // Record interviewee candidature immediately upon joining to prevent loss if they leave early
      if (!userIsHost && user) {
        try {
          const { data: existingHist } = await supabase
            .from("interview_history")
            .select("id")
            .eq("user_id", user.id)
            .eq("title", `Coding Interview (${formattedCode})`)
            .maybeSingle();

          if (!existingHist) {
            let hostName = "Interviewer";
            if (data.host_id) {
              const { data: hostProfile } = await supabase
                .from("profiles")
                .select("full_name, username")
                .eq("id", data.host_id)
                .maybeSingle();
              if (hostProfile) {
                hostName = hostProfile.full_name || hostProfile.username || "Interviewer";
              }
            }

            await supabase
              .from("interview_history")
              .insert({
                user_id: user.id,
                title: `Coding Interview (${formattedCode})`,
                interviewer_name: hostName,
                status: "Pending"
              });
          }
        } catch (dbErr) {
          console.warn("Failed to pre-insert candidate history record on join:", dbErr);
        }
      }

      setRoomCode(formattedCode);
      updateUrlRoom(formattedCode);
      triggerAlert("Joined Session", `Successfully joined session "${formattedCode}".`, "success");
    } catch (err: any) {
      console.error(err);
      triggerAlert("Join Error", err.message || "Failed to join session.");
    }
  };

  const handleLeaveSession = () => {
    setRoomCode(null);
    setIsHost(false);
    updateUrlRoom(null);
    triggerAlert("Left Session", "You have left the collaborative session.", "success");
  };

  const handleEndSession = async () => {
    if (!roomCode) return;
    setVerdictModalOpen(true);
  };

  const endInterviewWithVerdict = async (verdict: "Accepted" | "Rejected" | "Pending") => {
    if (!roomCode) return;

    // 1. Broadcast an "interview-ended" event to let applicant insert their history record
    if (channelRef.current) {
      await channelRef.current.send({
        type: "broadcast",
        event: "interview-ended",
        payload: {
          hostName: user?.user_metadata?.display_name || user?.email || "Interviewer",
          verdict: verdict
        }
      });
    }

    // 2. Insert conduct record into interviews_taken table with verdict & notes
    if (user) {
      try {
        await supabase
          .from("interviews_taken")
          .insert({
            interviewer_id: user.id,
            candidate_name: "Applicant",
            title: `Coding Interview (${roomCode})`,
            status: verdict,
            notes: interviewerNotes || null
          });
      } catch (err) {
        console.warn("Failed to insert interviews_taken record:", err);
      }

      // Also update the applicant's history record directly from the host client in case the applicant has left early
      try {
        await supabase
          .from("interview_history")
          .update({ status: verdict })
          .eq("title", `Coding Interview (${roomCode})`);
      } catch (err) {
        console.warn("Failed to update candidate's interview_history status from host:", err);
      }
    }

    // 3. Delete session from interview_sessions
    try {
      await supabase
        .from("interview_sessions")
        .delete()
        .eq("code", roomCode);
    } catch (err) {
      console.warn("Failed to delete interview session:", err);
    }

    setRoomCode(null);
    setIsHost(false);
    setInterviewerNotes("");
    updateUrlRoom(null);
    setVerdictModalOpen(false);
    triggerAlert("Interview Ended", `The interview has ended and session has been closed. Candidate verdict: ${verdict}.`, "success");
  };

  // Check URL search parameters for join room parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const room = urlParams.get("room");
      if (room && !roomCode) {
        handleJoinSession(room);
      }
    }
  }, [user]);

  // Realtime Broadcast Channel Listener
  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`room:${roomCode}`, {
      config: {
        broadcast: { self: false }
      }
    });

    channelRef.current = channel;

    channel
      .on("broadcast", { event: "workspace-sync" }, (payload: any) => {
        const { files: remoteFiles, activeFilePath: remoteActive, entrypoint: remoteEntry, language: remoteLang, inputData: remoteInput } = payload.payload;

        isUpdatingFromRemoteRef.current = true;
        if (remoteFiles) setFiles(remoteFiles);
        if (remoteActive) setActiveFilePath(remoteActive);
        if (remoteEntry) setEntrypoint(remoteEntry);
        if (remoteLang) setLanguage(remoteLang);
        if (remoteInput !== undefined) setInputData(remoteInput);
        setTimeout(() => {
          isUpdatingFromRemoteRef.current = false;
        }, 100);
      })
      .on("broadcast", { event: "interview-ended" }, async (payload: any) => {
        const hostName = payload.payload?.hostName || "Interviewer";

        if (user) {
          try {
            const { data: existing } = await supabase
              .from("interview_history")
              .select("id")
              .eq("user_id", user.id)
              .eq("title", `Coding Interview (${roomCode})`)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("interview_history")
                .update({
                  status: payload.payload?.verdict || "Pending"
                })
                .eq("id", existing.id);
            } else {
              await supabase
                .from("interview_history")
                .insert({
                  user_id: user.id,
                  title: `Coding Interview (${roomCode})`,
                  interviewer_name: hostName,
                  status: payload.payload?.verdict || "Pending"
                });
            }
          } catch (err) {
            console.warn("Failed to save or update interview_history record:", err);
          }
        }

        setRoomCode(null);
        setIsHost(false);
        updateUrlRoom(null);
        triggerAlert("Interview Ended", "The host has ended the interview session.", "success");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, user]);

  // Broadcast local changes to channel and save to DB
  useEffect(() => {
    if (!roomCode || isUpdatingFromRemoteRef.current) return;

    const channel = supabase.channel(`room:${roomCode}`);
    channel.send({
      type: "broadcast",
      event: "workspace-sync",
      payload: {
        files,
        activeFilePath,
        entrypoint,
        language,
        inputData
      }
    });

    const delayDebounce = setTimeout(async () => {
      try {
        await supabase
          .from("interview_sessions")
          .update({
            files,
            active_file_path: activeFilePath,
            entrypoint,
            language,
            input_data: inputData
          })
          .eq("code", roomCode);
      } catch (err) {
        console.warn("Failed to backup session state to Supabase table:", err);
      }
    }, 2000);

    return () => clearTimeout(delayDebounce);
  }, [roomCode, files, activeFilePath, entrypoint, language, inputData]);

  const toggleSidebarTab = (tab: "files" | "settings" | "notes") => {
    if (activeSidebarTab === tab && isSidebarExpanded) {
      setIsSidebarExpanded(false);
    } else {
      setActiveSidebarTab(tab);
      setIsSidebarExpanded(true);
    }
  };

  const toggleFolder = (folder: string) => {
    setCollapsedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const getThemeClass = (light: string, dark: string) => {
    return theme === "light" ? light : dark;
  };

  return (
    <main className={`flex flex-col h-screen w-screen overflow-hidden font-sans antialiased transition-colors duration-250 ${getThemeClass("bg-zinc-50 text-zinc-900", "bg-zinc-950 text-zinc-100")
      } ${uiScale === "sm" ? "text-xs" : uiScale === "lg" ? "text-base" : "text-sm"
      }`}>

      {/* Right-click custom Context Menu */}
      <ContextMenu
        contextMenu={contextMenu}
        contextMenuRef={contextMenuRef}
        theme={theme}
        getThemeClass={getThemeClass}
        onRenameTrigger={(path, isFolder) => {
          setContextMenu(prev => ({ ...prev, visible: false }));
          setRenamePath(path);
          setIsRenamingFolder(isFolder);
          const nodeName = path.includes("/") ? path.substring(path.lastIndexOf("/") + 1) : path;
          setRenameValue(nodeName);
        }}
        onSetEntrypoint={(path) => {
          setContextMenu(prev => ({ ...prev, visible: false }));
          setEntrypoint(path);
        }}
        onCopyPath={(path) => {
          setContextMenu(prev => ({ ...prev, visible: false }));
          handleCopyRelativePath(path);
        }}
        onDelete={(path, isFolder) => {
          setContextMenu(prev => ({ ...prev, visible: false }));
          if (isFolder) {
            triggerConfirm(
              "Delete Folder",
              `Are you sure you want to delete the folder "${path}" and all its contents? This action is permanent.`,
              () => handleDeleteFolder(path)
            );
          } else {
            triggerConfirm(
              "Delete File",
              `Are you sure you want to delete the file "${path}"? This action is permanent.`,
              () => handleDeleteFile(path)
            );
          }
        }}
        onCreateFile={() => {
          setContextMenu(prev => ({ ...prev, visible: false }));
          triggerPrompt("New File", "Enter file name (e.g. app.py)", "", (name) => {
            handleCreateFile("", name);
          });
        }}
        onCreateFolder={() => {
          setContextMenu(prev => ({ ...prev, visible: false }));
          triggerPrompt("New Folder", "Enter folder name (e.g. models)", "", (name) => {
            handleCreateFolder("", name);
          });
        }}
        onCollapseAll={() => {
          setContextMenu(prev => ({ ...prev, visible: false }));
          const collapsedMap: Record<string, boolean> = {};
          folders.forEach(f => {
            collapsedMap[f] = true;
          });
          setCollapsedFolders(collapsedMap);
        }}
      />

      {/* 1. Header */}
      <Header
        language={language}
        setLanguage={setLanguage}
        activeFilePath={activeFilePath}
        entrypoint={entrypoint}
        isRunning={isRunning}
        handleRun={handleRun}
        getThemeClass={getThemeClass}
        triggerAlert={triggerAlert}
        user={user}
        activeRoomCode={roomCode}
        isHost={isHost}
        onHostSession={handleHostSession}
        onJoinSession={() => {
          triggerPrompt(
            "Join Interview",
            "Enter Session Code (e.g. WERC-XXXX)",
            "",
            (code) => {
              if (code.trim()) {
                handleJoinSession(code.trim());
              }
            }
          );
        }}
        onLeaveSession={handleLeaveSession}
        onEndSession={handleEndSession}
      />

      {/* Main Workspace Body */}
      <div className={`flex flex-1 relative min-h-0 ${getThemeClass("bg-zinc-50", "bg-zinc-950")} ${isDraggingDrawer || isDraggingSidebar ? "select-none" : ""}`}>

        {/* 2. Left Utility Bar */}
        <SidebarTabs
          activeSidebarTab={activeSidebarTab}
          isSidebarExpanded={isSidebarExpanded}
          toggleSidebarTab={toggleSidebarTab}
          getThemeClass={getThemeClass}
          triggerAlert={triggerAlert}
          showNotesTab={!roomCode || isHost}
        />

        {/* 2b. Collapsible Sidebar Drawer Panel */}
        {isSidebarExpanded && (
          <>
            <SidebarDrawer
              activeSidebarTab={activeSidebarTab}
              sidebarWidth={sidebarWidth}
              theme={theme}
              setTheme={setTheme}
              fontSize={fontSize}
              setFontSize={setFontSize}
              uiScale={uiScale}
              setUiScale={setUiScale}
              files={files}
              folders={folders}
              activeFilePath={activeFilePath}
              setActiveFilePath={setActiveFilePath}
              entrypoint={entrypoint}
              setEntrypoint={setEntrypoint}
              collapsedFolders={collapsedFolders}
              toggleFolder={toggleFolder}
              createTargetDir={createTargetDir}
              setCreateTargetDir={setCreateTargetDir}
              renamePath={renamePath}
              setRenamePath={setRenamePath}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              isRenamingFolder={isRenamingFolder}
              setIsRenamingFolder={setIsRenamingFolder}
              handleCreateFile={handleCreateFile}
              handleCreateFolder={handleCreateFolder}
              handleRename={handleRename}
              handleContextMenu={handleContextMenu}
              interviewerNotes={interviewerNotes}
              setInterviewerNotes={setInterviewerNotes}
              getThemeClass={getThemeClass}
              triggerPrompt={triggerPrompt}
            />

            {/* Sidebar Width Resize Slider Handle */}
            <div
              onMouseDown={startDraggingSidebar}
              className={`hidden md:flex w-[4px] hover:w-[6px] bg-transparent hover:bg-zinc-700 cursor-col-resize h-full transition-all z-30 select-none items-center justify-center border-l border-r ${getThemeClass("border-zinc-200 hover:border-zinc-300", "border-zinc-900 hover:border-zinc-800")
                } ${isDraggingSidebar ? getThemeClass("bg-zinc-300 w-[6px]", "bg-zinc-650 w-[6px]") : ""
                }`}
            />
          </>
        )}

        {/* 3. Editor Workspace Area & Collapsible Console Drawer */}
        <div className="flex-1 h-full flex flex-col relative min-w-0">

          {/* Main Monaco Workspace */}
          <div className="flex-1 min-h-0 bg-zinc-950 relative">
            {activeFile.path ? (
              <Editor
                height="100%"
                defaultLanguage="python"
                language="python"
                theme={theme === "dark" ? "vs-dark" : "light"}
                value={activeFile.content}
                onChange={(val) => updateActiveFileContent(val || "")}
                options={{
                  fontSize: fontSize,
                  fontFamily: "JetBrains Mono, Geist Mono, monospace",
                  minimap: { enabled: false },
                  lineHeight: fontSize + 8,
                  padding: { top: 16 },
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8
                  },
                  roundedSelection: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on"
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-550 select-none">
                <Info className="h-8 w-8 opacity-40 mb-2" />
                <span>No active file selected. Click a file in the sidebar to open.</span>
              </div>
            )}
          </div>

          {/* Horizontal Resize Bar Handle */}
          <div
            onMouseDown={startDraggingDrawer}
            className={`hidden md:flex h-[4px] hover:h-[6px] cursor-row-resize w-full transition-all z-20 select-none items-center justify-center border-t ${getThemeClass("bg-zinc-200 hover:bg-zinc-300 border-zinc-200", "bg-zinc-900 hover:bg-zinc-700 border-zinc-900")
              } ${isDraggingDrawer ? getThemeClass("bg-zinc-300 h-[6px]", "bg-zinc-600 h-[6px]") : ""
              }`}
          />

          {/* 4. Bottom Resizable Console Drawer */}
          <ConsoleDrawer
            activeConsoleTab={activeConsoleTab}
            setActiveConsoleTab={setActiveConsoleTab}
            isDrawerCollapsed={isDrawerCollapsed}
            setIsDrawerCollapsed={setIsDrawerCollapsed}
            drawerHeight={drawerHeight}
            inputData={inputData}
            setInputData={setInputData}
            isRunning={isRunning}
            result={result}
            errorMsg={errorMsg}
            getThemeClass={getThemeClass}
          />

        </div>

      </div>

      {/* Custom Alert Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
        getThemeClass={getThemeClass}
        type={alertConfig.type}
      />

      {/* Custom Prompt Modal */}
      <PromptModal
        isOpen={promptConfig.isOpen}
        onClose={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))}
        title={promptConfig.title}
        placeholder={promptConfig.placeholder}
        defaultValue={promptConfig.defaultValue}
        onSubmit={promptConfig.onSubmit}
        getThemeClass={getThemeClass}
      />

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        confirmLabel="Delete"
        getThemeClass={getThemeClass}
      />

      {/* Live Interview Info Modal */}
      <InterviewModal
        isOpen={isHostingModalOpen}
        onClose={() => setIsHostingModalOpen(false)}
        code={roomCode || ""}
        getThemeClass={getThemeClass}
      />

      {/* Verdict Selection Modal */}
      <BaseModal
        isOpen={verdictModalOpen}
        onClose={() => setVerdictModalOpen(false)}
        title="Submit Candidate Verdict"
        getThemeClass={getThemeClass}
      >
        <div className="flex flex-col gap-4 py-2 select-none text-center">
          <p className={`text-sm ${getThemeClass("text-zinc-650", "text-zinc-400")}`}>
            Provide a verdict for this interview before ending the session.
          </p>

          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={() => endInterviewWithVerdict("Accepted")}
              className="w-full py-2.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-[0.98] cursor-pointer"
            >
              Accept Candidate
            </button>

            <button
              onClick={() => endInterviewWithVerdict("Rejected")}
              className="w-full py-2.5 rounded-lg font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white transition-all active:scale-[0.98] cursor-pointer"
            >
              Reject Candidate
            </button>

            <button
              onClick={() => endInterviewWithVerdict("Pending")}
              className={`w-full py-2.5 rounded-lg font-bold text-xs border transition-all active:scale-[0.98] cursor-pointer ${getThemeClass("bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700", "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300")
                }`}
            >
              Decide Later (Pending)
            </button>
          </div>
        </div>
      </BaseModal>
    </main>
  );
}
