export type ImageRole = 'background' | 'subject' | 'none';

export interface UploadedImage {
  id: string;
  url: string;
  name: string;
  width: number;
  height: number;
  role: ImageRole;
  aspectRatio: number;
  visible: boolean;
  gridScale?: number;  // 1..20, discrete scale in grid mode
}

export type AspectRatioType = '1:1' | '3:4' | '9:16' | '4:3' | '16:9';

export const ASPECT_RATIOS: Record<AspectRatioType, number> = {
  '1:1': 1,
  '3:4': 3 / 4,
  '9:16': 9 / 16,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
};

export type ExportResolution = '1K' | '2K' | '4K';

export const RESOLUTIONS: Record<ExportResolution, number> = {
  '1K': 1024 * 1024,
  '2K': 2048 * 2048,
  '4K': 4096 * 4096,
};
