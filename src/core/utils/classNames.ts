export const ensureNodeDomId = (nodeId: string): string => (nodeId.startsWith('node-') ? nodeId : `node-${nodeId}`);

export const stripClassPrefix = (className: string, prefix: string): string =>
  (className.startsWith(prefix) ? className.slice(prefix.length) : className);

export const findClassWithPrefix = (classList: DOMTokenList, prefix: string): string | undefined =>
  Array.from(classList).find((className) => className.startsWith(prefix));

export interface ConnectionClassInfo {
  outputNodeId: string;
  inputNodeId: string;
  outputNodeDomId: string;
  inputNodeDomId: string;
  outputPortClass: string;
  inputPortClass: string;
}

export const extractConnectionClassInfo = (classList: DOMTokenList): ConnectionClassInfo | null => {
  const outputNodeClass = findClassWithPrefix(classList, 'node_out_');
  const inputNodeClass = findClassWithPrefix(classList, 'node_in_');
  const outputPortClass = findClassWithPrefix(classList, 'output_');
  const inputPortClass = findClassWithPrefix(classList, 'input_');

  if (!outputNodeClass || !inputNodeClass || !outputPortClass || !inputPortClass) {
    return null;
  }

  const outputNodeDomId = ensureNodeDomId(stripClassPrefix(outputNodeClass, 'node_out_'));
  const inputNodeDomId = ensureNodeDomId(stripClassPrefix(inputNodeClass, 'node_in_'));

  return {
    outputNodeDomId,
    inputNodeDomId,
    outputNodeId: outputNodeDomId.slice(5),
    inputNodeId: inputNodeDomId.slice(5),
    outputPortClass,
    inputPortClass,
  };
};
