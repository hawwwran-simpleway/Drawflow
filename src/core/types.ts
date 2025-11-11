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

export type DrawflowPortType = 'input' | 'output';

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
