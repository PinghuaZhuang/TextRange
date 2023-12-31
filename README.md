# TextRange

[![publish](https://github.com/PinghuaZhuang/TextRange/actions/workflows/publish.yml/badge.svg)](https://github.com/PinghuaZhuang/TextRange/actions/workflows/publish.yml) [![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/PinghuaZhuang/TextRange/blob/master/LICENSE) [![Commit](https://img.shields.io/github/last-commit/pinghuazhuang/TextRange.svg)](https://github.com/PinghuaZhuang/TextRange/commits/master) [![Verison](https://img.shields.io/npm/v/text-range.svg)](https://www.npmjs.com/package/text-range)

管理 [Range](https://developer.mozilla.org/zh-CN/docs/Web/API/Range) 的工具. 支持导入/导出. 可用于页面批注.

![](https://cdn.statically.io/gh/PinghuaZhuang/obsdian-note@images/images/text-range.3n18aedajly0.gif)

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
 *  对于 text(1) 的path为 [1, 0, 1]
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
  getSelection().collapseToStart();
});
```

```css
// css
nrmark {
  background-color: #ffeb3b;
}
```

## 属性

+ root: Element.
  + default: document.body
  + 计算路径的根元素, 不传默认为 `body`.

+ range: Range.
  + 不传默认取 `getSelection().getRangeAt(0)`.

+ split: boolean;
  + default: false;
  + 首尾文本节点是否根据索引裁剪.


+ single: boolean;
  + `range` 首尾节点是否是同一个.
+ data: RangeData;
  + 记录 `range` 的数据.
+ isEmpty: boolean;
  + `range` 是否为空.

## 方法

+ **rects**: () => DOMRect[];
  + `range.getClientRects()` 所有元素的非空 DOMRect.

+ **mergeRects**: () => DOMRect[];
  + 合并 `rects` 使相邻的 `rect` 高度一致.

+ **replace**: (render: (textNode: Text) => Node | Element) => void;
  + 替换文本节点为新的节点.
  + 会执行 `splitText` 方法.
+ **isPointInRange**: (point: { x: number; y: number; }, expand?: number | [number, number]) => boolean;
  + 判断坐标是否在 `Range` 内.
  + expand: `DOMRect` 扩展区域. 默认值: 0.

+ **isIntersecting**: (threshold?: number) => boolean;
  + 判断 `range` 是否在可视区域内.
  + threshold: 目标元素与视窗重叠的阈值（0~1）

+ replaceNodes: (render: (textNodes: Text[]) => Node | Element | void) => void;
  + 如果是相邻的文本节点则合并到新节点中.
  
+ text: () => string;
  + `range.toString()`.

+ textNodes: () => Text[];
  + 返回所有的非空文本节点.

+ trimTextNode: () => Text[];
  + 返回除掉首尾的所有非空文本节点.

+ rect: () => DOMRect;
  + `Range.getBoundingClientRect()`.

+ splitText: () => void;
  + 根据 `startOffset` `endOffset` 裁剪掉首尾的文本节点.
+ export: () => RangeData;
  + 导出数据.
  + ⚠️ 裁剪文本节点(splitText)后, 导出的数据是没办法还原的.
+ update:() => void;
  + 更新 `range`.



## 静态方法

+ **create**: (config: RangeData, root?: Element) => TextRange;
  + 根据数据创建 `TextRange`.
+ createRange: (config: RangeData, root?: Element) => Range.
  + 根据数据创建 `Range`.
+ getPath: (textNode: Node, root: Element) => Path;
  + 生成节点的路径.
+ getNodeByPath(path: number[], root: Element) => void;
  + 根据路径, 获取对应的节点.
