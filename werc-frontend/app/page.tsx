"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Cpu, Info } from "lucide-react";
import { runCode, JUDGE_API_BASE_URL, RunCodeResponse, CodeFile } from "./config/api";

import Header from "../components/home/Header";
import SidebarTabs from "../components/home/SidebarTabs";
import SidebarDrawer from "../components/home/SidebarDrawer";
import ConsoleDrawer from "../components/home/ConsoleDrawer";
import ContextMenu from "../components/home/ContextMenu";
import AlertModal from "../components/modals/AlertModal";
import PromptModal from "../components/modals/PromptModal";
import ConfirmModal from "../components/modals/ConfirmModal";

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
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: ""
  });
  
  const [promptConfig, setPromptConfig] = useState<{ isOpen: boolean; title: string; placeholder: string; defaultValue: string; onSubmit: (val: string) => void }>({
    isOpen: false,
    title: "",
    placeholder: "",
    defaultValue: "",
    onSubmit: () => {}
  });

  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const triggerAlert = (title: string, message: string) => {
    setAlertConfig({ isOpen: true, title, message });
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
    <main className={`flex flex-col h-screen w-screen overflow-hidden font-sans antialiased transition-colors duration-250 ${
      getThemeClass("bg-zinc-50 text-zinc-900", "bg-zinc-950 text-zinc-100")
    } ${
      uiScale === "sm" ? "text-xs" : uiScale === "lg" ? "text-base" : "text-sm"
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
              className={`hidden md:flex w-[4px] hover:w-[6px] bg-transparent hover:bg-zinc-700 cursor-col-resize h-full transition-all z-30 select-none items-center justify-center border-l border-r ${
                getThemeClass("border-zinc-200 hover:border-zinc-300", "border-zinc-900 hover:border-zinc-800")
              } ${
                isDraggingSidebar ? getThemeClass("bg-zinc-300 w-[6px]", "bg-zinc-650 w-[6px]") : ""
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
            className={`hidden md:flex h-[4px] hover:h-[6px] cursor-row-resize w-full transition-all z-20 select-none items-center justify-center border-t ${
              getThemeClass("bg-zinc-200 hover:bg-zinc-300 border-zinc-200", "bg-zinc-900 hover:bg-zinc-700 border-zinc-900")
            } ${
              isDraggingDrawer ? getThemeClass("bg-zinc-300 h-[6px]", "bg-zinc-600 h-[6px]") : ""
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
    </main>
  );
}
