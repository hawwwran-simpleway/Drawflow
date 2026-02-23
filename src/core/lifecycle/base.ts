import type Drawflow from '../Drawflow';

export function start(context: Drawflow): void {
  const { container } = context;
  container.classList.add('parent-drawflow');
  container.tabIndex = 0;
  context.precanvas = document.createElement('div');
  context.precanvas.classList.add('drawflow');
  container.appendChild(context.precanvas);

  document.addEventListener('mouseup', context.dragEnd);
  container.addEventListener('mousemove', context.position);
  container.addEventListener('mousedown', context.click);

  container.addEventListener('touchend', context.dragEnd);
  container.addEventListener('touchmove', context.position);
  container.addEventListener('touchstart', context.click);

  container.addEventListener('contextmenu', context.contextmenu);
  container.addEventListener('keydown', context.key);
  container.addEventListener('wheel', context.zoom_enter);
  container.addEventListener('input', context.updateNodeValue);
  container.addEventListener('dblclick', context.dblclick);

  container.onpointerdown = context.pointerdown_handler;
  container.onpointermove = context.pointermove_handler;
  container.onpointerup = context.pointerup_handler;
  container.onpointercancel = context.pointerup_handler;
  container.onpointerout = context.pointerup_handler;
  container.onpointerleave = context.pointerup_handler;

  context.load();
}

export function load(context: Drawflow): void {
  const moduleData = context.drawflow.drawflow[context.module];
  if (!moduleData) {
    return;
  }

  Object.keys(moduleData.data).forEach((key) => {
    context.addNodeImport(moduleData.data[key], context.precanvas!);
  });

  if (context.reroute) {
    Object.keys(moduleData.data).forEach((key) => {
      context.addRerouteImport(moduleData.data[key]);
    });
  }

  Object.keys(moduleData.data).forEach((key) => {
    context.updateConnectionNodes(`node-${key}`);
  });

  const editor = context.drawflow.drawflow;
  let number = 1;
  Object.keys(editor).forEach((moduleName) => {
    Object.keys(editor[moduleName].data).forEach((id) => {
      const numericId = parseInt(id, 10);
      if (numericId >= number) {
        number = numericId + 1;
      }
    });
  });
  context.nodeId = number;
}

export function removeReouteConnectionSelected(context: Drawflow): void {
  context.dispatch('connectionUnselected', true);
  if (context.reroute_fix_curvature && context.connection_selected) {
    context.connection_selected.parentElement?.querySelectorAll('.main-path').forEach((item) => {
      item.classList.remove('selected');
    });
  }
}
