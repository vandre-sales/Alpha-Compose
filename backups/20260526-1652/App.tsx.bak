/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  Maximize, 
  Download, 
  Layers,
  Settings2,
  ZoomIn,
  ZoomOut,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { 
  UploadedImage, 
  AspectRatioType, 
  ASPECT_RATIOS, 
  RESOLUTIONS, 
  ExportResolution 
} from './types';
import * as fabric from 'fabric';
import JSZip from 'jszip';

// Components
import CanvasEditor from './components/CanvasEditor';

export default function App() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('1:1');
  const [exportRes, setExportRes] = useState<ExportResolution>('1K');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  
  const canvasRef = useRef<fabric.Canvas | null>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent, forcedRole?: 'background' | 'subject') => {
    let files: File[] = [];
    if ('dataTransfer' in e) {
      files = Array.from(e.dataTransfer.files);
    } else {
      files = Array.from((e.target as HTMLInputElement).files || []);
    }

    if (images.length + files.length > 20) {
      alert('Maximum 20 images allowed.');
      return;
    }

    const newImages = await Promise.all(
      files.map(async (file: File) => {
        return new Promise<UploadedImage>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const url = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
              resolve({
                id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                url,
                name: file.name,
                width: img.width,
                height: img.height,
                aspectRatio: img.width / img.height,
                role: forcedRole || 'none',
                visible: true,
              });
            };
            img.src = url;
          };
          reader.readAsDataURL(file);
        });
      })
    );

    setImages((prev) => [...prev, ...newImages]);
  }, [images]);

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const toggleVisibility = (id: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, visible: !img.visible } : img));
  };

  const moveImage = (id: string) => {
    setImages(prev => prev.map(img => {
      if (img.id === id) {
        return { ...img, role: img.role === 'background' ? 'subject' : 'background' };
      }
      return img;
    }));
  };

  const downloadAll = async () => {
    if (!canvasRef.current || images.length === 0) return;
    
    const bgImages = images.filter(img => img.role === 'background');
    const subImages = images.filter(img => img.role === 'subject');

    if (bgImages.length === 0) {
      alert('Please select at least one image as a background.');
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total: bgImages.length });
    
    try {
      const zip = new JSZip();
      const canvas = canvasRef.current;
      const res = exportRes;
      const totalPixels = RESOLUTIONS[res];
      const arValue = ASPECT_RATIOS[aspectRatio];
      
      // Calculate target dimensions based on W * H = TotalPixels and W/H = AR
      // H = sqrt(TotalPixels / AR)
      const targetHeight = Math.sqrt(totalPixels / arValue);
      const targetWidth = targetHeight * arValue;
      
      // multiplier = TargetWidth / CanvasWidth
      const multiplier = targetWidth / canvas.width;
      
      const allObjects = canvas.getObjects();

      // Algorithm: Toggle visibility on objects to render one by one
      for (let i = 0; i < bgImages.length; i++) {
        setExportProgress({ current: i + 1, total: bgImages.length });
        const currentBg = bgImages[i];

        // Prepare canvas for this specific frame
        allObjects.forEach(obj => {
          const imageId = (obj as any)._imageId;
          const imageRole = (obj as any)._imageRole;

          if (imageRole === 'background') {
            // Only show the specific background of this turn
            obj.set('visible', imageId === currentBg.id);
          } else if (imageRole === 'subject') {
            // Follow the "Show" state selected by user for subjects
            const subData = subImages.find(s => s.id === imageId);
            obj.set('visible', subData ? subData.visible : false);
          }
        });

        canvas.renderAll();

        const dataUrl = canvas.toDataURL({
          format: 'png',
          multiplier: multiplier,
        });
        
        const base64Data = dataUrl.split(',')[1];
        const safeName = currentBg.name.replace(/\.[^/.]+$/, "");
        zip.file(`compose_${i + 1}_${safeName}_${res}.png`, base64Data, { base64: true });
        
        // Brief timeout to let the UI update the counter
        await new Promise(r => setTimeout(r, 50));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `alpha_compose_${res}_pack.zip`;
      link.click();
      
      // Cleanup: revert visibility to the state in the "images" array
      allObjects.forEach(obj => {
        const imageId = (obj as any)._imageId;
        const imgState = images.find(img => img.id === imageId);
        if (imgState) obj.set('visible', imgState.visible);
      });
      canvas.renderAll();

    } catch (err) {
      console.error(err);
      alert('Export failed.');
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  const Section = ({ title, role, items, color }: { title: string, role: 'background' | 'subject', items: UploadedImage[], color: string }) => {
    const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };

    const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      handleFileUpload(e, role);
    };

    return (
      <div 
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="flex-1 flex flex-col min-h-0 bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h2 className={cn("text-[10px] font-bold uppercase tracking-[0.2em]", color)}>{title}</h2>
          <span className="text-[10px] text-white/20 font-mono">{items.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.map(img => (
            <motion.div
              key={img.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "group relative h-16 rounded-lg bg-black/40 border border-white/5 overflow-hidden flex transition-all",
                !img.visible && "opacity-40 grayscale"
              )}
            >
              <div className="w-16 h-full flex-shrink-0 bg-black/60 relative">
                <img src={img.url} className="w-full h-full object-cover" alt="" />
                {!img.visible && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-1 h-1 bg-white/20 rounded-full" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 p-2 flex flex-col justify-center">
                <p className="text-[10px] font-medium truncate opacity-60 mb-1.5">{img.name}</p>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => toggleVisibility(img.id)}
                    title={img.visible ? 'Hide' : 'Show'}
                    className="p-1 px-2 rounded-sm bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all text-[8px] uppercase font-bold flex items-center gap-1"
                  >
                    {img.visible ? <ImageIcon size={10} /> : <div className="w-2.5 h-2.5 border border-dashed border-white/20 rounded-sm" />}
                    {img.visible ? 'Hide' : 'Show'}
                  </button>
                  <button 
                    onClick={() => moveImage(img.id)}
                    title="Move to other section"
                    className="p-1 px-2 rounded-sm bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all text-[8px] uppercase font-bold flex items-center gap-1"
                  >
                    <Layers size={10} />
                    Move
                  </button>
                  <button 
                    onClick={() => removeImage(img.id)}
                    title="Delete"
                    className="ml-auto p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          <label className="block w-full cursor-pointer">
            <div className="w-full py-4 border border-dashed border-white/10 rounded-lg text-[9px] uppercase font-bold tracking-widest text-white/20 hover:text-white/40 hover:border-white/20 transition-all text-center">
              Drop or Click +
            </div>
            <input type="file" className="hidden" multiple onChange={(e) => handleFileUpload(e, role)} accept="image/*" />
          </label>
        </div>
      </div>
    );
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
        />
        
        <Section 
          title="Backgrounds (BG)" 
          role="background" 
          items={images.filter(img => img.role === 'background')} 
          color="text-blue-400"
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[radial-gradient(circle_at_center,_#111_0%,_#050505_100%)] relative">
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Ratio</span>
              <div className="flex bg-white/5 p-1 rounded border border-white/10">
                {(Object.keys(ASPECT_RATIOS) as AspectRatioType[]).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={cn(
                      "px-3 py-1 rounded text-[10px] font-bold transition-all",
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
                <div className="flex items-center gap-3 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold text-blue-400 font-mono uppercase tracking-widest">
                    Generating: {exportProgress.current} / {exportProgress.total}
                  </span>
                </div>
              )}
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-12 overflow-hidden">
          <CanvasEditor 
            aspectRatio={ASPECT_RATIOS[aspectRatio]} 
            images={images} 
            onCanvasReady={(c) => {
              canvasRef.current = c;
            }}
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
               <div className="grid grid-cols-3 gap-2">
                {(Object.keys(RESOLUTIONS) as ExportResolution[]).map((res) => (
                  <button
                    key={res}
                    onClick={() => setExportRes(res)}
                    className={cn(
                      "py-2 rounded text-[10px] font-bold border transition-all",
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
              onClick={downloadAll}
              disabled={isExporting || images.length === 0}
              className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-lg hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_20px_40px_rgba(255,255,255,0.05)]"
            >
              {isExporting ? <span className="animate-pulse">Processing...</span> : 'Generate Pack'}
            </button>
            <p className="text-[9px] text-center text-white/20 uppercase tracking-widest">
              High Resolution Export Enabled
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}
