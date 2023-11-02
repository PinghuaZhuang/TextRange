/**
 * 判断是否是文本节点
 */
export function isTextNode(node: Node): node is Text {
  return node.nodeType === 3;
}

/**
 * 判断是否是非空文本节点
 */
export function isPlainTextNode(node: Node): node is Text {
  return node.nodeType === 3 && !!(node as Text).wholeText.length;
}

/**
 * 判断==是否选中了文本
 */
export function isValidRange(selection: Selection) {
  if (selection.isCollapsed || selection.getRangeAt(0).collapsed) return false;
  return true;
}

/**
 * 获取某个字符的 DOMRect
 */
export function getCharRect(node: Text, offset: number) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.setEnd(
    node,
    offset + 1 > node.textContent!.length ? offset : offset + 1,
  );
  return range.getBoundingClientRect();
}

/**
 * 获取节点的区间内所有元素的 DOMRect
 * 文本节点换行后会被切分多个 DOMRect
 */
export function getTextNodeRects(
  node: Node,
  startOffset?: number,
  endOffset?: number,
) {
  if (startOffset === undefined) startOffset = 0;
  if (endOffset === undefined) endOffset = node.textContent!.length;

  const range = document.createRange();
  range.setStart(node, startOffset);
  range.setEnd(node, endOffset);
  return Array.from(range.getClientRects());
}

/**
 * 获取 Range 内的文本
 */
export function getStartAndEndRangeText(range: Range) {
  const { startContainer, endContainer, startOffset, endOffset } = range;
  let startText = '';
  let endText = '';

  if (range.collapsed) {
    startText = endText = sliceText(startContainer, startOffset, endOffset);
  } else {
    startText = sliceText(startContainer, startOffset);
    endText = sliceText(endContainer, 0, endOffset);
  }

  return {
    start: startText,
    end: endText,
  };
}

/**
 * 获取节点中某区间的文本
 */
export function sliceText(node: Node, startOffset: number, endOffset?: number) {
  return node.textContent ? node.textContent.slice(startOffset, endOffset) : '';
}

/**
 * 从节点开始, 遍历往后的文本节点
 */
export function* nodeAfterIterator(
  node: Node,
  isGoBack = false,
): Generator<Node, void, Node> {
  yield node;
  if (!isGoBack && node.childNodes.length > 0) {
    yield* nodeAfterIterator(node.childNodes[0], false);
  } else if (node.nextSibling) {
    yield* nodeAfterIterator(node.nextSibling, false);
  } else if (node.parentNode) {
    yield* nodeAfterIterator(node.parentNode, true);
  }
}
