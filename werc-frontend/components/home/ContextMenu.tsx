import React, { RefObject } from "react";
import { Edit, PlayCircle, Copy, Trash2, Plus, FolderPlus, FolderOpen } from "lucide-react";

interface ContextMenuProps {
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    targetPath: string;
    isFolder: boolean;
  };
  contextMenuRef: RefObject<HTMLDivElement | null>;
  theme: "light" | "dark";
  getThemeClass: (light: string, dark: string) => string;
  onRenameTrigger: (path: string, isFolder: boolean) => void;
  onSetEntrypoint: (path: string) => void;
  onCopyPath: (path: string) => void;
  onDelete: (path: string, isFolder: boolean) => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onCollapseAll: () => void;
}

export default function ContextMenu({
  contextMenu,
  contextMenuRef,
  theme,
  getThemeClass,
  onRenameTrigger,
  onSetEntrypoint,
  onCopyPath,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onCollapseAll
}: ContextMenuProps) {
  if (!contextMenu.visible) return null;

  const isGeneralWorkspace = contextMenu.targetPath === "";

  return (
    <div
      ref={contextMenuRef}
      className={`absolute z-[100] w-48 py-1.5 rounded-lg border shadow-xl ${
        getThemeClass("bg-white border-zinc-200 text-zinc-700", "bg-zinc-900 border-zinc-800 text-zinc-300")
      }`}
      style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
    >
      {isGeneralWorkspace ? (
        <>
          <button
            onClick={onCreateFile}
            className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${getThemeClass("hover:bg-zinc-100", "hover:bg-zinc-800")}`}
          >
            <Plus className="h-3.5 w-3.5" />
            New File
          </button>
          <button
            onClick={onCreateFolder}
            className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${getThemeClass("hover:bg-zinc-100", "hover:bg-zinc-800")}`}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New Folder
          </button>
          <div className={`my-1 border-t ${getThemeClass("border-zinc-200", "border-zinc-800")}`} />
          <button
            onClick={onCollapseAll}
            className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${getThemeClass("hover:bg-zinc-100", "hover:bg-zinc-800")}`}
          >
            <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
            Collapse All Folders
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onRenameTrigger(contextMenu.targetPath, contextMenu.isFolder)}
            className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${getThemeClass("hover:bg-zinc-100", "hover:bg-zinc-800")}`}
          >
            <Edit className="h-3.5 w-3.5" />
            Rename
          </button>

          {!contextMenu.isFolder && (
            <button
              onClick={() => onSetEntrypoint(contextMenu.targetPath)}
              className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${getThemeClass("hover:bg-zinc-100", "hover:bg-zinc-800")}`}
            >
              <PlayCircle className="h-3.5 w-3.5 text-indigo-400" />
              Set as Entrypoint
            </button>
          )}

          <button
            onClick={() => onCopyPath(contextMenu.targetPath)}
            className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${getThemeClass("hover:bg-zinc-100", "hover:bg-zinc-800")}`}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Relative Path
          </button>

          <div className={`my-1 border-t ${getThemeClass("border-zinc-200", "border-zinc-800")}`} />

          <button
            onClick={() => onDelete(contextMenu.targetPath, contextMenu.isFolder)}
            className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 text-rose-500 ${getThemeClass("hover:bg-zinc-100", "hover:bg-zinc-800")}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </>
      )}
    </div>
  );
}
