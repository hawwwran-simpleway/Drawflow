import type Drawflow from '../Drawflow';

export function pointerdown_handler(context: Drawflow, ev: PointerEvent): void {
  context.evCache.push(ev);
}

export function pointermove_handler(context: Drawflow, ev: PointerEvent): void {
  for (let i = 0; i < context.evCache.length; i += 1) {
    if (ev.pointerId === context.evCache[i].pointerId) {
      context.evCache[i] = ev;
      break;
    }
  }

  if (context.evCache.length === 2) {
    const curDiff = Math.abs(context.evCache[0].clientX - context.evCache[1].clientX);

    if (context.prevDiff > 100) {
      if (curDiff > context.prevDiff) {
        context.zoom_in();
      }
      if (curDiff < context.prevDiff) {
        context.zoom_out();
      }
    }
    context.prevDiff = curDiff;
  }
}

export function pointerup_handler(context: Drawflow, ev: PointerEvent): void {
  remove_event(context, ev);
  if (context.evCache.length < 2) {
    context.prevDiff = -1;
  }
}

export function remove_event(context: Drawflow, ev: PointerEvent): void {
  for (let i = 0; i < context.evCache.length; i += 1) {
    if (context.evCache[i].pointerId === ev.pointerId) {
      context.evCache.splice(i, 1);
      break;
    }
  }
}
