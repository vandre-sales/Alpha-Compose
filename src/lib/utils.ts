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
