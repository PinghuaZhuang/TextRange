# TextRange

[![publish](https://github.com/PinghuaZhuang/TextRange/actions/workflows/publish.yml/badge.svg)](https://github.com/PinghuaZhuang/TextRange/actions/workflows/publish.yml) [![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/PinghuaZhuang/TextRange/blob/master/LICENSE) [![Commit](https://img.shields.io/github/last-commit/pinghuazhuang/TextRange.svg)](https://github.com/PinghuaZhuang/TextRange/commits/master) [![Verison](https://img.shields.io/npm/v/TextRange.svg)](https://www.npmjs.com/package/TextRange)

管理 [Range](https://developer.mozilla.org/zh-CN/docs/Web/API/Range) 的工具. 支持导入/导出. 可用于页面批注.

## Installation

```bash
pnpm add text-range
```

## Usage

```ts
// 用户选中文本后
// 未选中文本会抛出异常
new TextRange();
```

## Example

访问 [Live Demo](https://pinghuazhuang.github.io/comments/text-range/) 或者克隆项目, 并执行:

```bash
pnpm install
pnpm dev
```
