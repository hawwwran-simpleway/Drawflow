import type Drawflow from '../Drawflow';

export function applyCanvasTranslation(context: Drawflow, x: number, y: number): void {
  const rx = Math.round(x);
  const ry = Math.round(y);

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
