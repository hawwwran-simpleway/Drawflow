export interface DrawflowConnectionPoint {
	pos_x: number;
	pos_y: number;
}
export interface DrawflowOutputConnection {
	node: string;
	output: string;
	points?: DrawflowConnectionPoint[];
	signal?: string;
}
export interface DrawflowInputConnection {
	node: string;
	input: string;
	points?: DrawflowConnectionPoint[];
	signal?: string;
}
export interface DrawflowInputPort {
	connections: DrawflowInputConnection[];
	wireless?: string | null;
}
export interface DrawflowOutputPort {
	connections: DrawflowOutputConnection[];
	wireless?: string | null;
}
export interface DrawflowNodeData {
	id: number | string;
	name: string;
	data: Record<string, any>;
	class: string;
	html: string;
	typenode: boolean | string;
	inputs: Record<string, DrawflowInputPort>;
	outputs: Record<string, DrawflowOutputPort>;
	pos_x: number;
	pos_y: number;
}
export interface DrawflowModuleData {
	data: Record<string, DrawflowNodeData>;
}
export interface DrawflowData {
	drawflow: Record<string, DrawflowModuleData>;
}
export type DrawflowPortType = "input" | "output";
export interface DrawflowWirelessPortReference {
	nodeId: string;
	portClass: string;
	type: DrawflowPortType;
}
export type DrawflowEventCallback<T = any> = (payload: T) => void;
export interface DrawflowEventRegistry {
	[event: string]: {
		listeners: DrawflowEventCallback[];
	} | undefined;
}
export interface DrawflowRender {
	version?: string | number;
	h?: any;
	render?: (wrapper: any, container: HTMLElement) => void;
}
export interface AddConnectionOptions {
	signal?: string;
	skipDom?: boolean;
}
declare class Drawflow {
	events: DrawflowEventRegistry;
	container: HTMLElement;
	precanvas: HTMLElement | null;
	nodeId: number;
	ele_selected: any;
	node_selected: HTMLElement | null;
	drag: boolean;
	reroute: boolean;
	reroute_fix_curvature: boolean;
	curvature: number;
	reroute_curvature_start_end: number;
	reroute_curvature: number;
	reroute_width: number;
	drag_point: boolean;
	editor_selected: boolean;
	connection: boolean;
	connection_ele: any;
	connection_selected: any;
	canvas_x: number;
	canvas_y: number;
	pos_x: number;
	pos_x_start: number;
	pos_y: number;
	pos_y_start: number;
	mouse_x: number;
	mouse_y: number;
	line_path: number;
	first_click: HTMLElement | null;
	force_first_input: boolean;
	draggable_inputs: boolean;
	useuuid: boolean;
	parent: any;
	noderegister: Record<string, any>;
	render: any;
	drawflow: DrawflowData;
	module: string;
	editor_mode: "edit" | "fixed" | "view";
	zoom: number;
	zoom_max: number;
	zoom_min: number;
	zoom_value: number;
	zoom_last_value: number;
	evCache: PointerEvent[];
	prevDiff: number;
	autoPanEdgeMargin: number;
	autoPanSpeed: number;
	autoPanPointerX: number;
	autoPanPointerY: number;
	autoPanFrame: number | null;
	autoPanMode: "connection" | "node" | null;
	pending_wireless: DrawflowWirelessPortReference | null;
	constructor(container: HTMLElement, render?: any, parent?: any);
	start: () => void;
	pointerdown_handler: (ev: PointerEvent) => void;
	pointermove_handler: (ev: PointerEvent) => void;
	pointerup_handler: (ev: PointerEvent) => void;
	remove_event: (ev: PointerEvent) => void;
	load: () => void;
	removeReouteConnectionSelected: () => void;
	click: (e: MouseEvent | TouchEvent) => void;
	position: (e: MouseEvent | TouchEvent) => void;
	dragEnd: (e: MouseEvent | TouchEvent) => void;
	contextmenu: (e: MouseEvent) => void;
	contextmenuDel: () => void;
	key: (e: KeyboardEvent) => void;
	zoom_enter: (event: WheelEvent) => void;
	zoom_refresh: () => void;
	zoom_in: () => void;
	zoom_out: () => void;
	zoom_reset: () => void;
	createCurvature: (start_pos_x: number, start_pos_y: number, end_pos_x: number, end_pos_y: number, curvature_value: number, type: string) => string;
	drawConnection: (ele: HTMLElement) => void;
	updateConnection: (eX: number, eY: number) => void;
	addConnection: (id_output: string, id_input: string, output_class: string, input_class: string, options?: AddConnectionOptions) => void;
	updateConnectionNodes: (id: string) => void;
	dblclick: (e: MouseEvent) => void;
	createReroutePoint: (ele: Element) => void;
	removeReroutePoint: (ele: Element) => void;
	addRerouteImport: (dataNode: any) => void;
	removeConnection: () => void;
	removeSingleConnection: (id_output: string, id_input: string, output_class: string, input_class: string) => boolean;
	removeConnectionNodeId: (id: string) => void;
	registerNode: (name: string, html: any, props?: any, options?: any) => void;
	getNodeFromId: (id: string) => DrawflowNodeData;
	getNodesFromName: (name: string) => string[];
	addNode: (name: string, num_in: number, num_out: number, ele_pos_x: number, ele_pos_y: number, classoverride: string, data: Record<string, any>, html: any, typenode?: boolean | string) => number | string;
	addNodeImport: (dataNode: any, precanvas: HTMLElement) => void;
	updateNodeValue: (event: Event) => void;
	updateNodeDataFromId: (id: string, data: Record<string, any>) => void;
	addNodeInput: (id: string) => void;
	addNodeOutput: (id: string) => void;
	removeNodeInput: (id: string, input_class: string) => void;
	removeNodeOutput: (id: string, output_class: string) => void;
	removeNodeId: (id: string) => void;
	getModuleFromNodeId: (id: string) => string | undefined;
	addModule: (name: string) => void;
	changeModule: (name: string) => void;
	removeModule: (name: string) => void;
	clearModuleSelected: () => void;
	clear: () => void;
	export: () => DrawflowData;
	import: (data: DrawflowData, notify?: boolean) => void;
	on: <T>(eventName: string, callback: (payload: T) => void) => void;
	removeListener: <T>(eventName: string, callback: (payload: T) => void) => void;
	dispatch: <T>(eventName: string, payload: T) => void;
	getUuid: () => string;
}

export {
	Drawflow as default,
};

export {};
