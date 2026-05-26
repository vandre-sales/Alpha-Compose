/**
 * Web Worker for ZIP generation.
 * Receives PNG frame data and produces a ZIP blob off the main thread.
 */
import JSZip from 'jszip';

export interface ZipWorkerMessage {
  type: 'add-frame';
  filename: string;
  data: Uint8Array;
}

export interface ZipWorkerGenerateMessage {
  type: 'generate';
}

export interface ZipWorkerResult {
  type: 'done';
  blob: Blob;
  fileCount: number;
}

export interface ZipWorkerError {
  type: 'error';
  message: string;
}

type IncomingMessage = ZipWorkerMessage | ZipWorkerGenerateMessage;
type OutgoingMessage = ZipWorkerResult | ZipWorkerError;

const zip = new JSZip();

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data;

  if (msg.type === 'add-frame') {
    zip.file(msg.filename, msg.data);
  } else if (msg.type === 'generate') {
    try {
      const blob = await zip.generateAsync({ type: 'blob' });
      const result: ZipWorkerResult = {
        type: 'done',
        blob,
        fileCount: Object.keys(zip.files).length,
      };
      self.postMessage(result);
    } catch (err) {
      const error: ZipWorkerError = {
        type: 'error',
        message: err instanceof Error ? err.message : 'Unknown error generating ZIP',
      };
      self.postMessage(error);
    }
  }
};
