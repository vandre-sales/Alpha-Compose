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
