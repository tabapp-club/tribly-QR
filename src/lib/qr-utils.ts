import QRCode from "qrcode";

/**
 * Simple hash function for client-side use
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Generate a unique short URL code for a business
 * Uses a combination of business ID and a hash for security
 */
export function generateShortUrlCode(businessId: string): string {
  // Create a hash from business ID for security
  const secret = typeof window !== "undefined"
    ? "tribly-secret-key"
    : process.env.NEXT_PUBLIC_QR_SECRET || "tribly-secret-key";
  const hash = simpleHash(businessId + secret);

  // Combine with business ID prefix for uniqueness
  return `${businessId.slice(0, 4)}-${hash}`;
}

/**
 * Generate the full review URL for a business
 */
export function generateReviewUrl(businessCode: string): string {
  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL || "https://triblyqr.netlify.app";

  return `${baseUrl}/review/${businessCode}`;
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCodeDataUrl(url: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 300,
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}

/**
 * Download QR code as PNG
 */
export function downloadQRCodeAsPNG(dataUrl: string, filename: string = "qr-code.png"): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate QR code blob for download
 */
export async function generateQRCodeBlob(url: string): Promise<Blob> {
  try {
    const canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, url, {
      errorCorrectionLevel: "M",
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 300,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to generate blob"));
        }
      }, "image/png");
    });
  } catch (error) {
    console.error("Error generating QR code blob:", error);
    throw error;
  }
}
