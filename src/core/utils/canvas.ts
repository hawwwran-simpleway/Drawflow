import type Drawflow from '../Drawflow';

export function applyCanvasTranslation(context: Drawflow, x: number, y: number): void {
  if (context.precanvas) {
    context.precanvas.style.transform = `translate(${x}px, ${y}px) scale(${context.zoom})`;
  }

  context.container.style.backgroundPosition = `${x}px ${y}px`;
}

export function applyStoredCanvasTranslation(context: Drawflow): void {
  applyCanvasTranslation(context, context.canvas_x, context.canvas_y);
}

export function resetCanvasTransform(context: Drawflow): void {
  if (context.precanvas) {
    context.precanvas.style.transform = '';
  }

  context.container.style.backgroundPosition = '0px 0px';
}
