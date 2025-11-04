import type { DrawflowData, DrawflowEventRegistry } from './types';
import * as lifecycle from './lifecycle';
import * as connections from './connections';
import * as nodes from './nodes';
import * as modules from './modules';
import * as serialization from './serialization';
import * as events from './events';
import * as zoom from './zoom';

export default class Drawflow {
  public events: DrawflowEventRegistry;
  public container: HTMLElement;
  public precanvas: HTMLElement | null;
  public nodeId: number;
  public ele_selected: any;
  public node_selected: HTMLElement | null;
  public drag: boolean;
  public reroute: boolean;
  public reroute_fix_curvature: boolean;
  public curvature: number;
  public reroute_curvature_start_end: number;
  public reroute_curvature: number;
  public reroute_width: number;
  public drag_point: boolean;
  public editor_selected: boolean;
  public connection: boolean;
  public connection_ele: any;
  public connection_selected: any;
  public canvas_x: number;
  public canvas_y: number;
  public pos_x: number;
  public pos_x_start: number;
  public pos_y: number;
  public pos_y_start: number;
  public mouse_x: number;
  public mouse_y: number;
  public line_path: number;
  public first_click: HTMLElement | null;
  public force_first_input: boolean;
  public draggable_inputs: boolean;
  public useuuid: boolean;
  public parent: any;
  public noderegister: Record<string, any>;
  public render: any;
  public drawflow: DrawflowData;
  public module: string;
  public editor_mode: 'edit' | 'fixed' | 'view';
  public zoom: number;
  public zoom_max: number;
  public zoom_min: number;
  public zoom_value: number;
  public zoom_last_value: number;
  public evCache: PointerEvent[];
  public prevDiff: number;
  public autoPanEdgeMargin: number;
  public autoPanSpeed: number;
  public autoPanPointerX: number;
  public autoPanPointerY: number;
  public autoPanFrame: number | null;
  public autoPanMode: 'connection' | 'node' | null;

  constructor(container: HTMLElement, render: any = null, parent: any = null) {
    this.events = {};
    this.container = container;
    this.precanvas = null;
    this.nodeId = 1;
    this.ele_selected = null;
    this.node_selected = null;
    this.drag = false;
    this.reroute = false;
    this.reroute_fix_curvature = false;
    this.curvature = 0.5;
    this.reroute_curvature_start_end = 0.5;
    this.reroute_curvature = 0.5;
    this.reroute_width = 6;
    this.drag_point = false;
    this.editor_selected = false;
    this.connection = false;
    this.connection_ele = null;
    this.connection_selected = null;
    this.canvas_x = 0;
    this.canvas_y = 0;
    this.pos_x = 0;
    this.pos_x_start = 0;
    this.pos_y = 0;
    this.pos_y_start = 0;
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.line_path = 5;
    this.first_click = null;
    this.force_first_input = false;
    this.draggable_inputs = true;
    this.useuuid = false;
    this.parent = parent;
    this.noderegister = {};
    this.render = render;
    this.drawflow = { drawflow: { Home: { data: {} } } } as DrawflowData;
    this.module = 'Home';
    this.editor_mode = 'edit';
    this.zoom = 1;
    this.zoom_max = 1.6;
    this.zoom_min = 0.5;
    this.zoom_value = 0.1;
    this.zoom_last_value = 1;
    this.evCache = [];
    this.prevDiff = -1;
    this.autoPanEdgeMargin = 40;
    this.autoPanSpeed = 12;
    this.autoPanPointerX = 0;
    this.autoPanPointerY = 0;
    this.autoPanFrame = null;
    this.autoPanMode = null;
  }

  public start = (): void => lifecycle.start(this);
  public pointerdown_handler = (ev: PointerEvent): void => lifecycle.pointerdown_handler(this, ev);
  public pointermove_handler = (ev: PointerEvent): void => lifecycle.pointermove_handler(this, ev);
  public pointerup_handler = (ev: PointerEvent): void => lifecycle.pointerup_handler(this, ev);
  public remove_event = (ev: PointerEvent): void => lifecycle.remove_event(this, ev);
  public load = (): void => lifecycle.load(this);
  public removeReouteConnectionSelected = (): void => lifecycle.removeReouteConnectionSelected(this);
  public click = (e: MouseEvent | TouchEvent): void => lifecycle.click(this, e);
  public position = (e: MouseEvent | TouchEvent): void => lifecycle.position(this, e);
  public dragEnd = (e: MouseEvent | TouchEvent): void => lifecycle.dragEnd(this, e);
  public contextmenu = (e: MouseEvent): void => lifecycle.contextmenu(this, e);
  public contextmenuDel = (): void => lifecycle.contextmenuDel(this);
  public key = (e: KeyboardEvent): void => lifecycle.key(this, e);

  public zoom_enter = (event: WheelEvent): void => zoom.zoom_enter(this, event);
  public zoom_refresh = (): void => zoom.zoom_refresh(this);
  public zoom_in = (): void => zoom.zoom_in(this);
  public zoom_out = (): void => zoom.zoom_out(this);
  public zoom_reset = (): void => zoom.zoom_reset(this);

  public createCurvature = (
    start_pos_x: number,
    start_pos_y: number,
    end_pos_x: number,
    end_pos_y: number,
    curvature_value: number,
    type: string
  ): string => connections.createCurvature(this, start_pos_x, start_pos_y, end_pos_x, end_pos_y, curvature_value, type);
  public drawConnection = (ele: HTMLElement): void => connections.drawConnection(this, ele);
  public updateConnection = (eX: number, eY: number): void => connections.updateConnection(this, eX, eY);
  public addConnection = (id_output: string, id_input: string, output_class: string, input_class: string): void =>
    connections.addConnection(this, id_output, id_input, output_class, input_class);
  public updateConnectionNodes = (id: string): void => connections.updateConnectionNodes(this, id);
  public dblclick = (e: MouseEvent): void => connections.dblclick(this, e);
  public createReroutePoint = (ele: Element): void => connections.createReroutePoint(this, ele);
  public removeReroutePoint = (ele: Element): void => connections.removeReroutePoint(this, ele);
  public addRerouteImport = (dataNode: any): void => connections.addRerouteImport(this, dataNode);
  public removeConnection = (): void => connections.removeConnection(this);
  public removeSingleConnection = (id_output: string, id_input: string, output_class: string, input_class: string): boolean =>
    connections.removeSingleConnection(this, id_output, id_input, output_class, input_class);
  public removeConnectionNodeId = (id: string): void => connections.removeConnectionNodeId(this, id);

  public registerNode = (name: string, html: any, props: any = null, options: any = null): void =>
    nodes.registerNode(this, name, html, props, options);
  public getNodeFromId = (id: string) => nodes.getNodeFromId(this, id);
  public getNodesFromName = (name: string): string[] => nodes.getNodesFromName(this, name);
  public addNode = (
    name: string,
    num_in: number,
    num_out: number,
    ele_pos_x: number,
    ele_pos_y: number,
    classoverride: string,
    data: Record<string, any>,
    html: any,
    typenode: boolean | string = false
  ): number | string => nodes.addNode(this, name, num_in, num_out, ele_pos_x, ele_pos_y, classoverride, data, html, typenode);
  public addNodeImport = (dataNode: any, precanvas: HTMLElement): void => nodes.addNodeImport(this, dataNode, precanvas);
  public updateNodeValue = (event: Event): void => nodes.updateNodeValue(this, event);
  public updateNodeDataFromId = (id: string, data: Record<string, any>): void => nodes.updateNodeDataFromId(this, id, data);
  public addNodeInput = (id: string): void => nodes.addNodeInput(this, id);
  public addNodeOutput = (id: string): void => nodes.addNodeOutput(this, id);
  public removeNodeInput = (id: string, input_class: string): void => nodes.removeNodeInput(this, id, input_class);
  public removeNodeOutput = (id: string, output_class: string): void => nodes.removeNodeOutput(this, id, output_class);
  public removeNodeId = (id: string): void => nodes.removeNodeId(this, id);

  public getModuleFromNodeId = (id: string): string | undefined => modules.getModuleFromNodeId(this, id);
  public addModule = (name: string): void => modules.addModule(this, name);
  public changeModule = (name: string): void => modules.changeModule(this, name);
  public removeModule = (name: string): void => modules.removeModule(this, name);
  public clearModuleSelected = (): void => modules.clearModuleSelected(this);
  public clear = (): void => modules.clear(this);

  public export = (): DrawflowData => serialization.exportData(this);
  public import = (data: DrawflowData, notify = true): void => serialization.importData(this, data, notify);

  public on = <T>(eventName: string, callback: (payload: T) => void): void => events.on(this, eventName, callback);
  public removeListener = <T>(eventName: string, callback: (payload: T) => void): void =>
    events.removeListener(this, eventName, callback);
  public dispatch = <T>(eventName: string, payload: T): void => events.dispatch(this, eventName, payload);

  public getUuid = (): string => {
    const s: any[] = [];
    const hexDigits = '0123456789abcdef';
    for (let i = 0; i < 36; i += 1) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = '4';
    s[19] = hexDigits.substr((parseInt(s[19], 16) & 0x3) | 0x8, 1);
    s[8] = s[13] = s[18] = s[23] = '-';
    return s.join('');
  };
}
