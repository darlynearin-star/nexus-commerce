// Cap at 1600px / 0.82 JPEG: product photos display at ~800px on the
// storefront, so 3840px @ 0.95 translated to multi-MB base64 blobs in the DB
// that slowed uploads, the dashboard lists, and the storefront image
// optimizer. Only affects new uploads; existing data is untouched.
export function compressImage(file: File, maxW = 1600, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => { if (b) resolve(b); else reject(new Error('Compression failed')); }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}
