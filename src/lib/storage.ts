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

const BASE_HOMEWORK_DIR = path.join(process.cwd(), "storage", "devoirs");

export async function saveSecureHomeworkFile({
  schoolId,
  homeworkId,
  studentId,
  file,
}: {
  schoolId: string;
  homeworkId: string;
  studentId: string;
  file: File;
}): Promise<{ relativePath: string; fileName: string; mimeType: string }> {
  const targetDir = path.join(BASE_HOMEWORK_DIR, schoolId, homeworkId);
  await fs.mkdir(targetDir, { recursive: true });

  const ext = path.extname(file.name) || ".bin";
  const safeBaseName = `${studentId}_${Date.now()}${ext}`;
  const absolutePath = path.join(targetDir, safeBaseName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(absolutePath, buffer);

  const relativePath = path.join(schoolId, homeworkId, safeBaseName).replace(/\\/g, "/");

  return {
    relativePath,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function readSecureHomeworkFile(relativePath: string): Promise<{
  buffer: Buffer;
  mimeType: string;
} | null> {
  const safeRelative = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.join(BASE_HOMEWORK_DIR, safeRelative);

  try {
    const buffer = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    let mimeType = "application/octet-stream";
    if (ext === ".pdf") mimeType = "application/pdf";
    else if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".png") mimeType = "image/png";
    else if (ext === ".docx")
      mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (ext === ".zip") mimeType = "application/zip";

    return { buffer, mimeType };
  } catch {
    return null;
  }
}

const BASE_COURSES_DIR = path.join(process.cwd(), "storage", "cours");

export async function saveSecureCourseFile({
  schoolId,
  subjectId,
  file,
}: {
  schoolId: string;
  subjectId: string;
  file: File;
}): Promise<{ relativePath: string; fileName: string; mimeType: string }> {
  const targetDir = path.join(BASE_COURSES_DIR, schoolId, subjectId);
  await fs.mkdir(targetDir, { recursive: true });

  const ext = path.extname(file.name) || ".bin";
  const safeBaseName = `${Date.now()}_${path.basename(file.name, ext).slice(0, 30)}${ext}`;
  const absolutePath = path.join(targetDir, safeBaseName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(absolutePath, buffer);

  const relativePath = path.join(schoolId, subjectId, safeBaseName).replace(/\\/g, "/");

  return {
    relativePath,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function readSecureCourseFile(relativePath: string): Promise<{
  buffer: Buffer;
  mimeType: string;
} | null> {
  const safeRelative = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.join(BASE_COURSES_DIR, safeRelative);

  try {
    const buffer = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    let mimeType = "application/octet-stream";
    if (ext === ".pdf") mimeType = "application/pdf";
    else if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".png") mimeType = "image/png";
    else if (ext === ".docx")
      mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (ext === ".pptx")
      mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    else if (ext === ".zip") mimeType = "application/zip";

    return { buffer, mimeType };
  } catch {
    return null;
  }
}

