import type Drawflow from '../Drawflow';
import { applyCanvasTranslation, applyStoredCanvasTranslation } from '../utils/canvas';
import { extractConnectionClassInfo, findClassWithPrefix } from '../utils/classNames';
import type { DrawflowWirelessPortReference } from '../types';
import { isPortEligibleForWireless, movementExceedsThreshold, openWirelessDialog } from '../wireless';

const hasWindow = typeof window !== 'undefined';
const requestFrame = hasWindow && typeof window.requestAnimationFrame === 'function'
  ? window.requestAnimationFrame.bind(window)
  : (callback: (time: number) => void) => setTimeout(() => callback(Date.now()), 16);
const cancelFrame = hasWindow && typeof window.cancelAnimationFrame === 'function'
  ? window.cancelAnimationFrame.bind(window)
  : (id: number) => clearTimeout(id);

export function click(context: Drawflow, e: MouseEvent | TouchEvent): void {
  context.dispatch('click', e);
  const target = e.target as HTMLElement;
  if (!target) {
    return;
  }

  if (context.editor_mode === 'fixed') {
    if (target.classList.contains('parent-drawflow') || target.classList.contains('drawflow')) {
      context.ele_selected = target.closest('.parent-drawflow') as HTMLElement;
      e.preventDefault();
    } else {
      return;
    }
  } else if (context.editor_mode === 'view') {
    if (target.closest('.drawflow') != null || target.matches('.parent-drawflow')) {
      context.ele_selected = target.closest('.parent-drawflow') as HTMLElement;
      e.preventDefault();
    }
  } else {
    context.first_click = target as HTMLElement;
    context.ele_selected = target as HTMLElement;
    if ('button' in e && (e as MouseEvent).button === 0) {
      context.contextmenuDel();
    }

    const contentNode = target.closest('.drawflow_content_node');
    if (contentNode) {
      context.ele_selected = contentNode.parentElement as HTMLElement;
    }
  }

  if (!context.ele_selected) {
    return;
  }

  const selectedElement = context.ele_selected;
  const selectedClasses = selectedElement.classList;
  const isNode = selectedClasses.contains('drawflow-node');
  const isOutput = selectedClasses.contains('output');
  const isInput = selectedClasses.contains('input');
  const isEditor = selectedClasses.contains('parent-drawflow') || selectedClasses.contains('drawflow');
  const isMainPath = selectedClasses.contains('main-path');
  const isPoint = selectedClasses.contains('point');
  const isDeleteAction = selectedClasses.contains('drawflow-delete');

  if (isNode) {
    handleNodeSelected(context);
  } else if (isOutput || isInput) {
    handlePortSelected(context, selectedElement);
  } else if (isEditor) {
    handleEditorSelected(context);
  } else if (isMainPath) {
    handleConnectionSelected(context);
  } else if (isPoint) {
    context.drag_point = true;
    selectedElement.classList.add('selected');
  } else if (isDeleteAction) {
    if (context.node_selected) {
      context.removeNodeId(context.node_selected.id);
    }
    if (context.connection_selected) {
      context.removeConnection();
    }
    if (context.node_selected) {
      context.node_selected.classList.remove('selected');
      context.node_selected = null;
      context.dispatch('nodeUnselected', true);
    }
    if (context.connection_selected) {
      context.connection_selected.classList.remove('selected');
      context.removeReouteConnectionSelected();
      context.connection_selected = null;
    }
  }

  if (e.type === 'touchstart') {
    const touchEvent = e as TouchEvent;
    context.pos_x = touchEvent.touches[0].clientX;
    context.pos_x_start = touchEvent.touches[0].clientX;
    context.pos_y = touchEvent.touches[0].clientY;
    context.pos_y_start = touchEvent.touches[0].clientY;
    context.mouse_x = touchEvent.touches[0].clientX;
    context.mouse_y = touchEvent.touches[0].clientY;
  } else {
    const mouseEvent = e as MouseEvent;
    context.pos_x = mouseEvent.clientX;
    context.pos_x_start = mouseEvent.clientX;
    context.pos_y = mouseEvent.clientY;
    context.pos_y_start = mouseEvent.clientY;
  }

  if (isInput || isOutput || isMainPath) {
    e.preventDefault();
  }
  context.dispatch('clickEnd', e);
}

function handleNodeSelected(context: Drawflow): void {
  if (context.node_selected) {
    context.node_selected.classList.remove('selected');
    if (context.node_selected !== context.ele_selected) {
      context.dispatch('nodeUnselected', true);
    }
  }
  if (context.connection_selected) {
    context.connection_selected.classList.remove('selected');
    context.removeReouteConnectionSelected();
    context.connection_selected = null;
  }
  if (context.node_selected !== context.ele_selected) {
    context.dispatch('nodeSelected', context.ele_selected!.id.slice(5));
  }
  context.node_selected = context.ele_selected;
  context.node_selected.classList.add('selected');
  const target = context.first_click as HTMLElement | null;
  const isEditableTarget = target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.hasAttribute('contenteditable'));
  if (!context.draggable_inputs) {
    if (!isEditableTarget) {
      context.drag = true;
    }
  } else if (!target || target.tagName !== 'SELECT') {
    context.drag = true;
  }
}

function handlePortSelected(context: Drawflow, element: HTMLElement): void {
  const portReference = getPortReferenceFromElement(element);
  if (portReference && isPortEligibleForWireless(context, portReference)) {
    context.pending_wireless = portReference;
  } else {
    context.pending_wireless = null;
  }
  context.connection = true;
  if (context.node_selected) {
    context.node_selected.classList.remove('selected');
    context.node_selected = null;
    context.dispatch('nodeUnselected', true);
  }
  if (context.connection_selected) {
    context.connection_selected.classList.remove('selected');
    context.removeReouteConnectionSelected();
    context.connection_selected = null;
  }
  context.drawConnection(element);
}

function getPortReferenceFromElement(element: HTMLElement): DrawflowWirelessPortReference | null {
  const isInput = element.classList.contains('input');
  const isOutput = element.classList.contains('output');
  if (!isInput && !isOutput) {
    return null;
  }
  const nodeElement = element.parentElement?.parentElement;
  if (!nodeElement || !nodeElement.id.startsWith('node-')) {
    return null;
  }
  const portClass = findClassWithPrefix(element.classList, isInput ? 'input_' : 'output_');
  if (!portClass) {
    return null;
  }
  return {
    nodeId: nodeElement.id.slice(5),
    portClass,
    type: isInput ? 'input' : 'output',
  };
}

function handleEditorSelected(context: Drawflow): void {
  if (context.node_selected) {
    context.node_selected.classList.remove('selected');
    context.node_selected = null;
    context.dispatch('nodeUnselected', true);
  }
  if (context.connection_selected) {
    context.connection_selected.classList.remove('selected');
    context.removeReouteConnectionSelected();
    context.connection_selected = null;
  }
  context.editor_selected = true;
}

function handleConnectionSelected(context: Drawflow): void {
  if (context.node_selected) {
    context.node_selected.classList.remove('selected');
    context.node_selected = null;
    context.dispatch('nodeUnselected', true);
  }
  if (context.connection_selected) {
    context.connection_selected.classList.remove('selected');
    context.removeReouteConnectionSelected();
    context.connection_selected = null;
  }
  context.connection_selected = context.ele_selected as HTMLElement;
  context.connection_selected.classList.add('selected');
  const connectionElement = context.connection_selected.parentElement as HTMLElement | null;
  if (!connectionElement) {
    return;
  }
  const connectionInfo = extractConnectionClassInfo(connectionElement.classList);
  if (connectionInfo) {
    context.dispatch('connectionSelected', {
      output_id: connectionInfo.outputNodeId,
      input_id: connectionInfo.inputNodeId,
      output_class: connectionInfo.outputPortClass,
      input_class: connectionInfo.inputPortClass,
    });
    if (context.reroute_fix_curvature) {
      connectionElement.querySelectorAll('.main-path').forEach((item) => {
        item.classList.add('selected');
      });
    }
  }
}

export function position(context: Drawflow, e: MouseEvent | TouchEvent): void {
  let e_pos_x: number;
  let e_pos_y: number;
  if (e.type === 'touchmove') {
    const touchEvent = e as TouchEvent;
    e_pos_x = touchEvent.touches[0].clientX;
    e_pos_y = touchEvent.touches[0].clientY;
  } else {
    const mouseEvent = e as MouseEvent;
    e_pos_x = mouseEvent.clientX;
    e_pos_y = mouseEvent.clientY;
  }

  if (context.connection) {
    context.updateConnection(e_pos_x, e_pos_y);
    if (context.pending_wireless && movementExceedsThreshold(context, e_pos_x, e_pos_y)) {
      context.pending_wireless = null;
    }
    handleConnectionAutoPan(context, e_pos_x, e_pos_y);
  } else if (context.drag && context.ele_selected) {
    handleNodeAutoPan(context, e_pos_x, e_pos_y);
  } else {
    stopAutoPan(context);
  }
  if (context.editor_selected) {
    const x = context.canvas_x + (-(context.pos_x - e_pos_x));
    const y = context.canvas_y + (-(context.pos_y - e_pos_y));
    context.dispatch('translate', { x, y });
    applyCanvasTranslation(context, x, y);
  }
  if (context.drag && context.ele_selected) {
    e.preventDefault();
    const x = (context.pos_x - e_pos_x) * context.precanvas!.clientWidth / (context.precanvas!.clientWidth * context.zoom);
    const y = (context.pos_y - e_pos_y) * context.precanvas!.clientHeight / (context.precanvas!.clientHeight * context.zoom);
    context.pos_x = e_pos_x;
    context.pos_y = e_pos_y;

    context.ele_selected.style.top = `${context.ele_selected.offsetTop - y}px`;
    context.ele_selected.style.left = `${context.ele_selected.offsetLeft - x}px`;

    const nodeId = context.ele_selected.id.slice(5);
    context.drawflow.drawflow[context.module].data[nodeId].pos_x = context.ele_selected.offsetLeft - x;
    context.drawflow.drawflow[context.module].data[nodeId].pos_y = context.ele_selected.offsetTop - y;

    context.updateConnectionNodes(context.ele_selected.id);
  }

  if (context.drag_point && context.ele_selected) {
    const x = (context.pos_x - e_pos_x) * context.precanvas!.clientWidth / (context.precanvas!.clientWidth * context.zoom);
    const y = (context.pos_y - e_pos_y) * context.precanvas!.clientHeight / (context.precanvas!.clientHeight * context.zoom);
    context.pos_x = e_pos_x;
    context.pos_y = e_pos_y;

    const pos_x = context.pos_x * (context.precanvas!.clientWidth / (context.precanvas!.clientWidth * context.zoom)) -
      (context.precanvas!.getBoundingClientRect().x * (context.precanvas!.clientWidth / (context.precanvas!.clientWidth * context.zoom)));
    const pos_y = context.pos_y * (context.precanvas!.clientHeight / (context.precanvas!.clientHeight * context.zoom)) -
      (context.precanvas!.getBoundingClientRect().y * (context.precanvas!.clientHeight / (context.precanvas!.clientHeight * context.zoom)));

    context.ele_selected.setAttributeNS(null, 'cx', pos_x.toString());
    context.ele_selected.setAttributeNS(null, 'cy', pos_y.toString());

    const connectionElement = context.ele_selected.parentElement as HTMLElement | null;
    if (!connectionElement) {
      return;
    }

    const connectionInfo = extractConnectionClassInfo(connectionElement.classList);
    if (!connectionInfo) {
      return;
    }

    const {
      outputNodeDomId,
      outputNodeId,
      inputNodeId,
      outputPortClass,
      inputPortClass,
    } = connectionInfo;

    let numberPointPosition = Array.from(connectionElement.children).indexOf(context.ele_selected) - 1;

    if (context.reroute_fix_curvature) {
      const numberMainPath = connectionElement.querySelectorAll('.main-path').length - 1;
      numberPointPosition -= numberMainPath;
      if (numberPointPosition < 0) {
        numberPointPosition = 0;
      }
    }

    const nodeId = outputNodeId;
    const searchConnection = context.drawflow.drawflow[context.module].data[nodeId].outputs[outputPortClass].connections.findIndex((item) => {
      return item.node === inputNodeId && item.output === inputPortClass;
    });

    context.drawflow.drawflow[context.module].data[nodeId].outputs[outputPortClass].connections[searchConnection].points![numberPointPosition] = {
      pos_x,
      pos_y
    };

    context.updateConnectionNodes(outputNodeDomId);
  }

  if (e.type === 'touchmove') {
    const touchEvent = e as TouchEvent;
    context.mouse_x = touchEvent.touches[0].clientX;
    context.mouse_y = touchEvent.touches[0].clientY;
  }
  context.dispatch('mouseMove', { x: e_pos_x, y: e_pos_y });
}

export function dragEnd(context: Drawflow, e: MouseEvent | TouchEvent): void {
  let e_pos_x: number;
  let e_pos_y: number;
  let ele_last: HTMLElement | null = null;
  if (e.type === 'touchend') {
    e_pos_x = context.mouse_x;
    e_pos_y = context.mouse_y;
    ele_last = document.elementFromPoint(e_pos_x, e_pos_y) as HTMLElement | null;
  } else {
    const mouseEvent = e as MouseEvent;
    e_pos_x = mouseEvent.clientX;
    e_pos_y = mouseEvent.clientY;
    ele_last = mouseEvent.target as HTMLElement;
  }

  if (context.drag && context.ele_selected) {
    if (context.pos_x_start !== e_pos_x || context.pos_y_start !== e_pos_y) {
      context.dispatch('nodeMoved', context.ele_selected.id.slice(5));
    }
  }

  if (context.drag_point && context.ele_selected) {
    context.ele_selected.classList.remove('selected');
    if (context.pos_x_start !== e_pos_x || context.pos_y_start !== e_pos_y) {
      const connectionElement = context.ele_selected.parentElement as HTMLElement | null;
      const connectionInfo = connectionElement ? extractConnectionClassInfo(connectionElement.classList) : null;
      if (connectionInfo) {
        context.dispatch('rerouteMoved', connectionInfo.outputNodeId);
      }
    }
  }

  if (context.editor_selected) {
    context.canvas_x = context.canvas_x + (-(context.pos_x - e_pos_x));
    context.canvas_y = context.canvas_y + (-(context.pos_y - e_pos_y));
    context.editor_selected = false;
  }

  if (context.connection === true && context.ele_selected) {
    handleConnectionDrop(context, ele_last);
    context.connection_ele = null;
  }

  stopAutoPan(context);
  context.drag = false;
  context.drag_point = false;
  context.connection = false;
  context.ele_selected = null;
  context.editor_selected = false;

  context.dispatch('mouseUp', e);

  const pendingWireless = context.pending_wireless;
  context.pending_wireless = null;
  if (pendingWireless && context.editor_mode === 'edit') {
    void openWirelessDialog(context, pendingWireless).catch((error) => console.error(error));
  }
}

function handleConnectionDrop(context: Drawflow, ele_last: HTMLElement | null): void {
  if (!ele_last || !context.connection_ele) {
    context.dispatch('connectionCancel', true);
    context.connection_ele?.remove();
    return;
  }

  const targetIsOutput = ele_last.classList.contains('output');
  const targetIsInput = ele_last.classList.contains('input');
  const targetIsNode = ele_last.classList.contains('drawflow-node');
  const sourceIsInput = context.ele_selected!.classList.contains('input');

  if (targetIsInput || targetIsOutput || ele_last.closest('.drawflow_content_node') != null || targetIsNode) {
    let input_id: string | undefined;
    let input_class: string | undefined;
    let output_id: string | undefined;
    let output_class: string | undefined;

    if (sourceIsInput && targetIsOutput) {
      input_id = context.ele_selected!.parentElement!.parentElement!.id;
      input_class = findClassWithPrefix(context.ele_selected!.classList, 'input_');
      output_id = ele_last.parentElement!.parentElement!.id;
      output_class = findClassWithPrefix(ele_last.classList, 'output_');
    } else if (!sourceIsInput && (targetIsInput || ele_last.closest('.drawflow_content_node'))) {
      const container = ele_last.closest('.drawflow_content_node');
      input_id = container ? container.parentElement!.id : ele_last.parentElement!.parentElement!.id;
      input_class = targetIsInput ? findClassWithPrefix(ele_last.classList, 'input_') : 'input_1';
      output_id = context.ele_selected!.parentElement!.parentElement!.id;
      output_class = findClassWithPrefix(context.ele_selected!.classList, 'output_');
    }

    if (input_id && output_id && input_id !== output_id && input_class && output_class) {
      const outputNode = context.drawflow.drawflow[context.module].data[output_id.slice(5)];
      const inputNode = context.drawflow.drawflow[context.module].data[input_id.slice(5)];

      let connectionExists = false;

      const inputPort = inputNode?.inputs?.[input_class!];
      const inputHasWirelessName = inputPort?.connections.some((conn) => {
        return typeof conn.signal === 'string' && conn.signal.trim() !== '';
      }) ?? false;

      if (inputHasWirelessName) {
        context.dispatch('connectionCancel', true);
        context.connection_ele!.remove();
        context.pending_wireless = null;
        return;
      }

      if (outputNode && outputNode.outputs[output_class!]) {
        connectionExists = outputNode.outputs[output_class!].connections.some((conn) =>
          conn.node === input_id!.slice(5) && conn.output === input_class
        );
      }

      if (!connectionExists && inputNode && inputNode.inputs[input_class!]) {
        connectionExists = inputNode.inputs[input_class!].connections.some((conn) =>
          conn.node === output_id!.slice(5) && conn.input === output_class
        );
      }

      if (!connectionExists) {
        context.connection_ele!.classList.add(`node_in_${input_id}`);
        context.connection_ele!.classList.add(`node_out_${output_id}`);
        context.connection_ele!.classList.add(output_class!);
        context.connection_ele!.classList.add(input_class!);

        context.drawflow.drawflow[context.module].data[output_id.slice(5)].outputs[output_class!].connections.push({
          node: input_id.slice(5),
          output: input_class!
        });

        context.drawflow.drawflow[context.module].data[input_id.slice(5)].inputs[input_class!].connections.push({
          node: output_id.slice(5),
          input: output_class!
        });

        context.updateConnectionNodes(`node-${output_id.slice(5)}`);
        context.updateConnectionNodes(`node-${input_id.slice(5)}`);

        context.dispatch('connectionCreated', {
          output_id: output_id.slice(5),
          input_id: input_id.slice(5),
          output_class: output_class!,
          input_class: input_class!
        });
        context.pending_wireless = null;
      } else {
        context.dispatch('connectionCancel', true);
        context.connection_ele!.remove();
      }
    } else {
      context.dispatch('connectionCancel', true);
      context.connection_ele!.remove();
    }
  } else {
    context.dispatch('connectionCancel', true);
    context.connection_ele!.remove();
  }
}

function handleConnectionAutoPan(context: Drawflow, pointerX: number, pointerY: number): void {
  handleAutoPan(context, 'connection', pointerX, pointerY);
}

function handleNodeAutoPan(context: Drawflow, pointerX: number, pointerY: number): void {
  if (!context.drag || !context.ele_selected) {
    stopAutoPan(context);
    return;
  }

  handleAutoPan(context, 'node', pointerX, pointerY);
}

function handleAutoPan(
  context: Drawflow,
  mode: 'connection' | 'node',
  pointerX: number,
  pointerY: number
): void {
  if (!context.precanvas) {
    return;
  }

  context.autoPanPointerX = pointerX;
  context.autoPanPointerY = pointerY;
  context.autoPanMode = mode;

  if (!shouldAutoPan(context, pointerX, pointerY)) {
    stopAutoPan(context);
    return;
  }

  scheduleAutoPan(context);
}

function performAutoPan(context: Drawflow): void {
  if (!context.autoPanMode || !context.precanvas) {
    stopAutoPan(context);
    return;
  }

  const pointerX = context.autoPanPointerX;
  const pointerY = context.autoPanPointerY;

  if (!shouldAutoPan(context, pointerX, pointerY)) {
    stopAutoPan(context);
    return;
  }

  const margin = Math.max(context.autoPanEdgeMargin, 0);
  const speed = context.autoPanSpeed;

  if (margin === 0 || speed === 0) {
    stopAutoPan(context);
    return;
  }

  const rect = context.container.getBoundingClientRect();
  const distanceLeft = pointerX - rect.left;
  const distanceRight = rect.right - pointerX;
  const distanceTop = pointerY - rect.top;
  const distanceBottom = rect.bottom - pointerY;

  const stepLeft = calculateAutoPanStep(distanceLeft, margin, speed, 1);
  const stepRight = calculateAutoPanStep(distanceRight, margin, speed, -1);
  const stepTop = calculateAutoPanStep(distanceTop, margin, speed, 1);
  const stepBottom = calculateAutoPanStep(distanceBottom, margin, speed, -1);

  const stepX = stepLeft !== 0 ? stepLeft : stepRight;
  const stepY = stepTop !== 0 ? stepTop : stepBottom;

  if (stepX === 0 && stepY === 0) {
    stopAutoPan(context);
    return;
  }

  context.canvas_x += stepX;
  context.canvas_y += stepY;
  applyStoredCanvasTranslation(context);

  if (context.autoPanMode === 'node') {
    adjustDraggedNodeDuringAutoPan(context, stepX, stepY);
  } else if (context.autoPanMode === 'connection') {
    context.updateConnection(pointerX, pointerY);
  }

  scheduleAutoPan(context);
}

function adjustDraggedNodeDuringAutoPan(context: Drawflow, stepX: number, stepY: number): void {
  if (!context.drag || !context.ele_selected) {
    return;
  }

  const zoom = context.zoom || 1;
  const deltaX = -stepX / zoom;
  const deltaY = -stepY / zoom;

  if (deltaX === 0 && deltaY === 0) {
    return;
  }

  const node = context.ele_selected;

  const currentLeft = getPreciseNodePosition(node.style.left, node.offsetLeft);
  const currentTop = getPreciseNodePosition(node.style.top, node.offsetTop);

  const nextLeft = currentLeft + deltaX;
  const nextTop = currentTop + deltaY;

  node.style.left = `${nextLeft}px`;
  node.style.top = `${nextTop}px`;

  const nodeId = node.id.slice(5);
  const moduleData = context.drawflow.drawflow[context.module].data[nodeId];
  if (moduleData) {
    moduleData.pos_x = nextLeft;
    moduleData.pos_y = nextTop;
  }

  context.updateConnectionNodes(node.id);
}

function getPreciseNodePosition(styleValue: string, fallback: number): number {
  const parsed = parseFloat(styleValue);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function calculateAutoPanStep(distance: number, margin: number, speed: number, direction: 1 | -1): number {
  if (distance >= margin) {
    return 0;
  }

  const normalizedDistance = Math.max(distance, 0);
  const intensity = (margin - normalizedDistance) / margin;
  return direction * intensity * speed;
}

function shouldAutoPan(context: Drawflow, pointerX: number, pointerY: number): boolean {
  const margin = Math.max(context.autoPanEdgeMargin, 0);
  if (margin === 0) {
    return false;
  }

  const rect = context.container.getBoundingClientRect();

  return (
    pointerX <= rect.left + margin ||
    pointerX >= rect.right - margin ||
    pointerY <= rect.top + margin ||
    pointerY >= rect.bottom - margin
  );
}

function scheduleAutoPan(context: Drawflow): void {
  if (context.autoPanFrame != null) {
    return;
  }

  context.autoPanFrame = requestFrame(() => {
    context.autoPanFrame = null;
    performAutoPan(context);
  });
}

function stopAutoPan(context: Drawflow): void {
  if (context.autoPanFrame != null) {
    cancelFrame(context.autoPanFrame);
    context.autoPanFrame = null;
  }

  context.autoPanMode = null;
}

export function contextmenu(context: Drawflow, e: MouseEvent): void {
  context.dispatch('contextmenu', e);
  e.preventDefault();
  if (context.editor_mode === 'fixed' || context.editor_mode === 'view') {
    return;
  }
  if (context.precanvas!.getElementsByClassName('drawflow-delete').length) {
    context.precanvas!.getElementsByClassName('drawflow-delete')[0].remove();
  }

  if (context.node_selected || context.connection_selected) {
    const deletebox = document.createElement('div');
    deletebox.classList.add('drawflow-delete');
    deletebox.innerHTML = 'x';
    if (context.node_selected) {
      context.node_selected.appendChild(deletebox);
    }
    if (context.connection_selected && context.connection_selected.parentElement && context.connection_selected.parentElement.classList.length > 1) {
      deletebox.style.top = `${e.clientY * (context.precanvas!.clientHeight / (context.precanvas!.clientHeight * context.zoom)) -
        (context.precanvas!.getBoundingClientRect().y * (context.precanvas!.clientHeight / (context.precanvas!.clientHeight * context.zoom)))}px`;
      deletebox.style.left = `${e.clientX * (context.precanvas!.clientWidth / (context.precanvas!.clientWidth * context.zoom)) -
        (context.precanvas!.getBoundingClientRect().x * (context.precanvas!.clientWidth / (context.precanvas!.clientWidth * context.zoom)))}px`;

      context.precanvas!.appendChild(deletebox);
    }
  }
}

export function contextmenuDel(context: Drawflow): void {
  if (context.precanvas!.getElementsByClassName('drawflow-delete').length) {
    context.precanvas!.getElementsByClassName('drawflow-delete')[0].remove();
  }
}

export function key(context: Drawflow, e: KeyboardEvent): void {
  context.dispatch('keydown', e);
  if (context.editor_mode === 'fixed' || context.editor_mode === 'view') {
    return;
  }
  if (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey)) {
    if (context.node_selected) {
      const tagName = context.first_click?.tagName;
      const editable = context.first_click?.hasAttribute('contenteditable');
      if (tagName !== 'INPUT' && tagName !== 'TEXTAREA' && editable !== true) {
        context.removeNodeId(context.node_selected.id);
      }
    }
    if (context.connection_selected) {
      context.removeConnection();
    }
  }
}
