import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes a filename by removing characters that are illegal
 * on Windows, Linux, or inside ZIP archives.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/\.[^/.]+$/, '')              // remove extension
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // replace illegal chars
    .replace(/_{2,}/g, '_')                // collapse multiple underscores
    .replace(/^_|_$/g, '')                 // trim leading/trailing underscores
    || 'untitled';
}

/**
 * Formats the filename for a composed frame in the ZIP.
 * Pattern: compose_S{subIdx}_B{bgIdx}_{subName}__{bgName}_{res}.png
 * When there's no subject (legacy mode): compose_B{bgIdx}_{bgName}_{res}.png
 */
export function formatFrameName(
  subIdx: number | null,
  bgIdx: number,
  subName: string | null,
  bgName: string,
  res: string
): string {
  const safeBg = sanitizeFilename(bgName);
  if (subIdx === null || subName === null) {
    return `compose_B${bgIdx}_${safeBg}_${res}.png`;
  }
  const safeSub = sanitizeFilename(subName);
  return `compose_S${subIdx}_B${bgIdx}_${safeSub}__${safeBg}_${res}.png`;
}

// ═══════════════════════════════════════════════════════════════
// Grid Mode utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Computes the grid slice size based on the canvas dimensions.
 * The minor side is always divided into exactly 20 slices.
 */
export function computeGridSliceSize(canvasWidth: number, canvasHeight: number): number {
  return Math.min(canvasWidth, canvasHeight) / 20;
}

/**
 * Applies grid-based discrete scale to a subject, centering it
 * and locking all transformations.
 *
 * @param obj - The Fabric object representing the subject
 * @param imgWidth - Original image width in pixels
 * @param imgHeight - Original image height in pixels
 * @param gridScale - Discrete level 1..20
 * @param canvasWidth - Current canvas width
 * @param canvasHeight - Current canvas height
 */
export function applyGridScaleToSubject(
  obj: { set: (props: Record<string, unknown>) => void },
  imgWidth: number,
  imgHeight: number,
  gridScale: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const sliceSize = computeGridSliceSize(canvasWidth, canvasHeight);
  const boxSide = gridScale * sliceSize;
  const ratio = imgWidth / imgHeight;

  let renderWidth: number;
  if (ratio >= 1) {
    renderWidth = boxSide;
  } else {
    renderWidth = boxSide * ratio;
  }

  const scale = renderWidth / imgWidth;

  obj.set({
    scaleX: scale,
    scaleY: scale,
    left: canvasWidth / 2,
    top: canvasHeight / 2,
    originX: 'center',
    originY: 'center',
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    selectable: false,
  });
}

/**
 * Unlocks a subject for free manipulation (grid mode OFF).
 */
export function unlockSubject(
  obj: { set: (props: Record<string, unknown>) => void }
): void {
  obj.set({
    lockMovementX: false,
    lockMovementY: false,
    lockScalingX: false,
    lockScalingY: false,
    lockRotation: false,
    selectable: true,
  });
}
