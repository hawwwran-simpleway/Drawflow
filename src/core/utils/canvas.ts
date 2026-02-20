import type Drawflow from '../Drawflow';

export function applyCanvasTranslation(context: Drawflow, x: number, y: number): void {
  // Snap to the zoom-unit grid so grid lines stay on whole pixels at every zoom level.
  // canvas_x / zoom must be an integer; at zoom=1 → 1px steps, zoom=2 → 2px steps, etc.
  // NOTE: canvas_x is NOT updated here — this is display-only. The stored value is
  // snapped separately in dragEnd so the cumulative drag formula stays correct.
  const rx = Math.round(Math.round(x / context.zoom) * context.zoom);
  const ry = Math.round(Math.round(y / context.zoom) * context.zoom);

  if (context.precanvas) {
    context.precanvas.style.transform = `translate(${rx}px, ${ry}px) scale(${context.zoom})`;

    // CSS transform-origin is 50% 50% of the precanvas. When the precanvas scales,
    // its visual top-left shifts by origin*(1-zoom). The background grid must compensate
    // so that grid lines stay aligned with canvas coordinates at all zoom levels.
    const ox = context.precanvas.clientWidth / 2;
    const oy = context.precanvas.clientHeight / 2;
    context.container.style.backgroundPosition =
      `${Math.round(rx + ox * (1 - context.zoom))}px ${Math.round(ry + oy * (1 - context.zoom))}px`;
  } else {
    context.container.style.backgroundPosition = `${rx}px ${ry}px`;
  }
}

export function applyStoredCanvasTranslation(context: Drawflow): void {
  applyCanvasTranslation(context, context.canvas_x, context.canvas_y);
}

export function setCanvasTranslation(context: Drawflow, x: number, y: number): void {
  context.canvas_x = x;
  context.canvas_y = y;

  context.dispatch('translate', { x, y });
  applyCanvasTranslation(context, x, y);
}

export function resetCanvasTransform(context: Drawflow): void {
  if (context.precanvas) {
    context.precanvas.style.transform = '';
  }

  context.container.style.backgroundPosition = '0px 0px';
}
