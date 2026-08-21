export const FALLOFF_CURVES = {
  linear: p => p,
  smooth: p => p * p * (3 - 2 * p),
  sharp:  p => p * p * p
};

export const FALLOFF_NAMES = ['linear', 'smooth', 'sharp'];

export function applyFalloff(value, curve = 'smooth') {
  const fn = FALLOFF_CURVES[curve] ?? FALLOFF_CURVES.linear;
  return fn(Math.max(0, Math.min(1, value)));
}
