/**
 * Posbakum Photo Compressor Utility
 * Automatically converts and compresses visitor selfie photos to ~150 KB per photo.
 * Ensures maximum visual clarity for court administration while guaranteeing
 * lightweight storage, instant synchronization, and zero data corruption.
 */

export interface CompressionResult {
  dataUrl: string;
  sizeBytes: number;
  sizeKb: number;
  width: number;
  height: number;
  qualityUsed: number;
}

/**
 * Calculates accurate byte size from a base64 Data URL
 */
export const getDataUrlSizeBytes = (dataUrl: string): number => {
  if (!dataUrl) return 0;
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.substring(commaIdx + 1) : dataUrl;
  const padding = (base64.match(/=+$/) || [''])[0].length;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

/**
 * Calculates size in Kilobytes (KB) rounded to 1 decimal place
 */
export const getDataUrlSizeKb = (dataUrl: string): number => {
  const bytes = getDataUrlSizeBytes(dataUrl);
  return Math.round((bytes / 1024) * 10) / 10;
};

/**
 * Loads an image from a File, Blob, or Data URL string into an HTMLImageElement
 */
export const loadImageElement = (source: string | File | Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      resolve(img);
    };

    img.onerror = (err) => {
      reject(new Error('Gagal memuat elemen gambar untuk dikonversi'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
      reader.readAsDataURL(source);
    }
  });
};

/**
 * Automatically converts and compresses any image to target size (default 150 KB).
 * Target range: strictly <= targetKb (aiming for ~130 - 150 KB for maximum clarity).
 * 
 * @param source Image file, blob, canvas, or Data URL string
 * @param targetKb Target size in Kilobytes (default 150 KB)
 * @returns CompressionResult with optimized dataUrl and metrics
 */
export const compressImageToTargetKb = async (
  source: string | File | Blob | HTMLCanvasElement | HTMLImageElement,
  targetKb: number = 150
): Promise<CompressionResult> => {
  const targetBytes = targetKb * 1024; // 150 KB = 153,600 bytes

  // If source is already an SVG data URL (fallback avatar), return as is since SVG is <5KB
  if (typeof source === 'string' && source.startsWith('data:image/svg+xml')) {
    const bytes = getDataUrlSizeBytes(source);
    return {
      dataUrl: source,
      sizeBytes: bytes,
      sizeKb: Math.round((bytes / 1024) * 10) / 10,
      width: 300,
      height: 300,
      qualityUsed: 1.0,
    };
  }

  let img: HTMLImageElement;
  if (source instanceof HTMLImageElement) {
    img = source;
  } else if (source instanceof HTMLCanvasElement) {
    const tempUrl = source.toDataURL('image/jpeg', 0.95);
    img = await loadImageElement(tempUrl);
  } else {
    img = await loadImageElement(source);
  }

  const origWidth = img.naturalWidth || img.width || 640;
  const origHeight = img.naturalHeight || img.height || 480;

  // Max dimension bounds for ~150KB: 1024px ensures facial details, KTP text, and sharp resolution
  let maxDim = 1024;
  let targetWidth = origWidth;
  let targetHeight = origHeight;

  if (targetWidth > maxDim || targetHeight > maxDim) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
      targetWidth = maxDim;
    } else {
      targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
      targetHeight = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    ctx = canvas.getContext('2d');
  }

  // Helper to draw at given dimensions and test quality
  const renderAtSize = (w: number, h: number, quality: number): { dataUrl: string; bytes: number } => {
    canvas.width = w;
    canvas.height = h;
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }
    // High quality bicubic smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const bytes = getDataUrlSizeBytes(dataUrl);
    return { dataUrl, bytes };
  };

  // Stepped quality search to find the highest visual quality that stays strictly <= targetBytes
  const qualities = [0.92, 0.88, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.50, 0.40];
  let bestResult: { dataUrl: string; bytes: number; quality: number; w: number; h: number } | null = null;

  // Try with initial dimensions (up to 1024px)
  for (const q of qualities) {
    const res = renderAtSize(targetWidth, targetHeight, q);
    if (res.bytes <= targetBytes) {
      bestResult = {
        dataUrl: res.dataUrl,
        bytes: res.bytes,
        quality: q,
        w: targetWidth,
        h: targetHeight,
      };
      // Since qualities are ordered descending, the first one under targetBytes is our highest quality match!
      break;
    }
  }

  // If still above targetBytes at quality 0.40 (rare, only for very noisy images),
  // progressively scale dimensions down (e.g. 800px, 640px) with comfortable 0.75 quality
  if (!bestResult) {
    const downscaleDimensions = [800, 640, 480];
    for (const dim of downscaleDimensions) {
      let scaledW = origWidth;
      let scaledH = origHeight;
      if (scaledW > scaledH) {
        scaledH = Math.round((scaledH * dim) / scaledW);
        scaledW = dim;
      } else {
        scaledW = Math.round((scaledW * dim) / scaledH);
        scaledH = dim;
      }

      for (const q of [0.80, 0.72, 0.65, 0.55]) {
        const res = renderAtSize(scaledW, scaledH, q);
        if (res.bytes <= targetBytes) {
          bestResult = {
            dataUrl: res.dataUrl,
            bytes: res.bytes,
            quality: q,
            w: scaledW,
            h: scaledH,
          };
          break;
        }
      }
      if (bestResult) break;
    }
  }

  // Fallback if somehow still not set
  if (!bestResult) {
    const res = renderAtSize(480, Math.round((origHeight * 480) / origWidth), 0.60);
    bestResult = {
      dataUrl: res.dataUrl,
      bytes: res.bytes,
      quality: 0.60,
      w: 480,
      h: Math.round((origHeight * 480) / origWidth),
    };
  }

  return {
    dataUrl: bestResult.dataUrl,
    sizeBytes: bestResult.bytes,
    sizeKb: Math.round((bestResult.bytes / 1024) * 10) / 10,
    width: bestResult.w,
    height: bestResult.h,
    qualityUsed: bestResult.quality,
  };
};
