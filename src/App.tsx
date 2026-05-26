/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { cn } from './lib/utils';
import {
  AspectRatioType,
  ASPECT_RATIOS,
  RESOLUTIONS,
  ExportResolution,
} from './types';
import { useState } from 'react';

// Hooks
import { useImageLibrary } from './hooks/useImageLibrary';
import { useExporter } from './hooks/useExporter';
import { useToast, ToastContainer } from './components/Toast';

// Components
import CanvasEditor from './components/CanvasEditor';
import Section from './components/Section';

export default function App() {
  const { toasts, addToast, removeToast } = useToast();
  const { images, handleFileUpload, removeImage, toggleVisibility, moveImage, incrementGridScale } = useImageLibrary(addToast);
  const { isExporting, exportProgress, setCanvas, downloadAll, cancelExport } = useExporter(addToast);

  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('1:1');
  const [exportRes, setExportRes] = useState<ExportResolution>('1K');
  const [gridMode, setGridMode] = useState(false);

  const handleGenerate = () => {
    downloadAll(images, aspectRatio, exportRes);
  };

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 font-sans select-none overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-[300px] h-full border-r border-white/10 bg-[#0a0a0a] flex flex-col z-20 p-4 space-y-4">
        <div className="px-2 pt-2">
          <h1 className="text-xs font-black uppercase tracking-[0.3em] text-blue-500 mb-1">Alpha Compose</h1>
          <p className="text-[9px] text-slate-500 font-mono tracking-tighter italic">Precision Image Orchestrator</p>
        </div>

        <Section
          title="Subjects (SUB)"
          role="subject"
          items={images.filter(img => img.role === 'subject')}
          color="text-purple-400"
          gridMode={gridMode}
          onUpload={handleFileUpload}
          onToggleVisibility={toggleVisibility}
          onMove={moveImage}
          onRemove={removeImage}
          onIncrementScale={incrementGridScale}
        />

        <Section
          title="Backgrounds (BG)"
          role="background"
          items={images.filter(img => img.role === 'background')}
          color="text-blue-400"
          onUpload={handleFileUpload}
          onToggleVisibility={toggleVisibility}
          onMove={moveImage}
          onRemove={removeImage}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[radial-gradient(circle_at_center,_#111_0%,_#050505_100%)] relative">
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5">
          <div className="flex items-center gap-8">
            {/* Grid toggle */}
            <button
              onClick={() => setGridMode(!gridMode)}
              aria-pressed={gridMode}
              aria-label="Toggle grid mode"
              className={cn(
                "px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest border transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
                gridMode
                  ? "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white"
              )}
            >
              ⊞ Grid {gridMode ? 'ON' : 'OFF'}
            </button>

            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Ratio</span>
              <div className="flex bg-white/5 p-1 rounded border border-white/10" role="group" aria-label="Aspect ratio selection">
                {(Object.keys(ASPECT_RATIOS) as AspectRatioType[]).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    aria-pressed={aspectRatio === ratio}
                    className={cn(
                      "px-3 py-1 rounded text-[10px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
                      aspectRatio === ratio ? "bg-blue-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isExporting && (
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full animate-pulse" role="status" aria-live="polite">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold text-blue-400 font-mono uppercase tracking-widest">
                  Frame {exportProgress.current} / {exportProgress.total} · S{exportProgress.currentSub}/{exportProgress.totalSubs} B{exportProgress.currentBg}/{exportProgress.totalBgs}
                </span>
                <button
                  onClick={cancelExport}
                  aria-label="Cancel export"
                  className="ml-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-12 overflow-hidden">
          <CanvasEditor
            aspectRatio={ASPECT_RATIOS[aspectRatio]}
            gridMode={gridMode}
            images={images}
            onCanvasReady={setCanvas}
          />
        </div>

        <div className="h-10 border-t border-white/5 flex items-center justify-center gap-6 text-[9px] uppercase tracking-[0.3em] text-white/20">
          <span>{exportRes} RENDER ENGINE</span>
          <div className="w-1 h-1 bg-white/10 rounded-full" />
          <span>REAL-TIME COMPOSITION</span>
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="w-[300px] h-full border-l border-white/10 bg-[#0a0a0a] p-6 flex flex-col space-y-8 z-20">
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">Workflow</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 space-y-3">
              <p className="text-[9px] text-slate-500 leading-normal uppercase font-mono tracking-tighter">
                1. Upload subjects with alpha.
                <br/>2. Upload backgrounds.
                <br/>3. Toggle Show/Hide for desired Subs.
                <br/>4. Generate pack (Iterates all BGs).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">Quality</h2>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Export quality selection">
                {(Object.keys(RESOLUTIONS) as ExportResolution[]).map((res) => (
                  <button
                    key={res}
                    onClick={() => setExportRes(res)}
                    aria-pressed={exportRes === res}
                    className={cn(
                      "py-2 rounded text-[10px] font-bold border transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
                      exportRes === res
                        ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    )}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 flex flex-col justify-end">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <button
              onClick={handleGenerate}
              disabled={isExporting || images.length === 0}
              aria-label="Generate ZIP pack with composed images"
              className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-lg hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_20px_40px_rgba(255,255,255,0.05)] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              {isExporting ? <span className="animate-pulse">Processing...</span> : 'Generate Pack'}
            </button>
            <p className="text-[9px] text-center text-white/20 uppercase tracking-widest">
              High Resolution Export Enabled
            </p>
          </div>
        </section>
      </aside>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
