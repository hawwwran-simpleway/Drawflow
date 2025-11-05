import type Drawflow from './Drawflow';
import type { DrawflowConnectionPoint } from './types';

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
    const input_class = ele.classList[1];
    context.dispatch('connectionStart', { input_id: id_input, input_class });
  } else {
    const id_output = ele.parentElement!.parentElement!.id.slice(5);
    const output_class = ele.classList[1];
    context.dispatch('connectionStart', { output_id: id_output, output_class });
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

export function addConnection(
  context: Drawflow,
  id_output: string,
  id_input: string,
  output_class: string,
  input_class: string
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
  context.drawflow.drawflow[nodeOneModule!].data[id_output].outputs[output_class].connections.push({
    node: id_input.toString(),
    output: input_class
  });
  context.drawflow.drawflow[nodeOneModule!].data[id_input].inputs[input_class].connections.push({
    node: id_output.toString(),
    input: output_class
  });

  if (context.module === nodeOneModule) {
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
  context.dispatch('connectionCreated', { output_id: id_output, input_id: id_input, output_class, input_class });
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
    if (element.querySelector('.point') === null) {
      const elemtsearchId_out = container.querySelector(`#${id}`) as HTMLElement;
      const id_search = element.classList[1].replace('node_in_', '');
      const elemtsearchId = container.querySelector(`#${id_search}`) as HTMLElement;
      const elemtsearch = elemtsearchId.querySelector<HTMLElement>(`.${element.classList[4]}`)!;

      const eX = elemtsearch.offsetWidth / 2 + (elemtsearch.getBoundingClientRect().x - precanvas!.getBoundingClientRect().x) * precanvasWidthZoom;
      const eY = elemtsearch.offsetHeight / 2 + (elemtsearch.getBoundingClientRect().y - precanvas!.getBoundingClientRect().y) * precanvasHeightZoom;

      const elemtsearchOut = elemtsearchId_out.querySelector<HTMLElement>(`.${element.classList[3]}`)!;
      const line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas!.getBoundingClientRect().x) * precanvasWidthZoom;
      const line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas!.getBoundingClientRect().y) * precanvasHeightZoom;

      const x = eX;
      const y = eY;

      const lineCurve = createCurvature(context, line_x, line_y, x, y, curvature, 'openclose');
      (element.children[0] as SVGPathElement).setAttributeNS(null, 'd', lineCurve);
    } else {
      const outputNodeId = getOutputNodeIdFromClassList(element.classList);
      const inputNodeId = getInputNodeIdFromClassList(element.classList);
      updateConnectionWithPoints({
        context,
        element,
        outputNodeId,
        inputNodeId,
        precanvasWidthZoom,
        precanvasHeightZoom,
        rerouteWidth,
        reroute_curvature,
        reroute_curvature_start_end,
        reroute_fix_curvature,
      });
    }
  });

  const elems = container.querySelectorAll<HTMLElement>(`.${idSearch}`);
  Object.keys(elems).forEach((item) => {
    const element = (elems as any)[item] as HTMLElement;
    if (!element) {
      return;
    }
    if (element.querySelector('.point') === null) {
      const elemtsearchId_in = container.querySelector(`#${id}`) as HTMLElement;
      const id_search = element.classList[2].replace('node_out_', '');
      const elemtsearchId = container.querySelector(`#${id_search}`) as HTMLElement;
      const elemtsearch = elemtsearchId.querySelector<HTMLElement>(`.${element.classList[3]}`)!;
      const line_x = elemtsearch.offsetWidth / 2 + (elemtsearch.getBoundingClientRect().x - precanvas!.getBoundingClientRect().x) * precanvasWidthZoom;
      const line_y = elemtsearch.offsetHeight / 2 + (elemtsearch.getBoundingClientRect().y - precanvas!.getBoundingClientRect().y) * precanvasHeightZoom;

      const elemtsearchIn = elemtsearchId_in.querySelector<HTMLElement>(`.${element.classList[4]}`)!;
      const x = elemtsearchIn.offsetWidth / 2 + (elemtsearchIn.getBoundingClientRect().x - precanvas!.getBoundingClientRect().x) * precanvasWidthZoom;
      const y = elemtsearchIn.offsetHeight / 2 + (elemtsearchIn.getBoundingClientRect().y - precanvas!.getBoundingClientRect().y) * precanvasHeightZoom;

      const lineCurve = createCurvature(context, line_x, line_y, x, y, curvature, 'openclose');
      (element.children[0] as SVGPathElement).setAttributeNS(null, 'd', lineCurve);
    } else {
      const outputNodeId = getOutputNodeIdFromClassList(element.classList);
      const inputNodeId = getInputNodeIdFromClassList(element.classList);
      updateConnectionWithPoints({
        context,
        element,
        outputNodeId,
        inputNodeId,
        precanvasWidthZoom,
        precanvasHeightZoom,
        rerouteWidth,
        reroute_curvature,
        reroute_curvature_start_end,
        reroute_fix_curvature,
      });
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

const ensureNodeDomId = (nodeId: string): string => (nodeId.startsWith('node-') ? nodeId : `node-${nodeId}`);

const stripClassPrefix = (className: string, prefix: string): string =>
  (className.startsWith(prefix) ? className.slice(prefix.length) : className);

const findClassWithPrefix = (classList: DOMTokenList, prefix: string): string | undefined =>
  Array.from(classList).find((className) => className.startsWith(prefix));

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

function updateConnectionWithPoints(args: UpdateConnectionWithPointsArgs): void {
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
    return;
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

  const outputPort = outputNode.querySelector<HTMLElement>(`.${element.classList[3]}`);
  const inputPort = inputNode.querySelector<HTMLElement>(`.${element.classList[4]}`);

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

  const tangentScale = curvature * 0.5;
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
  if (target && target.classList[0] === 'point') {
    context.removeReroutePoint(target);
  }
}

export function createReroutePoint(context: Drawflow, ele: Element): void {
  context.connection_selected!.classList.remove('selected');
  const nodeUpdate = context.connection_selected!.parentElement!.classList[2].slice(9);
  const nodeUpdateIn = context.connection_selected!.parentElement!.classList[1].slice(13);
  const output_class = context.connection_selected!.parentElement!.classList[3];
  const input_class = context.connection_selected!.parentElement!.classList[4];
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

  const connectionElement = ele.parentElement!;

  const nodeId = nodeUpdate.slice(5);
  const searchConnection = context.drawflow.drawflow[context.module].data[nodeId].outputs[output_class].connections.findIndex((item) => {
    return item.node === nodeUpdateIn && item.output === input_class;
  });

  const connection = context.drawflow.drawflow[context.module].data[nodeId].outputs[output_class].connections[searchConnection];
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

      const outputNodeElement = context.container.querySelector<HTMLElement>(`#${nodeUpdate}`);
      const inputNodeDomId = nodeUpdateIn.startsWith('node-') ? nodeUpdateIn : `node-${nodeUpdateIn}`;
      const inputNodeElement = context.container.querySelector<HTMLElement>(`#${inputNodeDomId}`);
      const outputElement = outputNodeElement?.querySelector<HTMLElement>(`.${output_class}`) ?? null;
      const inputElement = inputNodeElement?.querySelector<HTMLElement>(`.${input_class}`) ?? null;

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
  context.updateConnectionNodes(nodeUpdate);
}

export function removeReroutePoint(context: Drawflow, ele: Element): void {
  const nodeUpdate = ele.parentElement!.classList[2].slice(9);
  const nodeUpdateIn = ele.parentElement!.classList[1].slice(13);
  const output_class = ele.parentElement!.classList[3];
  const input_class = ele.parentElement!.classList[4];

  let numberPointPosition = Array.from(ele.parentElement!.children).indexOf(ele);
  const nodeId = nodeUpdate.slice(5);
  const searchConnection = context.drawflow.drawflow[context.module].data[nodeId].outputs[output_class].connections.findIndex((item) => {
    return item.node === nodeUpdateIn && item.output === input_class;
  });

  if (context.reroute_fix_curvature) {
    const numberMainPath = ele.parentElement!.querySelectorAll('.main-path').length;
    ele.parentElement!.children[numberMainPath - 1].remove();
    numberPointPosition -= numberMainPath;
    if (numberPointPosition < 0) {
      numberPointPosition = 0;
    }
  } else {
    numberPointPosition -= 1;
  }
  context.drawflow.drawflow[context.module].data[nodeId].outputs[output_class].connections[searchConnection].points!.splice(numberPointPosition, 1);

  ele.remove();
  context.dispatch('removeReroute', nodeId);
  context.updateConnectionNodes(nodeUpdate);
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
  if (!context.connection_selected) {
    return;
  }
  const listclass = context.connection_selected.parentElement!.classList;
  context.connection_selected.parentElement!.remove();
  const index_out = context.drawflow.drawflow[context.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.findIndex((item) => {
    return item.node === listclass[1].slice(13) && item.output === listclass[4];
  });
  context.drawflow.drawflow[context.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.splice(index_out, 1);

  const index_in = context.drawflow.drawflow[context.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.findIndex((item) => {
    return item.node === listclass[2].slice(14) && item.input === listclass[3];
  });
  context.drawflow.drawflow[context.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.splice(index_in, 1);
  context.dispatch('connectionRemoved', {
    output_id: listclass[2].slice(14),
    input_id: listclass[1].slice(13),
    output_class: listclass[3],
    input_class: listclass[4]
  });
  context.connection_selected = null;
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
  const idSearchIn = `node_in_${id}`;
  const idSearchOut = `node_out_${id}`;

  const elemsOut = context.container.querySelectorAll<HTMLElement>(`.${idSearchOut}`);
  for (let i = elemsOut.length - 1; i >= 0; i -= 1) {
    const listclass = elemsOut[i].classList;
    const index_in = context.drawflow.drawflow[context.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.findIndex((item) => {
      return item.node === listclass[2].slice(14) && item.input === listclass[3];
    });
    context.drawflow.drawflow[context.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.splice(index_in, 1);

    const index_out = context.drawflow.drawflow[context.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.findIndex((item) => {
      return item.node === listclass[1].slice(13) && item.output === listclass[4];
    });
    context.drawflow.drawflow[context.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.splice(index_out, 1);

    elemsOut[i].remove();
    context.dispatch('connectionRemoved', {
      output_id: listclass[2].slice(14),
      input_id: listclass[1].slice(13),
      output_class: listclass[3],
      input_class: listclass[4]
    });
  }

  const elemsIn = context.container.querySelectorAll<HTMLElement>(`.${idSearchIn}`);
  for (let i = elemsIn.length - 1; i >= 0; i -= 1) {
    const listclass = elemsIn[i].classList;
    const index_out = context.drawflow.drawflow[context.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.findIndex((item) => {
      return item.node === listclass[1].slice(13) && item.output === listclass[4];
    });
    context.drawflow.drawflow[context.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.splice(index_out, 1);

    const index_in = context.drawflow.drawflow[context.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.findIndex((item) => {
      return item.node === listclass[2].slice(14) && item.input === listclass[3];
    });
    context.drawflow.drawflow[context.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.splice(index_in, 1);

    elemsIn[i].remove();
    context.dispatch('connectionRemoved', {
      output_id: listclass[2].slice(14),
      input_id: listclass[1].slice(13),
      output_class: listclass[3],
      input_class: listclass[4]
    });
  }
}
