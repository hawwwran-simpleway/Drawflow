import type Drawflow from '../Drawflow';

export function applyCanvasTranslation(context: Drawflow, x: number, y: number): void {
  if (context.precanvas) {
    const pixelRatio = window.devicePixelRatio || 1;
    const roundedX = Math.round(x * pixelRatio) / pixelRatio;
    const roundedY = Math.round(y * pixelRatio) / pixelRatio;
    context.precanvas.style.transform = `translate3d(${roundedX}px, ${roundedY}px, 0) scale(${context.zoom})`;
    context.container.style.backgroundPosition = `${roundedX}px ${roundedY}px`;
    return;
  }

  context.container.style.backgroundPosition = `${x}px ${y}px`;
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
