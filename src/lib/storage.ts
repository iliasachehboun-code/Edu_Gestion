import fs from "fs/promises";
import path from "path";

const BASE_STORAGE_DIR = path.join(process.cwd(), "storage", "justificatifs");

export async function saveSecureJustificatif({
  schoolId,
  attendanceId,
  file,
}: {
  schoolId: string;
  attendanceId: string;
  file: File;
}): Promise<{ relativePath: string; fileName: string; mimeType: string }> {
  const schoolDir = path.join(BASE_STORAGE_DIR, schoolId);
  await fs.mkdir(schoolDir, { recursive: true });

  const ext = path.extname(file.name) || (file.type === "image/webp" ? ".webp" : ".bin");
  const safeBaseName = `${attendanceId}_${Date.now()}${ext}`;
  const absolutePath = path.join(schoolDir, safeBaseName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(absolutePath, buffer);

  const relativePath = path.join(schoolId, safeBaseName).replace(/\\/g, "/");

  return {
    relativePath,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function readSecureJustificatif(relativePath: string): Promise<{
  buffer: Buffer;
  mimeType: string;
} | null> {
  // Sécurité anti-Directory Traversal
  const safeRelative = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.join(BASE_STORAGE_DIR, safeRelative);

  try {
    const buffer = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    let mimeType = "application/octet-stream";
    if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".png") mimeType = "image/png";
    else if (ext === ".pdf") mimeType = "application/pdf";

    return { buffer, mimeType };
  } catch {
    return null;
  }
}
