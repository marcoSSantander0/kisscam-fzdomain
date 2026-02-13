import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getMaxUploadBytesFromEnv, getStorageDirFromEnv } from "@/lib/config";
import type { ImageItem } from "@/lib/types";

const ALLOWED_FILE_TYPES = new Map<string, "jpg" | "png">([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function resolveStorageDir(): string {
  const dir = getStorageDirFromEnv();
  return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
}

export async function ensureStorageDir(): Promise<string> {
  const storageDir = resolveStorageDir();
  await mkdir(storageDir, { recursive: true });
  return storageDir;
}

export function parseImageMimeFromName(fileName: string): string | null {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".png") {
    return "image/png";
  }
  return null;
}

function normalizeImageId(id: string): string | null {
  const clean = path.basename(id);
  if (clean !== id) {
    return null;
  }
  const ext = path.extname(clean).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return null;
  }
  return clean;
}

export async function listImagesFromDisk(): Promise<ImageItem[]> {
  const storageDir = await ensureStorageDir();
  const entries = await readdir(storageDir, { withFileTypes: true });

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()));

  const items = await Promise.all(
    files.map(async (name) => {
      const fullPath = path.join(storageDir, name);
      const fileStat = await stat(fullPath);
      const created = fileStat.birthtimeMs > 0 ? fileStat.birthtime : fileStat.mtime;
      const createdMs = fileStat.birthtimeMs > 0 ? fileStat.birthtimeMs : fileStat.mtimeMs;

      return {
        id: name,
        url: `/api/images/${encodeURIComponent(name)}`,
        createdAt: created.toISOString(),
        createdMs,
      };
    }),
  );

  return items
    .sort((a, b) => b.createdMs - a.createdMs)
    .map(({ id, url, createdAt }) => ({ id, url, createdAt }));
}

export async function readImageFromDisk(id: string): Promise<{ body: ArrayBuffer; mimeType: string } | null> {
  const storageDir = await ensureStorageDir();
  const safeId = normalizeImageId(id);
  if (!safeId) {
    return null;
  }

  const fullPath = path.join(storageDir, safeId);
  try {
    const mimeType = parseImageMimeFromName(safeId);
    if (!mimeType) {
      return null;
    }
    const buffer = await readFile(fullPath);
    return {
      body: Uint8Array.from(buffer).buffer,
      mimeType,
    };
  } catch {
    return null;
  }
}

export async function saveUploadedImage(file: File): Promise<{ id: string; url: string }> {
  const ext = ALLOWED_FILE_TYPES.get(file.type);
  if (!ext) {
    throw new Error("INVALID_MIME");
  }

  if (file.size <= 0) {
    throw new Error("EMPTY_FILE");
  }

  if (file.size > getMaxUploadBytesFromEnv()) {
    throw new Error("MAX_SIZE_EXCEEDED");
  }

  const storageDir = await ensureStorageDir();
  const fileId = `${Date.now()}_${randomUUID()}.${ext}`;
  const fullPath = path.join(storageDir, fileId);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, bytes);

  return {
    id: fileId,
    url: `/api/images/${encodeURIComponent(fileId)}`,
  };
}

export async function deleteImageFromDisk(id: string): Promise<boolean> {
  const storageDir = await ensureStorageDir();
  const safeId = normalizeImageId(id);
  if (!safeId) {
    return false;
  }

  const fullPath = path.join(storageDir, safeId);
  try {
    await unlink(fullPath);
    return true;
  } catch {
    return false;
  }
}
