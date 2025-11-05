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
      updateConnectionWithPoints({
        context,
        element,
        id,
        precanvasWidthZoom,
        precanvasHeightZoom,
        rerouteWidth,
        reroute_curvature,
        reroute_curvature_start_end,
        reroute_fix_curvature,
        curvature,
        zoom,
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
      updateConnectionWithPoints({
        context,
        element,
        id,
        precanvasWidthZoom,
        precanvasHeightZoom,
        rerouteWidth,
        reroute_curvature,
        reroute_curvature_start_end,
        reroute_fix_curvature,
        curvature,
        zoom,
      });
    }
  });
}

interface UpdateConnectionWithPointsArgs {
  context: Drawflow;
  element: HTMLElement;
  id: string;
  precanvasWidthZoom: number;
  precanvasHeightZoom: number;
  rerouteWidth: number;
  reroute_curvature: number;
  reroute_curvature_start_end: number;
  reroute_fix_curvature: boolean;
  curvature: number;
  zoom: number;
}

function updateConnectionWithPoints(args: UpdateConnectionWithPointsArgs): void {
  const { context, element, id, precanvasWidthZoom, precanvasHeightZoom, rerouteWidth, reroute_curvature,
    reroute_curvature_start_end, reroute_fix_curvature, curvature, zoom } = args;
  const points = element.querySelectorAll<SVGCircleElement>('.point');
  let linecurve = '';
  const reoute_fix: string[] = [];

  points.forEach((point, i) => {
    const data = calculateRerouteSegment({
      context,
      element,
      point,
      index: i,
      points,
      precanvasWidthZoom,
      precanvasHeightZoom,
      rerouteWidth,
      reroute_curvature,
      reroute_curvature_start_end,
      reroute_fix_curvature,
      zoom,
      id
    });
    linecurve += data.path;
    if (reroute_fix_curvature) {
      reoute_fix.push(data.path);
    }
  });

  if (reroute_fix_curvature) {
    reoute_fix.forEach((itempath, index) => {
      const mainPath = element.children[index] as SVGPathElement;
      if (mainPath) {
        mainPath.setAttributeNS(null, 'd', itempath);
      }
    });
  } else {
    (element.children[0] as SVGPathElement).setAttributeNS(null, 'd', linecurve);
  }
}

interface CalculateRerouteArgs {
  context: Drawflow;
  element: HTMLElement;
  point: SVGCircleElement;
  index: number;
  points: NodeListOf<SVGCircleElement>;
  precanvasWidthZoom: number;
  precanvasHeightZoom: number;
  rerouteWidth: number;
  reroute_curvature: number;
  reroute_curvature_start_end: number;
  reroute_fix_curvature: boolean;
  zoom: number;
  id: string;
}

function calculateRerouteSegment(args: CalculateRerouteArgs): { path: string } {
  const { context, element, point, index, points, precanvasWidthZoom, precanvasHeightZoom, rerouteWidth,
    reroute_curvature, reroute_curvature_start_end, reroute_fix_curvature, zoom, id } = args;
  const precanvas = context.precanvas!;

  const create = (sx: number, sy: number, ex: number, ey: number, type: string): string =>
    createCurvature(context, sx, sy, ex, ey, type === 'other' ? reroute_curvature : reroute_curvature_start_end, type);

  if (index === 0 && ((points.length - 1) === 0)) {
    const elemtsearchId_out = context.container.querySelector(`#${id}`) as HTMLElement;
    const elemtsearch = point;

    const eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWidthZoom + rerouteWidth;
    const eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;

    const elemtsearchOut = elemtsearchId_out.querySelector<HTMLElement>(`.${point.parentElement!.classList[3]}`)!;
    const line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWidthZoom;
    const line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;
    const pathOpen = create(line_x, line_y, eX, eY, 'open');

    const id_search = point.parentElement!.classList[1].replace('node_in_', '');
    const elemtsearchId = context.container.querySelector(`#${id_search}`) as HTMLElement;
    const elemtsearchIn = elemtsearchId.querySelector<HTMLElement>(`.${point.parentElement!.classList[4]}`)!;
    const eXIn = elemtsearchIn.offsetWidth / 2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWidthZoom;
    const eYIn = elemtsearchIn.offsetHeight / 2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;
    const pathClose = create(eX, eY, eXIn, eYIn, 'close');

    return { path: `${pathOpen}${pathClose}` };
  }

  if (index === 0) {
    const elemtsearchId_out = context.container.querySelector(`#${id}`) as HTMLElement;
    const elemtsearch = point;

    const eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWidthZoom + rerouteWidth;
    const eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;

    const elemtsearchOut = elemtsearchId_out.querySelector<HTMLElement>(`.${point.parentElement!.classList[3]}`)!;
    const line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWidthZoom;
    const line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;
    const pathOpen = create(line_x, line_y, eX, eY, 'open');

    const nextPoint = points[index + 1];
    const eXNext = (nextPoint.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWidthZoom + rerouteWidth;
    const eYNext = (nextPoint.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
    const pathOther = create(eX, eY, eXNext, eYNext, 'other');
    return { path: `${pathOpen}${pathOther}` };
  }

  if (index === (points.length - 1)) {
    const id_search = point.parentElement!.classList[1].replace('node_in_', '');
    const elemtsearchId = context.container.querySelector(`#${id_search}`) as HTMLElement;
    const elemtsearchIn = elemtsearchId.querySelector<HTMLElement>(`.${point.parentElement!.classList[4]}`)!;
    const eXIn = elemtsearchIn.offsetWidth / 2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWidthZoom;
    const eYIn = elemtsearchIn.offsetHeight / 2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

    const line_x = (point.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWidthZoom + rerouteWidth;
    const line_y = (point.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;

    const pathClose = create(line_x, line_y, eXIn, eYIn, 'close');
    return { path: pathClose };
  }

  const nextPoint = points[index + 1];
  const eX = (nextPoint.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWidthZoom + rerouteWidth;
  const eY = (nextPoint.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
  const line_x = (point.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWidthZoom + rerouteWidth;
  const line_y = (point.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
  const pathOther = create(line_x, line_y, eX, eY, 'other');
  return { path: pathOther };
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

  let position_add_array_point = 0;
  const parentConnection = ele.parentElement as Element;
  if (context.reroute_fix_curvature) {
    const numberPoints = ele.parentElement!.querySelectorAll('.main-path').length;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('main-path');
    path.setAttributeNS(null, 'd', '');
    parentConnection.insertBefore(path, parentConnection.children[numberPoints]);
    if (numberPoints === 1) {
      parentConnection.appendChild(point);
    } else {
      const search_point = Array.from(parentConnection.children).indexOf(ele);
      position_add_array_point = search_point;
      parentConnection.insertBefore(point, parentConnection.children[search_point + numberPoints + 1]);
    }
  } else {
    parentConnection.appendChild(point);
  }

  const nodeId = nodeUpdate.slice(5);
  const searchConnection = context.drawflow.drawflow[context.module].data[nodeId].outputs[output_class].connections.findIndex((item) => {
    return item.node === nodeUpdateIn && item.output === input_class;
  });

  const connection = context.drawflow.drawflow[context.module].data[nodeId].outputs[output_class].connections[searchConnection];
  if (!connection.points) {
    connection.points = [];
  }

  if (context.reroute_fix_curvature) {
    if (position_add_array_point > 0 || connection.points.length !== 0) {
      connection.points.splice(position_add_array_point, 0, { pos_x, pos_y });
    } else {
      connection.points.push({ pos_x, pos_y });
    }
    ele.parentElement!.querySelectorAll('.main-path').forEach((item) => {
      item.classList.remove('selected');
    });
  } else {
    const precanvas = context.precanvas!;
    const precanvasRect = precanvas.getBoundingClientRect();
    const precanvasWidthZoom = precanvas.clientWidth / (precanvas.clientWidth * context.zoom) || 0;
    const precanvasHeightZoom = precanvas.clientHeight / (precanvas.clientHeight * context.zoom) || 0;
    const outputNodeElement = context.container.querySelector(`#${nodeUpdate}`) as HTMLElement;
    const outputSocket = outputNodeElement.querySelector<HTMLElement>(`.${output_class}`)!;
    const outputRect = outputSocket.getBoundingClientRect();
    const outputPosX = outputSocket.offsetWidth / 2 + (outputRect.x - precanvasRect.x) * precanvasWidthZoom;
    const outputPosY = outputSocket.offsetHeight / 2 + (outputRect.y - precanvasRect.y) * precanvasHeightZoom;
    const distanceFromOutput = (x: number, y: number): number => Math.hypot(x - outputPosX, y - outputPosY);
    const getCirclePosition = (circle: SVGCircleElement): { x: number; y: number } => ({
      x: Number(circle.getAttribute('cx') ?? 0),
      y: Number(circle.getAttribute('cy') ?? 0),
    });
    const sortedPoints = Array.from(parentConnection.querySelectorAll<SVGCircleElement>('.point'))
      .sort((a, b) => {
        const positionA = getCirclePosition(a);
        const positionB = getCirclePosition(b);
        return distanceFromOutput(positionA.x, positionA.y) - distanceFromOutput(positionB.x, positionB.y);
      });

    sortedPoints.forEach((sortedPoint) => {
      parentConnection.appendChild(sortedPoint);
    });

    connection.points = sortedPoints.map((sortedPoint) => {
      const position = getCirclePosition(sortedPoint);
      return { pos_x: position.x, pos_y: position.y };
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
