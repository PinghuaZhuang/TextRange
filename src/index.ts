import {
  isTextNode,
  nodeRangeIterator,
  getTextNodeRects,
  isSingle,
  getStartAndEndRangeText,
  isAdjacentV,
  isAdjacentH,
  getRangeFrontierTextNode,
  isPlainTextNode,
  findRectIncludePoint,
} from './utils';

export interface RangeNodeData {
  path: Path;
  offset: number;
  text: string;
}

export interface RangeData {
  id: string | number;
  start: RangeNodeData;
  end: RangeNodeData;
}

export interface TextRangeOptions {
  container?: Element;
  range?: Range;
  id?: string | number;
  /**
   * 是否裁剪开始和结束的文本节点
   * @default false
   */
  splitText?: boolean;
}

/**
 * 距离根元素的距离
 * path 最后数值代表 Node 的索引, 其他则是元素 Element 的索引.
 * @example body > div(0) + div(1) > span > text(0) + text(1)
 *  对于 text(2) 的path为 [1, 0, 1]
 *  [(body > div + div), (div(1) > span), (span > text(0) + text(1))]
 */
export type Path = number[];

export type ID = string | number;

class TextRange {
  /**
   * @default document.body
   */
  root!: Element;
  range!: Range;
  id!: ID;
  options!: TextRangeOptions;
  /**
   * 是否裁剪过文本节点
   * @default false
   */
  split = false;
  data!: RangeData;

  constructor(options: TextRangeOptions = {}) {
    const { container, range, id, splitText = false } = options;
    this.options = options;
    this.root = container ?? document.body;
    let selection: Selection | null;
    const _range =
      range ??
      ((selection = getSelection())?.isCollapsed
        ? undefined
        : selection!.getRangeAt(0));
    if (_range == null) {
      throw new Error('range parameter is reqired.');
    }
    this.range = _range;
    this.id = id ?? TextRange.generateId();
    this.data = this.export();
    splitText && this.splitText();
    if (this.isEmpty) {
      console.warn(`ID: ${this.id}, No text selected.`);
    }
  }

  *[Symbol.iterator]() {
    yield* nodeRangeIterator(this.range);
  }

  get single() {
    return isSingle(this.range);
  }

  get commonAncestorElement() {
    const container = this.range.commonAncestorContainer;
    return container instanceof Element ? container! : container.parentElement!;
  }

  get isEmpty() {
    return this.range.collapsed;
  }

  text() {
    return this.range.toString();
  }

  textNodes(): Text[] {
    return [...this];
  }

  trimTextNodes() {
    const textNodes = this.textNodes();
    textNodes.shift();
    textNodes.pop();
    return textNodes;
  }

  rect() {
    return this.range.getBoundingClientRect();
  }

  /**
   * 获取所有元素的 DOMRect
   */
  rects() {
    if (this.isEmpty) return [];
    const rects: DOMRect[] = [];
    const [startTextNode, startOffset] = this.getStart();
    const [endTextNode, endOffset] = this.getEnd();
    const trimTextNodes = this.trimTextNodes();
    if (this.single) {
      rects.push(...getTextNodeRects(startTextNode, startOffset, endOffset));
      return rects;
    }
    rects.push(...getTextNodeRects(startTextNode, startOffset));
    for (const textNode of trimTextNodes) {
      rects.push(...getTextNodeRects(textNode));
    }
    rects.push(...getTextNodeRects(endTextNode, 0, endOffset));
    return rects;
  }

  /**
   * 水平方向相邻的 DOMRect 合并
   */
  mergeRects(v?: boolean) {
    const rects = this.rects();
    if (!rects.length) return [];
    let rect = rects[0];
    const mergeRects: DOMRect[] = [rect];
    rects.reduce((pre, cur) => {
      if (isAdjacentH(pre, cur)) {
        pre.width += cur.width;
        pre.height = Math.max(pre.height, cur.height);
        pre.y = Math.min(pre.y, cur.y);
        return pre;
      }
      if (v && isAdjacentV(pre, cur)) {
        pre.height += Math.floor(cur.height);
        return pre;
      }
      mergeRects.push(cur);
      return cur;
    });
    return mergeRects;
  }

  getStart() {
    const { startContainer, startOffset } = this.range;
    const node = getRangeFrontierTextNode(startContainer, startOffset);
    const changed = this.split || startContainer !== node;
    if (changed) {
      this.range.setStart(node, 0);
    }
    return [node, startContainer !== node ? 0 : startOffset] as [
      Node | Comment,
      number,
    ];
  }

  getEnd() {
    const { endContainer, endOffset } = this.range;
    const node = getRangeFrontierTextNode(endContainer, endOffset);
    const changed = this.split || endContainer !== node;
    let offset = isPlainTextNode(node) ? node.textContent!.length : 0;
    if (changed) {
      this.range.setEnd(node, offset);
    }
    return [node, changed ? offset : endOffset] as [Node | Comment, number];
  }

  /**
   * 导出数据
   */
  export(): RangeData {
    if (this.split) {
      console.warn(`Exporting data must come before cropping.`);
    }
    const { start, end } = getStartAndEndRangeText(this.range);
    const [startTextNode, startOffset] = this.getStart();
    const [endTextNode, endOffset] = this.getEnd();

    return {
      id: this.id,
      start: {
        path: TextRange.getPath(startTextNode, this.root),
        offset: startOffset,
        text: start,
      },
      end: {
        path: TextRange.getPath(endTextNode, this.root),
        offset: endOffset,
        text: end,
      },
    };
  }

  /**
   * 替换文本节点
   * 替换成新的节点后, range会发生变化
   */
  replace(render: (textNode: Text) => Node | Element | void) {
    if (!this.options.splitText) this.splitText();
    const textNodes = this.textNodes();
    textNodes.forEach((o) => {
      const { parentNode, nextSibling } = o;
      if (parentNode == null) return;
      const newNode = render(o);
      if (newNode == null) return;
      if (nextSibling) {
        parentNode.insertBefore(newNode, nextSibling);
      } else {
        parentNode.appendChild(newNode);
      }
    });

    this.update();
  }

  /**
   * 如果是相邻的文本节点则合并到新节点中
   */
  replaceNodes(render: (textNodes: Text[]) => Node | Element | void) {
    if (!this.options.splitText) this.splitText();
    const textNodes = this.textNodes();
    const cns = [[textNodes[0]]];
    textNodes.reduce((pre, cur) => {
      if (pre.nextSibling === cur && cur.textContent?.trim()) {
        cns[cns.length - 1].push(cur);
      } else {
        cur.textContent?.trim() && cns.push([cur]);
      }
      return cur;
    });
    cns.forEach((nodes) => {
      if (!nodes.length) return;
      const { parentNode, nextSibling } = nodes[nodes.length - 1];
      if (parentNode == null) return;
      const newNode = render(nodes);
      if (newNode == null) return;
      if (nextSibling) {
        parentNode.insertBefore(newNode, nextSibling);
      } else {
        parentNode.appendChild(newNode);
      }
      newNode.normalize();
    });
  }

  /**
   * 更新 range
   * 替换节点后会导致 range 发生变化(range.collapsed === true)
   */
  update() {
    this.getStart();
    this.getEnd();
  }

  /**
   * 裁剪开始节点和结束节点
   */
  splitText() {
    this.split = true;
    const { startContainer, startOffset, endContainer, endOffset } = this.range;
    if (this.single) {
      if (isTextNode(startContainer) && startOffset !== endOffset) {
        isTextNode(endContainer) && endContainer.splitText(endOffset);
        startContainer.splitText(startOffset);
        startContainer.nextSibling &&
          this.range.setStart(startContainer.nextSibling, 0);
      }
      return;
    }
    if (isTextNode(startContainer)) {
      startContainer.splitText(startOffset);
      startContainer.nextSibling &&
        this.range.setStart(startContainer.nextSibling, 0);
    }
    if (isTextNode(endContainer)) {
      endContainer.splitText(endOffset);
    }
  }

  /**
   * 判断坐标是否在 Range 内.
   */
  isPointInRange(
    point: { x: number; y: number },
    expand: [number, number] | number = 0,
  ) {
    return !!findRectIncludePoint(this.mergeRects(), point, expand);
  }

  /**
   * 判断 Range 是否在可视区域内
   * @param {number} [threshold] 目标元素与视窗重叠的阈值（0~1）
   */
  isIntersecting(threshold?: number) {
    const { left, top, right, bottom, height, width } = this.rect();
    // 数据有些小偏差, 所以这里最小距离 1px
    const min = 1;
    const minDistanceX =
      threshold == null ? min : Math.max(width * threshold, min);
    const minDistanceY =
      threshold == null ? min : Math.max(height * threshold, min);
    const { clientHeight, clientWidth } = document.body;
    if (right < minDistanceX || left > clientWidth - minDistanceX) return false;
    if (bottom < minDistanceY || top > clientHeight - minDistanceY)
      return false;
    return true;
  }

  static generateId() {
    return String(new Date().getTime());
  }

  /**
   * 根据配置创建 TextRange
   */
  static create(config: RangeData, root?: Element): TextRange {
    const range = TextRange.createRange(config, root);
    return new TextRange({ id: config.id, range, container: root });
  }

  /**
   * 根据配置创建 Range
   */
  static createRange(config: RangeData, root?: Element): Range {
    root = root ?? document.body;
    const range = document.createRange();
    const { start, end } = config;
    range.setStart(this.getNodeByPath(start.path, root), start.offset);
    range.setEnd(this.getNodeByPath(end.path, root), end.offset);
    return range;
  }

  /**
   * 获取指定节点的 path
   * 用户修改文本后尽可能不影响选中的位置
   */
  static getPath(textNode: Node, root: Element = document.body): Path {
    let parentElement = textNode.parentElement!;
    const path = [
      0,
      Array.from(parentElement.childNodes).findIndex((o) => textNode === o),
    ];
    let cur: Element = parentElement!;
    parentElement = parentElement.parentElement!;

    while (parentElement) {
      if (cur === parentElement.firstElementChild) {
        if (parentElement === root) {
          break;
        } else {
          cur = parentElement;
          parentElement = cur.parentElement!;
          path.unshift(0);
        }
      } else {
        cur = cur.previousElementSibling!;
        path[0]++;
      }
    }

    if (parentElement == null) {
      throw new Error('The node must be within the root node.');
    }

    return path;
  }

  /**
   * 根据 path 获取指定节点
   */
  static getNodeByPath(path: number[], root: Element = document.body) {
    let node: Node | Element = root;
    path.reduce<typeof node>((_node, index, i) => {
      if (node == null) return node;
      const isLast = i === path.length - 1;
      const childs = isLast ? _node.childNodes : (_node as Element).children;
      if (childs[index]) {
        node = childs[index];
      } else {
        throw new Error('Path error, node not found.');
      }
      return node;
    }, node);
    return node;
  }
}

export default TextRange;
