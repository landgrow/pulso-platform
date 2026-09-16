export const MIN_MAP_SCALE = 0.25;
export const MAX_MAP_SCALE = 2.5;

export type MapView = { x: number; y: number; scale: number };

export const DEFAULT_MAP_VIEW: MapView = { x: 40, y: 32, scale: 1 };

export function clampMapScale(scale: number): number {
  return Math.min(MAX_MAP_SCALE, Math.max(MIN_MAP_SCALE, scale));
}

/** Mantém o ponto do cursor parado no mundo ao mudar o zoom. */
export function zoomMapView(
  view: MapView,
  pointer: { x: number; y: number },
  nextScale: number,
): MapView {
  const scale = clampMapScale(nextScale);
  const worldX = (pointer.x - view.x) / view.scale;
  const worldY = (pointer.y - view.y) / view.scale;
  return {
    scale,
    x: pointer.x - worldX * scale,
    y: pointer.y - worldY * scale,
  };
}

export function panMapView(
  view: MapView,
  delta: { x: number; y: number },
): MapView {
  return { ...view, x: view.x + delta.x, y: view.y + delta.y };
}
