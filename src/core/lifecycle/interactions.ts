import type Drawflow from '../Drawflow';

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
    if (target.classList[0] === 'parent-drawflow' || target.classList[0] === 'drawflow') {
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

  switch (context.ele_selected.classList[0]) {
    case 'drawflow-node':
      handleNodeSelected(context);
      break;
    case 'output':
    case 'input':
      handlePortSelected(context, context.ele_selected);
      break;
    case 'parent-drawflow':
    case 'drawflow':
      handleEditorSelected(context);
      break;
    case 'main-path':
      handleConnectionSelected(context);
      break;
    case 'point':
      context.drag_point = true;
      context.ele_selected.classList.add('selected');
      break;
    case 'drawflow-delete':
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
      break;
    default:
      break;
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

  const primaryClass = context.ele_selected.classList[0];
  if (['input', 'output', 'main-path'].includes(primaryClass)) {
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
  const listclassConnection = context.connection_selected.parentElement?.classList;
  if (listclassConnection && listclassConnection.length > 1) {
    context.dispatch('connectionSelected', {
      output_id: listclassConnection[2].slice(14),
      input_id: listclassConnection[1].slice(13),
      output_class: listclassConnection[3],
      input_class: listclassConnection[4]
    });
    if (context.reroute_fix_curvature) {
      context.connection_selected.parentElement?.querySelectorAll('.main-path').forEach((item) => {
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
    handleConnectionAutoPan(context, e_pos_x, e_pos_y);
  } else {
    stopConnectionAutoPan(context);
  }
  if (context.editor_selected) {
    const x = context.canvas_x + (-(context.pos_x - e_pos_x));
    const y = context.canvas_y + (-(context.pos_y - e_pos_y));
    context.dispatch('translate', { x, y });
    if (context.precanvas) {
      context.precanvas.style.transform = `translate(${x}px, ${y}px) scale(${context.zoom})`;
    }
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

    const nodeUpdate = context.ele_selected.parentElement!.classList[2].slice(9);
    const nodeUpdateIn = context.ele_selected.parentElement!.classList[1].slice(13);
    const output_class = context.ele_selected.parentElement!.classList[3];
    const input_class = context.ele_selected.parentElement!.classList[4];

    let numberPointPosition = Array.from(context.ele_selected.parentElement!.children).indexOf(context.ele_selected) - 1;

    if (context.reroute_fix_curvature) {
      const numberMainPath = context.ele_selected.parentElement!.querySelectorAll('.main-path').length - 1;
      numberPointPosition -= numberMainPath;
      if (numberPointPosition < 0) {
        numberPointPosition = 0;
      }
    }

    const nodeId = nodeUpdate.slice(5);
    const searchConnection = context.drawflow.drawflow[context.module].data[nodeId].outputs[output_class].connections.findIndex((item) => {
      return item.node === nodeUpdateIn && item.output === input_class;
    });

    context.drawflow.drawflow[context.module].data[nodeId].outputs[output_class].connections[searchConnection].points![numberPointPosition] = {
      pos_x,
      pos_y
    };

    const parentSelected = context.ele_selected.parentElement!.classList[2].slice(9);
    context.updateConnectionNodes(parentSelected);
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
      context.dispatch('rerouteMoved', context.ele_selected.parentElement!.classList[2].slice(14));
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

  stopConnectionAutoPan(context);
  context.drag = false;
  context.drag_point = false;
  context.connection = false;
  context.ele_selected = null;
  context.editor_selected = false;

  context.dispatch('mouseUp', e);
}

function handleConnectionDrop(context: Drawflow, ele_last: HTMLElement | null): void {
  if (!ele_last || !context.connection_ele) {
    context.dispatch('connectionCancel', true);
    context.connection_ele?.remove();
    return;
  }

  const targetIsOutput = ele_last.classList[0] === 'output';
  const targetIsInput = ele_last.classList[0] === 'input';
  const sourceIsInput = context.ele_selected!.classList.contains('input');

  if (targetIsInput || targetIsOutput || ele_last.closest('.drawflow_content_node') != null || ele_last.classList[0] === 'drawflow-node') {
    let input_id: string | undefined;
    let input_class: string | undefined;
    let output_id: string | undefined;
    let output_class: string | undefined;

    if (sourceIsInput && targetIsOutput) {
      input_id = context.ele_selected!.parentElement!.parentElement!.id;
      input_class = context.ele_selected!.classList[1];
      output_id = ele_last.parentElement!.parentElement!.id;
      output_class = ele_last.classList[1];
    } else if (!sourceIsInput && (targetIsInput || ele_last.closest('.drawflow_content_node'))) {
      const container = ele_last.closest('.drawflow_content_node');
      input_id = container ? container.parentElement!.id : ele_last.parentElement!.parentElement!.id;
      input_class = targetIsInput ? ele_last.classList[1] : 'input_1';
      output_id = context.ele_selected!.parentElement!.parentElement!.id;
      output_class = context.ele_selected!.classList[1];
    }

    if (input_id && output_id && input_id !== output_id) {
      const outputNode = context.drawflow.drawflow[context.module].data[output_id.slice(5)];
      const inputNode = context.drawflow.drawflow[context.module].data[input_id.slice(5)];

      let connectionExists = false;

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
  if (!context.precanvas) {
    return;
  }

  context.autoPanPointerX = pointerX;
  context.autoPanPointerY = pointerY;

  if (!shouldAutoPan(context, pointerX, pointerY)) {
    stopConnectionAutoPan(context);
    return;
  }

  scheduleConnectionAutoPan(context);
}

function performConnectionAutoPan(context: Drawflow): void {
  if (!context.connection || !context.precanvas) {
    stopConnectionAutoPan(context);
    return;
  }

  const pointerX = context.autoPanPointerX;
  const pointerY = context.autoPanPointerY;

  if (!shouldAutoPan(context, pointerX, pointerY)) {
    stopConnectionAutoPan(context);
    return;
  }

  const margin = Math.max(context.autoPanEdgeMargin, 0);
  const speed = context.autoPanSpeed;

  if (margin === 0 || speed === 0) {
    stopConnectionAutoPan(context);
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
    stopConnectionAutoPan(context);
    return;
  }

  context.canvas_x += stepX;
  context.canvas_y += stepY;
  context.precanvas.style.transform = `translate(${context.canvas_x}px, ${context.canvas_y}px) scale(${context.zoom})`;
  context.updateConnection(pointerX, pointerY);

  scheduleConnectionAutoPan(context);
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

function scheduleConnectionAutoPan(context: Drawflow): void {
  if (context.autoPanFrame != null) {
    return;
  }

  context.autoPanFrame = requestFrame(() => {
    context.autoPanFrame = null;
    performConnectionAutoPan(context);
  });
}

function stopConnectionAutoPan(context: Drawflow): void {
  if (context.autoPanFrame != null) {
    cancelFrame(context.autoPanFrame);
    context.autoPanFrame = null;
  }
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
