import type Drawflow from './Drawflow';
import type { DrawflowData } from './types';
import { resetCanvasTransform } from './utils/canvas';

export function getModuleFromNodeId(context: Drawflow, id: string): string | undefined {
  let nameModule: string | undefined;
  const editor = context.drawflow.drawflow;
  Object.keys(editor).forEach((moduleName) => {
    Object.keys(editor[moduleName].data).forEach((node) => {
      if (String(node) === String(id)) {
        nameModule = moduleName;
      }
    });
  });
  return nameModule;
}

export function addModule(context: Drawflow, name: string): void {
  context.drawflow.drawflow[name] = { data: {} };
  context.dispatch('moduleCreated', name);
}

export function changeModule(context: Drawflow, name: string): void {
  context.dispatch('moduleChanged', name);
  context.module = name;
  if (context.precanvas) {
    context.precanvas.innerHTML = '';
  }
  context.canvas_x = 0;
  context.canvas_y = 0;
  context.pos_x = 0;
  context.pos_y = 0;
  context.mouse_x = 0;
  context.mouse_y = 0;
  context.zoom = 1;
  context.zoom_last_value = 1;
  resetCanvasTransform(context);
  context.import(context.drawflow, false);
}

export function removeModule(context: Drawflow, name: string): void {
  if (context.module === name) {
    context.changeModule('Home');
  }
  delete context.drawflow.drawflow[name];
  context.dispatch('moduleRemoved', name);
}

export function clearModuleSelected(context: Drawflow): void {
  if (context.precanvas) {
    context.precanvas.innerHTML = '';
  }
  context.drawflow.drawflow[context.module] = { data: {} };
}

export function clear(context: Drawflow): void {
  if (context.precanvas) {
    context.precanvas.innerHTML = '';
  }
  context.drawflow = { drawflow: { Home: { data: {} } } } as DrawflowData;
}
