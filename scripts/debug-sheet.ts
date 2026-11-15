import sharp from "sharp";
import { readSheetMarks } from "../src/lib/attendance-sheet";

const expected = [
  "ABSENT",
  "PRESENT",
  "ABSENT",
  "ABSENT",
  "PRESENT",
  "ABSENT",
  "PRESENT",
  "PRESENT",
  "ABSENT",
  "PRESENT",
  "PRESENT",
  "ABSENT",
  "PRESENT",
  "PRESENT",
  "PRESENT",
  "ABSENT",
  "PRESENT",
  "ABSENT",
  "ABSENT",
  "PRESENT",
  "PRESENT",
  "PRESENT",
  "ABSENT",
  "PRESENT",
  "PRESENT",
  "PRESENT",
  "ABSENT",
  "PRESENT",
] as const;

async function main() {
  const path = process.argv[2] || "scripts/fiche_presence_cochee.png";
  const meta = await sharp(path).metadata();
  const maxWidth = 900;
  const scale = Math.min(1, maxWidth / (meta.width || 1));
  const width = Math.round((meta.width || 1) * scale);
  const height = Math.round((meta.height || 1) * scale);

  const { data, info } = await sharp(path)
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  const marks = readSheetMarks(rgba, info.width, info.height, expected.length);
  const absent = marks.filter((m) => m === "ABSENT").length;
  const present = marks.length - absent;
  console.log(`result ${present} P / ${absent} A`);

  let mismatches = 0;
  marks.forEach((m, i) => {
    if (m !== expected[i]) {
      mismatches += 1;
      console.log(`${i + 1}: got ${m}, expected ${expected[i]}`);
    }
  });
  console.log("mismatches", mismatches);
  if (mismatches !== 0 || present !== 17 || absent !== 11) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
