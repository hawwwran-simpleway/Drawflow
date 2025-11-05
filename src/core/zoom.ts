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
