"use client";

import React from "react";
import { Terminal as TerminalIcon, Terminal, ChevronUp, ChevronDown, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { RunCodeResponse } from "../../app/config/api";

interface ConsoleDrawerProps {
  activeConsoleTab: "output" | "input";
  setActiveConsoleTab: (tab: "output" | "input") => void;
  isDrawerCollapsed: boolean;
  setIsDrawerCollapsed: (collapsed: boolean) => void;
  drawerHeight: number;
  inputData: string;
  setInputData: (data: string) => void;
  isRunning: boolean;
  result: RunCodeResponse | null;
  errorMsg: string | null;
  getThemeClass: (light: string, dark: string) => string;
}

export default function ConsoleDrawer({
  activeConsoleTab,
  setActiveConsoleTab,
  isDrawerCollapsed,
  setIsDrawerCollapsed,
  drawerHeight,
  inputData,
  setInputData,
  isRunning,
  result,
  errorMsg,
  getThemeClass
}: ConsoleDrawerProps) {
  return (
    <div 
      style={{ height: isDrawerCollapsed ? "40px" : `${drawerHeight}px` }}
      className={`w-full border-t flex flex-col transition-[height] duration-75 relative z-10 ${
        getThemeClass("bg-zinc-50 border-zinc-200", "bg-zinc-950 border-zinc-900")
      }`}
    >
      {/* Drawer Tab Headers */}
      <div className={`h-10 flex items-center justify-between px-4 border-b select-none ${
        getThemeClass("bg-zinc-100 border-zinc-200", "bg-zinc-950 border-zinc-900")
      }`}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveConsoleTab("output");
              setIsDrawerCollapsed(false);
            }}
            className={`px-3 h-10 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeConsoleTab === "output" && !isDrawerCollapsed
                ? getThemeClass("border-zinc-800 text-zinc-900", "border-white text-zinc-100")
                : "border-transparent text-zinc-500 hover:text-zinc-350"
            }`}
          >
            <TerminalIcon className="h-3.5 w-3.5" />
            Console Output
          </button>
          <button
            onClick={() => {
              setActiveConsoleTab("input");
              setIsDrawerCollapsed(false);
            }}
            className={`px-3 h-10 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeConsoleTab === "input" && !isDrawerCollapsed
                ? getThemeClass("border-zinc-800 text-zinc-900", "border-white text-zinc-100")
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Custom Input (stdin)
          </button>
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
          className="p-1 rounded hover:bg-zinc-205 text-zinc-500 hover:text-zinc-300 transition-colors"
          title={isDrawerCollapsed ? "Expand Console" : "Collapse Console"}
        >
          {isDrawerCollapsed ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Drawer Body Panel */}
      {!isDrawerCollapsed && (
        <div className="flex-1 min-h-0 overflow-auto">
          
          {/* Console Tab */}
          {activeConsoleTab === "output" && (
            <div className="h-full p-5 font-mono text-xs select-text">
              
              {isRunning && (
                <div className="flex items-center gap-2 text-zinc-500 py-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                  <span>Compiling and running workspace files...</span>
                </div>
              )}

              {!isRunning && !result && !errorMsg && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 py-4 select-none">
                  <TerminalIcon className="h-5 w-5 opacity-40 text-zinc-500" />
                  <span className="text-zinc-500">Terminal ready. Run code to display output.</span>
                </div>
              )}

              {errorMsg && (
                <div className={`p-3.5 rounded-lg border flex items-start gap-2.5 ${
                  getThemeClass("bg-rose-50 border-rose-200 text-rose-700", "bg-red-950/20 border-red-900/30 text-red-400")
                }`}>
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs uppercase tracking-wider">Engine Execution Error</div>
                    <div className="text-xs mt-1 leading-relaxed">{errorMsg}</div>
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {/* Status bar */}
                  <div className={`flex items-center gap-4 text-xs font-sans pb-2 border-b ${
                    getThemeClass("border-zinc-200", "border-zinc-900")
                  }`}>
                    <span className="text-zinc-550">Verdict:</span>
                    <span className={`font-semibold ${
                      result.status === "Success" ? "text-emerald-500" : "text-rose-500"
                    }`}>
                      {result.status}
                    </span>
                    <span className="text-zinc-400">|</span>
                    <span className="text-zinc-550">Duration:</span>
                    <span className="text-zinc-500 font-mono">{result.duration?.toFixed(3)}s</span>
                  </div>

                  {/* stdout */}
                  {result.stdout && (
                    <div className="space-y-1">
                      <pre className={`whitespace-pre-wrap leading-relaxed ${
                        getThemeClass("text-zinc-800", "text-zinc-200")
                      }`}>{result.stdout}</pre>
                    </div>
                  )}

                  {/* stderr */}
                  {result.stderr && (
                    <div className="space-y-1">
                      <pre className="text-rose-500/90 whitespace-pre-wrap leading-relaxed">{result.stderr}</pre>
                    </div>
                  )}

                  {!result.stdout && !result.stderr && result.status === "Success" && (
                    <div className="text-zinc-500 italic">Code executed successfully with no output.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Input Tab */}
          {activeConsoleTab === "input" && (
            <textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              className={`w-full h-full p-5 font-mono text-xs resize-none focus:outline-none ${
                getThemeClass("bg-white text-zinc-800 placeholder-zinc-400", "bg-zinc-950 text-zinc-300 placeholder-zinc-700")
              }`}
              placeholder="Enter interactive program inputs here..."
            />
          )}

        </div>
      )}

    </div>
  );
}
