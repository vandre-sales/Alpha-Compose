import React from 'react';
import { Trash2, Image as ImageIcon, Layers, Plus, Minus } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { UploadedImage } from '../types';

interface SectionProps {
  title: string;
  role: 'background' | 'subject';
  items: UploadedImage[];
  color: string;
  gridMode?: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent, role: 'background' | 'subject') => void;
  onToggleVisibility: (id: string) => void;
  onMove: (id: string) => void;
  onRemove: (id: string) => void;
  onIncrementScale?: (id: string, delta: 1 | -1) => void;
}

export default function Section({ title, role, items, color, gridMode, onUpload, onToggleVisibility, onMove, onRemove, onIncrementScale }: SectionProps) {
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onUpload(e, role);
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
                  onClick={() => onToggleVisibility(img.id)}
                  title={img.visible ? 'Hide' : 'Show'}
                  aria-label={img.visible ? `Hide ${img.name}` : `Show ${img.name}`}
                  className="p-1 px-2 rounded-sm bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all text-[8px] uppercase font-bold flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  {img.visible ? <ImageIcon size={10} /> : <div className="w-2.5 h-2.5 border border-dashed border-white/20 rounded-sm" />}
                  {img.visible ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => onMove(img.id)}
                  title="Move to other section"
                  aria-label={`Move ${img.name} to ${role === 'background' ? 'subjects' : 'backgrounds'}`}
                  className="p-1 px-2 rounded-sm bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all text-[8px] uppercase font-bold flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  <Layers size={10} />
                  Move
                </button>
                <button
                  onClick={() => onRemove(img.id)}
                  title="Delete"
                  aria-label={`Delete ${img.name}`}
                  className="ml-auto p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                >
                  <Trash2 size={12} />
                  </button>
                </div>
                {/* Grid scale controls — only for subjects when grid mode is active */}
                {gridMode && role === 'subject' && onIncrementScale && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      onClick={() => onIncrementScale(img.id, -1)}
                      disabled={(img.gridScale ?? 10) <= 1}
                      aria-label={`Decrease scale of ${img.name}`}
                      className="p-0.5 rounded-sm bg-white/5 hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="text-[9px] font-mono text-white/50 w-8 text-center">
                      {img.gridScale ?? 10}/{20}
                    </span>
                    <button
                      onClick={() => onIncrementScale(img.id, 1)}
                      disabled={(img.gridScale ?? 10) >= 20}
                      aria-label={`Increase scale of ${img.name}`}
                      className="p-0.5 rounded-sm bg-white/5 hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        <label className="block w-full cursor-pointer">
          <div className="w-full py-4 border border-dashed border-white/10 rounded-lg text-[9px] uppercase font-bold tracking-widest text-white/20 hover:text-white/40 hover:border-white/20 transition-all text-center">
            Drop or Click +
          </div>
          <input type="file" className="hidden" multiple onChange={(e) => onUpload(e, role)} accept="image/*" />
        </label>
      </div>
    </div>
  );
}
