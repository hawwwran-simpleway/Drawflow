import type Drawflow from './Drawflow';
import type { DrawflowData } from './types';

export function exportData(context: Drawflow): DrawflowData {
  const dataExport = JSON.parse(JSON.stringify(context.drawflow));
  context.dispatch('export', dataExport);
  return dataExport;
}

export function importData(context: Drawflow, data: DrawflowData, notify = true): void {
  context.clear();
  context.drawflow = JSON.parse(JSON.stringify(data));
  context.load();
  if (notify) {
    context.dispatch('import', 'import');
  }
}
