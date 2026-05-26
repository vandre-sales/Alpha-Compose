import { useState, useCallback, useRef } from 'react';
import * as fabric from 'fabric';
import { UploadedImage, ExportResolution, AspectRatioType, RESOLUTIONS, ASPECT_RATIOS } from '../types';
import { sanitizeFilename } from '../lib/utils';
import type { ZipWorkerMessage, ZipWorkerGenerateMessage, ZipWorkerResult, ZipWorkerError } from '../workers/zipWorker';

interface ExportProgress {
  current: number;
  total: number;
}

type NotifyFn = (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;

export function useExporter(notify: NotifyFn) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({ current: 0, total: 0 });
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const cancelledRef = useRef(false);

  const setCanvas = useCallback((canvas: fabric.Canvas) => {
    canvasRef.current = canvas;
  }, []);

  const cancelExport = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const downloadAll = useCallback(async (
    images: UploadedImage[],
    aspectRatio: AspectRatioType,
    exportRes: ExportResolution,
  ) => {
    if (!canvasRef.current || images.length === 0) return;

    const bgImages = images.filter(img => img.role === 'background');
    const subImages = images.filter(img => img.role === 'subject');

    if (bgImages.length === 0) {
      notify('Please select at least one image as a background.', 'warning');
      return;
    }

    cancelledRef.current = false;
    setIsExporting(true);
    setExportProgress({ current: 0, total: bgImages.length });

    // Create Web Worker for ZIP generation
    const worker = new Worker(
      new URL('../workers/zipWorker.ts', import.meta.url),
      { type: 'module' }
    );

    try {
      const canvas = canvasRef.current;
      const res = exportRes;
      const totalPixels = RESOLUTIONS[res];
      const arValue = ASPECT_RATIOS[aspectRatio];

      // Calculate target dimensions
      const targetHeight = Math.sqrt(totalPixels / arValue);
      const targetWidth = targetHeight * arValue;
      const multiplier = targetWidth / canvas.width;

      // Safety check: most browsers cap canvas at 16384px per side
      const MAX_CANVAS_SIDE = 16384;
      const outputWidth = canvas.width * multiplier;
      const outputHeight = canvas.height * multiplier;

      if (outputWidth > MAX_CANVAS_SIDE || outputHeight > MAX_CANVAS_SIDE) {
        notify(
          `Export resolution too high (${Math.round(outputWidth)}×${Math.round(outputHeight)}px exceeds ${MAX_CANVAS_SIDE}px limit). Select a lower quality.`,
          'error'
        );
        worker.terminate();
        return;
      }

      const allObjects = canvas.getObjects();

      // Helper: convert base64 string to Uint8Array
      const base64ToUint8Array = (base64: string): Uint8Array => {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }
        return bytes;
      };

      let framesAdded = 0;

      // Render frames on main thread, send data to worker
      for (let i = 0; i < bgImages.length; i++) {
        if (cancelledRef.current) {
          notify('Export cancelled.', 'warning');
          break;
        }

        setExportProgress({ current: i + 1, total: bgImages.length });
        const currentBg = bgImages[i];

        // Prepare canvas for this specific frame
        allObjects.forEach(obj => {
          const imageId = obj._imageId;
          const imageRole = obj._imageRole;

          if (imageRole === 'background') {
            obj.set('visible', imageId === currentBg.id);
          } else if (imageRole === 'subject') {
            const subData = subImages.find(s => s.id === imageId);
            obj.set('visible', subData ? subData.visible : false);
          }
        });

        canvas.renderAll();

        try {
          const dataUrl = canvas.toDataURL({
            format: 'png',
            multiplier: multiplier,
          });

          const base64Data = dataUrl.split(',')[1];
          if (!base64Data) {
            throw new Error('toDataURL returned empty — possible OOM');
          }

          const safeName = sanitizeFilename(currentBg.name);
          const frameData = base64ToUint8Array(base64Data);

          // Send frame to worker for ZIP packaging
          const msg: ZipWorkerMessage = {
            type: 'add-frame',
            filename: `compose_${i + 1}_${safeName}_${res}.png`,
            data: frameData,
          };
          worker.postMessage(msg, [frameData.buffer]);
          framesAdded++;
        } catch (renderErr) {
          console.error(`[Export] Failed to render frame ${i + 1}:`, renderErr);
          continue;
        }

        // Yield to main thread
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      }

      // Cleanup: revert visibility
      allObjects.forEach(obj => {
        const imageId = obj._imageId;
        const imgState = images.find(img => img.id === imageId);
        if (imgState) obj.set('visible', imgState.visible);
      });
      canvas.renderAll();

      if (cancelledRef.current || framesAdded === 0) {
        if (framesAdded === 0 && !cancelledRef.current) {
          notify('Export failed: no frames could be rendered. Try a lower resolution.', 'error');
        }
        worker.terminate();
        return;
      }

      // Request ZIP generation from worker
      const generateMsg: ZipWorkerGenerateMessage = { type: 'generate' };
      worker.postMessage(generateMsg);

      // Wait for worker response
      const result = await new Promise<ZipWorkerResult | ZipWorkerError>((resolve) => {
        worker.onmessage = (event: MessageEvent<ZipWorkerResult | ZipWorkerError>) => {
          resolve(event.data);
        };
        worker.onerror = () => {
          resolve({ type: 'error', message: 'Worker crashed' });
        };
      });

      if (result.type === 'done') {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(result.blob);
        link.download = `alpha_compose_${res}_pack.zip`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        notify(`Pack exported! ${result.fileCount} images at ${res}.`, 'success');
      } else {
        notify(`Export failed: ${result.message}`, 'error');
      }

    } catch (err) {
      console.error('[Export] Unexpected error:', err);
      notify('Export failed. Check console for details.', 'error');
    } finally {
      worker.terminate();
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  }, [notify]);

  return {
    isExporting,
    exportProgress,
    setCanvas,
    downloadAll,
    cancelExport,
  };
}
