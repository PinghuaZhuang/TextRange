/**
 * 判断是否是文本节点
 */
export function isTextNode(node: Node): node is Text {
  return node.nodeType === 3;
}

export function isCommentNode(node: Node): node is Comment {
  return node.nodeType === 8;
}

export function isPlainNode(node: Node) {
  return isTextNode(node) || isCommentNode(node);
}

/**
 * 判断是否是非空文本节点
 */
export function isPlainTextNode(node: Node): node is Text {
  return isTextNode(node) && !!(node as Text).textContent?.length;
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
  return Array.from(range.getClientRects()).filter(
    (o) => o.width !== 0 && o.height !== 0,
  );
}

/**
 * 获取 Range 内的文本
 */
export function getStartAndEndRangeText(range: Range) {
  const { startContainer, endContainer, startOffset, endOffset } = range;
  let startText = '';
  let endText = '';

  if (isSingle(range)) {
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

/**
 * 获取 Range 内的所有非空文本节点
 */
export function* nodeRangeIterator(range: Range) {
  const { startContainer, endContainer, startOffset, endOffset } = range;
  const start = getRangeFrontierTextNode(startContainer, startOffset);
  const end = getRangeFrontierTextNode(endContainer, endOffset);
  if (isSingle(range)) {
    if (isPlainTextNode(start)) {
      yield start;
    }
    return;
  }
  const iterator = nodeAfterIterator(start);
  let nextNode = iterator.next().value; // start
  while (nextNode && nextNode !== end) {
    if (isPlainTextNode(nextNode)) {
      yield nextNode;
    }
    nextNode = iterator.next().value;
  }
  if (nextNode && isPlainTextNode(nextNode)) {
    yield nextNode; // end
  }
}

/**
 * 判断选中文本是否只有一个节点
 */
export function isSingle(range: Range) {
  const { startContainer, endContainer } = range;
  return startContainer === endContainer;
}

/**
 * 判断2个DOMRect是否垂直允许合并
 */
export function isAdjacentV(left: DOMRect, right: DOMRect) {
  // 由于line-height, 这里有一些误差
  return left.width === right.width && Math.abs(left.bottom - right.top) < 1;
}
/**
 * 判断2个DOMRect是否水平方向允许合并
 */
export function isAdjacentH(left: DOMRect, right: DOMRect) {
  return left.right === right.left;
}

/**
 * 获取开始和结束的文本节点
 * 节点类型是 Text、Comment 或 CDATASection(xml)之一
 * HTML中没有 CDATASection
 * @param target range.startContainer || range.endContainer
 */
export function getRangeFrontierTextNode(
  target: Text | Node,
  offset: number,
): Text | Comment {
  return isTextNode(target) || isCommentNode(target)
    ? (target as Comment)
    : getRangeFrontierTextNode(target.childNodes[offset], 0);
}

export function findRectIncludePoint(
  rects: DOMRect[],
  point: { x: number; y: number },
  expand: [number, number] | number = 0,
) {
  let expandX: number;
  let expandY: number;
  if (typeof expand === 'number') {
    expandX = expandY = expand;
  } else {
    [expandX, expandY] = expand;
  }
  let result: DOMRect | undefined;
  rects.forEach((rect) => {
    if (rect.x - expandX > point.x || rect.y - expandY > point.y) return;
    if (rect.right + expandX < point.x || rect.bottom + expandY < point.y)
      return;
    result = rect;
  });
  return result;
}
