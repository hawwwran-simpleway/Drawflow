import type Drawflow from './Drawflow';
import type {
  DrawflowInputPort,
  DrawflowOutputPort,
  DrawflowPortType,
  DrawflowWirelessPortReference,
} from './types';

const LABEL_CLASS = 'df-wireless-label';
const WIRELESS_PORT_CLASS = 'has-wireless';
const LABEL_ID_PREFIX = 'df-wireless-label-';
const MOVE_THRESHOLD = 5;

interface WirelessConnectionDescriptor {
  outputNodeId: string;
  inputNodeId: string;
  outputPortClass: string;
  inputPortClass: string;
  signal: string;
}

export interface WirelessEndpointOption extends DrawflowWirelessPortReference {
  name: string;
  label: string;
}

interface DialogSelectionResult {
  selectedId?: string;
  name?: string;
}

const hasWindow = typeof window !== 'undefined';

const getSwal = (): any | null => {
  if (!hasWindow) {
    return null;
  }
  const candidate = (window as any).Swal;
  return candidate && typeof candidate.fire === 'function' ? candidate : null;
};

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatPortClass = (portClass: string): string => {
  const [type, index] = portClass.split('_');
  const capitalized = type ? `${type.charAt(0).toUpperCase()}${type.slice(1)}` : '';
  return index ? `${capitalized} ${index}` : capitalized;
};

function getModuleData(context: Drawflow, nodeId: string) {
  const moduleName = context.getModuleFromNodeId(nodeId);
  if (!moduleName) {
    return null;
  }
  return context.drawflow.drawflow[moduleName]?.data ?? null;
}

function getPortData(context: Drawflow, ref: DrawflowWirelessPortReference): DrawflowInputPort | DrawflowOutputPort | null {
  const moduleData = getModuleData(context, ref.nodeId);
  if (!moduleData) {
    return null;
  }
  const node = moduleData[ref.nodeId];
  if (!node) {
    return null;
  }
  const collection = ref.type === 'input' ? node.inputs : node.outputs;
  const port = collection?.[ref.portClass];
  if (!port) {
    return null;
  }
  if (port.wireless === undefined) {
    port.wireless = null;
  }
  return port;
}

function resolvePortWirelessName(port: DrawflowInputPort | DrawflowOutputPort): string | null {
  if (typeof port.wireless === 'string' && port.wireless.trim() !== '') {
    return port.wireless;
  }
  const connectionWithSignal = port.connections.find((connection) => typeof connection.signal === 'string' && connection.signal.trim() !== '');
  return connectionWithSignal?.signal ?? null;
}

export function getPortWirelessName(context: Drawflow, ref: DrawflowWirelessPortReference): string | null {
  const port = getPortData(context, ref);
  if (!port) {
    return null;
  }
  const name = resolvePortWirelessName(port);
  if (port.wireless !== name) {
    port.wireless = name ?? null;
  }
  return name;
}

export function isPortEligibleForWireless(context: Drawflow, ref: DrawflowWirelessPortReference): boolean {
  const port = getPortData(context, ref);
  if (!port) {
    return false;
  }
  if (port.connections.length === 0) {
    return true;
  }
  return port.connections.every((connection) => typeof connection.signal === 'string' && connection.signal.trim() !== '');
}

function getPortElement(context: Drawflow, ref: DrawflowWirelessPortReference): HTMLElement | null {
  const nodeElement = context.container.querySelector<HTMLElement>(`#node-${ref.nodeId}`);
  if (!nodeElement) {
    return null;
  }
  const selector = ref.type === 'input' ? `.inputs .${ref.portClass}` : `.outputs .${ref.portClass}`;
  return nodeElement.querySelector<HTMLElement>(selector);
}

function ensureLabelElement(portElement: HTMLElement): HTMLElement {
  let label = portElement.querySelector<HTMLElement>(`.${LABEL_CLASS}`);
  if (!label) {
    label = document.createElement('span');
    label.classList.add(LABEL_CLASS);
    label.id = `${LABEL_ID_PREFIX}${Math.random().toString(36).slice(2)}`;
    portElement.appendChild(label);
  }
  return label;
}

function clearLabelElement(portElement: HTMLElement): void {
  const label = portElement.querySelector<HTMLElement>(`.${LABEL_CLASS}`);
  if (label) {
    label.remove();
  }
}

export function setPortWirelessName(context: Drawflow, ref: DrawflowWirelessPortReference, name: string | null): void {
  const port = getPortData(context, ref);
  if (port) {
    port.wireless = name && name.trim() !== '' ? name : null;
  }
  const element = getPortElement(context, ref);
  if (!element) {
    return;
  }
  if (name && name.trim() !== '') {
    const normalizedName = name.trim();
    const label = ensureLabelElement(element);
    label.textContent = normalizedName;
    label.setAttribute('title', normalizedName);
    element.classList.add(WIRELESS_PORT_CLASS);
    element.setAttribute('data-wireless', normalizedName);
  } else {
    element.classList.remove(WIRELESS_PORT_CLASS);
    element.removeAttribute('data-wireless');
    clearLabelElement(element);
  }
}

function buildWirelessConnections(context: Drawflow, ref: DrawflowWirelessPortReference): WirelessConnectionDescriptor[] {
  const port = getPortData(context, ref);
  if (!port) {
    return [];
  }
  const descriptors: WirelessConnectionDescriptor[] = [];
  port.connections.forEach((connection) => {
    if (typeof connection.signal !== 'string' || connection.signal.trim() === '') {
      return;
    }
    const signal = connection.signal.trim();
    if (ref.type === 'output') {
      descriptors.push({
        outputNodeId: ref.nodeId,
        inputNodeId: connection.node,
        outputPortClass: ref.portClass,
        inputPortClass: connection.output,
        signal,
      });
    } else {
      descriptors.push({
        outputNodeId: connection.node,
        inputNodeId: ref.nodeId,
        outputPortClass: connection.input,
        inputPortClass: ref.portClass,
        signal,
      });
    }
  });
  return descriptors;
}

export function removeWirelessConnections(context: Drawflow, ref: DrawflowWirelessPortReference): void {
  const descriptors = buildWirelessConnections(context, ref);
  descriptors.forEach((descriptor) => {
    context.removeSingleConnection(descriptor.outputNodeId, descriptor.inputNodeId, descriptor.outputPortClass, descriptor.inputPortClass);
  });
}

const createOptionLabel = (
  nodeName: string,
  nodeId: number | string,
  portClass: string,
  name: string,
  type: DrawflowPortType,
): string => {
  const location = `${nodeName} (#${nodeId}) ${formatPortClass(portClass)}`.trim();
  const direction = type === 'input' ? 'Input' : 'Output';
  return `${name} — ${direction}: ${location}`;
};

export function listAvailableOppositeEndpoints(context: Drawflow, ref: DrawflowWirelessPortReference): WirelessEndpointOption[] {
  const moduleData = getModuleData(context, ref.nodeId);
  if (!moduleData) {
    return [];
  }
  const oppositeType: DrawflowPortType = ref.type === 'input' ? 'output' : 'input';
  const options: WirelessEndpointOption[] = [];
  Object.values(moduleData).forEach((node) => {
    const ports = oppositeType === 'input' ? node.inputs : node.outputs;
    Object.entries(ports).forEach(([portClass, portData]) => {
      const name = resolvePortWirelessName(portData);
      if (!name || portData.connections.length > 0) {
        return;
      }
      options.push({
        nodeId: node.id.toString(),
        portClass,
        type: oppositeType,
        name,
        label: createOptionLabel(node.name, node.id, portClass, name, oppositeType),
      });
    });
  });
  return options;
}

function findEndpointOption(options: WirelessEndpointOption[], identifier?: string): WirelessEndpointOption | undefined {
  if (!identifier) {
    return undefined;
  }
  return options.find((option) => `${option.nodeId}|${option.portClass}` === identifier);
}

function connectWirelessPorts(context: Drawflow, origin: DrawflowWirelessPortReference, target: WirelessEndpointOption, signal: string): void {
  const trimmedSignal = signal.trim();
  if (origin.type === 'output' && target.type === 'input') {
    context.addConnection(origin.nodeId, target.nodeId, origin.portClass, target.portClass, { signal: trimmedSignal, skipDom: true });
  } else if (origin.type === 'input' && target.type === 'output') {
    context.addConnection(target.nodeId, origin.nodeId, target.portClass, origin.portClass, { signal: trimmedSignal, skipDom: true });
  }
  setPortWirelessName(context, origin, trimmedSignal);
  setPortWirelessName(context, target, trimmedSignal);
}

function autoConnectByName(context: Drawflow, ref: DrawflowWirelessPortReference, name: string): void {
  const candidates = listAvailableOppositeEndpoints(context, ref).filter((option) => {
    return option.name === name && !(option.nodeId === ref.nodeId && option.portClass === ref.portClass);
  });
  if (candidates.length === 1) {
    connectWirelessPorts(context, ref, candidates[0], name);
  } else {
    setPortWirelessName(context, ref, name);
  }
}

function buildDialogHtml(existingName: string | null, options: WirelessEndpointOption[]): string {
  const escapedValue = existingName ? escapeHtml(existingName) : '';
  const selectOptions = options
    .map((option) => {
      const value = `${option.nodeId}|${option.portClass}`;
      return `<option value="${escapeHtml(value)}">${escapeHtml(option.label)}</option>`;
    })
    .join('');
  return `
    <div class="drawflow-wireless-dialog">
      <label class="drawflow-wireless-dialog__label" for="df-wireless-name-input">Signal name</label>
      <input id="df-wireless-name-input" class="swal2-input" placeholder="Enter new signal name" value="${escapedValue}">
      <label class="drawflow-wireless-dialog__label" for="df-wireless-name-select">Connect to existing</label>
      <select id="df-wireless-name-select" class="swal2-select">
        <option value="">(none)</option>
        ${selectOptions}
      </select>
    </div>
  `;
}

function readDialogSelection(): DialogSelectionResult {
  const input = document.getElementById('df-wireless-name-input') as HTMLInputElement | null;
  const select = document.getElementById('df-wireless-name-select') as HTMLSelectElement | null;
  return {
    name: input ? input.value.trim() : undefined,
    selectedId: select ? select.value : undefined,
  };
}

function shouldShowRemoveButton(context: Drawflow, ref: DrawflowWirelessPortReference, existingName: string | null): boolean {
  if (existingName) {
    return true;
  }
  return buildWirelessConnections(context, ref).length > 0;
}

async function openDialog(context: Drawflow, ref: DrawflowWirelessPortReference): Promise<DialogSelectionResult | 'remove' | null> {
  const existingName = getPortWirelessName(context, ref);
  const options = listAvailableOppositeEndpoints(context, ref);
  const modal = getSwal();
  if (!modal) {
    if (!hasWindow) {
      return null;
    }
    const availableNames = options.map((option) => option.name).join(', ');
    const promptMessage = availableNames
      ? `Enter a signal name. Available names: ${availableNames}`
      : 'Enter a signal name.';
    const response = window.prompt(promptMessage, existingName ?? '');
    if (response === null) {
      return null;
    }
    const trimmed = response.trim();
    if (trimmed === '' && existingName) {
      return 'remove';
    }
    return { name: trimmed || undefined };
  }

  const result = await modal.fire({
    title: ref.type === 'input' ? 'Configure input signal' : 'Configure output signal',
    html: buildDialogHtml(existingName, options),
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Save',
    showDenyButton: shouldShowRemoveButton(context, ref, existingName),
    denyButtonText: 'Remove name',
    preConfirm: () => {
      const selection = readDialogSelection();
      if (selection.selectedId && selection.name) {
        return selection;
      }
      if (selection.selectedId || (selection.name && selection.name.trim() !== '')) {
        return selection;
      }
      return { selectedId: '', name: existingName ?? '' };
    },
  });

  if (result.isDismissed) {
    return null;
  }
  if (result.isDenied) {
    return 'remove';
  }
  return result.value as DialogSelectionResult;
}

function applySelection(
  context: Drawflow,
  ref: DrawflowWirelessPortReference,
  selection: DialogSelectionResult | 'remove' | null,
  options: WirelessEndpointOption[],
): void {
  if (!selection) {
    return;
  }
  if (selection === 'remove') {
    removeWirelessConnections(context, ref);
    setPortWirelessName(context, ref, null);
    return;
  }
  const option = findEndpointOption(options, selection.selectedId);
  if (option) {
    removeWirelessConnections(context, ref);
    connectWirelessPorts(context, ref, option, option.name);
    return;
  }
  if (selection.name && selection.name.trim() !== '') {
    removeWirelessConnections(context, ref);
    autoConnectByName(context, ref, selection.name.trim());
  }
}

export async function openWirelessDialog(context: Drawflow, ref: DrawflowWirelessPortReference): Promise<void> {
  const optionsSnapshot = listAvailableOppositeEndpoints(context, ref);
  const selection = await openDialog(context, ref);
  applySelection(context, ref, selection, optionsSnapshot);
}

export function movementExceedsThreshold(context: Drawflow, currentX: number, currentY: number): boolean {
  const deltaX = Math.abs(context.pos_x_start - currentX);
  const deltaY = Math.abs(context.pos_y_start - currentY);
  return deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD;
}
