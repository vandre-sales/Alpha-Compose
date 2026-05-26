import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { UploadedImage } from '../types';
import { applyGridScaleToSubject, unlockSubject, computeGridSliceSize } from '../lib/utils';

interface CanvasEditorProps {
  aspectRatio: number;
  images: UploadedImage[];
  gridMode: boolean;
  onCanvasReady: (canvas: fabric.Canvas) => void;
}

export default function CanvasEditor({ aspectRatio, images, gridMode, onCanvasReady }: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  // Track internal state of objects to sync with the images prop
  const objectsRef = useRef<Map<string, fabric.FabricObject>>(new Map());

  useEffect(() => {
    if (!canvasElementRef.current || !containerRef.current) return;

    const canvas = new fabric.Canvas(canvasElementRef.current, {
      width: 0,
      height: 0,
      backgroundColor: '#000',
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;
    onCanvasReady(canvas);

    const resizeCanvas = () => {
      if (!containerRef.current || !fabricCanvasRef.current) return;
      
      const container = containerRef.current;
      const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
      
      let canvasWidth, canvasHeight;
      const padding = 100;
      const availableWidth = containerWidth - padding;
      const availableHeight = containerHeight - padding;
      
      if (availableWidth / availableHeight > aspectRatio) {
        canvasHeight = availableHeight;
        canvasWidth = availableHeight * aspectRatio;
      } else {
        canvasWidth = availableWidth;
        canvasHeight = availableWidth / aspectRatio;
      }

      fabricCanvasRef.current.setDimensions({
        width: canvasWidth,
        height: canvasHeight,
      });

      // Special handling for background on resize
      images.forEach(img => {
        if (img.role === 'background') {
          const obj = objectsRef.current.get(img.id);
          if (obj) {
            // Keep background centered and covering
            const scale = Math.max(canvasWidth / img.width, canvasHeight / img.height);
            // Only force scale if it's smaller than required to cover
            if (obj.scaleX! < scale) {
              obj.set({ scaleX: scale, scaleY: scale });
            }
            // Ensure background is at bottom
            fabricCanvasRef.current?.sendObjectToBack(obj);
          }
        }
      });

      fabricCanvasRef.current.renderAll();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.dispose();
    };
  }, [aspectRatio]);

  // Sync images with canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const syncImages = async () => {
      const activeImages = images.filter(img => img.role !== 'none');
      const currentIds = new Set(activeImages.map(img => img.id));
      
      // Remove objects no longer present
      for (const [id, obj] of objectsRef.current.entries()) {
        if (!currentIds.has(id)) {
          canvas.remove(obj);
          objectsRef.current.delete(id);
        }
      }

      // Add or update objects
      for (const img of activeImages) {
        let obj = objectsRef.current.get(img.id);

        if (!obj) {
          try {
            const fabricImg = await fabric.FabricImage.fromURL(img.url, { crossOrigin: 'anonymous' });
            
            // Set custom property to identify it during export
            fabricImg._imageId = img.id;
            fabricImg._imageRole = img.role as 'background' | 'subject';

            if (img.role === 'background') {
              const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
              fabricImg.set({
                scaleX: scale,
                scaleY: scale,
                left: canvas.width / 2,
                top: canvas.height / 2,
                originX: 'center',
                originY: 'center',
                selectable: true,
                hasControls: true,
                lockRotation: true,
                visible: img.visible,
              });
              canvas.insertAt(0, fabricImg);
            } else {
              const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.5;
              fabricImg.set({
                scaleX: scale,
                scaleY: scale,
                left: canvas.width / 2,
                top: canvas.height / 2,
                originX: 'center',
                originY: 'center',
                selectable: true,
                visible: img.visible,
              });
              canvas.add(fabricImg);
            }
            
            objectsRef.current.set(img.id, fabricImg);
          } catch (err) {
            console.error('Failed to load image into fabric', err);
          }
        } else {
          // Update visibility
          obj.set('visible', img.visible);

          // Detect role change and re-apply defaults
          const previousRole = obj._imageRole;
          const newRole = img.role as 'background' | 'subject';
          obj._imageRole = newRole;

          if (previousRole !== newRole) {
            // Role changed — re-apply scale and positioning for new role
            if (newRole === 'background') {
              const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
              obj.set({
                scaleX: scale,
                scaleY: scale,
                left: canvas.width / 2,
                top: canvas.height / 2,
                originX: 'center',
                originY: 'center',
                lockRotation: true,
              });
              canvas.sendObjectToBack(obj);
            } else {
              const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.5;
              obj.set({
                scaleX: scale,
                scaleY: scale,
                left: canvas.width / 2,
                top: canvas.height / 2,
                originX: 'center',
                originY: 'center',
                lockRotation: false,
              });
              canvas.bringObjectToFront(obj);
            }
          } else {
            // Same role — just adjust Z-order
            if (newRole === 'background') {
              canvas.sendObjectToBack(obj);
            } else {
              canvas.bringObjectToFront(obj);
            }
          }
        }
      }
      canvas.requestRenderAll();
    };

    syncImages();
  }, [images]);

  // Grid mode effect: apply/remove discrete scale on subjects
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    images.filter(i => i.role === 'subject').forEach(img => {
      const obj = objectsRef.current.get(img.id);
      if (!obj) return;

      if (gridMode) {
        const scale = img.gridScale ?? 10;
        applyGridScaleToSubject(obj, img.width, img.height, scale, canvas.width, canvas.height);
      } else {
        unlockSubject(obj);
      }
    });

    canvas.requestRenderAll();
  }, [gridMode, images]);

  // Compute slice size for the SVG overlay
  const canvasEl = fabricCanvasRef.current;
  const sliceSize = canvasEl ? computeGridSliceSize(canvasEl.width, canvasEl.height) : 0;
  const canvasW = canvasEl?.width ?? 0;
  const canvasH = canvasEl?.height ?? 0;

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative">
      <div className="shadow-[0_0_100px_rgba(0,0,0,0.6)] border border-white/20 overflow-hidden bg-[#000] relative group">
        <canvas ref={canvasElementRef} />
        {/* Grid overlay — SVG outside Fabric canvas so it doesn't appear in exports */}
        {gridMode && sliceSize > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasW}
            height={canvasH}
            style={{ opacity: 0.1 }}
          >
            {/* Vertical lines */}
            {Array.from({ length: Math.floor(canvasW / sliceSize) + 1 }, (_, i) => (
              <line
                key={`v-${i}`}
                x1={i * sliceSize}
                y1={0}
                x2={i * sliceSize}
                y2={canvasH}
                stroke="white"
                strokeWidth={1}
              />
            ))}
            {/* Horizontal lines */}
            {Array.from({ length: Math.floor(canvasH / sliceSize) + 1 }, (_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * sliceSize}
                x2={canvasW}
                y2={i * sliceSize}
                stroke="white"
                strokeWidth={1}
              />
            ))}
          </svg>
        )}
        <div className="absolute inset-0 border border-blue-500/50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      
      {/* Precision indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-20 pointer-events-none">
        <div className="w-1 h-1 bg-white" />
        <div className="w-1 h-1 bg-white" />
        <div className="w-1 h-1 bg-white" />
      </div>
    </div>
  );
}
