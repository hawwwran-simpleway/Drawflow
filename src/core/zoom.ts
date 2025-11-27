import type Drawflow from './Drawflow';
import { applyStoredCanvasTranslation } from './utils/canvas';

export function zoom_enter(context: Drawflow, event: WheelEvent): void {
  if (event.ctrlKey) {
    event.preventDefault();
    if (event.deltaY > 0) {
      context.zoom_out();
    } else {
      context.zoom_in();
    }
  }
}

export function zoom_refresh(context: Drawflow): void {
  context.dispatch('zoom', context.zoom);
  context.canvas_x = (context.canvas_x / context.zoom_last_value) * context.zoom;
  context.canvas_y = (context.canvas_y / context.zoom_last_value) * context.zoom;
  context.zoom_last_value = context.zoom;
  applyStoredCanvasTranslation(context);
}

export function zoom_in(context: Drawflow): void {
  if (context.zoom < context.zoom_max) {
    context.zoom += context.zoom_value;
    context.zoom_refresh();
  }
}

export function zoom_out(context: Drawflow): void {
  if (context.zoom > context.zoom_min) {
    context.zoom -= context.zoom_value;
    context.zoom_refresh();
  }
}

export function zoom_reset(context: Drawflow): void {
  if (context.zoom !== 1) {
    context.zoom = 1;
    context.zoom_refresh();
  }
}

export function zoom_fit(context: Drawflow, padding = 0): void {
  if (!context.precanvas) return;

  const nodes = Array.from(context.precanvas.querySelectorAll<HTMLElement>('.drawflow-node'));
  if (nodes.length === 0) return;

  const bounds = nodes.reduce(
    (acc, node) => {
      const left = node.offsetLeft;
      const top = node.offsetTop;
      const right = left + node.offsetWidth;
      const bottom = top + node.offsetHeight;

      return {
        minX: Math.min(acc.minX, left),
        minY: Math.min(acc.minY, top),
        maxX: Math.max(acc.maxX, right),
        maxY: Math.max(acc.maxY, bottom)
      };
    },
    { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY }
  );

  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);

  const containerWidth = context.container.clientWidth;
  const containerHeight = context.container.clientHeight;
  const normalizedPadding = Math.max(0, padding);

  const availableWidth = Math.max(containerWidth - normalizedPadding * 2, 0);
  const availableHeight = Math.max(containerHeight - normalizedPadding * 2, 0);

  if (availableWidth === 0 || availableHeight === 0) return;

  const scaleX = availableWidth / contentWidth;
  const scaleY = availableHeight / contentHeight;
  const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), context.zoom_min), context.zoom_max);

  const contentCenterX = bounds.minX + contentWidth / 2;
  const contentCenterY = bounds.minY + contentHeight / 2;

  const paddedCenterX = normalizedPadding + availableWidth / 2;
  const paddedCenterY = normalizedPadding + availableHeight / 2;

  context.zoom = newZoom;
  context.zoom_last_value = newZoom;
  const panShiftX = paddedCenterX / newZoom - contentCenterX;
  const panShiftY = paddedCenterY / newZoom - contentCenterY;

  console.log('Drawflow zoom_fit content center', { x: contentCenterX, y: contentCenterY });
  console.log('Drawflow zoom_fit pan shift', { x: panShiftX, y: panShiftY });

  context.canvas_x = panShiftX;
  context.canvas_y = panShiftY;

  context.dispatch('zoom', context.zoom);
  applyStoredCanvasTranslation(context);
}
