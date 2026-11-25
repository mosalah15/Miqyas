/**
 * Utility for fast client-side image compression and resizing.
 * Prevents network bottlenecks and API timeouts when teachers upload
 * high-resolution camera photos or scans.
 */

export interface CompressedImageResult {
  data: string;
  mimeType: string;
  name: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Compress an image file to max dimension (default 1600px) and JPEG quality 0.82
 */
export async function compressImage(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.82
): Promise<CompressedImageResult> {
  const originalSize = file.size;

  return new Promise((resolve) => {
    // If not an image or SVG, read as-is
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve({
          data: base64,
          mimeType: file.type || 'image/jpeg',
          name: file.name,
          originalSize,
          compressedSize: originalSize,
        });
      };
      reader.onerror = () => {
        resolve({
          data: '',
          mimeType: file.type || 'image/jpeg',
          name: file.name,
          originalSize,
          compressedSize: 0,
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      resolve({
        data: '',
        mimeType: file.type,
        name: file.name,
        originalSize,
        compressedSize: 0,
      });
    };

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        // Fallback to original base64
        resolve({
          data: reader.result as string,
          mimeType: file.type,
          name: file.name,
          originalSize,
          compressedSize: originalSize,
        });
      };

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // If both dimensions are within maxDimension and file is reasonably small (<400KB), keep as-is or compress
        if (width <= maxDimension && height <= maxDimension && originalSize < 400 * 1024) {
          resolve({
            data: reader.result as string,
            mimeType: file.type,
            name: file.name,
            originalSize,
            compressedSize: originalSize,
          });
          return;
        }

        // Calculate aspect ratio preserving dimensions
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
          resolve({
            data: reader.result as string,
            mimeType: file.type,
            name: file.name,
            originalSize,
            compressedSize: originalSize,
          });
          return;
        }

        // Draw with white background in case of transparent PNGs converting to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/jpeg';
        const compressedData = canvas.toDataURL(mimeType, quality);
        const approxBytes = Math.round((compressedData.length * 3) / 4);

        resolve({
          data: compressedData,
          mimeType,
          name: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
          originalSize,
          compressedSize: approxBytes,
        });
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

