"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Cpu, Info, X } from "lucide-react";
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

  // Keep refs in sync with state for reliable access inside closures
  const isUpdatingFromRemoteRef = useRef(false);
  const channelRef = useRef<any>(null);
  const roomCodeRef = useRef<string | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Right Sidebar Layout States
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300);
  const [isDraggingRightSidebar, setIsDraggingRightSidebar] = useState(false);
  
  const [rightVerticalSplit, setRightVerticalSplit] = useState(0.5); // Default 50% split ratio
  const [isDraggingVerticalSplit, setIsDraggingVerticalSplit] = useState(false);

  // Chat message state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");

  // Participant list state
  const [discoveredParticipants, setDiscoveredParticipants] = useState<any[]>([]);

  // Waiting Room States
  const [isApprovedEntry, setIsApprovedEntry] = useState(false);
  const [waitingCandidates, setWaitingCandidates] = useState<any[]>([]);

  // Custom Toast/Notification state
  const [waitingRoomToast, setWaitingRoomToast] = useState<{
    show: boolean;
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);

  const isHostRef = useRef(isHost);
  const isApprovedEntryRef = useRef(isApprovedEntry);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { isApprovedEntryRef.current = isApprovedEntry; }, [isApprovedEntry]);

  useEffect(() => {
    if (isHost) {
      setIsApprovedEntry(true);
    }
  }, [isHost]);

  // Auto-sync candidate_id to database when candidate is discovered in the room
  useEffect(() => {
    if (isHost && roomCode && discoveredParticipants.length > 0) {
      const candidate = discoveredParticipants.find(p => !p.isHost && p.id !== user?.id);
      if (candidate) {
        supabase
          .from("interview_sessions")
          .update({ candidate_id: candidate.id })
          .eq("code", roomCode)
          .then(({ error }) => {
            if (error) {
              console.warn("Failed to auto-sync candidate_id to database:", error);
            } else {
              console.log("WeRC Sync: Successfully auto-synced candidate_id to DB:", candidate.id);
            }
          });
      }
    }
  }, [isHost, roomCode, discoveredParticipants, user?.id]);

  const handleApproveEntry = async (candidate: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "entry-approved",
        payload: {
          candidateId: candidate.id
        }
      });
      // Also register them in participants list locally
      setDiscoveredParticipants(prev => {
        if (prev.some(p => p.id === candidate.id)) return prev;
        return [...prev, candidate];
      });
    }
    setWaitingCandidates(prev => prev.filter(c => c.id !== candidate.id));

    // Update candidate_id in database since host has write permissions
    if (roomCode) {
      try {
        await supabase
          .from("interview_sessions")
          .update({ candidate_id: candidate.id })
          .eq("code", roomCode);
      } catch (err) {
        console.warn("Failed to set candidate_id in session:", err);
      }
    }
  };

  const handleDeclineEntry = (candidateId: string) => {
    setWaitingCandidates(prev => prev.filter(c => c.id !== candidateId));
  };

  const handleKickParticipant = (candidateId: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "kick-participant",
        payload: { candidateId }
      });
    }
    setDiscoveredParticipants(prev => prev.filter(p => p.id !== candidateId));
  };

  // Dragging Handlers
  const startDraggingRightSidebar = (e: React.MouseEvent) => {
    setIsDraggingRightSidebar(true);
    e.preventDefault();
  };

  const startDraggingVerticalSplit = (e: React.MouseEvent) => {
    setIsDraggingVerticalSplit(true);
    e.preventDefault();
  };

  // Dragging mousemove handler
  useEffect(() => {
    if (!isDraggingRightSidebar && !isDraggingVerticalSplit) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRightSidebar) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 260 && newWidth < 600) {
          setRightSidebarWidth(newWidth);
        }
      }

      if (isDraggingVerticalSplit) {
        const sidebarElement = document.getElementById("right-collapsible-sidebar");
        if (sidebarElement) {
          const rect = sidebarElement.getBoundingClientRect();
          const relativeY = e.clientY - rect.top;
          const ratio = relativeY / rect.height;
          // Constraint: max vertical split is 80-20 for both windows
          if (ratio >= 0.2 && ratio <= 0.8) {
            setRightVerticalSplit(ratio);
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingRightSidebar(false);
      setIsDraggingVerticalSplit(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingRightSidebar, isDraggingVerticalSplit]);

  // Reset states on session end
  useEffect(() => {
    if (!roomCode) {
      setDiscoveredParticipants([]);
      setChatMessages([]);
      setShowRightSidebar(false);
    }
  }, [roomCode]);

  const handleSendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim()) return;
    
    const payload = {
      id: Math.random().toString(36).substr(2, 9),
      sender: user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User",
      text: messageInput.trim(),
      timestamp: Date.now()
    };
    
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "chat-message",
        payload: payload
      });
    }
    
    setChatMessages(prev => [...prev, payload]);
    setMessageInput("");
  };


  useEffect(() => {
    const refreshSession = async () => {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (freshUser) {
        setUser(freshUser);
      }
    };

    refreshSession();

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
  const [executionEnabled, setExecutionEnabled] = useState(true);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);

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

  const handleToggleExecution = async (val: boolean) => {
    setExecutionEnabled(val);
    if (roomCode) {
      try {
        await supabase
          .from("interview_sessions")
          .update({ execution_enabled: val })
          .eq("code", roomCode);
        
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "execution-toggle",
            payload: { enabled: val }
          });
        }
      } catch (err) {
        console.warn("Failed to update execution setting:", err);
      }
    }
  };

  const handleRun = async () => {
    if (isHost && !discoveredParticipants.some(p => !p.isHost)) {
      triggerAlert("Execution Blocked", "An applicant must be present in the workspace to execute code.", "error");
      return;
    }

    if (!executionEnabled) {
      triggerAlert("Execution Disabled", "Code execution has been disabled by the host.", "error");
      return;
    }

    if (rateLimitCooldown > 0) {
      triggerAlert("Rate Limit Cooldown", `Please wait ${rateLimitCooldown}s before running code again.`, "error");
      return;
    }

    setIsRunning(true);
    setResult(null);
    setErrorMsg(null);
    setIsDrawerCollapsed(false);
    setActiveConsoleTab("output");

    try {
      const payload = {
        files,
        entrypoint,
        input: inputData,
        roomCode: roomCode || "local-sandbox"
      };

      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        const data = await response.json();
        setErrorMsg(data.error);
        const retryAfter = parseInt(response.headers.get("Retry-After") || "10");
        setRateLimitCooldown(retryAfter);
        setIsRunning(false);
        return;
      }

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

    // Check if host already has an active session to reuse it
    try {
      const { data: existingSession, error: checkError } = await supabase
        .from("interview_sessions")
        .select("code")
        .eq("host_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingSession) {
        setIsHost(true);
        setRoomCode(existingSession.code);
        updateUrlRoom(existingSession.code);
        setIsHostingModalOpen(true);
        return;
      }
    } catch (err: any) {
      console.warn("Failed to check for existing active session:", err);
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
      if (data.execution_enabled !== undefined) setExecutionEnabled(data.execution_enabled);
      setTimeout(() => {
        isUpdatingFromRemoteRef.current = false;
      }, 100);

      const userIsHost = user ? data.host_id === user.id : false;
      setIsHost(userIsHost);
      if (!userIsHost && activeSidebarTab === "notes") {
        setActiveSidebarTab("files");
      }

      // Ensure exactly ONE history record exists for this candidate+room (upsert pattern)
      if (!userIsHost && user) {
        try {
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

          const { data: existingHist } = await supabase
            .from("interview_history")
            .select("id, status")
            .eq("user_id", user.id)
            .eq("title", `Coding Interview (${formattedCode})`)
            .maybeSingle();

          if (!existingHist) {
            // Only insert if no record exists
            await supabase
              .from("interview_history")
              .insert({
                user_id: user.id,
                title: `Coding Interview (${formattedCode})`,
                interviewer_name: hostName,
                status: "Pending"
              });
          }
          // If a record already exists (re-join), keep it as-is to preserve any verdict already set
        } catch (dbErr) {
          console.warn("Failed to upsert candidate history record on join:", dbErr);
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
    // Announce departure so other sessions drop candidate cleanly
    if (channelRef.current && user) {
      channelRef.current.send({
        type: "broadcast",
        event: "cancel-request",
        payload: { id: user.id }
      });
      channelRef.current.send({
        type: "broadcast",
        event: "participant-left",
        payload: { id: user.id }
      });
    }

    setRoomCode(null);
    setIsHost(false);
    setIsApprovedEntry(false); // Reset entry approval state
    updateUrlRoom(null);
    triggerAlert("Left Session", "You have left the collaborative session.", "success");
  };

  // Broadcast exit on page unload/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (channelRef.current && user && roomCode) {
        channelRef.current.send({
          type: "broadcast",
          event: "cancel-request",
          payload: { id: user.id }
        });
        channelRef.current.send({
          type: "broadcast",
          event: "participant-left",
          payload: { id: user.id }
        });
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [roomCode, user?.id]);

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

      // Update the applicant's history record via the server-side verdict endpoint.
      // This uses the service role key to bypass RLS (client can't update another user's row).
      // It also de-duplicates any extra history rows for this room.
      try {
        await fetch("/api/verdict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode, verdict }),
        });
      } catch (err) {
        console.warn("Failed to call /api/verdict endpoint:", err);
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
      .on("broadcast", { event: "execution-toggle" }, (payload: any) => {
        setExecutionEnabled(payload.payload.enabled);
      })
      .on("broadcast", { event: "interview-ended" }, async (payload: any) => {
        const hostName = payload.payload?.hostName || "Interviewer";
        const verdict = payload.payload?.verdict;
        // Use refs to get the live values — closures would have stale state
        const currentUser = userRef.current;
        const currentRoomCode = roomCodeRef.current;

        if (currentUser && currentRoomCode && verdict) {
          try {
            // Update the existing record — do NOT insert another one to avoid duplicates
            await supabase
              .from("interview_history")
              .update({ status: verdict })
              .eq("user_id", currentUser.id)
              .eq("title", `Coding Interview (${currentRoomCode})`);
          } catch (err) {
            console.warn("Failed to update interview_history record:", err);
          }
        }

        setRoomCode(null);
        setIsHost(false);
        updateUrlRoom(null);
        triggerAlert("Interview Ended", "The host has ended the interview session.", "success");
      })
      .on("broadcast", { event: "chat-message" }, (payload: any) => {
        setChatMessages(prev => [...prev, payload.payload]);
      })
      .on("broadcast", { event: "participant-ping" }, (payload: any) => {
        console.log("WeRC Event: Received participant-ping", payload, "isHostRef:", isHostRef.current, "isApprovedEntryRef:", isApprovedEntryRef.current);
        if (!isHostRef.current && !isApprovedEntryRef.current) {
          console.log("WeRC Event: Ignored participant-ping (not host and not approved)");
          return;
        }
        const participant = payload.payload;
        setDiscoveredParticipants(prev => {
          if (prev.some(p => p.id === participant.id)) return prev;
          return [...prev, participant];
        });
        
        // Reply with details so they discover us too
        const selfParticipant = {
          id: user?.id || "anonymous",
          name: user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User",
          avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
          isHost: isHostRef.current
        };
        console.log("WeRC Event: Sending participant-pong reply", selfParticipant);
        channel.send({
          type: "broadcast",
          event: "participant-pong",
          payload: selfParticipant
        });
      })
      .on("broadcast", { event: "participant-pong" }, (payload: any) => {
        console.log("WeRC Event: Received participant-pong", payload, "isHostRef:", isHostRef.current, "isApprovedEntryRef:", isApprovedEntryRef.current);
        if (!isHostRef.current && !isApprovedEntryRef.current) {
          console.log("WeRC Event: Ignored participant-pong (not host and not approved)");
          return;
        }
        const participant = payload.payload;
        setDiscoveredParticipants(prev => {
          if (prev.some(p => p.id === participant.id)) return prev;
          return [...prev, participant];
        });
      })
      .on("broadcast", { event: "request-entry" }, (payload: any) => {
        const participant = payload.payload;
        setWaitingCandidates(prev => {
          if (prev.some(c => c.id === participant.id)) return prev;
          return [...prev, participant];
        });
        setWaitingRoomToast({
          show: true,
          message: `Applicant "${participant.name}" has joined the waiting room.`,
          type: "info"
        });
        setTimeout(() => {
          setWaitingRoomToast(prev => prev ? { ...prev, show: false } : null);
        }, 5000);
      })
      .on("broadcast", { event: "entry-approved" }, (payload: any) => {
        const { candidateId } = payload.payload;
        if (candidateId === user?.id) {
          setIsApprovedEntry(true);
          setWaitingRoomToast({
            show: true,
            message: "The interviewer has allowed you to join the session.",
            type: "success"
          });
          setTimeout(() => {
            setWaitingRoomToast(prev => prev ? { ...prev, show: false } : null);
          }, 4000);

          if (channelRef.current && user) {
            channelRef.current.send({
              type: "broadcast",
              event: "participant-ping",
              payload: {
                id: user.id,
                name: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                isHost: false
              }
            });
          }
        }
      })
      .on("broadcast", { event: "cancel-request" }, (payload: any) => {
        const { id } = payload.payload;
        setWaitingCandidates((prev: { id: any; }[]) => prev.filter(c => c.id !== id));
      })
      .on("broadcast", { event: "participant-left" }, (payload: any) => {
        const { id } = payload.payload;
        setDiscoveredParticipants(prev => prev.filter(p => p.id !== id));
      })
      .on("broadcast", { event: "kick-participant" }, (payload: any) => {
        const { candidateId } = payload.payload;
        if (candidateId === user?.id) {
          // We got kicked!
          setRoomCode(null);
          setIsHost(false);
          setIsApprovedEntry(false);
          updateUrlRoom(null);
          triggerAlert("Removed from Session", "You have been removed from the session by the host.", "error");
        } else {
          setDiscoveredParticipants(prev => prev.filter(p => p.id !== candidateId));
        }
      });

    channel.subscribe((status) => {
      console.log("WeRC Event: Channel subscription status change:", status);
      if (status === "SUBSCRIBED" && user) {
        const selfParticipant = {
          id: user.id,
          name: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          isHost: isHostRef.current
        };

        // Use a short warm-up delay to guarantee broadcast delivery
        setTimeout(() => {
          if (isHostRef.current) {
            console.log("WeRC Event: Sending warm-up participant-ping as Host", selfParticipant);
            channel.send({
              type: "broadcast",
              event: "participant-ping",
              payload: selfParticipant
            });
          } else {
            console.log("WeRC Event: Sending warm-up request-entry as Candidate", selfParticipant);
            channel.send({
              type: "broadcast",
              event: "request-entry",
              payload: selfParticipant
            });
          }
        }, 500);

        if (!isHostRef.current) {
          setWaitingRoomToast({
            show: true,
            message: "Request sent. Waiting in the waiting room...",
            type: "info"
          });
          setTimeout(() => {
            setWaitingRoomToast(prev => prev ? { ...prev, show: false } : null);
          }, 3000);
        }
      }
    });

    // Periodic ping to keep participants list perfectly in sync (every 6 seconds)
    const pingInterval = setInterval(() => {
      if (channel && user) {
        const selfParticipant = {
          id: user.id,
          name: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          isHost: isHostRef.current
        };

        if (isHostRef.current || isApprovedEntryRef.current) {
          console.log("WeRC Event: Sending periodic participant-ping", selfParticipant);
          channel.send({
            type: "broadcast",
            event: "participant-ping",
            payload: selfParticipant
          });
        }
      }
    }, 6000);

    return () => {
      clearInterval(pingInterval);
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, user?.id]);

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
            input_data: inputData,
            last_activity_at: new Date().toISOString()
          })
          .eq("code", roomCode);
      } catch (err) {
        console.warn("Failed to backup session state to Supabase table:", err);
      }
    }, 2000);

    return () => clearTimeout(delayDebounce);
  }, [roomCode, files, activeFilePath, entrypoint, language, inputData]);

  // Rate Limit Cooldown timer effect
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const timer = setInterval(() => {
      setRateLimitCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCooldown]);

  // Check room status periodically
  useEffect(() => {
    if (!roomCode) return;
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("interview_sessions")
          .select("status")
          .eq("code", roomCode)
          .maybeSingle();

        if (error) return;
        if (!data || data.status === "expired") {
          setRoomCode(null);
          setIsHost(false);
          setIsApprovedEntry(false);
          updateUrlRoom(null);
          triggerAlert("Session Ended", "This session has been closed or expired.", "error");
        }
      } catch (err) {
        console.warn("Status check failed:", err);
      }
    };

    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [roomCode]);

  // Local Inactivity Expiration
  useEffect(() => {
    if (!roomCode) return;
    
    let idleTimeout: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(async () => {
        try {
          await supabase
            .from("interview_sessions")
            .update({ status: "expired" })
            .eq("code", roomCode);
          
          setRoomCode(null);
          setIsHost(false);
          setIsApprovedEntry(false);
          updateUrlRoom(null);
          triggerAlert("Session Expired", "This room has been expired due to 15 minutes of inactivity.", "error");
        } catch (err) {
          console.warn("Failed to expire session:", err);
        }
      }, 15 * 60 * 1000); // 15 minutes
    };

    resetIdleTimer();

    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    const handleActivity = () => resetIdleTimer();
    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity));

    return () => {
      clearTimeout(idleTimeout);
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
    };
  }, [roomCode]);

  // Host Auto-Sync candidate_id of joined applicant (bypass RLS restriction)
  useEffect(() => {
    if (isHost && roomCode && discoveredParticipants.length > 0) {
      const applicant = discoveredParticipants.find(p => !p.isHost);
      if (applicant) {
        supabase
          .from("interview_sessions")
          .update({ candidate_id: applicant.id })
          .eq("code", roomCode)
          .then(({ error }) => {
            if (error) console.warn("Failed to auto-sync candidate_id:", error);
          });
      }
    }
  }, [isHost, roomCode, discoveredParticipants]);

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

  if (roomCode && !isHost && !isApprovedEntry) {
    return (
      <main className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center p-6 select-none font-sans relative overflow-hidden">
        {/* Brand logo at top center */}
        <div className="flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <img src="/logo/logo.png" alt="WeRC Logo" className="h-6 w-6 object-contain rounded" />
          <span className="text-sm font-semibold tracking-tight text-white font-sans">WeRC</span>
        </div>

        {/* Flat Minimal Card */}
        <div className="max-w-sm w-full p-6 rounded-xl border border-zinc-900 bg-zinc-950 flex flex-col items-center gap-5 relative z-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="h-12 w-12 rounded-full border border-zinc-900 flex items-center justify-center text-zinc-400">
            <Cpu className="h-5 w-5 animate-spin duration-3000" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Waiting for approval</h3>
            <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
              Joined session <span className="font-mono font-bold text-indigo-400">{roomCode}</span>. Please wait for the interviewer to let you in.
            </p>
          </div>
          <div className="h-0.5 w-full bg-zinc-900 overflow-hidden relative rounded-full">
            <div className="absolute top-0 bottom-0 left-0 bg-indigo-500 rounded-full animate-progress" />
          </div>
          <button
            onClick={handleLeaveSession}
            className="w-full py-2.5 rounded-lg border border-zinc-900 hover:border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-rose-500 text-xs font-semibold cursor-pointer transition-colors active:scale-[0.98]"
          >
            Leave Session
          </button>
        </div>

        {waitingRoomToast?.show && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none select-none">
            <div className="px-3.5 py-2 rounded-lg border shadow-xl flex items-center gap-2 text-xs font-medium bg-zinc-900 border-zinc-850 text-zinc-300">
              <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
              <span>{waitingRoomToast.message}</span>
            </div>
          </div>
        )}
      </main>
    );
  }

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
        executionEnabled={executionEnabled}
        setExecutionEnabled={handleToggleExecution}
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
        showRightSidebar={showRightSidebar}
        onToggleRightSidebar={() => setShowRightSidebar(!showRightSidebar)}
        onShowMeetingDetails={() => setIsHostingModalOpen(true)}
        activeParticipants={[
          {
            id: user?.id || "anonymous",
            name: user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User",
            avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
          },
          ...discoveredParticipants.filter(p => !waitingCandidates.some(wc => wc.id === p.id))
        ]}
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
          roomCode={roomCode}
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
          onLeaveSession={() => {
            if (isHost) {
              handleEndSession();
            } else {
              handleLeaveSession();
            }
          }}
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
              isHost={isHost}
              executionEnabled={executionEnabled}
              setExecutionEnabled={handleToggleExecution}
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

        {/* 5. Right Collaborative Sidebar (Participants & Chat) */}
        {showRightSidebar && roomCode && (
          <>
            {/* Sidebar Width Drag Handle */}
            <div
              onMouseDown={startDraggingRightSidebar}
              className={`hidden md:flex w-[4px] hover:w-[6px] bg-transparent hover:bg-zinc-700 cursor-col-resize h-full transition-all z-30 select-none items-center justify-center border-l border-r ${getThemeClass("border-zinc-200 hover:border-zinc-300", "border-zinc-900 hover:border-zinc-800")
                } ${isDraggingRightSidebar ? getThemeClass("bg-zinc-300 w-[6px]", "bg-zinc-650 w-[6px]") : ""
                }`}
            />

            <aside 
              id="right-collapsible-sidebar"
              style={{ width: `${rightSidebarWidth}px` }}
              className={`h-full flex flex-col shrink-0 border-l ${getThemeClass("bg-zinc-100 border-zinc-200 text-zinc-800", "bg-zinc-950 border-zinc-900 text-zinc-300")}`}
            >
              {/* Top Half: Participant List */}
              <div 
                style={{ height: `${rightVerticalSplit * 100}%` }}
                className="flex flex-col min-h-0"
              >
                <div className="px-4 py-2 border-b border-zinc-900 flex items-center justify-between shrink-0 select-none">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">// participants ({[
                    {
                      id: user?.id || "anonymous",
                      name: user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User",
                      avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
                      isHost: isHost
                    },
                    ...discoveredParticipants.filter(p => !waitingCandidates.some(wc => wc.id === p.id))
                  ].length})</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-4 select-none">
                  {/* Section 1: Active Collaborators */}
                  <div className="space-y-2">
                    <div className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider">// active</div>
                    {[
                      {
                        id: user?.id || "anonymous",
                        name: user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User",
                        avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
                        isHost: isHost,
                        isSelf: true
                      },
                      ...discoveredParticipants.filter(p => !waitingCandidates.some(wc => wc.id === p.id))
                    ].map((p, idx) => (
                      <div key={p.id + idx} className="flex items-center gap-2.5 px-2 py-1.5 rounded bg-zinc-900/40 border border-transparent hover:border-zinc-900/60 transition-all">
                        <div className="h-6 w-6 rounded-full overflow-hidden border border-zinc-800 shrink-0 flex items-center justify-center bg-zinc-950">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-bold text-[9px] uppercase text-zinc-500">{p.name?.[0]}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-250 truncate flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.isSelf && <span className="text-[8px] font-mono text-zinc-500">(You)</span>}
                          </p>
                        </div>
                        {p.isHost && (
                          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase shrink-0">Host</span>
                        )}
                        {isHost && !p.isSelf && (
                          <button
                            onClick={() => handleKickParticipant(p.id)}
                            className="p-1 rounded text-zinc-500 hover:text-rose-500 transition-colors bg-transparent border-none cursor-pointer"
                            title="Kick Participant"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Section 2: Waiting Room Candidates (Only visible to host) */}
                  {isHost && waitingCandidates.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-zinc-900/60">
                      <div className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-indigo-450 animate-pulse" />
                        <span>// waiting room ({waitingCandidates.length})</span>
                      </div>
                      {waitingCandidates.map((p) => (
                        <div key={p.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded bg-indigo-950/10 border border-indigo-900/20">
                          <div className="h-6 w-6 rounded-full overflow-hidden border border-zinc-800 shrink-0 flex items-center justify-center bg-zinc-950">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                              <span className="font-bold text-[9px] uppercase text-zinc-550">{p.name?.[0]}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-zinc-250 truncate">
                              {p.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleApproveEntry(p)}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] cursor-pointer border-0"
                              title="Admit"
                            >
                              Admit
                            </button>
                            <button
                              onClick={() => handleDeclineEntry(p.id)}
                              className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 hover:border-zinc-700 text-[9px] cursor-pointer"
                              title="Decline"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Vertical Split Horizontal Divider Drag Handle */}
              <div
                onMouseDown={startDraggingVerticalSplit}
                className={`h-[4px] hover:h-[6px] cursor-row-resize w-full transition-all z-20 select-none border-t border-b ${getThemeClass("bg-zinc-200 hover:bg-zinc-300 border-zinc-200", "bg-zinc-900 hover:bg-zinc-700 border-zinc-900")
                  } ${isDraggingVerticalSplit ? getThemeClass("bg-zinc-300 h-[6px]", "bg-zinc-600 h-[6px]") : ""
                  }`}
              />

              {/* Bottom Half: Chat Window */}
              <div 
                style={{ height: `${(1 - rightVerticalSplit) * 100}%` }}
                className="flex flex-col min-h-0 bg-zinc-950/20"
              >
                <div className="px-4 py-2 border-b border-zinc-900 flex items-center justify-between shrink-0 select-none">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">// room_chat</span>
                </div>

                {/* Messages Box */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-600 select-none">// no messages yet</div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isSelf = msg.sender === (user?.user_metadata?.display_name || user?.email?.split("@")[0]);
                      return (
                        <div key={msg.id} className="flex flex-col gap-0.5 max-w-[85%] break-words">
                          <div className="flex items-baseline gap-1.5 select-none">
                            <span className={`font-bold ${isSelf ? "text-indigo-400" : "text-zinc-400"}`}>
                              {msg.sender}
                            </span>
                            <span className="text-[8px] text-zinc-600">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-zinc-300 leading-relaxed font-sans text-xs bg-zinc-900/55 px-2.5 py-1.5 rounded border border-zinc-900/40">
                            {msg.text}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input Form */}
                <form 
                  onSubmit={handleSendChatMessage}
                  className="p-3 border-t border-zinc-900 bg-zinc-950/40 flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type message..."
                    className="flex-1 bg-zinc-900 border border-zinc-900 hover:border-zinc-850 focus:border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none transition-all"
                  />
                  <button
                    type="submit"
                    className="px-3 h-7.5 rounded bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs cursor-pointer transition-all active:scale-[0.97]"
                  >
                    Send
                  </button>
                </form>
              </div>
            </aside>
          </>
        )}

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



      {/* 7. Host Admission Floating Popup Tooltip */}
      {waitingCandidates.length > 0 && isHost && (
        <div className="fixed bottom-6 right-6 z-[150] w-76 p-4 rounded-xl border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 bg-zinc-950 border-zinc-900 text-zinc-300 font-sans">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2 select-none">// entry request</span>
          <div className="flex items-center gap-2.5 mb-3 select-none">
            <div className="h-8 w-8 rounded-full overflow-hidden border border-zinc-800 shrink-0 flex items-center justify-center bg-zinc-900">
              {waitingCandidates[0].avatar_url ? (
                <img src={waitingCandidates[0].avatar_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="font-bold text-xs uppercase text-zinc-500">{waitingCandidates[0].name?.[0]}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-semibold text-zinc-250 truncate">{waitingCandidates[0].name}</h5>
              <p className="text-[10px] text-zinc-500 truncate">wants to join the interview</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => handleApproveEntry(waitingCandidates[0])}
              className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition-all active:scale-[0.97] border-0"
            >
              Let In
            </button>
            <button
              onClick={() => handleDeclineEntry(waitingCandidates[0].id)}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800 hover:border-zinc-700 font-medium cursor-pointer transition-all active:scale-[0.97]"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* 8. Waiting Room Tooltip Popups (Bottom Centre) */}
      {waitingRoomToast?.show && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none select-none">
          <div className={`px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-semibold ${
            waitingRoomToast.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/30 text-emerald-450"
              : waitingRoomToast.type === "error"
              ? "bg-rose-950/95 border-rose-500/30 text-rose-450"
              : "bg-zinc-900/95 border-zinc-850 text-zinc-300"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              waitingRoomToast.type === "success" ? "bg-emerald-500" : waitingRoomToast.type === "error" ? "bg-rose-500" : "bg-indigo-400 animate-pulse"
            }`} />
            <span>{waitingRoomToast.message}</span>
          </div>
        </div>
      )}
    </main>
  );
}
