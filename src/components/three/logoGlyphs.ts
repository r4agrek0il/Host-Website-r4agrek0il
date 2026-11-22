import * as THREE from 'three';

export interface GlyphSpec {
  width: number;
  buildShapes: () => THREE.Shape[];
}

function makeRoundedRectHole(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): THREE.Path {
  const path = new THREE.Path();
  const cr = Math.min(r, w / 2, h / 2);
  path.moveTo(x + cr, y);
  path.lineTo(x + w - cr, y);
  path.quadraticCurveTo(x + w, y, x + w, y + cr);
  path.lineTo(x + w, y + h - cr);
  path.quadraticCurveTo(x + w, y + h, x + w - cr, y + h);
  path.lineTo(x + cr, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - cr);
  path.lineTo(x, y + cr);
  path.quadraticCurveTo(x, y, x + cr, y);
  path.closePath();
  return path;
}

function buildR(): THREE.Shape[] {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.18, 0);
  s.lineTo(0.18, 0.34);
  s.lineTo(0.32, 0.34);
  s.lineTo(0.49, 0);
  s.lineTo(0.69, 0);
  s.lineTo(0.49, 0.37);
  s.quadraticCurveTo(0.64, 0.44, 0.64, 0.63);
  s.quadraticCurveTo(0.64, 0.86, 0.36, 0.86);
  s.lineTo(0, 0.86);
  s.closePath();

  const hole = new THREE.Path();
  hole.moveTo(0.18, 0.5);
  hole.lineTo(0.35, 0.5);
  hole.quadraticCurveTo(0.45, 0.5, 0.45, 0.61);
  hole.quadraticCurveTo(0.45, 0.71, 0.35, 0.71);
  hole.lineTo(0.18, 0.71);
  hole.closePath();
  s.holes.push(hole);
  return [s];
}

function build4(): THREE.Shape[] {
  const s = new THREE.Shape();
  s.moveTo(0.37, 0);
  s.lineTo(0.55, 0);
  s.lineTo(0.55, 0.19);
  s.lineTo(0.67, 0.19);
  s.lineTo(0.67, 0.34);
  s.lineTo(0.55, 0.34);
  s.lineTo(0.55, 0.86);
  s.lineTo(0.34, 0.86);
  s.lineTo(0.01, 0.32);
  s.lineTo(0.01, 0.19);
  s.lineTo(0.37, 0.19);
  s.closePath();

  const hole = new THREE.Path();
  hole.moveTo(0.37, 0.34);
  hole.lineTo(0.18, 0.34);
  hole.lineTo(0.37, 0.64);
  hole.closePath();
  s.holes.push(hole);
  return [s];
}

function buildA(): THREE.Shape[] {
  const s = new THREE.Shape();
  // Bold geometric lowercase 'a' (double-story feel)
  s.moveTo(0.08, 0.5);
  s.quadraticCurveTo(0.15, 0.66, 0.35, 0.66);
  s.quadraticCurveTo(0.58, 0.66, 0.58, 0.42);
  s.lineTo(0.58, 0);
  s.lineTo(0.43, 0);
  s.lineTo(0.42, 0.07);
  s.quadraticCurveTo(0.34, -0.02, 0.21, -0.02);
  s.quadraticCurveTo(0.02, -0.02, 0.02, 0.17);
  s.quadraticCurveTo(0.02, 0.36, 0.26, 0.38);
  s.lineTo(0.41, 0.39);
  s.lineTo(0.41, 0.43);
  s.quadraticCurveTo(0.41, 0.52, 0.31, 0.52);
  s.quadraticCurveTo(0.22, 0.52, 0.19, 0.44);
  s.closePath();

  const hole = new THREE.Path();
  hole.moveTo(0.25, 0.11);
  hole.quadraticCurveTo(0.17, 0.11, 0.17, 0.18);
  hole.quadraticCurveTo(0.17, 0.26, 0.29, 0.26);
  hole.lineTo(0.41, 0.26);
  hole.lineTo(0.41, 0.21);
  hole.quadraticCurveTo(0.39, 0.11, 0.25, 0.11);
  hole.closePath();
  s.holes.push(hole);
  return [s];
}

function buildG(): THREE.Shape[] {
  const s = new THREE.Shape();
  // Bold lowercase 'g' with curved descender hook
  s.moveTo(0.44, 0.64);
  s.lineTo(0.59, 0.64);
  s.lineTo(0.59, 0.01);
  s.quadraticCurveTo(0.59, -0.25, 0.3, -0.25);
  s.quadraticCurveTo(0.1, -0.25, 0.05, -0.11);
  s.lineTo(0.2, -0.06);
  s.quadraticCurveTo(0.23, -0.13, 0.31, -0.13);
  s.quadraticCurveTo(0.42, -0.13, 0.42, 0.02);
  s.lineTo(0.42, 0.08);
  s.quadraticCurveTo(0.34, 0.0, 0.23, 0.0);
  s.quadraticCurveTo(0.02, 0.0, 0.02, 0.32);
  s.quadraticCurveTo(0.02, 0.66, 0.25, 0.66);
  s.quadraticCurveTo(0.36, 0.66, 0.43, 0.57);
  s.closePath();

  const hole = makeRoundedRectHole(0.18, 0.14, 0.24, 0.36, 0.11);
  s.holes.push(hole);
  return [s];
}

function buildE(): THREE.Shape[] {
  const s = new THREE.Shape();
  s.moveTo(0.58, 0.29);
  s.lineTo(0.18, 0.29);
  s.quadraticCurveTo(0.19, 0.13, 0.33, 0.13);
  s.quadraticCurveTo(0.41, 0.13, 0.47, 0.19);
  s.lineTo(0.57, 0.1);
  s.quadraticCurveTo(0.47, -0.02, 0.31, -0.02);
  s.quadraticCurveTo(0.02, -0.02, 0.02, 0.32);
  s.quadraticCurveTo(0.02, 0.66, 0.31, 0.66);
  s.quadraticCurveTo(0.59, 0.66, 0.59, 0.34);
  s.closePath();

  const hole = new THREE.Path();
  hole.moveTo(0.19, 0.4);
  hole.lineTo(0.43, 0.4);
  hole.quadraticCurveTo(0.42, 0.53, 0.31, 0.53);
  hole.quadraticCurveTo(0.2, 0.53, 0.19, 0.4);
  hole.closePath();
  s.holes.push(hole);
  return [s];
}

function buildK(): THREE.Shape[] {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.17, 0);
  s.lineTo(0.17, 0.24);
  s.lineTo(0.24, 0.31);
  s.lineTo(0.43, 0);
  s.lineTo(0.63, 0);
  s.lineTo(0.36, 0.4);
  s.lineTo(0.6, 0.64);
  s.lineTo(0.39, 0.64);
  s.lineTo(0.17, 0.4);
  s.lineTo(0.17, 0.88);
  s.lineTo(0, 0.88);
  s.closePath();
  return [s];
}

function build0(): THREE.Shape[] {
  const s = new THREE.Shape();
  s.moveTo(0.3, 0);
  s.quadraticCurveTo(0.59, 0, 0.59, 0.43);
  s.quadraticCurveTo(0.59, 0.86, 0.3, 0.86);
  s.quadraticCurveTo(0.01, 0.86, 0.01, 0.43);
  s.quadraticCurveTo(0.01, 0, 0.3, 0);
  s.closePath();

  const hole = makeRoundedRectHole(0.18, 0.16, 0.24, 0.54, 0.11);
  s.holes.push(hole);
  return [s];
}

function buildI(): THREE.Shape[] {
  const stem = new THREE.Shape();
  stem.moveTo(0.02, 0);
  stem.lineTo(0.19, 0);
  stem.lineTo(0.19, 0.64);
  stem.lineTo(0.02, 0.64);
  stem.closePath();

  const dot = new THREE.Shape();
  dot.moveTo(0.02, 0.72);
  dot.lineTo(0.19, 0.72);
  dot.lineTo(0.19, 0.88);
  dot.lineTo(0.02, 0.88);
  dot.closePath();

  return [stem, dot];
}

function buildL(): THREE.Shape[] {
  const s = new THREE.Shape();
  s.moveTo(0.02, 0);
  s.lineTo(0.19, 0);
  s.lineTo(0.19, 0.88);
  s.lineTo(0.02, 0.88);
  s.closePath();
  return [s];
}

export const LOGO_GLYPH_MAP: Record<string, GlyphSpec> = {
  R: { width: 0.7, buildShapes: buildR },
  '4': { width: 0.68, buildShapes: build4 },
  a: { width: 0.62, buildShapes: buildA },
  g: { width: 0.64, buildShapes: buildG },
  e: { width: 0.62, buildShapes: buildE },
  k: { width: 0.63, buildShapes: buildK },
  '0': { width: 0.61, buildShapes: build0 },
  i: { width: 0.23, buildShapes: buildI },
  l: { width: 0.23, buildShapes: buildL },
};

export const WORDMARK_CHARS = ['R', '4', 'a', 'g', 'R', 'e', 'k', '0', 'i', 'l'] as const;
