import type Drawflow from './Drawflow';
import type { DrawflowData } from './types';
import { refreshWirelessPorts } from './wireless';

export function exportData(context: Drawflow): DrawflowData {
  const dataExport = JSON.parse(JSON.stringify(context.drawflow));
  context.dispatch('export', dataExport);
  return dataExport;
}

function repairAsymmetricConnections(context: Drawflow): void {
  const modules = context.drawflow.drawflow;
  for (const moduleName of Object.keys(modules)) {
    const data = modules[moduleName].data;
    for (const nodeId of Object.keys(data)) {
      const node = data[nodeId];
      for (const outClass of Object.keys(node.outputs || {})) {
        const conns = node.outputs[outClass].connections;
        for (let i = conns.length - 1; i >= 0; i -= 1) {
          const c = conns[i];
          const targetInputs = data[c.node]?.inputs?.[c.output]?.connections;
          if (!targetInputs || !targetInputs.find((tc) => tc.node === nodeId && tc.input === outClass)) {
            console.warn(`[drawflow] dropping orphaned source-side record ${nodeId}.${outClass} -> ${c.node}.${c.output}`);
            conns.splice(i, 1);
          }
        }
      }
      for (const inClass of Object.keys(node.inputs || {})) {
        const conns = node.inputs[inClass].connections;
        for (let i = conns.length - 1; i >= 0; i -= 1) {
          const c = conns[i];
          const sourceOutputs = data[c.node]?.outputs?.[c.input]?.connections;
          if (!sourceOutputs || !sourceOutputs.find((sc) => sc.node === nodeId && sc.output === inClass)) {
            console.warn(`[drawflow] dropping orphaned target-side record ${nodeId}.${inClass} <- ${c.node}.${c.input}`);
            conns.splice(i, 1);
          }
        }
      }
    }
  }
}

export function importData(context: Drawflow, data: DrawflowData, notify = true): void {
  context.clear();
  context.drawflow = JSON.parse(JSON.stringify(data));
  repairAsymmetricConnections(context);
  context.load();
  refreshWirelessPorts(context);
  if (notify) {
    context.dispatch('import', 'import');
  }
}
