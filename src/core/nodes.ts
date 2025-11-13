import type Drawflow from './Drawflow';
import type { DrawflowNodeData } from './types';
import { findClassWithPrefix } from './utils/classNames';
import { setPortWirelessName } from './wireless';

export function registerNode(context: Drawflow, name: string, html: any, props: any = null, options: any = null): void {
  context.noderegister[name] = { html, props, options };
}

export function getNodeFromId(context: Drawflow, id: string): DrawflowNodeData | null {
  const moduleName = context.getModuleFromNodeId(id);
  if (moduleName && context.drawflow.drawflow[moduleName] && context.drawflow.drawflow[moduleName].data[id]) {
    return JSON.parse(JSON.stringify(context.drawflow.drawflow[moduleName].data[id]));
  }
  return null;
}

export function getNodesFromName(context: Drawflow, name: string): string[] {
  const nodes: string[] = [];
  const editor = context.drawflow.drawflow;
  Object.keys(editor).forEach((moduleName) => {
    Object.keys(editor[moduleName].data).forEach((node) => {
      if (editor[moduleName].data[node].name === name) {
        nodes.push(editor[moduleName].data[node].id.toString());
      }
    });
  });
  return nodes;
}

export function addNode(
  context: Drawflow,
  name: string,
  num_in: number,
  num_out: number,
  ele_pos_x: number,
  ele_pos_y: number,
  classoverride: string,
  data: Record<string, any>,
  html: any,
  typenode: boolean | string = false
): number | string {
  const newNodeId = context.useuuid ? context.getUuid() : context.nodeId;
  const parent = document.createElement('div');
  parent.classList.add('parent-node');

  const node = document.createElement('div');
  node.innerHTML = '';
  node.setAttribute('id', `node-${newNodeId}`);
  node.classList.add('drawflow-node');
  if (classoverride !== '') {
    node.classList.add(...classoverride.split(' '));
  }

  const inputs = document.createElement('div');
  inputs.classList.add('inputs');

  const outputs = document.createElement('div');
  outputs.classList.add('outputs');

  const json_inputs: Record<string, any> = {};
  for (let x = 0; x < num_in; x += 1) {
    const input = document.createElement('div');
    input.classList.add('input');
    input.classList.add(`input_${x + 1}`);
    json_inputs[`input_${x + 1}`] = { connections: [] };
    inputs.appendChild(input);
  }

  const json_outputs: Record<string, any> = {};
  for (let x = 0; x < num_out; x += 1) {
    const output = document.createElement('div');
    output.classList.add('output');
    output.classList.add(`output_${x + 1}`);
    json_outputs[`output_${x + 1}`] = { connections: [] };
    outputs.appendChild(output);
  }

  const content = document.createElement('div');
  content.classList.add('drawflow_content_node');
  if (typenode === false) {
    content.innerHTML = html;
  } else if (typenode === true) {
    content.appendChild(context.noderegister[html].html.cloneNode(true));
  } else if (context.render) {
    if (parseInt(context.render.version as string, 10) === 3) {
      const wrapper = context.render.h!(context.noderegister[html].html, context.noderegister[html].props, context.noderegister[html].options);
      wrapper.appContext = context.parent;
      context.render.render!(wrapper, content);
    } else {
      const wrapper = new context.render({
        parent: context.parent,
        render: (h: any) => h(context.noderegister[html].html, { props: context.noderegister[html].props }),
        ...context.noderegister[html].options
      }).$mount();
      content.appendChild(wrapper.$el);
    }
  }

  applyDataBindings(content, data);

  node.appendChild(inputs);
  node.appendChild(content);
  node.appendChild(outputs);
  node.style.top = `${ele_pos_y}px`;
  node.style.left = `${ele_pos_x}px`;
  parent.appendChild(node);
  context.precanvas!.appendChild(parent);

  const json = {
    id: newNodeId,
    name,
    data,
    class: classoverride,
    html,
    typenode,
    inputs: json_inputs,
    outputs: json_outputs,
    pos_x: ele_pos_x,
    pos_y: ele_pos_y
  } as DrawflowNodeData;
  context.drawflow.drawflow[context.module].data[String(newNodeId)] = json as any;
  context.dispatch('nodeCreated', newNodeId);
  if (!context.useuuid) {
    context.nodeId += 1;
  }
  return newNodeId;
}

export function addNodeImport(context: Drawflow, dataNode: DrawflowNodeData, precanvas: HTMLElement): void {
  const parent = document.createElement('div');
  parent.classList.add('parent-node');

  const node = document.createElement('div');
  node.innerHTML = '';
  node.setAttribute('id', `node-${dataNode.id}`);
  node.classList.add('drawflow-node');
  if (dataNode.class !== '') {
    node.classList.add(...dataNode.class.split(' '));
  }

  const inputs = document.createElement('div');
  inputs.classList.add('inputs');

  const outputs = document.createElement('div');
  outputs.classList.add('outputs');

  Object.keys(dataNode.inputs).forEach((input_item) => {
    const input = document.createElement('div');
    input.classList.add('input');
    input.classList.add(input_item);
    inputs.appendChild(input);

    const inputPortData = dataNode.inputs[input_item];
    if ((inputPortData as any).wireless !== undefined) {
      delete (inputPortData as any).wireless;
    }

    Object.keys(inputPortData.connections).forEach((output_item) => {
      const connectionData = inputPortData.connections[output_item];
      if (!connectionData) {
        return;
      }
      if (typeof connectionData.signal === 'string' && connectionData.signal.trim() !== '') {
        return;
      }
      const connection = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.classList.add('main-path');
      path.setAttributeNS(null, 'd', '');
      connection.classList.add('connection');
      connection.classList.add(`node_in_node-${dataNode.id}`);
      connection.classList.add(`node_out_node-${connectionData.node}`);
      connection.classList.add(connectionData.input);
      connection.classList.add(input_item);
      connection.appendChild(path);
      precanvas.appendChild(connection);
    });
  });

  Object.keys(dataNode.outputs).forEach((output_item) => {
    const output = document.createElement('div');
    output.classList.add('output');
    output.classList.add(output_item);
    outputs.appendChild(output);
    const outputPortData = dataNode.outputs[output_item];
    if ((outputPortData as any).wireless !== undefined) {
      delete (outputPortData as any).wireless;
    }
  });

  const content = document.createElement('div');
  content.classList.add('drawflow_content_node');

  if (dataNode.typenode === false) {
    content.innerHTML = dataNode.html;
  } else if (dataNode.typenode === true) {
    content.appendChild(context.noderegister[dataNode.html].html.cloneNode(true));
  } else if (context.render) {
    if (parseInt(context.render.version as string, 10) === 3) {
      const wrapper = context.render.h!(context.noderegister[dataNode.html].html, context.noderegister[dataNode.html].props, context.noderegister[dataNode.html].options);
      wrapper.appContext = context.parent;
      context.render.render!(wrapper, content);
    } else {
      const wrapper = new context.render({
        parent: context.parent,
        render: (h: any) => h(context.noderegister[dataNode.html].html, { props: context.noderegister[dataNode.html].props }),
        ...context.noderegister[dataNode.html].options
      }).$mount();
      content.appendChild(wrapper.$el);
    }
  }

  applyDataBindings(content, dataNode.data);

  node.appendChild(inputs);
  node.appendChild(content);
  node.appendChild(outputs);
  node.style.top = `${dataNode.pos_y}px`;
  node.style.left = `${dataNode.pos_x}px`;
  parent.appendChild(node);
  context.precanvas!.appendChild(parent);

  Object.entries(dataNode.inputs).forEach(([inputClass, portData]) => {
    const existingSignal = portData.connections.find((connection) => typeof connection.signal === 'string' && connection.signal.trim() !== '');
    const name = typeof existingSignal?.signal === 'string' && existingSignal.signal.trim() !== '' ? existingSignal.signal.trim() : null;
    if (name) {
      setPortWirelessName(context, { nodeId: dataNode.id.toString(), portClass: inputClass, type: 'input' }, name);
    }
  });

  Object.entries(dataNode.outputs).forEach(([outputClass, portData]) => {
    const existingSignal = portData.connections.find((connection) => typeof connection.signal === 'string' && connection.signal.trim() !== '');
    const name = typeof existingSignal?.signal === 'string' && existingSignal.signal.trim() !== '' ? existingSignal.signal.trim() : null;
    if (name) {
      setPortWirelessName(context, { nodeId: dataNode.id.toString(), portClass: outputClass, type: 'output' }, name);
    }
  });
}

function applyDataBindings(content: HTMLElement, data: Record<string, any>): void {
  const insertObjectkeys = (object: any, name: string, completname: string): void => {
    const current = object === null ? data[name] : object[name];
    if (current !== null && current !== undefined) {
      Object.entries(current).forEach(([key, value]) => {
        if (typeof value === 'object') {
          insertObjectkeys(current, key, `${completname}-${key}`);
        } else {
          const elems = content.querySelectorAll<HTMLInputElement | HTMLElement>(`[df-${completname}-${key}]`);
          elems.forEach((elem) => {
            (elem as HTMLInputElement).value = value as any;
            if ((elem as HTMLElement).isContentEditable) {
              (elem as HTMLElement).innerText = value as any;
            }
          });
        }
      });
    }
  };

  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object') {
      insertObjectkeys(null, key, key);
    } else {
      const elems = content.querySelectorAll<HTMLInputElement | HTMLElement>(`[df-${key}]`);
      elems.forEach((elem) => {
        (elem as HTMLInputElement).value = value as any;
        if ((elem as HTMLElement).isContentEditable) {
          (elem as HTMLElement).innerText = value as any;
        }
      });
    }
  });
}

export function updateNodeValue(context: Drawflow, event: Event): void {
  const target = event.target as HTMLElement & { value?: any };
  if (!target) {
    return;
  }
  const attr = target.attributes;
  for (let i = 0; i < attr.length; i += 1) {
    if (attr[i].nodeName.startsWith('df-')) {
      const keys = attr[i].nodeName.slice(3).split('-');
      const nodeId = target.closest('.drawflow_content_node')!.parentElement!.id.slice(5);
      let dataTarget = context.drawflow.drawflow[context.module].data[nodeId].data;
      for (let index = 0; index < keys.length - 1; index += 1) {
        if (dataTarget[keys[index]] == null) {
          dataTarget[keys[index]] = {};
        }
        dataTarget = dataTarget[keys[index]];
      }
      const lastKey = keys[keys.length - 1];
      dataTarget[lastKey] = target.isContentEditable ? target.innerText : (target as any).value;
      context.dispatch('nodeDataChanged', nodeId);
    }
  }
}

export function updateNodeDataFromId(context: Drawflow, id: string, data: Record<string, any>): void {
  const moduleName = context.getModuleFromNodeId(id);
  context.drawflow.drawflow[moduleName!].data[id].data = data;
  if (context.module === moduleName) {
    const content = context.container.querySelector(`#node-${id}`)!;
    applyDataBindings(content.querySelector('.drawflow_content_node') as HTMLElement, data);
  }
}

export function addNodeInput(context: Drawflow, id: string): void {
  const moduleName = context.getModuleFromNodeId(id);
  const infoNode = context.getNodeFromId(id)!;
  const numInputs = Object.keys(infoNode.inputs).length;
  if (context.module === moduleName) {
    const input = document.createElement('div');
    input.classList.add('input');
    input.classList.add(`input_${numInputs + 1}`);
    const parent = context.container.querySelector(`#node-${id} .inputs`)!;
    parent.appendChild(input);
    context.updateConnectionNodes(`node-${id}`);
  }
  context.drawflow.drawflow[moduleName!].data[id].inputs[`input_${numInputs + 1}`] = { connections: [] };
}

export function addNodeOutput(context: Drawflow, id: string): void {
  const moduleName = context.getModuleFromNodeId(id);
  const infoNode = context.getNodeFromId(id);
  const numOutputs = Object.keys(infoNode.outputs).length;
  if (context.module === moduleName) {
    const output = document.createElement('div');
    output.classList.add('output');
    output.classList.add(`output_${numOutputs + 1}`);
    const parent = context.container.querySelector(`#node-${id} .outputs`)!;
    parent.appendChild(output);
    context.updateConnectionNodes(`node-${id}`);
  }
  context.drawflow.drawflow[moduleName!].data[id].outputs[`output_${numOutputs + 1}`] = { connections: [] };
}

export function removeNodeInput(context: Drawflow, id: string, input_class: string): void {
  const moduleName = context.getModuleFromNodeId(id);
  const infoNode = context.getNodeFromId(id)!;
  if (context.module === moduleName) {
    context.container.querySelector(`#node-${id} .inputs .input.${input_class}`)?.remove();
  }
  const removeInputs: Array<{ id_output: string; id: string; output_class: string; input_class: string }> = [];
  infoNode.inputs[input_class].connections.forEach((connection) => {
    removeInputs.push({
      id_output: connection.node,
      id,
      output_class: connection.input,
      input_class
    });
  });
  removeInputs.forEach((item) => {
    context.removeSingleConnection(item.id_output, item.id, item.output_class, item.input_class);
  });

  delete context.drawflow.drawflow[moduleName!].data[id].inputs[input_class];

  const connections = Object.values(context.drawflow.drawflow[moduleName!].data[id].inputs);
  context.drawflow.drawflow[moduleName!].data[id].inputs = {} as any;
  const input_class_id = parseInt(input_class.slice(6), 10);
  let nodeUpdates: any[] = [];
  connections.forEach((item, index) => {
    item.connections.forEach((conn) => {
      nodeUpdates.push(conn);
    });
    context.drawflow.drawflow[moduleName!].data[id].inputs[`input_${index + 1}`] = item;
  });
  nodeUpdates = Array.from(new Set(nodeUpdates.map((e) => JSON.stringify(e)))).map((e) => JSON.parse(e));

  if (context.module === moduleName) {
    const eles = context.container.querySelectorAll(`#node-${id} .inputs .input`);
    eles.forEach((item) => {
      const inputClassName = findClassWithPrefix(item.classList, 'input_');
      if (!inputClassName) {
        return;
      }
      const id_class = parseInt(inputClassName.slice(6), 10);
      if (input_class_id < id_class) {
        item.classList.remove(`input_${id_class}`);
        item.classList.add(`input_${id_class - 1}`);
      }
    });
  }

  nodeUpdates.forEach((itemx) => {
    context.drawflow.drawflow[moduleName!].data[itemx.node].outputs[itemx.input].connections.forEach((itemz: any, index: number) => {
      if (itemz.node === id) {
        const output_id = parseInt(itemz.output.slice(6), 10);
        if (input_class_id < output_id) {
          if (context.module === moduleName) {
            const ele = context.container.querySelector(`.connection.node_in_node-${id}.node_out_node-${itemx.node}.${itemx.input}.input_${output_id}`);
            ele?.classList.remove(`input_${output_id}`);
            ele?.classList.add(`input_${output_id - 1}`);
          }
          if (itemz.points) {
            context.drawflow.drawflow[moduleName!].data[itemx.node].outputs[itemx.input].connections[index] = {
              node: itemz.node,
              output: `input_${output_id - 1}`,
              points: itemz.points
            };
          } else {
            context.drawflow.drawflow[moduleName!].data[itemx.node].outputs[itemx.input].connections[index] = {
              node: itemz.node,
              output: `input_${output_id - 1}`
            };
          }
        }
      }
    });
  });
  context.updateConnectionNodes(`node-${id}`);
}

export function removeNodeOutput(context: Drawflow, id: string, output_class: string): void {
  const moduleName = context.getModuleFromNodeId(id);
  const infoNode = context.getNodeFromId(id)!;
  if (context.module === moduleName) {
    context.container.querySelector(`#node-${id} .outputs .output.${output_class}`)?.remove();
  }
  const removeOutputs: Array<{ id: string; id_input: string; output_class: string; input_class: string }> = [];
  infoNode.outputs[output_class].connections.forEach((connection) => {
    removeOutputs.push({
      id,
      id_input: connection.node,
      output_class,
      input_class: connection.output
    });
  });
  removeOutputs.forEach((item) => {
    context.removeSingleConnection(item.id, item.id_input, item.output_class, item.input_class);
  });

  delete context.drawflow.drawflow[moduleName!].data[id].outputs[output_class];

  const connections = Object.values(context.drawflow.drawflow[moduleName!].data[id].outputs);
  context.drawflow.drawflow[moduleName!].data[id].outputs = {} as any;
  const output_class_id = parseInt(output_class.slice(7), 10);
  let nodeUpdates: any[] = [];
  connections.forEach((item, index) => {
    item.connections.forEach((conn) => {
      nodeUpdates.push({ node: conn.node, output: conn.output });
    });
    context.drawflow.drawflow[moduleName!].data[id].outputs[`output_${index + 1}`] = item;
  });
  nodeUpdates = Array.from(new Set(nodeUpdates.map((e) => JSON.stringify(e)))).map((e) => JSON.parse(e));

  if (context.module === moduleName) {
    const eles = context.container.querySelectorAll(`#node-${id} .outputs .output`);
    eles.forEach((item) => {
      const outputClassName = findClassWithPrefix(item.classList, 'output_');
      if (!outputClassName) {
        return;
      }
      const id_class = parseInt(outputClassName.slice(7), 10);
      if (output_class_id < id_class) {
        item.classList.remove(`output_${id_class}`);
        item.classList.add(`output_${id_class - 1}`);
      }
    });
  }

  nodeUpdates.forEach((itemx) => {
    context.drawflow.drawflow[moduleName!].data[itemx.node].inputs[itemx.output].connections.forEach((itemz: any, index: number) => {
      if (itemz.node === id) {
        const input_id = parseInt(itemz.input.slice(7), 10);
        if (output_class_id < input_id) {
          if (context.module === moduleName) {
            const ele = context.container.querySelector(`.connection.node_in_node-${itemx.node}.node_out_node-${id}.output_${input_id}.${itemx.output}`);
            ele?.classList.remove(`output_${input_id}`);
            ele?.classList.add(`output_${input_id - 1}`);
          }
          if (itemz.points) {
            context.drawflow.drawflow[moduleName!].data[itemx.node].inputs[itemx.output].connections[index] = {
              node: itemz.node,
              input: `output_${input_id - 1}`,
              points: itemz.points
            };
          } else {
            context.drawflow.drawflow[moduleName!].data[itemx.node].inputs[itemx.output].connections[index] = {
              node: itemz.node,
              input: `output_${input_id - 1}`
            };
          }
        }
      }
    });
  });

  context.updateConnectionNodes(`node-${id}`);
}

export function removeNodeId(context: Drawflow, id: string): void {
  context.removeConnectionNodeId(id.slice(5));
  const moduleName = context.getModuleFromNodeId(id.slice(5));
  if (context.module === moduleName) {
    context.container.querySelector(`#${id}`)?.remove();
  }
  delete context.drawflow.drawflow[moduleName!].data[id.slice(5)];
  context.dispatch('nodeRemoved', id.slice(5));
}
