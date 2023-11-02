import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import _ from 'lodash-es';
import pkg from './package.json' assert { type: 'json' };

export default [
  // CommonJS (for Node) and ES module (for bundlers) build.
  {
    input: 'src/index.ts',
    output: { file: pkg.module, format: 'es', sourcemap: true },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
      }),
    ],
  },
  // browser-friendly UMD build
  // {
  //   input: './es/index.js',
  //   output: {
  //     name: _.camelCase(pkg.name),
  //     file: pkg.browser,
  //     format: 'umd',
  //     sourcemap: true,
  //   },
  //   plugins: [resolve(), babel(), commonjs()],
  // },
  {
    input: './es/index.js',
    output: {
      name: _.upperFirst(_.camelCase(pkg.name)),
      file: pkg.browser.replace(/\.js$/, '.min.js'),
      format: 'umd',
    },
    plugins: [resolve(), babel(), commonjs(), terser()],
  },
];
