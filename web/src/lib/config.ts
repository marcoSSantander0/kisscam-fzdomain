export const DEFAULT_STORAGE_DIR = "/app/data/images";

export function getStorageDirFromEnv(): string {
  return process.env.STORAGE_DIR?.trim() || DEFAULT_STORAGE_DIR;
}

export function getMaxUploadMbFromEnv(): number {
  const parsed = Number(process.env.MAX_UPLOAD_MB ?? "15");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 15;
  }
  return parsed;
}

export function getMaxUploadBytesFromEnv(): number {
  return Math.floor(getMaxUploadMbFromEnv() * 1024 * 1024);
}
