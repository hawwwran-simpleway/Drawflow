import type Drawflow from './Drawflow';
import type { DrawflowConnectionPoint } from './types';
import {
  ensureNodeDomId,
  extractConnectionClassInfo,
  findClassWithPrefix,
  stripClassPrefix,
} from './utils/classNames';

export function createCurvature(
  context: Drawflow,
  start_pos_x: number,
  start_pos_y: number,
  end_pos_x: number,
  end_pos_y: number,
  curvature_value: number,
  type: string
): string {
  const line_x = start_pos_x;
  const line_y = start_pos_y;
  const x = end_pos_x;
  const y = end_pos_y;
  const curvature = curvature_value;
  switch (type) {
    case 'open':
      if (start_pos_x >= end_pos_x) {
        const hx1 = line_x + Math.abs(x - line_x) * curvature;
        const hx2 = x - Math.abs(x - line_x) * (curvature * -1);
        return ` M ${line_x} ${line_y} C ${hx1} ${line_y} ${hx2} ${y} ${x}  ${y}`;
      }
      return ` M ${line_x} ${line_y} C ${line_x + Math.abs(x - line_x) * curvature} ${line_y} ${x - Math.abs(x - line_x) * curvature} ${y} ${x}  ${y}`;
    case 'close':
      if (start_pos_x >= end_pos_x) {
        const hx1 = line_x + Math.abs(x - line_x) * (curvature * -1);
        const hx2 = x - Math.abs(x - line_x) * curvature;
        return ` M ${line_x} ${line_y} C ${hx1} ${line_y} ${hx2} ${y} ${x}  ${y}`;
      }
      return ` M ${line_x} ${line_y} C ${line_x + Math.abs(x - line_x) * curvature} ${line_y} ${x - Math.abs(x - line_x) * curvature} ${y} ${x}  ${y}`;
    case 'other':
      if (start_pos_x >= end_pos_x) {
        const hx1 = line_x + Math.abs(x - line_x) * (curvature * -1);
        const hx2 = x - Math.abs(x - line_x) * (curvature * -1);
        return ` M ${line_x} ${line_y} C ${hx1} ${line_y} ${hx2} ${y} ${x}  ${y}`;
      }
      return ` M ${line_x} ${line_y} C ${line_x + Math.abs(x - line_x) * curvature} ${line_y} ${x - Math.abs(x - line_x) * curvature} ${y} ${x}  ${y}`;
    default: {
      const hx1 = line_x + Math.abs(x - line_x) * curvature;
      const hx2 = x - Math.abs(x - line_x) * curvature;
      return ` M ${line_x} ${line_y} C ${hx1} ${line_y} ${hx2} ${y} ${x}  ${y}`;
    }
  }
}

export function drawConnection(context: Drawflow, ele: HTMLElement): void {
  const connection = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  context.connection_ele = connection;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.classList.add('main-path');
  path.setAttributeNS(null, 'd', '');
  connection.classList.add('connection');
  connection.appendChild(path);
  context.precanvas!.appendChild(connection);

  if (ele.classList.contains('input')) {
    const id_input = ele.parentElement!.parentElement!.id.slice(5);
    const inputClass = findClassWithPrefix(ele.classList, 'input_');
    if (!inputClass) {
      return;
    }
    context.dispatch('connectionStart', { input_id: id_input, input_class: inputClass });
  } else {
    const id_output = ele.parentElement!.parentElement!.id.slice(5);
    const outputClass = findClassWithPrefix(ele.classList, 'output_');
    if (!outputClass) {
      return;
    }
    context.dispatch('connectionStart', { output_id: id_output, output_class: outputClass });
  }
}

export function updateConnection(context: Drawflow, eX: number, eY: number): void {
  const precanvas = context.precanvas!;
  const zoom = context.zoom;
  let precanvasWidthZoom = precanvas.clientWidth / (precanvas.clientWidth * zoom);
  precanvasWidthZoom = precanvasWidthZoom || 0;
  let precanvasHeightZoom = precanvas.clientHeight / (precanvas.clientHeight * zoom);
  precanvasHeightZoom = precanvasHeightZoom || 0;
  const path = context.connection_ele!.children[0] as SVGPathElement;

  const line_x = context.ele_selected!.offsetWidth / 2 +
    (context.ele_selected!.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWidthZoom;
  const line_y = context.ele_selected!.offsetHeight / 2 +
    (context.ele_selected!.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

  const x = eX * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) -
    (precanvas.getBoundingClientRect().x * (precanvas.clientWidth / (precanvas.clientWidth * zoom)));
  const y = eY * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) -
    (precanvas.getBoundingClientRect().y * (precanvas.clientHeight / (precanvas.clientHeight * zoom)));

  const curvature = context.curvature;
  const lineCurve = context.ele_selected!.classList.contains('input')
    ? createCurvature(context, x, y, line_x, line_y, curvature, 'close')
    : createCurvature(context, line_x, line_y, x, y, curvature, 'openclose');

  path.setAttributeNS(null, 'd', lineCurve);
}

export interface AddConnectionOptions {
  signal?: string;
  skipDom?: boolean;
}

export function addConnection(
  context: Drawflow,
  id_output: string,
  id_input: string,
  output_class: string,
  input_class: string,
  options: AddConnectionOptions = {}
): void {
  const nodeOneModule = context.getModuleFromNodeId(id_output);
  const nodeTwoModule = context.getModuleFromNodeId(id_input);
  if (nodeOneModule !== nodeTwoModule) {
    return;
  }
  const dataNode = context.getNodeFromId(id_output);
  if (!dataNode) {
    return;
  }
  let exist = false;
  for (const connectionSearch of dataNode.outputs[output_class].connections) {
    if (connectionSearch.node === id_input && connectionSearch.output === input_class) {
      exist = true;
      break;
    }
  }
  if (!exist) {
    const targetNode = context.getNodeFromId(id_input);
    if (targetNode) {
      for (const connectionSearch of targetNode.inputs[input_class].connections) {
        if (connectionSearch.node === id_output && connectionSearch.input === output_class) {
          exist = true;
          break;
        }
      }
    }
  }
  if (exist) {
    return;
  }
  const normalizedSignal = typeof options.signal === 'string' && options.signal.trim() !== '' ? options.signal.trim() : undefined;

  const outputConnection = {
    node: id_input.toString(),
    output: input_class,
  } as { node: string; output: string; signal?: string };
  if (normalizedSignal) {
    outputConnection.signal = normalizedSignal;
  }
  context.drawflow.drawflow[nodeOneModule!].data[id_output].outputs[output_class].connections.push(outputConnection);

  const inputConnection = {
    node: id_output.toString(),
    input: output_class,
  } as { node: string; input: string; signal?: string };
  if (normalizedSignal) {
    inputConnection.signal = normalizedSignal;
  }
  context.drawflow.drawflow[nodeOneModule!].data[id_input].inputs[input_class].connections.push(inputConnection);

  const shouldSkipDom = Boolean(options.skipDom);

  if (!shouldSkipDom && context.module === nodeOneModule) {
    const connection = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('main-path');
    path.setAttributeNS(null, 'd', '');
    connection.classList.add('connection');
    connection.classList.add(`node_in_node-${id_input}`);
    connection.classList.add(`node_out_node-${id_output}`);
    connection.classList.add(output_class);
    connection.classList.add(input_class);
    connection.appendChild(path);
    context.precanvas!.appendChild(connection);
    context.updateConnectionNodes(`node-${id_output}`);
    context.updateConnectionNodes(`node-${id_input}`);
  }
  context.dispatch('connectionCreated', {
    output_id: id_output,
    input_id: id_input,
    output_class,
    input_class,
    ...(normalizedSignal ? { signal: normalizedSignal } : {}),
  });
}

export function updateConnectionNodes(context: Drawflow, id: string): void {
  const idSearch = `node_in_${id}`;
  const idSearchOut = `node_out_${id}`;
  const { container, precanvas } = context;
  const curvature = context.curvature;
  const reroute_curvature = context.reroute_curvature;
  const reroute_curvature_start_end = context.reroute_curvature_start_end;
  const reroute_fix_curvature = context.reroute_fix_curvature;
  const rerouteWidth = context.reroute_width;
  const zoom = context.zoom;
  const precanvasWidthZoom = precanvas!.clientWidth / (precanvas!.clientWidth * zoom) || 0;
  const precanvasHeightZoom = precanvas!.clientHeight / (precanvas!.clientHeight * zoom) || 0;

  const elemsOut = container.querySelectorAll<HTMLElement>(`.${idSearchOut}`);

  Object.keys(elemsOut).forEach((item) => {
    const element = (elemsOut as any)[item] as HTMLElement;
    if (!element) {
      return;
    }

    const outputPortClass = findClassWithPrefix(element.classList, 'output_');
    const inputPortClass = findClassWithPrefix(element.classList, 'input_');
    const targetNodeDomId = getInputNodeIdFromClassListSafe(element.classList);

    if (!outputPortClass || !inputPortClass || !targetNodeDomId) {
      removeDanglingConnectionElement(context, element);
      return;
    }

    if (element.querySelector('.point') === null) {
      const sourceNodeElement = container.querySelector<HTMLElement>(`#${id}`);
      const targetNodeElement = container.querySelector<HTMLElement>(`#${targetNodeDomId}`);

      if (!sourceNodeElement || !targetNodeElement) {
        removeDanglingConnectionElement(context, element);
        return;
      }

      const targetPort = targetNodeElement.querySelector<HTMLElement>(`.${inputPortClass}`);
      const sourcePort = sourceNodeElement.querySelector<HTMLElement>(`.${outputPortClass}`);

      if (!targetPort || !sourcePort) {
        removeDanglingConnectionElement(context, element);
        return;
      }

      const eX = targetPort.offsetWidth / 2 + (targetPort.getBoundingClientRect().x - precanvas!.getBoundingClientRect().x) * precanvasWidthZoom;
      const eY = targetPort.offsetHeight / 2 + (targetPort.getBoundingClientRect().y - precanvas!.getBoundingClientRect().y) * precanvasHeightZoom;

      const line_x = sourcePort.offsetWidth / 2 + (sourcePort.getBoundingClientRect().x - precanvas!.getBoundingClientRect().x) * precanvasWidthZoom;
      const line_y = sourcePort.offsetHeight / 2 + (sourcePort.getBoundingClientRect().y - precanvas!.getBoundingClientRect().y) * precanvasHeightZoom;

      const lineCurve = createCurvature(context, line_x, line_y, eX, eY, curvature, 'openclose');
      (element.children[0] as SVGPathElement).setAttributeNS(null, 'd', lineCurve);
    } else {
      const outputNodeDomId = getOutputNodeIdFromClassListSafe(element.classList);
      const inputNodeDomId = targetNodeDomId;

      if (!outputNodeDomId || !inputNodeDomId) {
        removeDanglingConnectionElement(context, element);
        return;
      }

      const updated = updateConnectionWithPoints({
        context,
        element,
        outputNodeId: outputNodeDomId,
        inputNodeId: inputNodeDomId,
        precanvasWidthZoom,
        precanvasHeightZoom,
        rerouteWidth,
        reroute_curvature,
        reroute_curvature_start_end,
        reroute_fix_curvature,
      });

      if (!updated) {
        removeDanglingConnectionElement(context, element);
      }
    }
  });

  const elems = container.querySelectorAll<HTMLElement>(`.${idSearch}`);
  Object.keys(elems).forEach((item) => {
    const element = (elems as any)[item] as HTMLElement;
    if (!element) {
      return;
    }

    const outputPortClass = findClassWithPrefix(element.classList, 'output_');
    const inputPortClass = findClassWithPrefix(element.classList, 'input_');
    const sourceNodeDomId = getOutputNodeIdFromClassListSafe(element.classList);

    if (!outputPortClass || !inputPortClass || !sourceNodeDomId) {
      removeDanglingConnectionElement(context, element);
      return;
    }

    if (element.querySelector('.point') === null) {
      const targetNodeElement = container.querySelector<HTMLElement>(`#${id}`);
      const sourceNodeElement = container.querySelector<HTMLElement>(`#${sourceNodeDomId}`);

      if (!targetNodeElement || !sourceNodeElement) {
        removeDanglingConnectionElement(context, element);
        return;
      }

      const sourcePort = sourceNodeElement.querySelector<HTMLElement>(`.${outputPortClass}`);
      const targetPort = targetNodeElement.querySelector<HTMLElement>(`.${inputPortClass}`);

      if (!sourcePort || !targetPort) {
        removeDanglingConnectionElement(context, element);
        return;
      }

      const line_x = sourcePort.offsetWidth / 2 + (sourcePort.getBoundingClientRect().x - precanvas!.getBoundingClientRect().x) * precanvasWidthZoom;
      const line_y = sourcePort.offsetHeight / 2 + (sourcePort.getBoundingClientRect().y - precanvas!.getBoundingClientRect().y) * precanvasHeightZoom;

      const x = targetPort.offsetWidth / 2 + (targetPort.getBoundingClientRect().x - precanvas!.getBoundingClientRect().x) * precanvasWidthZoom;
      const y = targetPort.offsetHeight / 2 + (targetPort.getBoundingClientRect().y - precanvas!.getBoundingClientRect().y) * precanvasHeightZoom;

      const lineCurve = createCurvature(context, line_x, line_y, x, y, curvature, 'openclose');
      (element.children[0] as SVGPathElement).setAttributeNS(null, 'd', lineCurve);
    } else {
      const outputNodeDomId = sourceNodeDomId;
      const inputNodeDomId = getInputNodeIdFromClassListSafe(element.classList);

      if (!outputNodeDomId || !inputNodeDomId) {
        removeDanglingConnectionElement(context, element);
        return;
      }

      const updated = updateConnectionWithPoints({
        context,
        element,
        outputNodeId: outputNodeDomId,
        inputNodeId: inputNodeDomId,
        precanvasWidthZoom,
        precanvasHeightZoom,
        rerouteWidth,
        reroute_curvature,
        reroute_curvature_start_end,
        reroute_fix_curvature,
      });

      if (!updated) {
        removeDanglingConnectionElement(context, element);
      }
    }
  });
}
interface UpdateConnectionWithPointsArgs {
  context: Drawflow;
  element: HTMLElement;
  outputNodeId: string;
  inputNodeId: string;
  precanvasWidthZoom: number;
  precanvasHeightZoom: number;
  rerouteWidth: number;
  reroute_curvature: number;
  reroute_curvature_start_end: number;
  reroute_fix_curvature: boolean;
}

const getOutputNodeIdFromClass = (className: string): string => ensureNodeDomId(stripClassPrefix(className, 'node_out_'));

const getInputNodeIdFromClass = (className: string): string => ensureNodeDomId(stripClassPrefix(className, 'node_in_'));

const getOutputNodeIdFromClassList = (classList: DOMTokenList): string => {
  const className = findClassWithPrefix(classList, 'node_out_');
  if (!className) {
    throw new Error('Connection element is missing a node_out_ class');
  }
  return getOutputNodeIdFromClass(className);
};

const getInputNodeIdFromClassList = (classList: DOMTokenList): string => {
  const className = findClassWithPrefix(classList, 'node_in_');
  if (!className) {
    throw new Error('Connection element is missing a node_in_ class');
  }
  return getInputNodeIdFromClass(className);
};

const getOutputNodeIdFromClassListSafe = (classList: DOMTokenList): string | undefined => {
  const className = findClassWithPrefix(classList, 'node_out_');
  return className ? getOutputNodeIdFromClass(className) : undefined;
};

const getInputNodeIdFromClassListSafe = (classList: DOMTokenList): string | undefined => {
  const className = findClassWithPrefix(classList, 'node_in_');
  return className ? getInputNodeIdFromClass(className) : undefined;
};

const removeDanglingConnectionElement = (context: Drawflow, element: HTMLElement): void => {
  const connectionInfo = extractConnectionClassInfo(element.classList);
  if (!connectionInfo) {
    element.remove();
    return;
  }

  const {
    outputNodeId,
    inputNodeId,
    outputPortClass,
    inputPortClass,
  } = connectionInfo;

  const outputModuleName = context.getModuleFromNodeId(outputNodeId);
  const inputModuleName = context.getModuleFromNodeId(inputNodeId);

  let removedFromData = false;

  if (outputModuleName) {
    const outputModule = context.drawflow.drawflow[outputModuleName];
    const outputNode = outputModule?.data?.[outputNodeId];
    const outputConnections = outputNode?.outputs?.[outputPortClass]?.connections;
    if (outputConnections) {
      const index = outputConnections.findIndex((connection) => {
        return connection.node === inputNodeId && connection.output === inputPortClass;
      });
      if (index > -1) {
        outputConnections.splice(index, 1);
        removedFromData = true;
      }
    }
  }

  if (inputModuleName) {
    const inputModule = context.drawflow.drawflow[inputModuleName];
    const inputNode = inputModule?.data?.[inputNodeId];
    const inputConnections = inputNode?.inputs?.[inputPortClass]?.connections;
    if (inputConnections) {
      const index = inputConnections.findIndex((connection) => {
        return connection.node === outputNodeId && connection.input === outputPortClass;
      });
      if (index > -1) {
        inputConnections.splice(index, 1);
        removedFromData = true;
      }
    }
  }

  element.remove();

  if (removedFromData) {
    context.dispatch('connectionRemoved', {
      output_id: outputNodeId,
      input_id: inputNodeId,
      output_class: outputPortClass,
      input_class: inputPortClass
    });
  }
};

function updateConnectionWithPoints(args: UpdateConnectionWithPointsArgs): boolean {
  const { context, element, outputNodeId, inputNodeId, precanvasWidthZoom, precanvasHeightZoom, rerouteWidth, reroute_curvature,
    reroute_curvature_start_end, reroute_fix_curvature } = args;
  const points = element.querySelectorAll<SVGCircleElement>('.point');
  const normalizedOutputNodeId = ensureNodeDomId(outputNodeId);
  const normalizedInputNodeId = ensureNodeDomId(inputNodeId);

  const reroutePath = buildReroutePath({
    context,
    element,
    points,
    precanvasWidthZoom,
    precanvasHeightZoom,
    rerouteWidth,
    reroute_curvature,
    reroute_curvature_start_end,
    outputNodeId: normalizedOutputNodeId,
    inputNodeId: normalizedInputNodeId
  });

  if (!reroutePath) {
    return false;
  }

  if (reroute_fix_curvature) {
    reroutePath.segmentPaths.forEach((segmentPath, index) => {
      const pathElement = element.children[index] as SVGPathElement | undefined;
      if (pathElement) {
        pathElement.setAttributeNS(null, 'd', segmentPath);
      }
    });
  } else {
    (element.children[0] as SVGPathElement).setAttributeNS(null, 'd', reroutePath.fullPath);
  }

  return true;
}

interface BuildReroutePathArgs {
  context: Drawflow;
  element: HTMLElement;
  points: NodeListOf<SVGCircleElement>;
  precanvasWidthZoom: number;
  precanvasHeightZoom: number;
  rerouteWidth: number;
  reroute_curvature: number;
  reroute_curvature_start_end: number;
  outputNodeId: string;
  inputNodeId: string;
}

interface CanvasPoint {
  x: number;
  y: number;
}

interface ReroutePath {
  fullPath: string;
  segmentPaths: string[];
}

function buildReroutePath(args: BuildReroutePathArgs): ReroutePath | null {
  const { context, element, points, precanvasWidthZoom, precanvasHeightZoom, rerouteWidth, reroute_curvature,
    reroute_curvature_start_end, outputNodeId, inputNodeId } = args;

  const precanvas = context.precanvas;
  if (!precanvas) {
    return null;
  }

  const precanvasRect = precanvas.getBoundingClientRect();

  const outputNode = context.container.querySelector(`#${outputNodeId}`) as HTMLElement | null;
  const inputNode = context.container.querySelector(`#${inputNodeId}`) as HTMLElement | null;

  if (!outputNode || !inputNode) {
    return null;
  }

  const outputPortClass = findClassWithPrefix(element.classList, 'output_');
  const inputPortClass = findClassWithPrefix(element.classList, 'input_');

  if (!outputPortClass || !inputPortClass) {
    return null;
  }

  const outputPort = outputNode.querySelector<HTMLElement>(`.${outputPortClass}`);
  const inputPort = inputNode.querySelector<HTMLElement>(`.${inputPortClass}`);

  if (!outputPort || !inputPort) {
    return null;
  }

  const pathPoints: CanvasPoint[] = [];

  pathPoints.push(getPortCenter(outputPort, precanvasRect, precanvasWidthZoom, precanvasHeightZoom));

  points.forEach((point) => {
    pathPoints.push(getReroutePointCenter(point, precanvasRect, precanvasWidthZoom, precanvasHeightZoom, rerouteWidth));
  });

  pathPoints.push(getPortCenter(inputPort, precanvasRect, precanvasWidthZoom, precanvasHeightZoom));

  if (pathPoints.length < 2) {
    return null;
  }

  const { fullPath, segmentPaths } = createSmoothPath(pathPoints, reroute_curvature_start_end, reroute_curvature);
  return { fullPath, segmentPaths };
}

function getPortCenter(
  port: HTMLElement,
  precanvasRect: DOMRect,
  precanvasWidthZoom: number,
  precanvasHeightZoom: number
): CanvasPoint {
  const portRect = port.getBoundingClientRect();
  return {
    x: port.offsetWidth / 2 + (portRect.x - precanvasRect.x) * precanvasWidthZoom,
    y: port.offsetHeight / 2 + (portRect.y - precanvasRect.y) * precanvasHeightZoom,
  };
}

function getReroutePointCenter(
  point: SVGCircleElement,
  precanvasRect: DOMRect,
  precanvasWidthZoom: number,
  precanvasHeightZoom: number,
  rerouteWidth: number
): CanvasPoint {
  const pointRect = point.getBoundingClientRect();
  return {
    x: (pointRect.x - precanvasRect.x) * precanvasWidthZoom + rerouteWidth,
    y: (pointRect.y - precanvasRect.y) * precanvasHeightZoom + rerouteWidth,
  };
}

function createSmoothPath(
  points: CanvasPoint[],
  startEndCurvature: number,
  middleCurvature: number
): ReroutePath {
  if (points.length === 0) {
    return { fullPath: '', segmentPaths: [] };
  }

  let fullPath = ` M ${points[0].x} ${points[0].y}`;
  const segmentPaths: string[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const curvature = (index === 0 || index === points.length - 2) ? startEndCurvature : middleCurvature;
    const { cp1, cp2 } = computeControlPoints(points, index, curvature);
    fullPath += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
    segmentPaths.push(` M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`);
  }

  return { fullPath, segmentPaths };
}

function computeControlPoints(points: CanvasPoint[], index: number, curvature: number): { cp1: CanvasPoint; cp2: CanvasPoint } {
  const p0 = points[index - 1] ?? points[index];
  const p1 = points[index];
  const p2 = points[index + 1];
  const p3 = points[index + 2] ?? points[index + 1];

  const tangentScale = curvature * 0.75;
  const tangent1 = scalePoint({ x: p2.x - p0.x, y: p2.y - p0.y }, tangentScale);
  const tangent2 = scalePoint({ x: p3.x - p1.x, y: p3.y - p1.y }, tangentScale);

  const cp1: CanvasPoint = { x: p1.x + tangent1.x / 3, y: p1.y + tangent1.y / 3 };
  const cp2: CanvasPoint = { x: p2.x - tangent2.x / 3, y: p2.y - tangent2.y / 3 };

  return { cp1, cp2 };
}

function scalePoint(point: CanvasPoint, scale: number): CanvasPoint {
  return { x: point.x * scale, y: point.y * scale };
}

export function dblclick(context: Drawflow, e: MouseEvent): void {
  if (context.connection_selected && context.reroute) {
    context.createReroutePoint(context.connection_selected);
  }
  const target = e.target as HTMLElement;
  if (target && target.classList.contains('point')) {
    context.removeReroutePoint(target);
  }
}

export function createReroutePoint(context: Drawflow, ele: Element): void {
  const selectedConnection = context.connection_selected;
  if (!selectedConnection) {
    return;
  }

  selectedConnection.classList.remove('selected');

  const connectionElement = selectedConnection.parentElement as HTMLElement | null;
  if (!connectionElement) {
    context.connection_selected = null;
    return;
  }

  const connectionInfo = extractConnectionClassInfo(connectionElement.classList);
  if (!connectionInfo) {
    removeDanglingConnectionElement(context, connectionElement);
    context.connection_selected = null;
    return;
  }

  const {
    outputNodeDomId,
    inputNodeDomId,
    outputNodeId,
    inputNodeId,
    outputPortClass,
    inputPortClass,
  } = connectionInfo;

  context.connection_selected = null;
  const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  point.classList.add('point');
  const pos_x = context.pos_x * (context.precanvas!.clientWidth / (context.precanvas!.clientWidth * context.zoom)) -
    (context.precanvas!.getBoundingClientRect().x * (context.precanvas!.clientWidth / (context.precanvas!.clientWidth * context.zoom)));
  const pos_y = context.pos_y * (context.precanvas!.clientHeight / (context.precanvas!.clientHeight * context.zoom)) -
    (context.precanvas!.getBoundingClientRect().y * (context.precanvas!.clientHeight / (context.precanvas!.clientHeight * context.zoom)));

  point.setAttributeNS(null, 'cx', pos_x.toString());
  point.setAttributeNS(null, 'cy', pos_y.toString());
  point.setAttributeNS(null, 'r', context.reroute_width.toString());

  const nodeId = outputNodeId;
  const searchConnection = context.drawflow.drawflow[context.module].data[nodeId].outputs[outputPortClass].connections.findIndex((item) => {
    return item.node === inputNodeId && item.output === inputPortClass;
  });

  const connection = context.drawflow.drawflow[context.module].data[nodeId].outputs[outputPortClass].connections[searchConnection];
  if (!connection.points) {
    connection.points = [];
  }

  let insertIndex = connection.points.length;

  if (context.reroute_fix_curvature) {
    const numberPoints = connectionElement.querySelectorAll('.main-path').length;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('main-path');
    path.setAttributeNS(null, 'd', '');
    connectionElement.insertBefore(path, connectionElement.children[numberPoints]);
    if (numberPoints === 1) {
      insertIndex = connection.points.length;
      connectionElement.appendChild(point);
    } else {
      const search_point = Array.from(connectionElement.children).indexOf(ele);
      insertIndex = Math.min(search_point, connection.points.length);
      connectionElement.insertBefore(point, connectionElement.children[search_point + numberPoints + 1]);
    }
  } else {
    const calculateInsertIndex = (): number => {
      const precanvas = context.precanvas;
      if (!precanvas) {
        return connection.points.length;
      }

      const outputNodeElement = context.container.querySelector<HTMLElement>(`#${outputNodeDomId}`);
      const inputNodeElement = context.container.querySelector<HTMLElement>(`#${inputNodeDomId}`);
      const outputElement = outputNodeElement?.querySelector<HTMLElement>(`.${outputPortClass}`) ?? null;
      const inputElement = inputNodeElement?.querySelector<HTMLElement>(`.${inputPortClass}`) ?? null;

      if (!outputElement || !inputElement) {
        return connection.points.length;
      }

      const zoom = context.zoom;
      const precanvasRect = precanvas.getBoundingClientRect();
      const precanvasWidthZoom = precanvas.clientWidth / (precanvas.clientWidth * zoom) || 0;
      const precanvasHeightZoom = precanvas.clientHeight / (precanvas.clientHeight * zoom) || 0;

      const toCanvasX = (element: HTMLElement): number =>
        element.offsetWidth / 2 + (element.getBoundingClientRect().x - precanvasRect.x) * precanvasWidthZoom;
      const toCanvasY = (element: HTMLElement): number =>
        element.offsetHeight / 2 + (element.getBoundingClientRect().y - precanvasRect.y) * precanvasHeightZoom;

      const startPoint = { x: toCanvasX(outputElement), y: toCanvasY(outputElement) };
      const endPoint = { x: toCanvasX(inputElement), y: toCanvasY(inputElement) };
      const existingPoints = connection.points.map((pt) => ({ x: pt.pos_x, y: pt.pos_y }));
      const routePoints = [startPoint, ...existingPoints, endPoint];

      const newPoint = { x: pos_x, y: pos_y };
      let bestIndex = connection.points.length;
      let bestDistanceSq = Number.POSITIVE_INFINITY;
      let bestAlongDistance = Number.POSITIVE_INFINITY;
      let accumulatedDistance = 0;
      const EPSILON = 1e-6;

      for (let i = 0; i < routePoints.length - 1; i += 1) {
        const segmentStart = routePoints[i];
        const segmentEnd = routePoints[i + 1];
        const dx = segmentEnd.x - segmentStart.x;
        const dy = segmentEnd.y - segmentStart.y;
        const lengthSq = dx * dx + dy * dy;

        let t = 0;
        if (lengthSq > 0) {
          t = ((newPoint.x - segmentStart.x) * dx + (newPoint.y - segmentStart.y) * dy) / lengthSq;
          t = Math.max(0, Math.min(1, t));
        }

        const projX = segmentStart.x + dx * t;
        const projY = segmentStart.y + dy * t;
        const distSq = (newPoint.x - projX) ** 2 + (newPoint.y - projY) ** 2;
        const alongDistance = accumulatedDistance + Math.hypot(projX - segmentStart.x, projY - segmentStart.y);

        if ((distSq + EPSILON) < bestDistanceSq ||
          (Math.abs(distSq - bestDistanceSq) <= EPSILON && alongDistance < bestAlongDistance)) {
          bestDistanceSq = distSq;
          bestAlongDistance = alongDistance;
          bestIndex = Math.min(i, connection.points.length);
        }

        accumulatedDistance += Math.hypot(dx, dy);
      }

      return bestIndex;
    };

    insertIndex = calculateInsertIndex();
    const domPoints = Array.from(connectionElement.querySelectorAll<SVGCircleElement>('.point'));
    const referencePoint = domPoints[insertIndex] ?? null;
    if (referencePoint) {
      connectionElement.insertBefore(point, referencePoint);
    } else {
      connectionElement.appendChild(point);
    }
  }

  connection.points.splice(insertIndex, 0, { pos_x, pos_y });

  if (context.reroute_fix_curvature) {
    connectionElement.querySelectorAll('.main-path').forEach((item) => {
      item.classList.remove('selected');
    });
  }

  context.dispatch('addReroute', nodeId);
  context.updateConnectionNodes(outputNodeDomId);
}

export function removeReroutePoint(context: Drawflow, ele: Element): void {
  const connectionElement = ele.parentElement as HTMLElement | null;
  if (!connectionElement) {
    return;
  }

  const connectionInfo = extractConnectionClassInfo(connectionElement.classList);
  if (!connectionInfo) {
    removeDanglingConnectionElement(context, connectionElement);
    return;
  }

  const {
    outputNodeDomId,
    outputNodeId,
    inputNodeId,
    outputPortClass,
    inputPortClass,
  } = connectionInfo;

  let numberPointPosition = Array.from(connectionElement.children).indexOf(ele);
  const nodeId = outputNodeId;
  const searchConnection = context.drawflow.drawflow[context.module].data[nodeId].outputs[outputPortClass].connections.findIndex((item) => {
    return item.node === inputNodeId && item.output === inputPortClass;
  });

  if (context.reroute_fix_curvature) {
    const numberMainPath = connectionElement.querySelectorAll('.main-path').length;
    connectionElement.children[numberMainPath - 1].remove();
    numberPointPosition -= numberMainPath;
    if (numberPointPosition < 0) {
      numberPointPosition = 0;
    }
  } else {
    numberPointPosition -= 1;
  }
  context.drawflow.drawflow[context.module].data[nodeId].outputs[outputPortClass].connections[searchConnection].points!.splice(numberPointPosition, 1);

  ele.remove();
  context.dispatch('removeReroute', nodeId);
  context.updateConnectionNodes(outputNodeDomId);
}

export function addRerouteImport(context: Drawflow, dataNode: any): void {
  const reroute_width = context.reroute_width;
  const reroute_fix_curvature = context.reroute_fix_curvature;
  const { container } = context;
  Object.keys(dataNode.outputs).forEach((output_item) => {
    Object.keys(dataNode.outputs[output_item].connections).forEach((input_item) => {
      const points = dataNode.outputs[output_item].connections[input_item].points as DrawflowConnectionPoint[] | undefined;
      if (!points) {
        return;
      }
      points.forEach((item, i) => {
        const input_id = dataNode.outputs[output_item].connections[input_item].node;
        const input_class = dataNode.outputs[output_item].connections[input_item].output;
        const ele = container.querySelector<HTMLElement>(`.connection.node_in_node-${input_id}.node_out_node-${dataNode.id}.${output_item}.${input_class}`);
        if (!ele) {
          return;
        }
        if (reroute_fix_curvature && i === 0) {
          for (let z = 0; z < points.length; z += 1) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.classList.add('main-path');
            path.setAttributeNS(null, 'd', '');
            ele.appendChild(path);
          }
        }
        const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        point.classList.add('point');
        point.setAttributeNS(null, 'cx', item.pos_x.toString());
        point.setAttributeNS(null, 'cy', item.pos_y.toString());
        point.setAttributeNS(null, 'r', reroute_width.toString());
        ele.appendChild(point);
      });
    });
  });
}

export function removeConnection(context: Drawflow): void {
  const selectedConnectionPath = context.connection_selected;
  if (!selectedConnectionPath) {
    return;
  }
  const connectionElement = selectedConnectionPath.parentElement as HTMLElement | null;
  if (!connectionElement) {
    context.connection_selected = null;
    return;
  }

  const connectionInfo = extractConnectionClassInfo(connectionElement.classList);
  connectionElement.remove();
  context.connection_selected = null;

  if (!connectionInfo) {
    return;
  }

  const { outputNodeId, inputNodeId, outputPortClass, inputPortClass } = connectionInfo;
  const moduleData = context.drawflow.drawflow[context.module].data;

  let removed = false;

  const outputConnections = moduleData[outputNodeId]?.outputs?.[outputPortClass]?.connections;
  if (outputConnections) {
    const indexOut = outputConnections.findIndex((item) => item.node === inputNodeId && item.output === inputPortClass);
    if (indexOut > -1) {
      outputConnections.splice(indexOut, 1);
      removed = true;
    }
  }

  const inputConnections = moduleData[inputNodeId]?.inputs?.[inputPortClass]?.connections;
  if (inputConnections) {
    const indexIn = inputConnections.findIndex((item) => item.node === outputNodeId && item.input === outputPortClass);
    if (indexIn > -1) {
      inputConnections.splice(indexIn, 1);
      removed = true;
    }
  }

  if (removed) {
    context.dispatch('connectionRemoved', {
      output_id: outputNodeId,
      input_id: inputNodeId,
      output_class: outputPortClass,
      input_class: inputPortClass,
    });
  }
}

export function removeSingleConnection(
  context: Drawflow,
  id_output: string,
  id_input: string,
  output_class: string,
  input_class: string
): boolean {
  const nodeOneModule = context.getModuleFromNodeId(id_output);
  const nodeTwoModule = context.getModuleFromNodeId(id_input);
  if (nodeOneModule !== nodeTwoModule) {
    return false;
  }
  const exists = context.drawflow.drawflow[nodeOneModule!].data[id_output].outputs[output_class].connections.findIndex((item) => {
    return item.node === id_input && item.output === input_class;
  });
  if (exists <= -1) {
    return false;
  }
  if (context.module === nodeOneModule) {
    context.container.querySelector(`.connection.node_in_node-${id_input}.node_out_node-${id_output}.${output_class}.${input_class}`)?.remove();
  }
  const index_out = context.drawflow.drawflow[nodeOneModule!].data[id_output].outputs[output_class].connections.findIndex((item) => {
    return item.node === id_input && item.output === input_class;
  });
  context.drawflow.drawflow[nodeOneModule!].data[id_output].outputs[output_class].connections.splice(index_out, 1);

  const index_in = context.drawflow.drawflow[nodeOneModule!].data[id_input].inputs[input_class].connections.findIndex((item) => {
    return item.node === id_output && item.input === output_class;
  });
  context.drawflow.drawflow[nodeOneModule!].data[id_input].inputs[input_class].connections.splice(index_in, 1);

  context.dispatch('connectionRemoved', { output_id: id_output, input_id: id_input, output_class, input_class });
  return true;
}

export function removeConnectionNodeId(context: Drawflow, id: string): void {
  const targetNodeDomId = ensureNodeDomId(id);
  const connections = Array.from(context.container.querySelectorAll<HTMLElement>('.connection'));

  connections.forEach((element) => {
    const info = extractConnectionClassInfo(element.classList);
    if (!info) {
      element.remove();
      return;
    }

    if (info.outputNodeDomId === targetNodeDomId || info.inputNodeDomId === targetNodeDomId) {
      removeDanglingConnectionElement(context, element);
    }
  });

  removeWirelessConnectionsForNode(context, id);
}

function removeWirelessConnectionsForNode(context: Drawflow, nodeId: string): void {
  const moduleName = context.getModuleFromNodeId(nodeId);
  if (!moduleName) {
    return;
  }
  const moduleData = context.drawflow.drawflow[moduleName]?.data;
  if (!moduleData) {
    return;
  }

  const removals = new Map<string, { outputNode: string; inputNode: string; outputClass: string; inputClass: string }>();

  Object.entries(moduleData).forEach(([currentNodeId, nodeData]) => {
    Object.entries(nodeData.outputs).forEach(([outputClass, portData]) => {
      portData.connections.forEach((connection) => {
        if (!connection.signal || connection.signal.trim() === '') {
          return;
        }
        if (currentNodeId !== nodeId && connection.node !== nodeId) {
          return;
        }
        const removalKey = `${currentNodeId}->${connection.node}:${outputClass}:${connection.output}`;
        if (!removals.has(removalKey)) {
          removals.set(removalKey, {
            outputNode: currentNodeId,
            inputNode: connection.node,
            outputClass,
            inputClass: connection.output,
          });
        }
      });
    });
  });

  removals.forEach((removal) => {
    context.removeSingleConnection(removal.outputNode, removal.inputNode, removal.outputClass, removal.inputClass);
  });
}
