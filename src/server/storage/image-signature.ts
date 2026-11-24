import "server-only";

/**
 * The first bytes of each allowed image format (2026-09-18 notes). A cheap
 * check that an uploaded object really is the type it claims; not full image
 * decoding or malware scanning. Shared by gallery photos and cover photos.
 */
export function hasImageSignature(mimeType: string, bytes: Uint8Array): boolean {
  const starts = (...expected: number[]) => expected.every((byte, i) => bytes[i] === byte);
  const ascii = (from: number, text: string) =>
    [...text].every((char, i) => bytes[from + i] === char.charCodeAt(0));
  switch (mimeType) {
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/webp":
      return ascii(0, "RIFF") && ascii(8, "WEBP");
    default:
      return false;
  }
}
