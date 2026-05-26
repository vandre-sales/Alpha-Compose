/**
 * Augmentation for Fabric.js objects to include custom metadata
 * used during the export pipeline.
 */
import type { FabricObject } from 'fabric';

declare module 'fabric' {
  interface FabricObject {
    _imageId?: string;
    _imageRole?: 'background' | 'subject';
  }
}
