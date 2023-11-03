import {
  isPlainTextNode,
  nodeRangeIterator,
  getTextNodeRects,
  isSingle,
  getStartAndEndRangeText,
} from './utils';
// import invariant from 'invariant';

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
  container?: Element | Range;
  range?: Range;
  id?: string | number;
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

  constructor({ container, range, id }: TextRangeOptions = {}) {
    const hasContainer = container instanceof Element;
    this.root = hasContainer ? container : document.body;
    range =
      container instanceof Range
        ? container
        : range ?? getSelection()?.getRangeAt(0);
    // invariant(range, `No text selected`);
    if (range == null || range.collapsed) {
      throw new Error('No text selected');
    }
    this.range = range;
    this.id = id ?? TextRange.generateId();
  }

  *[Symbol.iterator]() {
    yield* nodeRangeIterator(this.range);
  }

  get single() {
    return isSingle(this.range);
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

  // TODO: compareBoundaryPoints
  get mergeRects() {
    const { rects } = this;
    return [];
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
  // TODO:
  replace() {}

  /**
   * 包含改节点 && 改节点是文本节点
   */
  isValidTextNode(node: Node): node is Text {
    return this.root.contains(node) && isPlainTextNode(node);
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
