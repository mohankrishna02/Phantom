export interface CompressedImage {
  dataUrl: string;
  width: number;
  height: number;
  aspect: number;
  sizeBytes: number;
}

/**
 * Compresses an image file client-side to prevent WebSocket payload bloat.
 * Scales down if wider/taller than maxDimension (default 1280px).
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1280,
  quality = 0.82
): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into memory'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context not available'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Prefer image/webp if supported, fallback to image/jpeg
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);

        resolve({
          dataUrl,
          width,
          height,
          aspect: width / (height || 1),
          sizeBytes: Math.round((dataUrl.length * 3) / 4),
        });
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
