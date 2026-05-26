import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { UploadedImage } from '../types';

interface CanvasEditorProps {
  aspectRatio: number;
  images: UploadedImage[];
  onCanvasReady: (canvas: fabric.Canvas) => void;
}

export default function CanvasEditor({ aspectRatio, images, onCanvasReady }: CanvasEditorProps) {
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
            (fabricImg as any)._imageId = img.id;
            (fabricImg as any)._imageRole = img.role;

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
          // Update visibility and role properties
          obj.set('visible', img.visible);
          (obj as any)._imageRole = img.role;

          if (img.role === 'background') {
            canvas.sendObjectToBack(obj);
          } else {
            canvas.bringObjectToFront(obj);
          }
        }
      }
      canvas.requestRenderAll();
    };

    syncImages();
  }, [images]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative">
      <div className="shadow-[0_0_100px_rgba(0,0,0,0.6)] border border-white/20 overflow-hidden bg-[#000] relative group">
        <canvas ref={canvasElementRef} />
        <div className="absolute inset-0 border border-blue-500/50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      
      {/* Precision indicators */}
      <div className="absolute bottom-8 left-1/2 -track-x-1/2 flex gap-1.5 opacity-20 pointer-events-none">
        <div className="w-1 h-1 bg-white" />
        <div className="w-1 h-1 bg-white" />
        <div className="w-1 h-1 bg-white" />
      </div>
    </div>
  );
}
