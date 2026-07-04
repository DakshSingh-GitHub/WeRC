"use client";

import React from "react";
import { 
  Files, 
  Sliders, 
  BookOpen, 
  Plus, 
  FolderPlus, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  FileCode, 
  Moon, 
  Sun, 
  Type, 
  ZoomIn 
} from "lucide-react";
import { CodeFile } from "../../app/config/api";

interface SidebarDrawerProps {
  activeSidebarTab: "files" | "settings" | "notes";
  sidebarWidth: number;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  uiScale: "sm" | "md" | "lg";
  setUiScale: (scale: "sm" | "md" | "lg") => void;
  files: CodeFile[];
  folders: string[];
  activeFilePath: string;
  setActiveFilePath: (path: string) => void;
  entrypoint: string;
  setEntrypoint: (path: string) => void;
  collapsedFolders: Record<string, boolean>;
  toggleFolder: (folder: string) => void;
  createTargetDir: string;
  setCreateTargetDir: (dir: string) => void;
  renamePath: string | null;
  setRenamePath: (path: string | null) => void;
  renameValue: string;
  setRenameValue: (val: string) => void;
  isRenamingFolder: boolean;
  setIsRenamingFolder: (val: boolean) => void;
  handleCreateFile: (targetDir: string, name: string) => void;
  handleCreateFolder: (targetDir: string, name: string) => void;
  handleRename: () => void;
  handleContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
  interviewerNotes: string;
  setInterviewerNotes: (notes: string) => void;
  getThemeClass: (light: string, dark: string) => string;
  triggerPrompt: (title: string, placeholder: string, defaultValue: string, onSubmit: (val: string) => void) => void;
  isHost?: boolean;
  executionEnabled?: boolean;
  setExecutionEnabled?: (val: boolean) => void;
}

export default function SidebarDrawer({
  activeSidebarTab,
  sidebarWidth,
  theme,
  setTheme,
  fontSize,
  setFontSize,
  uiScale,
  setUiScale,
  files,
  folders,
  activeFilePath,
  setActiveFilePath,
  entrypoint,
  collapsedFolders,
  toggleFolder,
  createTargetDir,
  setCreateTargetDir,
  renamePath,
  renameValue,
  setRenameValue,
  isRenamingFolder,
  handleCreateFile,
  handleCreateFolder,
  handleRename,
  handleContextMenu,
  interviewerNotes,
  setInterviewerNotes,
  getThemeClass,
  triggerPrompt,
  isHost = false,
  executionEnabled = true,
  setExecutionEnabled
}: SidebarDrawerProps) {

  // Nested File Tree Renderer inside drawer
  const renderDrawerFileTree = (currentDir: string = "", depth: number = 0) => {
    const dirPrefix = currentDir ? currentDir + "/" : "";
    
    const subfolders = folders.filter(f => {
      if (!f.startsWith(dirPrefix)) return false;
      const relative = f.slice(dirPrefix.length);
      return relative && !relative.includes("/");
    });

    const subfiles = files.filter(f => {
      if (!f.path.startsWith(dirPrefix)) return false;
      const relative = f.path.slice(dirPrefix.length);
      return relative && !relative.includes("/");
    });

    return (
      <div className="space-y-1">
        {/* Render Folder Nodes */}
        {subfolders.map(folderPath => {
          const folderName = folderPath.includes("/") ? folderPath.substring(folderPath.lastIndexOf("/") + 1) : folderPath;
          const isCollapsed = collapsedFolders[folderPath];
          const isRenaming = renamePath === folderPath && isRenamingFolder;

          return (
            <div key={folderPath} className="space-y-1">
              <div
                onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, folderPath, true); }}
                className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs cursor-pointer group transition-colors select-none ${
                  getThemeClass("hover:bg-zinc-200 text-zinc-700", "hover:bg-zinc-900 text-zinc-300")
                }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => toggleFolder(folderPath)}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 text-zinc-500" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-zinc-500" />
                  )}
                  {isCollapsed ? (
                    <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  )}
                  
                  {isRenaming ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={handleRename}
                      onKeyDown={(e) => e.key === "Enter" && handleRename()}
                      className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white max-w-[120px] focus:outline-none"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate">{folderName}</span>
                  )}
                </div>

                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreateTargetDir(folderPath);
                    }}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
                    title="New File Inside"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {!isCollapsed && renderDrawerFileTree(folderPath, depth + 1)}
            </div>
          );
        })}

        {/* Render File Nodes */}
        {subfiles.map(file => {
          const fileName = file.path.includes("/") ? file.path.substring(file.path.lastIndexOf("/") + 1) : file.path;
          const isActive = file.path === activeFilePath;
          const isEntry = file.path === entrypoint;
          const isRenaming = renamePath === file.path && !isRenamingFolder;

          return (
            <div
              key={file.path}
              onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, file.path, false); }}
              onClick={() => setActiveFilePath(file.path)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer group transition-colors ${
                isActive
                  ? getThemeClass("bg-zinc-200 text-zinc-900 font-medium", "bg-zinc-900 text-white font-medium")
                  : getThemeClass("hover:bg-zinc-150 text-zinc-650", "hover:bg-zinc-900/50 text-zinc-400")
              }`}
              style={{ paddingLeft: `${depth * 12 + 16}px` }}
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileCode className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-indigo-500" : "text-zinc-500"}`} />
                {isRenaming ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => e.key === "Enter" && handleRename()}
                    className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white max-w-[120px] focus:outline-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate">{fileName}</span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 select-none">
                {isEntry && (
                  <span className="text-[8px] px-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-semibold shrink-0">
                    Entry
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className={`h-full border-r flex flex-col p-4 select-none absolute md:relative left-12 md:left-0 w-[calc(100vw-48px)] md:w-[var(--sidebar-width)] z-40 md:z-10 transition-all ${
        getThemeClass("bg-zinc-50 border-zinc-200", "bg-zinc-950 border-zinc-900")
      }`}
      style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
    >
      
      {/* FILE MANAGER PANEL */}
      {activeSidebarTab === "files" && (
        <div 
          onContextMenu={(e) => handleContextMenu(e, "", false)}
          className="flex flex-col h-full space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Workspace Files</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  triggerPrompt("New File", "Enter file name (e.g. app.py)", "", (name) => {
                    handleCreateFile(createTargetDir, name);
                  });
                }}
                className={`p-1 rounded border hover:text-zinc-100 transition-colors ${
                  getThemeClass("bg-zinc-100 border-zinc-300 text-zinc-600 hover:bg-zinc-200", "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800")
                }`}
                title="Add File at Root"
              >
                <Plus className="h-3 w-3" />
              </button>
              
              <button
                onClick={() => {
                  triggerPrompt("New Folder", "Enter folder name (e.g. models)", "", (name) => {
                    handleCreateFolder(createTargetDir, name);
                  });
                }}
                className={`p-1 rounded border hover:text-zinc-100 transition-colors ${
                  getThemeClass("bg-zinc-100 border-zinc-300 text-zinc-650 hover:bg-zinc-200", "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800")
                }`}
                title="Add Folder at Root"
              >
                <FolderPlus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {createTargetDir && (
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-[10px] text-indigo-400">
              <span className="truncate">Adding inside: {createTargetDir}</span>
              <button
                onClick={() => setCreateTargetDir("")}
                className="text-zinc-500 hover:text-zinc-300 font-bold"
              >
                Clear
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-1">
            {renderDrawerFileTree("")}
          </div>
        </div>
      )}

      {/* USER SETTINGS PANEL */}
      {activeSidebarTab === "settings" && (
        <div className="space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Workspace Settings</h3>
          
          {/* 1. Theme Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              Workspace Theme
            </label>
            <div className={`flex rounded-lg p-0.5 border ${
              getThemeClass("bg-zinc-200 border-zinc-300", "bg-zinc-900 border-zinc-800")
            }`}>
              <button
                onClick={() => setTheme("light")}
                className={`flex-1 py-1 rounded text-xs font-medium transition-all ${
                  theme === "light"
                    ? getThemeClass("bg-white text-zinc-900 shadow-sm", "bg-zinc-800 text-white")
                    : "text-zinc-500 hover:text-zinc-400"
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex-1 py-1 rounded text-xs font-medium transition-all ${
                  theme === "dark"
                    ? getThemeClass("bg-white text-zinc-900 shadow", "bg-zinc-800 text-white")
                    : "text-zinc-500 hover:text-zinc-400"
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          {/* 2. Font Size Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5" />
              Editor Font Size ({fontSize}px)
            </label>
            <input
              type="range"
              min="12"
              max="22"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* 3. Screen Zoom / Interface scale */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <ZoomIn className="h-3.5 w-3.5" />
              Interface Scale
            </label>
            <div className={`flex rounded-lg p-0.5 border ${
              getThemeClass("bg-zinc-200 border-zinc-300", "bg-zinc-900 border-zinc-800")
            }`}>
              {(["sm", "md", "lg"] as const).map((scale) => (
                <button
                  key={scale}
                  onClick={() => setUiScale(scale)}
                  className={`flex-1 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                    uiScale === scale
                      ? getThemeClass("bg-white text-zinc-900 shadow", "bg-zinc-800 text-white")
                      : "text-zinc-500 hover:text-zinc-400"
                  }`}
                >
                  {scale}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Host Code Execution Toggle */}
          {isHost && (
            <div className="space-y-1.5 pt-2 border-t border-zinc-800">
              <label className="text-xs font-medium text-zinc-400 flex items-center justify-between">
                <span>Allow Code Execution</span>
                <input
                  type="checkbox"
                  checked={executionEnabled}
                  onChange={(e) => setExecutionEnabled?.(e.target.checked)}
                  className="rounded border-zinc-800 bg-zinc-900 text-indigo-500 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </label>
              <p className="text-[10px] text-zinc-550 leading-normal">
                Enable or disable candidates' ability to compile and run code in the console.
              </p>
            </div>
          )}
        </div>
      )}

      {/* INTERVIEWER NOTES PANEL */}
      {activeSidebarTab === "notes" && (
        <div className="flex flex-col h-full space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Interviewer Notes</h3>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Private notes for interview feedback. Candidates cannot see these notes.
          </p>
          <textarea
            value={interviewerNotes}
            onChange={(e) => setInterviewerNotes(e.target.value)}
            className={`flex-1 w-full p-3 rounded-lg border text-xs font-sans resize-none focus:outline-none ${
              getThemeClass("bg-white border-zinc-300 text-zinc-800 focus:border-zinc-500", "bg-zinc-900 border-zinc-800 text-zinc-300 focus:border-zinc-700")
            }`}
            placeholder="Type interviewer observations..."
          />
        </div>
      )}

    </div>
  );
}
