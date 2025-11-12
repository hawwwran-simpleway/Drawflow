import type Drawflow from './Drawflow';
import type { DrawflowData } from './types';
import { refreshWirelessPorts } from './wireless';

export function exportData(context: Drawflow): DrawflowData {
  const dataExport = JSON.parse(JSON.stringify(context.drawflow));
  context.dispatch('export', dataExport);
  return dataExport;
}

export function importData(context: Drawflow, data: DrawflowData, notify = true): void {
  context.clear();
  context.drawflow = JSON.parse(JSON.stringify(data));
  context.load();
  refreshWirelessPorts(context);
  if (notify) {
    context.dispatch('import', 'import');
  }
}
