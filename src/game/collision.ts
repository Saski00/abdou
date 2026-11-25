export interface Vec2 {
  x: number;
  y: number;
}

export function clamp(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

export function resolveCircleAABB(
  cx: number,
  cy: number,
  r: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): Vec2 {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= r * r) {
    return { x: cx, y: cy };
  }

  if (distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const overlap = r - dist;
    return {
      x: cx + (dx / dist) * overlap,
      y: cy + (dy / dist) * overlap,
    };
  }

  // Center is inside the box; push out along shallowest axis
  const left = cx - rx;
  const right = rx + rw - cx;
  const top = cy - ry;
  const bottom = ry + rh - cy;
  const minSide = Math.min(left, right, top, bottom);

  if (minSide === left) return { x: rx - r, y: cy };
  if (minSide === right) return { x: rx + rw + r, y: cy };
  if (minSide === top) return { x: cx, y: ry - r };
  return { x: cx, y: ry + rh + r };
}

export function resolveCircleOBB(
  cx: number,
  cy: number,
  r: number,
  ox: number,
  oy: number,
  w: number,
  h: number,
  angle: number
): Vec2 {
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const dx = cx - ox;
  const dy = cy - oy;

  // Transform circle center into OBB local space centered at (0, 0)
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  const hw = w * 0.5;
  const hh = h * 0.5;
  const resolvedLocal = resolveCircleAABB(localX, localY, r, -hw, -hh, w, h);

  if (resolvedLocal.x === localX && resolvedLocal.y === localY) {
    return { x: cx, y: cy };
  }

  // Transform back to world space
  const cosW = Math.cos(angle);
  const sinW = Math.sin(angle);
  return {
    x: ox + resolvedLocal.x * cosW - resolvedLocal.y * sinW,
    y: oy + resolvedLocal.x * sinW + resolvedLocal.y * cosW,
  };
}

export function resolveCircleCircle(
  cx: number,
  cy: number,
  r: number,
  tx: number,
  ty: number,
  tr: number
): Vec2 {
  const dx = cx - tx;
  const dy = cy - ty;
  const minDist = r + tr;
  const distSq = dx * dx + dy * dy;

  if (distSq >= minDist * minDist) {
    return { x: cx, y: cy };
  }

  if (distSq < 0.0001) {
    return { x: cx + minDist, y: cy };
  }

  const dist = Math.sqrt(distSq);
  const overlap = minDist - dist;
  return {
    x: cx + (dx / dist) * overlap,
    y: cy + (dy / dist) * overlap,
  };
}

export function resolveCircleSegment(
  cx: number,
  cy: number,
  r: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  halfThickness: number
): Vec2 {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 0.0001) {
    return resolveCircleCircle(cx, cy, r, x1, y1, halfThickness);
  }

  const t = clamp(((cx - x1) * vx + (cy - y1) * vy) / lenSq, 0, 1);
  const closestX = x1 + t * vx;
  const closestY = y1 + t * vy;

  return resolveCircleCircle(cx, cy, r, closestX, closestY, halfThickness);
}

export function segmentIntersectsAABB(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  let tMin = 0;
  let tMax = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (Math.abs(dx) < 1e-6) {
    if (x1 < rx || x1 > rx + rw) return false;
  } else {
    const inv = 1 / dx;
    let t1 = (rx - x1) * inv;
    let t2 = (rx + rw - x1) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }

  if (Math.abs(dy) < 1e-6) {
    if (y1 < ry || y1 > ry + rh) return false;
  } else {
    const inv = 1 / dy;
    let t1 = (ry - y1) * inv;
    let t2 = (ry + rh - y1) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }

  return tMin <= tMax;
}

export function segmentIntersectsOBB(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ox: number,
  oy: number,
  w: number,
  h: number,
  angle: number
): boolean {
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const dx1 = x1 - ox;
  const dy1 = y1 - oy;
  const dx2 = x2 - ox;
  const dy2 = y2 - oy;

  const lx1 = dx1 * cos - dy1 * sin;
  const ly1 = dx1 * sin + dy1 * cos;
  const lx2 = dx2 * cos - dy2 * sin;
  const ly2 = dx2 * sin + dy2 * cos;

  return segmentIntersectsAABB(lx1, ly1, lx2, ly2, -w * 0.5, -h * 0.5, w, h);
}

export function segmentsIntersect2D(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  bx1: number,
  by1: number,
  bx2: number,
  by2: number
): boolean {
  const rX = ax2 - ax1;
  const rY = ay2 - ay1;
  const sX = bx2 - bx1;
  const sY = by2 - by1;
  const denom = rX * sY - rY * sX;
  if (Math.abs(denom) < 1e-6) return false;

  const uNum = (bx1 - ax1) * rY - (by1 - ay1) * rX;
  const tNum = (bx1 - ax1) * sY - (by1 - ay1) * sX;
  const t = tNum / denom;
  const u = uNum / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

