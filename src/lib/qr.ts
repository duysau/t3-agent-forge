import QRCode from "qrcode";

/** Sinh QR dạng data URL. Từ chối chuỗi rỗng — một QR trỏ vào hư vô còn tệ hơn không có. */
export async function toQrDataUrl(text: string): Promise<string> {
  if (text.trim().length === 0) {
    throw new Error("Không sinh được mã QR từ chuỗi rỗng");
  }
  return QRCode.toDataURL(text, { width: 220, margin: 1 });
}
