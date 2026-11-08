export const SHEET_W = 1000;
export const SHEET_H = 1414;
export const MARKER = 72;
export const BOX = 36;

export type SheetMark = "PRESENT" | "ABSENT";

type Point = { x: number; y: number };

export function markerRects() {
  const pad = 26;
  return [
    { x: pad, y: pad },
    { x: SHEET_W - pad - MARKER, y: pad },
    { x: pad, y: SHEET_H - pad - MARKER },
    { x: SHEET_W - pad - MARKER, y: SHEET_H - pad - MARKER },
  ];
}

export function markerCenters() {
  return markerRects().map((mark) => ({
    x: mark.x + MARKER / 2,
    y: mark.y + MARKER / 2,
  }));
}

export function sheetUv(x: number, y: number) {
  const centers = markerCenters();
  const tl = centers[0];
  const tr = centers[1];
  const br = centers[3];
  return {
    u: (x - tl.x) / (tr.x - tl.x),
    v: (y - tl.y) / (br.y - tl.y),
  };
}

export function studentBoxes(count: number) {
  const top = 168;
  const bottom = SHEET_H - 88;
  return Array.from({ length: count }, (_, i) => {
    const y = top + ((i + 0.5) * (bottom - top)) / Math.max(count, 1) - BOX / 2;
    return {
      present: { x: 748, y },
      absent: { x: 888, y },
    };
  });
}

function luminance(data: Uint8ClampedArray, index: number) {
  return data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
}

function isDark(data: Uint8ClampedArray, index: number) {
  return luminance(data, index) < 120;
}

type Blob = { minX: number; minY: number; maxX: number; maxY: number; area: number };

function findDarkBlobs(data: Uint8ClampedArray, width: number, height: number) {
  const seen = new Uint8Array(width * height);
  const blobs: Blob[] = [];
  const stack: number[] = [];

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const start = y * width + x;
      if (seen[start]) continue;
      if (!isDark(data, start * 4)) continue;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;
      stack.push(start);

      while (stack.length) {
        const idx = stack.pop()!;
        if (seen[idx]) continue;
        if (!isDark(data, idx * 4)) continue;
        seen[idx] = 1;
        const px = idx % width;
        const py = (idx - px) / width;
        area += 1;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        if (px > 0) stack.push(idx - 1);
        if (px < width - 1) stack.push(idx + 1);
        if (py > 0) stack.push(idx - width);
        if (py < height - 1) stack.push(idx + width);
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const boxArea = bw * bh;
      const aspect = bw / Math.max(bh, 1);
      if (area > 180 && aspect > 0.65 && aspect < 1.5 && area / boxArea > 0.45) {
        blobs.push({ minX, minY, maxX, maxY, area });
      }
    }
  }

  return blobs;
}

function mapPoint(u: number, v: number, corners: Point[]) {
  const [tl, tr, bl, br] = corners;
  const x = tl.x + (tr.x - tl.x) * u + (bl.x - tl.x) * v + (tl.x - tr.x - bl.x + br.x) * u * v;
  const y = tl.y + (tr.y - tl.y) * u + (bl.y - tl.y) * v + (tl.y - tr.y - bl.y + br.y) * u * v;
  return { x, y };
}

function darkness(data: Uint8ClampedArray, width: number, height: number, cx: number, cy: number, radius: number) {
  let dark = 0;
  let total = 0;
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(width - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(height - 1, Math.ceil(cy + radius));
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      total += 1;
      if (isDark(data, (y * width + x) * 4)) dark += 1;
    }
  }
  return total ? dark / total : 0;
}

export function readSheetMarks(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  studentCount: number
): SheetMark[] {
  const blobs = findDarkBlobs(rgba, width, height).sort((a, b) => b.area - a.area);
  const imageArea = width * height;
  const markers = blobs.filter((b) => b.area > imageArea * 0.0012 && b.area < imageArea * 0.02);

  const centers = markers.map((b) => ({
    x: (b.minX + b.maxX) / 2,
    y: (b.minY + b.maxY) / 2,
  }));

  const corners = pickCorners(centers, width, height);
  const boxes = studentBoxes(studentCount);
  const radius = Math.max(4, (BOX / SHEET_W) * width * 0.35);

  return boxes.map((box) => {
    const presentUv = sheetUv(box.present.x + BOX / 2, box.present.y + BOX / 2);
    const absentUv = sheetUv(box.absent.x + BOX / 2, box.absent.y + BOX / 2);
    const present = mapPoint(presentUv.u, presentUv.v, corners);
    const absent = mapPoint(absentUv.u, absentUv.v, corners);
    const presentInk = darkness(rgba, width, height, present.x, present.y, radius);
    const absentInk = darkness(rgba, width, height, absent.x, absent.y, radius);
    return absentInk > presentInk + 0.08 ? "ABSENT" : "PRESENT";
  });
}

function pickCorners(points: Point[], width: number, height: number): Point[] {
  const targets = markerCenters().map((center) => ({
    x: (center.x / SHEET_W) * width,
    y: (center.y / SHEET_H) * height,
  }));
  const used = new Set<number>();
  const chosen: Point[] = [];

  for (const target of targets) {
    let best = -1;
    let bestDist = Infinity;
    points.forEach((point, index) => {
      if (used.has(index)) return;
      const dist = (point.x - target.x) ** 2 + (point.y - target.y) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    if (best >= 0 && bestDist < (width * 0.35) ** 2) {
      used.add(best);
      chosen.push(points[best]);
    } else {
      chosen.push(target);
    }
  }

  return chosen;
}
