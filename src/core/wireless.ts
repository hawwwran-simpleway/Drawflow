import Swal from 'sweetalert2';
import type Drawflow from './Drawflow';
import type {
  DrawflowInputConnection,
  DrawflowInputPort,
  DrawflowOutputConnection,
  DrawflowOutputPort,
  DrawflowPortType,
  DrawflowWirelessPortReference,
} from './types';

const LABEL_CLASS = 'df-wireless-label';
const LABEL_CONNECTED_CLASS = 'df-wireless-label--connected';
const WIRELESS_PORT_CLASS = 'has-wireless';
const LABEL_ID_PREFIX = 'df-wireless-label-';
const WIRELESS_CONNECTED_ATTRIBUTE = 'data-wireless-connected';
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
}

interface DialogSelectOption {
  value: string;
  label: string;
  name: string;
  endpoints: WirelessEndpointOption[];
}

interface DialogSelectionResult {
  selectedId?: string;
  name?: string;
}

const hasWindow = typeof window !== 'undefined';

type SwalLike = {
  fire: (options: any) => Promise<any>;
  showValidationMessage?: (message: string) => void;
};

const isSwalLike = (candidate: unknown): candidate is SwalLike => {
  return !!candidate && typeof (candidate as SwalLike).fire === 'function';
};

let cachedImportedSwal: SwalLike | null | undefined;

const resolveImportedSwal = (): SwalLike | null => {
  if (cachedImportedSwal !== undefined) {
    return cachedImportedSwal;
  }

  const directCandidate = Swal as unknown;
  if (isSwalLike(directCandidate)) {
    cachedImportedSwal = directCandidate;
    return cachedImportedSwal;
  }

  const defaultCandidate = (directCandidate as { default?: unknown }).default;
  if (isSwalLike(defaultCandidate)) {
    cachedImportedSwal = defaultCandidate;
    return cachedImportedSwal;
  }

  cachedImportedSwal = null;
  return cachedImportedSwal;
};

const getSwal = async (): Promise<SwalLike | null> => {
  if (!hasWindow) {
    return null;
  }
  const existing = (window as any).Swal;
  if (isSwalLike(existing)) {
    return existing;
  }
  const resolved = resolveImportedSwal();
  if (resolved) {
    (window as any).Swal = resolved;
  }
  return resolved;
};

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  return port;
}

function resolvePortWirelessName(port: DrawflowInputPort | DrawflowOutputPort): string | null {
  const storedWireless = (port as { wireless?: unknown }).wireless;
  if (typeof storedWireless === 'string' && storedWireless.trim() !== '') {
    return storedWireless.trim();
  }
  const connectionWithSignal = port.connections.find((connection) => {
    return typeof connection.signal === 'string' && connection.signal.trim() !== '';
  });
  return connectionWithSignal ? connectionWithSignal.signal!.trim() : null;
}

function applySignalValue(
  connection: DrawflowInputConnection | DrawflowOutputConnection,
  normalized: string,
): void {
  if (normalized !== '') {
    connection.signal = normalized;
  } else if ('signal' in connection) {
    delete (connection as any).signal;
  }
}

function isSamePort(
  ref: DrawflowWirelessPortReference,
  candidateNodeId: number | string,
  candidatePortClass: string,
  candidateType: DrawflowPortType,
): boolean {
  if (ref.type !== candidateType) {
    return false;
  }
  if (candidateType === 'input' || candidateType === 'output') {
    return ref.nodeId === candidateNodeId.toString() && ref.portClass === candidatePortClass;
  }
  return false;
}

function isWirelessNameUsedByAnotherOutput(
  context: Drawflow,
  ref: DrawflowWirelessPortReference,
  name: string,
): boolean {
  const moduleData = getModuleData(context, ref.nodeId);
  if (!moduleData) {
    return false;
  }
  const normalized = name.trim();
  if (normalized === '') {
    return false;
  }
  return Object.values(moduleData).some((node) => {
    const outputs = node.outputs ?? {};
    return Object.entries(outputs).some(([portClass, portData]) => {
      if (isSamePort(ref, node.id, portClass, 'output')) {
        return false;
      }
      const portName = resolvePortWirelessName(portData);
      return portName === normalized;
    });
  });
}

function listWirelessNamePool(
  context: Drawflow,
  ref: DrawflowWirelessPortReference,
  existingName: string | null,
): string[] {
  const moduleData = getModuleData(context, ref.nodeId);
  if (!moduleData) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  const considerName = (name: string | null) => {
    if (!name) {
      return;
    }
    const trimmed = name.trim();
    if (trimmed === '') {
      return;
    }
    if (seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    if (ref.type === 'output' && isWirelessNameUsedByAnotherOutput(context, ref, trimmed)) {
      return;
    }
    result.push(trimmed);
  };

  Object.values(moduleData).forEach((node) => {
    const inputs = node.inputs ?? {};
    Object.values(inputs).forEach((port) => {
      considerName(resolvePortWirelessName(port));
    });
    const outputs = node.outputs ?? {};
    Object.values(outputs).forEach((port) => {
      considerName(resolvePortWirelessName(port));
    });
  });

  if (existingName && existingName.trim() !== '') {
    const trimmedExisting = existingName.trim();
    if (!seen.has(trimmedExisting)) {
      seen.add(trimmedExisting);
      result.push(trimmedExisting);
    }
  }

  return result;
}

export function getPortWirelessName(context: Drawflow, ref: DrawflowWirelessPortReference): string | null {
  const port = getPortData(context, ref);
  if (!port) {
    return null;
  }
  return resolvePortWirelessName(port);
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

function hasActiveWirelessConnection(
  port: DrawflowInputPort | DrawflowOutputPort | null,
  signal?: string,
): boolean {
  if (!port) {
    return false;
  }
  const expectedSignal = signal?.trim();
  return port.connections.some((connection) => {
    if (typeof connection.signal !== 'string') {
      return false;
    }
    const candidate = connection.signal.trim();
    if (candidate === '') {
      return false;
    }
    if (expectedSignal) {
      return candidate === expectedSignal;
    }
    return true;
  });
}

function applyConnectionState(
  portElement: HTMLElement,
  label: HTMLElement,
  port: DrawflowInputPort | DrawflowOutputPort | null,
  signal: string,
): void {
  const isConnected = hasActiveWirelessConnection(port, signal);
  label.classList.toggle(LABEL_CONNECTED_CLASS, isConnected);
  if (isConnected) {
    portElement.setAttribute(WIRELESS_CONNECTED_ATTRIBUTE, 'true');
  } else {
    portElement.removeAttribute(WIRELESS_CONNECTED_ATTRIBUTE);
  }
}

export function setPortWirelessName(context: Drawflow, ref: DrawflowWirelessPortReference, name: string | null): void {
  const port = getPortData(context, ref);
  const normalized = typeof name === 'string' ? name.trim() : '';
  if (port) {
    if (normalized !== '') {
      (port as any).wireless = normalized;
    } else if ('wireless' in port) {
      delete (port as any).wireless;
    }
    const moduleData = getModuleData(context, ref.nodeId);
    if (!moduleData) {
      port.connections.forEach((connection) => {
        applySignalValue(connection, normalized);
      });
    } else {
      port.connections.forEach((connection) => {
        applySignalValue(connection, normalized);
        if (ref.type === 'output') {
          const targetNode = moduleData[connection.node];
          const targetPort = targetNode?.inputs?.[connection.output];
          const counterpart = targetPort?.connections.find((candidate) => {
            return candidate.node === ref.nodeId && candidate.input === ref.portClass;
          });
          if (counterpart) {
            applySignalValue(counterpart, normalized);
          }
        } else {
          const targetNode = moduleData[connection.node];
          const targetPort = targetNode?.outputs?.[connection.input];
          const counterpart = targetPort?.connections.find((candidate) => {
            return candidate.node === ref.nodeId && candidate.output === ref.portClass;
          });
          if (counterpart) {
            applySignalValue(counterpart, normalized);
          }
        }
      });
    }
  }
  const element = getPortElement(context, ref);
  if (!element) {
    return;
  }
  if (normalized !== '') {
    const label = ensureLabelElement(element);
    
    label.addEventListener('click', () => {
		void openWirelessDialog(context, ref).catch((error) => console.error(error));
    })
    
    label.textContent = normalized;
    label.setAttribute('title', normalized);
    element.classList.add(WIRELESS_PORT_CLASS);
    element.setAttribute('data-wireless', normalized);
    applyConnectionState(element, label, port, normalized);
  } else {
    element.classList.remove(WIRELESS_PORT_CLASS);
    element.removeAttribute('data-wireless');
    element.removeAttribute(WIRELESS_CONNECTED_ATTRIBUTE);
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

export function listAvailableOppositeEndpoints(context: Drawflow, ref: DrawflowWirelessPortReference): WirelessEndpointOption[] {
  const moduleData = getModuleData(context, ref.nodeId);
  if (!moduleData) {
    return [];
  }
  const oppositeType: DrawflowPortType = ref.type === 'input' ? 'output' : 'input';
  const options: WirelessEndpointOption[] = [];
  Object.values(moduleData).forEach((node) => {
    const ports = (oppositeType === 'input' ? node.inputs : node.outputs) ?? {};
    Object.entries(ports).forEach(([portClass, portData]) => {
      const name = resolvePortWirelessName(portData);
      if (!name) {
        return;
      }
      if (oppositeType === 'input' && portData.connections.length > 0) {
        return;
      }
      if (ref.type === 'output' && isWirelessNameUsedByAnotherOutput(context, ref, name)) {
        return;
      }
      options.push({
        nodeId: node.id.toString(),
        portClass,
        type: oppositeType,
        name,
      });
    });
  });
  return options;
}

const encodeNameValue = (name: string): string => {
  return `name|${encodeURIComponent(name)}`;
};

const findSelectOption = (
  options: DialogSelectOption[],
  identifier?: string,
): DialogSelectOption | undefined => {
  if (!identifier) {
    return undefined;
  }
  return options.find((option) => option.value === identifier);
};

function buildDialogSelectOptions(
  context: Drawflow,
  ref: DrawflowWirelessPortReference,
  existingName: string | null,
  endpoints: WirelessEndpointOption[],
): DialogSelectOption[] {
  const optionMap = new Map<string, DialogSelectOption>();

  const registerOption = (name: string): DialogSelectOption => {
    const existing = optionMap.get(name);
    if (existing) {
      return existing;
    }
    const created: DialogSelectOption = {
      value: encodeNameValue(name),
      label: name,
      name,
      endpoints: [],
    };
    optionMap.set(name, created);
    return created;
  };

  const pool = listWirelessNamePool(context, ref, existingName);
  pool.forEach((name) => {
    registerOption(name);
  });

  endpoints.forEach((endpoint) => {
    const normalized = endpoint.name.trim();
    if (normalized === '') {
      return;
    }
    const option = registerOption(normalized);
    const alreadyTracked = option.endpoints.some((tracked) => {
      return (
        tracked.nodeId === endpoint.nodeId &&
        tracked.portClass === endpoint.portClass &&
        tracked.type === endpoint.type
      );
    });
    if (!alreadyTracked) {
      option.endpoints.push(endpoint);
    }
  });

  return Array.from(optionMap.values()).sort((a, b) => a.name.localeCompare(b.name));
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
  const trimmed = name.trim();
  if (trimmed === '') {
    setPortWirelessName(context, ref, null);
    return;
  }
  const candidates = listAvailableOppositeEndpoints(context, ref).filter((option) => {
    return option.name === trimmed && !(option.nodeId === ref.nodeId && option.portClass === ref.portClass);
  });
  setPortWirelessName(context, ref, trimmed);
  candidates.forEach((candidate) => {
    connectWirelessPorts(context, ref, candidate, trimmed);
  });
}

const listAttributeValue = 'drawflow-wireless-dialog__input-data';

function buildDialogHtml(existingName: string | null, options: DialogSelectOption[]): string {
  const escapedValue = existingName ? escapeHtml(existingName) : '';
  const hasSelectOptions = options.length > 0;
  const selectOptions = hasSelectOptions
    ? options
        .map((option) => {
          return `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`;
        })
        .join('')
    : '';
  const selectOptionsData = hasSelectOptions
    ? options
        .map((option) => {
          return `<option>${escapeHtml(option.label)}</option>`;
        })
        .join('')
    : '';
  
	
  return `
    <div class="drawflow-wireless-dialog">
      <label class="drawflow-wireless-dialog__label" for="df-wireless-name-input">Signal name</label>
      <input
        id="df-wireless-name-input"
        class="swal2-input"
        placeholder="Enter new signal name"
        value="${escapedValue}"
        autocomplete="off"
      >
      ${hasSelectOptions
        ? `
                  <datalist id="${listAttributeValue}">${selectOptionsData}</datalist>
          <label class="drawflow-wireless-dialog__label" for="df-wireless-name-select">Connect to existing</label>
                  <select id="df-wireless-name-select" class="swal2-input swal2-select">
                        <option value="">(none)</option>
                        ${selectOptions}
                  </select>
                  `
        : ''
      }
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

async function openDialog(
  context: Drawflow,
  ref: DrawflowWirelessPortReference,
  existingName: string | null,
  selectOptions: DialogSelectOption[],
): Promise<DialogSelectionResult | 'remove' | null> {
  const modal = await getSwal();
  if (!modal) {
    return null;
  }

  const result = await modal.fire({
    title: ref.type === 'input' ? 'Configure input signal' : 'Configure output signal',
    html: buildDialogHtml(existingName, selectOptions),
    focusConfirm: false,
    didOpen: () => {
      const input = document.getElementById('df-wireless-name-input') as HTMLInputElement | null;
      const select = document.getElementById('df-wireless-name-select') as HTMLSelectElement | null;
      if (select) {
        input.setAttribute('list', listAttributeValue); // Set datalist attribute to input later, to force the list to be hidden
      } else {
        input?.focus();
      }
    },
    showCancelButton: true,
    confirmButtonText: 'Save',
    showDenyButton: shouldShowRemoveButton(context, ref, existingName),
    denyButtonText: 'Remove name',
    preConfirm: () => {
      const selection = readDialogSelection();
      const selectedOption = findSelectOption(selectOptions, selection.selectedId);
      if (selectedOption) {
        selection.name = selectedOption.name;
      }
      const candidateName = selection.name?.trim() ?? '';
      if (!selection.selectedId && candidateName === '') {
        modal.showValidationMessage?.('Signal name cannot be empty.');
        return false;
      }
      if (ref.type === 'output' && candidateName !== '' && isWirelessNameUsedByAnotherOutput(context, ref, candidateName)) {
        modal.showValidationMessage?.('Signal name is already used by another output.');
        return false;
      }
      selection.name = candidateName;
      if (selection.selectedId && candidateName !== '') {
        return selection;
      }
      if (selection.selectedId || candidateName !== '') {
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
  selectOptions: DialogSelectOption[],
): void {
  if (!selection) {
    return;
  }
  if (selection === 'remove') {
    removeWirelessConnections(context, ref);
    setPortWirelessName(context, ref, null);
    return;
  }
  const trimmedName = selection.name?.trim() ?? '';
  const option = findSelectOption(selectOptions, selection.selectedId);
  if (option) {
    removeWirelessConnections(context, ref);
    setPortWirelessName(context, ref, option.name);
    if (option.endpoints.length > 0) {
      option.endpoints.forEach((endpoint) => {
        connectWirelessPorts(context, ref, endpoint, option.name);
      });
    } else {
      autoConnectByName(context, ref, option.name);
    }
    return;
  }
  if (trimmedName !== '') {
    removeWirelessConnections(context, ref);
    autoConnectByName(context, ref, trimmedName);
  }
}

export async function openWirelessDialog(context: Drawflow, ref: DrawflowWirelessPortReference): Promise<void> {
  const existingName = getPortWirelessName(context, ref);
  const optionsSnapshot = listAvailableOppositeEndpoints(context, ref);
  const selectOptions = buildDialogSelectOptions(context, ref, existingName, optionsSnapshot);
  const selection = await openDialog(context, ref, existingName, selectOptions);
  applySelection(context, ref, selection, selectOptions);
}

export function movementExceedsThreshold(context: Drawflow, currentX: number, currentY: number): boolean {
  const deltaX = Math.abs(context.pos_x_start - currentX);
  const deltaY = Math.abs(context.pos_y_start - currentY);
  return deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD;
}

export function refreshWirelessPorts(context: Drawflow): void {
  const modules = context.drawflow?.drawflow ?? {};

  Object.values(modules).forEach((module) => {
    const nodes = module?.data ?? {};

    Object.values(nodes).forEach((node) => {
      const nodeId = node.id.toString();

      const inputs = node.inputs ?? {};
      Object.keys(inputs).forEach((inputClass) => {
        const portData = inputs[inputClass];
        const name = resolvePortWirelessName(portData) ?? null;
        setPortWirelessName(context, { nodeId, portClass: inputClass, type: 'input' }, name);
      });

      const outputs = node.outputs ?? {};
      Object.keys(outputs).forEach((outputClass) => {
        const portData = outputs[outputClass];
        const name = resolvePortWirelessName(portData) ?? null;
        setPortWirelessName(context, { nodeId, portClass: outputClass, type: 'output' }, name);
      });
    });
  });
}
