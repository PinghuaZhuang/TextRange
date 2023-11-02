import { isPlainTextNode, nodeAfterIterator } from './utils';
// import invariant from 'invariant';

interface RangeData {
  id: string | number;
  text: string;
  start: {
    path: [number, number];
    offset: number;
  };
}
/**
 * 距离根元素的距离
 * @example body > div(0) + div(1) > span > text(0) + text(1)
 *  对于 text(2) 的path为 [1, 0, 1]
 *  [(body > div + div), (div(1) > span), (span > text(0) + text(1))]
 */
type Path = number[];

let id = 0;

class TextRange {
  rects: DOMRect[] = [];
  root!: HTMLElement;
  range!: Range;
  id = TextRange.generateId();

  constructor(container?: HTMLElement | Range, range?: Range) {
    const hasContainer = container instanceof HTMLElement;
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
  }

  *[Symbol.iterator]() {
    const { startContainer, endContainer } = this.range;
    if (startContainer === endContainer) {
      if (isPlainTextNode(startContainer)) {
        yield startContainer;
      }
      return;
    }
    const iterator = nodeAfterIterator(startContainer);
    let nextNode = iterator.next().value; // startContainer
    while (nextNode && nextNode !== endContainer) {
      if (isPlainTextNode(nextNode)) {
        yield nextNode;
      }
      nextNode = iterator.next().value;
    }
    if (nextNode && isPlainTextNode(nextNode)) {
      yield nextNode; // endContainer
    }
  }

  get textNodes() {
    return [...this];
  }

  private getPath(textNode: Text): Path {
    let parentElement = textNode.parentElement!;
    const path = [
      0,
      Array.from(parentElement.childNodes).findIndex((o) => textNode === o),
    ];
    let cur: Element = parentElement!;
    parentElement = parentElement.parentElement!;

    while (parentElement) {
      if (cur === parentElement.firstElementChild) {
        if (parentElement === this.root) {
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
   * 替换文本节点
   */
  replace() {}

  each() {}

  createRects() {}

  mergeRects() {}

  /**
   * 包含改节点 && 改节点是文本节点
   */
  isValidTextNode(node: Node): node is Text {
    return this.root.contains(node) && isPlainTextNode(node);
  }

  static createRange() {}
  static getNodeByPath(path: [number, number]) {}

  static generateId() {
    return id++;
  }
}

export default TextRange;
