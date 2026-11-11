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

function isDark(data: Uint8ClampedArray, index: number, threshold = 110) {
  return luminance(data, index) < threshold;
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
  const x =
    tl.x +
    (tr.x - tl.x) * u +
    (bl.x - tl.x) * v +
    (tl.x - tr.x - bl.x + br.x) * u * v;
  const y =
    tl.y +
    (tr.y - tl.y) * u +
    (bl.y - tl.y) * v +
    (tl.y - tr.y - bl.y + br.y) * u * v;
  return { x, y };
}

/** Interior-only sample so empty checkboxes stay near white. */
function interiorInk(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  boxPx: number
) {
  const half = Math.max(2, boxPx * 0.2);
  const x0 = Math.max(0, Math.floor(cx - half));
  const x1 = Math.min(width - 1, Math.ceil(cx + half));
  const y0 = Math.max(0, Math.floor(cy - half));
  const y1 = Math.min(height - 1, Math.ceil(cy + half));

  let dark = 0;
  let total = 0;
  let sum = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const lum = luminance(data, (y * width + x) * 4);
      total += 1;
      sum += lum;
      if (lum < 150) dark += 1;
    }
  }
  if (!total) return { ink: 0, mean: 255 };
  return { ink: dark / total, mean: sum / total };
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
    if (best >= 0 && bestDist < (width * 0.4) ** 2) {
      used.add(best);
      chosen.push(points[best]);
    } else {
      chosen.push(target);
    }
  }

  return chosen;
}

/**
 * Detect checkbox border centers in the P/A columns and cluster them into rows.
 * This corrects vertical print/scan drift that grows toward the bottom of the page.
 */
function detectRowCenters(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  count: number,
  corners: Point[]
) {
  const boxes = studentBoxes(count);
  const expected = boxes.map((box) => {
    const p = sheetUv(box.present.x + BOX / 2, box.present.y + BOX / 2);
    const a = sheetUv(box.absent.x + BOX / 2, box.absent.y + BOX / 2);
    return {
      present: mapPoint(p.u, p.v, corners),
      absent: mapPoint(a.u, a.v, corners),
    };
  });

  const boxPx = (BOX / SHEET_W) * width;
  const xMin = Math.floor(width * 0.68);
  const yMin = Math.floor(height * 0.1);
  const yMax = Math.floor(height * 0.94);
  const seen = new Uint8Array(width * height);
  const candidates: Point[] = [];
  // Keep this tight: a large radius eats the last A checkboxes near the bottom-right marker.
  const markerExclude = corners.map((corner) => ({
    x: corner.x,
    y: corner.y,
    r2: (Math.max(width, height) * 0.035) ** 2,
  }));

  for (let y = yMin; y < yMax; y += 1) {
    for (let x = xMin; x < width * 0.97; x += 1) {
      const start = y * width + x;
      if (seen[start]) continue;
      if (!isDark(data, start * 4, 125)) continue;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;
      let sx = 0;
      let sy = 0;
      const stack = [start];

      while (stack.length) {
        const idx = stack.pop()!;
        if (seen[idx]) continue;
        const px = idx % width;
        const py = (idx - px) / width;
        if (px < xMin || py < yMin || py > yMax) continue;
        if (!isDark(data, idx * 4, 125)) continue;
        seen[idx] = 1;
        area += 1;
        sx += px;
        sy += py;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        if (px > xMin) stack.push(idx - 1);
        if (px < width - 1) stack.push(idx + 1);
        if (py > yMin) stack.push(idx - width);
        if (py < yMax) stack.push(idx + width);
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const cx = sx / Math.max(area, 1);
      const cy = sy / Math.max(area, 1);
      const nearMarker = markerExclude.some(
        (marker) => (cx - marker.x) ** 2 + (cy - marker.y) ** 2 < marker.r2
      );
      if (nearMarker) continue;
      if (
        area >= 12 &&
        area <= boxPx * boxPx * 3 &&
        bw >= boxPx * 0.45 &&
        bh >= boxPx * 0.45 &&
        bw <= boxPx * 2.4 &&
        bh <= boxPx * 2.4
      ) {
        candidates.push({ x: cx, y: cy });
      }
    }
  }

  const midX =
    expected.reduce((sum, row) => sum + (row.present.x + row.absent.x) / 2, 0) /
    Math.max(expected.length, 1);
  const left = candidates.filter((c) => c.x < midX);
  const right = candidates.filter((c) => c.x >= midX);
  const rowTolerance = boxPx * 0.55;
  const search = boxPx * 0.85;
  const usedLeft = new Set<number>();
  const usedRight = new Set<number>();

  return expected.map((row) => {
    let bestPresent = row.present;
    let bestAbsent = row.absent;
    let bestScore = Infinity;
    let bestLeft = -1;
    let bestRight = -1;

    left.forEach((present, li) => {
      if (usedLeft.has(li)) return;
      if (Math.abs(present.y - row.present.y) > search) return;
      right.forEach((absent, ri) => {
        if (usedRight.has(ri)) return;
        // P and A must belong to the same printed row.
        if (Math.abs(present.y - absent.y) > rowTolerance) return;
        const rowY = (present.y + absent.y) / 2;
        if (Math.abs(rowY - row.present.y) > search) return;
        const score =
          (present.x - row.present.x) ** 2 +
          (absent.x - row.absent.x) ** 2 +
          (rowY - row.present.y) ** 2 * 2;
        if (score < bestScore) {
          bestScore = score;
          bestLeft = li;
          bestRight = ri;
          bestPresent = { x: present.x, y: rowY };
          bestAbsent = { x: absent.x, y: rowY };
        }
      });
    });

    if (bestScore < Infinity) {
      usedLeft.add(bestLeft);
      usedRight.add(bestRight);
      return { present: bestPresent, absent: bestAbsent };
    }

    // Fallback: one-sided unused mark (last rows may have only one visible border).
    let bestDist = Infinity;
    let bestSide: "left" | "right" | null = null;
    let bestIndex = -1;
    let bestX = 0;
    let bestY = 0;
    for (let li = 0; li < left.length; li += 1) {
      if (usedLeft.has(li)) continue;
      const candidate = left[li];
      const dist =
        (candidate.x - row.present.x) ** 2 + (candidate.y - row.present.y) ** 2;
      if (Math.abs(candidate.y - row.present.y) <= search && dist < bestDist) {
        bestDist = dist;
        bestSide = "left";
        bestIndex = li;
        bestX = candidate.x;
        bestY = candidate.y;
      }
    }
    for (let ri = 0; ri < right.length; ri += 1) {
      if (usedRight.has(ri)) continue;
      const candidate = right[ri];
      const dist =
        (candidate.x - row.absent.x) ** 2 + (candidate.y - row.absent.y) ** 2;
      if (Math.abs(candidate.y - row.absent.y) <= search && dist < bestDist) {
        bestDist = dist;
        bestSide = "right";
        bestIndex = ri;
        bestX = candidate.x;
        bestY = candidate.y;
      }
    }

    if (bestSide !== null) {
      if (bestSide === "left") usedLeft.add(bestIndex);
      else usedRight.add(bestIndex);
      bestPresent = { x: row.present.x, y: bestY };
      bestAbsent = { x: row.absent.x, y: bestY };
      if (bestSide === "left") bestPresent = { ...bestPresent, x: bestX };
      else bestAbsent = { ...bestAbsent, x: bestX };
    }

    return { present: bestPresent, absent: bestAbsent };
  });
}

export function readSheetMarks(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  studentCount: number,
  debug?: { rows?: { present: Point; absent: Point }[] }
): SheetMark[] {
  const blobs = findDarkBlobs(rgba, width, height).sort((a, b) => b.area - a.area);
  const imageArea = width * height;
  const markers = blobs.filter(
    (b) => b.area > imageArea * 0.0008 && b.area < imageArea * 0.03
  );

  const centers = markers.map((b) => ({
    x: (b.minX + b.maxX) / 2,
    y: (b.minY + b.maxY) / 2,
  }));

  const corners = pickCorners(centers, width, height);
  const rows = detectRowCenters(rgba, width, height, studentCount, corners);
  if (debug) debug.rows = rows;
  const boxPx = (BOX / SHEET_W) * width;

  return rows.map((row) => {
    // Fine nudge around the detected center to land in the white interior.
    let best = {
      present: interiorInk(rgba, width, height, row.present.x, row.present.y, boxPx),
      absent: interiorInk(rgba, width, height, row.absent.x, row.absent.y, boxPx),
      score: -Infinity,
    };

    const step = Math.max(1, Math.round(boxPx * 0.08));
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const present = interiorInk(
          rgba,
          width,
          height,
          row.present.x + dx * step,
          row.present.y + dy * step,
          boxPx
        );
        const absent = interiorInk(
          rgba,
          width,
          height,
          row.absent.x + dx * step,
          row.absent.y + dy * step,
          boxPx
        );
        // Strong contrast first; also reward bright (empty) interiors overall.
        const contrast = Math.abs(present.ink - absent.ink);
        const brightness = (present.mean + absent.mean) / 510;
        const score = contrast * 12 + brightness;
        if (score > best.score) {
          best = { present, absent, score };
        }
      }
    }

    const inkGap = best.absent.ink - best.present.ink;
    const meanGap = best.present.mean - best.absent.mean;

    if (inkGap >= 0.045) return "ABSENT";
    if (-inkGap >= 0.045) return "PRESENT";
    if (meanGap >= 12) return "ABSENT";
    if (-meanGap >= 12) return "PRESENT";
    // Empty / ambiguous defaults to present (matches empty-box rule on the printed sheet).
    return "PRESENT";
  });
}
