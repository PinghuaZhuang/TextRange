import {
  isTextNode,
  isPlainTextNode,
  nodeRangeIterator,
  getTextNodeRects,
  isSingle,
  getStartAndEndRangeText,
  compareBoundaryRects,
} from './utils';

interface RangeNodeData {
  path: Path;
  offset: number;
  text: string;
}

interface RangeData {
  id: string | number;
  text: string;
  start: RangeNodeData;
  end: RangeNodeData;
}

interface TextRangeOptions {
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
 * @example body > div(0) + div(1) > span > text(0) + text(1)
 *  对于 text(2) 的path为 [1, 0, 1]
 *  [(body > div + div), (div(1) > span), (span > text(0) + text(1))]
 */
type Path = number[];

type ID = string | number;

let id = 0;

class TextRange {
  // rects: DOMRect[] = [];
  root!: Element;
  range!: Range;
  id!: ID;
  options!: TextRangeOptions;
  /**
   * 是否裁剪过文本节点
   * @default false
   */
  split = false;

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

  get text() {
    return this.range.toString();
  }

  get textNodes() {
    return [...this];
  }

  get trimTextNode() {
    const textNodes = this.textNodes;
    textNodes.shift();
    textNodes.pop();
    return textNodes;
  }

  get rect() {
    return this.range.getBoundingClientRect();
  }

  /**
   * 获取所有元素的 DOMRect
   */
  get rects() {
    if (this.isEmpty) return [];
    const rects: DOMRect[] = [];
    const { startContainer, startOffset, endContainer, endOffset } = this.range;
    if (this.single) {
      rects.push(...getTextNodeRects(startContainer, startOffset, endOffset));
      return rects;
    }
    rects.push(...getTextNodeRects(startContainer, startOffset));
    for (const textNode of this.trimTextNode) {
      rects.push(...getTextNodeRects(textNode));
    }
    rects.push(...getTextNodeRects(endContainer, 0, endOffset));
    return rects;
  }

  /**
   * 水平方向相邻的 DOMRect 合并
   */
  get mergeRects() {
    const { rects } = this;
    const mergeRects: DOMRect[] = [];
    let rect: DOMRect = rects[0];
    rects.reduce((pre, cur) => {
      if (compareBoundaryRects(pre, cur)) {
        rect.width += cur.width;
        rect.height = Math.max(rect.height, cur.height);
        rect.y = Math.min(rect.y, cur.y);
      } else {
        mergeRects.push(rect);
        rect = cur;
      }
      return pre;
    }, rect);
    return mergeRects;
  }

  get data(): RangeData {
    const { startContainer, endContainer, startOffset, endOffset } = this.range;
    const { start, end } = getStartAndEndRangeText(this.range);
    return {
      id: this.id,
      text: this.range.toString(),
      start: {
        path: TextRange.getPath(startContainer, this.root),
        offset: startOffset,
        text: start,
      },
      end: {
        path: TextRange.getPath(endContainer, this.root),
        offset: endOffset,
        text: end,
      },
    };
  }

  /**
   * 替换文本节点
   */
  replace(render: (textNode: Text) => Node | Element) {
    if (!this.options.splitText) this.splitText();
    const { textNodes } = this;
    textNodes.forEach((o) => {
      const { parentNode, nextSibling } = o;
      if (parentNode == null) return;
      const newNode = render(o);
      if (nextSibling) {
        parentNode.insertBefore(newNode, nextSibling);
      } else {
        parentNode.appendChild(newNode);
      }
    });
  }

  get isEmpty() {
    return this.range.collapsed;
  }

  /**
   * 裁剪开始节点和结束节点
   */
  splitText() {
    this.split = true;
    const { startContainer, startOffset, endContainer, endOffset } = this.range;
    if (this.single) {
      if (isTextNode(startContainer) && startOffset !== endOffset) {
        startContainer.splitText(startOffset);
        startContainer.splitText(endOffset);
      }
      return;
    }
    if (isTextNode(startContainer)) {
      startContainer.splitText(startOffset);
      this.range.setStart(startContainer.nextSibling!, 0);
    }
    if (isTextNode(endContainer)) {
      endContainer.splitText(endOffset);
    }
  }

  /**
   * 包含改节点 && 改节点是文本节点
   */
  isValidTextNode(node: Node): node is Text {
    return (
      this.range.commonAncestorContainer.contains(node) && isPlainTextNode(node)
    );
  }

  static generateId() {
    return id++;
  }

  /**
   * 根据配置创建 TextRange
   */
  static create(config: RangeData, root?: Element): TextRange {
    const range = this.createRange(config, root);
    return new TextRange({ id, range, container: root });
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
  static getPath(textNode: Node, root: Element): Path {
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
      throw new Error('The text node must be in the root container.');
    }

    return path;
  }

  /**
   * 根据 path 获取指定节点
   */
  static getNodeByPath(path: number[], root: Element) {
    let node: Node | Element = root;
    path.reduce<typeof node>((_node, index, i) => {
      if (node == null) return node;
      const isLast = i === path.length - 1;
      const childs = isLast ? _node.childNodes : (_node as Element).children;
      if (childs[index]) {
        node = childs[index];
      }
      return node;
    }, node);
    return node;
  }
}

export default TextRange;
