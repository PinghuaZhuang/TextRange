# TextRange

[![publish](https://github.com/PinghuaZhuang/TextRange/actions/workflows/publish.yml/badge.svg)](https://github.com/PinghuaZhuang/TextRange/actions/workflows/publish.yml) [![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/PinghuaZhuang/TextRange/blob/master/LICENSE) [![Commit](https://img.shields.io/github/last-commit/pinghuazhuang/TextRange.svg)](https://github.com/PinghuaZhuang/TextRange/commits/master) [![Verison](https://img.shields.io/npm/v/TextRange.svg)](https://www.npmjs.com/package/TextRange)

管理 [Range](https://developer.mozilla.org/zh-CN/docs/Web/API/Range) 的工具. 支持导入/导出. 可用于页面批注.

## 安装

```bash
pnpm add text-range
```

## Example

访问 [Live Demo](https://pinghuazhuang.github.io/comments/text-range/) 或者克隆项目, 并执行:

```bash
pnpm install
pnpm dev
```

## 使用

```ts
// 用户选中文本后
// 未选中文本会抛出异常
new TextRange(/** options */);

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
```

### 类型

```ts
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

/**
 * 距离根元素的距离
 * @example body > div(0) + div(1) > span > text(0) + text(1)
 *  对于 text(2) 的path为 [1, 0, 1]
 *  [(body > div + div), (div(1) > span), (span > text(0) + text(1))]
 */
type Path = number[];
```

### 导出

```ts
const r = new TextRange();
const data: RangeData = r.data;
```

### 导入

```ts
TextRange.create(data as RangeData); // => TextRange
```

### 高亮选中文本

```ts
import TextRange from 'text-range';

document.addEventListener('mouseup', function (e) {
  if (getSelection().isCollapsed) return;
  const r = new TextRange();
  r.replace((textNode) => {
    const nrmark = document.createElement('nrmark');
    nrmark.appendChild(textNode);
    return nrmark;
  });
});
```

## 属性.

+ root: Element. /** @default: document.body  */ 计算路径的根元素, 不传默认为 `body`.
+ range: Range. 不传默认取 `getSelection().getRangeAt(0)`.
+ split: boolean; /** @default: false  */  `Range` 首尾文本节点是否根据索引裁剪. 执行 `replace` 方法时, 会执行. 
+ single: boolean; `Range` 首尾节点是否是同一个. 
+ text: string; `Range.toString()`.
+ textNodes: Text[]; 返回所有的非空文本节点. 
+ trimTextNode: Text[]; 返回除掉首尾的所有非空文本节点. 
+ rect: DOMRect; `range.getBoundingClientRect()`.
+ rects: DOMRect[]; `range.getClientRects()` 所有元素的非空 DOMRect.
+ mergeRects: DOMRect[]; 合并 `rects` 使相邻的 `rect` 高度一致. 
+ data: RangeData; 记录 `range` 的数据. 
+ isEmpty: boolean; `range` 是否为空. 

## 方法

+ replace: (render: (textNode: Text) => Node | Element) => void; 
  + 替换文本节点为新的节点. 
  + 会执行 `splitText` 方法. 
+ splitText: () => void;
  + 根据 `startOffset` `endOffset` 裁剪掉首尾的文本节点. 

## 静态方法

+ create: (config: RangeData, root?: Element) => TextRange;
  + 根据数据创建 `TextRange`.
+ createRange: (config: RangeData, root?: Element) => Range.
  + 根据数据创建 `Range`.
+ getPath: (textNode: Node, root: Element) => Path;
  + 生成节点的路径.
+ getNodeByPath(path: number[], root: Element) => void;
  + 根据路径, 获取对应的节点. 

