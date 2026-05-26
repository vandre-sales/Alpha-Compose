import { useState, useCallback, useRef } from 'react';
import * as fabric from 'fabric';
import { UploadedImage, ExportResolution, AspectRatioType, ExportFormat, RESOLUTIONS, ASPECT_RATIOS, EXPORT_FORMATS } from '../types';
import { formatFrameName } from '../lib/utils';
import type { ZipWorkerMessage, ZipWorkerGenerateMessage, ZipWorkerResult, ZipWorkerError } from '../workers/zipWorker';

export interface ExportProgress {
  current: number;      // frame index (1-based)
  total: number;        // total frames = N × max(A, 1)
  currentSub: number;   // current subject index (1-based, or 1 if no subs)
  totalSubs: number;    // total visible subs (or 1 if legacy mode)
  currentBg: number;    // current background index (1-based)
  totalBgs: number;     // total visible backgrounds
}

type NotifyFn = (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;

export function useExporter(notify: NotifyFn) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    current: 0, total: 0, currentSub: 0, totalSubs: 0, currentBg: 0, totalBgs: 0,
  });
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
    exportFormat: ExportFormat = 'PNG',
  ) => {
    if (!canvasRef.current || images.length === 0) return;

    // Filter ONLY visible images in each layer
    const visibleBgs = images.filter(img => img.role === 'background' && img.visible);
    const visibleSubs = images.filter(img => img.role === 'subject' && img.visible);

    // Validation: need at least 1 visible background
    if (visibleBgs.length === 0) {
      notify('Select at least one visible background.', 'warning');
      return;
    }

    const N = visibleBgs.length;
    const A = visibleSubs.length;
    const totalFrames = N * Math.max(A, 1);

    // Pre-calculation alert for large packs
    if (totalFrames > 80 && exportRes === '4K') {
      const confirmed = window.confirm(
        `Generate ${totalFrames} frames at 4K? This may take several minutes and produce a large ZIP file.`
      );
      if (!confirmed) return;
    } else if (totalFrames > 80) {
      notify(`Large pack: generating ${totalFrames} frames...`, 'info');
    } else if (totalFrames > 30) {
      notify(`Generating ${totalFrames} frames...`, 'info');
    }

    cancelledRef.current = false;
    setIsExporting(true);
    setExportProgress({ current: 0, total: totalFrames, currentSub: 0, totalSubs: Math.max(A, 1), currentBg: 0, totalBgs: N });

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
      let frameIndex = 0;

      // ═══════════════════════════════════════════════════════════════
      // CARTESIAN PRODUCT: SUB-outer × BG-inner
      // INVARIANT: each frame contains exactly 1 BG + (0 or 1) SUB
      // SUBs/BGs in "hide" are silently skipped (not in visibleBgs/visibleSubs)
      // ═══════════════════════════════════════════════════════════════

      const subIterations = Math.max(A, 1); // legacy compat: if A=0, single pass with no sub

      for (let s = 0; s < subIterations; s++) {
        const currentSub = A > 0 ? visibleSubs[s] : null;

        for (let b = 0; b < N; b++) {
          // Check cancellation
          if (cancelledRef.current) {
            notify('Export cancelled.', 'warning');
            break;
          }

          frameIndex++;
          const currentBg = visibleBgs[b];

          setExportProgress({
            current: frameIndex,
            total: totalFrames,
            currentSub: s + 1,
            totalSubs: subIterations,
            currentBg: b + 1,
            totalBgs: N,
          });

          // Toggle visibility: ONLY currentBg visible + ONLY currentSub visible
          // This guarantees the invariant: never 2+ SUBs in the same frame
          allObjects.forEach(obj => {
            if (obj._imageRole === 'background') {
              obj.set('visible', obj._imageId === currentBg.id);
            } else if (obj._imageRole === 'subject') {
              obj.set('visible', currentSub !== null && obj._imageId === currentSub.id);
            }
          });

          canvas.renderAll();

          try {
            const formatConfig = EXPORT_FORMATS[exportFormat];
            const dataUrl = canvas.toDataURL({
              format: formatConfig.extension === 'jpg' ? 'jpeg' : formatConfig.extension as 'png' | 'webp',
              multiplier: multiplier,
              quality: formatConfig.quality,
            });

            const base64Data = dataUrl.split(',')[1];
            if (!base64Data) {
              throw new Error('toDataURL returned empty — possible OOM');
            }

            const filename = formatFrameName(
              currentSub ? s + 1 : null,
              b + 1,
              currentSub?.name ?? null,
              currentBg.name,
              res,
              formatConfig.extension,
            );

            const frameData = base64ToUint8Array(base64Data);

            // Send frame to worker for ZIP packaging
            const msg: ZipWorkerMessage = {
              type: 'add-frame',
              filename,
              data: frameData,
            };
            worker.postMessage(msg, [frameData.buffer]);
            framesAdded++;
          } catch (renderErr) {
            console.error(`[Export] Failed to render frame ${frameIndex}:`, renderErr);
            continue;
          }

          // Yield to main thread
          await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        }

        // Break outer loop too if cancelled
        if (cancelledRef.current) break;
      }

      // Cleanup: revert visibility to user state
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
        link.download = `alpha_compose_${res}_${EXPORT_FORMATS[exportFormat].extension}_pack.zip`;
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
      setExportProgress({ current: 0, total: 0, currentSub: 0, totalSubs: 0, currentBg: 0, totalBgs: 0 });
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
