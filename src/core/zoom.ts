import type Drawflow from './Drawflow';
import { applyStoredCanvasTranslation, setCanvasTranslation } from './utils/canvas';

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

export function zoom_fit(context: Drawflow, paddingTop = 0, paddingRight = 0, paddingBottom = 0, paddingLeft = 0): void {
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
  
  const normalizedPaddingTop = Math.max(0, paddingTop);
  const normalizedPaddingRight = Math.max(0, paddingRight);
  const normalizedPaddingBottom = Math.max(0, paddingBottom);
  const normalizedPaddingLeft = Math.max(0, paddingLeft);

  const availableWidth = Math.max(containerWidth - (normalizedPaddingLeft + normalizedPaddingRight), 0);
  const availableHeight = Math.max(containerHeight - (normalizedPaddingTop + normalizedPaddingBottom), 0);

  if (availableWidth === 0 || availableHeight === 0) return;

  const scaleX = availableWidth / contentWidth;
  const scaleY = availableHeight / contentHeight;
  const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), context.zoom_min), context.zoom_max);

  const contentCenterX = bounds.minX + contentWidth / 2;
  const contentCenterY = bounds.minY + contentHeight / 2;
	
  const paddedCenterX = containerWidth / 2;
  const paddedCenterY = containerHeight / 2;

  context.zoom = newZoom;
  context.zoom_last_value = newZoom;
  
  const panShiftX = ((paddedCenterX - contentCenterX) * newZoom) + ((normalizedPaddingLeft - normalizedPaddingRight) / 2);
  const panShiftY = ((paddedCenterY - contentCenterY) * newZoom) + ((normalizedPaddingTop - normalizedPaddingBottom) / 2);

  context.dispatch('zoom', context.zoom);
  setCanvasTranslation(context, panShiftX, panShiftY);
}
