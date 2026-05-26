import { useState, useCallback } from 'react';
import { UploadedImage } from '../types';

type NotifyFn = (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;

export function useImageLibrary(notify: NotifyFn) {
  const [images, setImages] = useState<UploadedImage[]>([]);

  const handleFileUpload = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement> | React.DragEvent,
    forcedRole?: 'background' | 'subject'
  ) => {
    let files: File[] = [];
    if ('dataTransfer' in e) {
      files = Array.from(e.dataTransfer.files);
    } else {
      files = Array.from((e.target as HTMLInputElement).files || []);
    }

    if (images.length + files.length > 25) {
      notify('Maximum 25 images allowed.', 'warning');
      return;
    }

    const newImages = await Promise.all(
      files.map(async (file: File) => {
        return new Promise<UploadedImage>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const url = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
              resolve({
                id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                url,
                name: file.name,
                width: img.width,
                height: img.height,
                aspectRatio: img.width / img.height,
                role: forcedRole || 'none',
                visible: true,
              });
            };
            img.src = url;
          };
          reader.readAsDataURL(file);
        });
      })
    );

    setImages((prev) => [...prev, ...newImages]);
  }, [images, notify]);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, visible: !img.visible } : img));
  }, []);

  const moveImage = useCallback((id: string) => {
    setImages(prev => prev.map(img => {
      if (img.id === id) {
        return { ...img, role: img.role === 'background' ? 'subject' : 'background' };
      }
      return img;
    }));
  }, []);

  return {
    images,
    handleFileUpload,
    removeImage,
    toggleVisibility,
    moveImage,
  };
}
