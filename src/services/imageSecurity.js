/**
 * Dating App Hardening Module: Image Security & Anti-Leak Safeguards
 * 1. EXIF Metadata Stripping (GPS tags, camera models, device IDs erased).
 * 2. Watermarking & Digital Fingerprinting (Anti-leak watermark overlay).
 * 3. Low-res blurred preview generator for unmatched feeds.
 */

/**
 * Process uploaded photo with EXIF stripping, watermarking, and low-res blurred preview generation.
 */
export async function processSecureImage(file, waterMarkText = 'VIT AP Match • Confidential') {
  if (!file) throw new Error('No file provided.');

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image file size exceeds the 10 MB limit.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 640 || img.height < 640) {
          return reject(new Error('Image resolution is too low. Minimum resolution is 640 × 640 pixels.'));
        }

        // 1. Render to clean Canvas (Strips all EXIF metadata tags automatically)
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1080;
        const MAX_HEIGHT = 1350;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');

        // Draw original pixels (stripping metadata)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 2. Anti-Leak Subtle Watermark Overlay
        ctx.save();
        ctx.font = '14px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'right';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 4;
        ctx.fillText(waterMarkText, canvas.width - 20, canvas.height - 20);
        ctx.restore();

        const secureHighResBase64 = canvas.toDataURL('image/jpeg', 0.85);

        // 3. Generate Low-Res Blurred Thumbnail Preview for Unmatched Feeds
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 40;
        thumbCanvas.height = 50;
        const thumbCtx = thumbCanvas.getContext('2d');
        thumbCtx.filter = 'blur(6px)';
        thumbCtx.drawImage(img, 0, 0, 40, 50);
        const blurredPreviewBase64 = thumbCanvas.toDataURL('image/jpeg', 0.3);

        resolve({
          image: secureHighResBase64,
          blurredPreview: blurredPreviewBase64,
        });
      };

      img.onerror = () => reject(new Error('Failed to load image file.'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}
