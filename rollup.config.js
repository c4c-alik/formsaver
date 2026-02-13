import { defineConfig } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import vue from 'rollup-plugin-vue';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
import replace from '@rollup/plugin-replace';
import { dirname, resolve as pathResolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig([
  // HTML 页面入口配置
  {
    input: {
      popup: 'src/popup/main.ts',
      options: 'src/options/main.ts',
    },
    output: {
      dir: 'dist',
      entryFileNames: '[name]/main.js',
      chunkFileNames: 'shared/[name].js',
      assetFileNames: '[name]/[name].[ext]',
      format: 'es',
      sourcemap: !isProduction,
    },
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        preventAssignment: true,
      }),
      alias({
        entries: [{ find: '@', replacement: pathResolve(__dirname, 'src') }],
      }),
      resolve({
        browser: true,
        extensions: ['.js', '.ts', '.vue'],
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
      vue({
        // 添加Vue插件配置
        template: {
          isProduction,
          compilerOptions: {
            whitespace: 'condense',
          },
        },
      }),
      postcss({
        extract: true,
        minimize: isProduction,
      }),
      copy({
        targets: [
          { src: 'public/*', dest: 'dist' },
          {
            src: 'src/popup/popup.html',
            dest: 'dist/popup',
            transform: contents => {
              return contents.toString().replace(/\.ts"/g, '.js"');
            },
          },
          {
            src: 'src/options/options.html',
            dest: 'dist/options',
            transform: contents => {
              return contents.toString().replace(/\.ts"/g, '.js"');
            },
          },
        ],
        hook: 'buildEnd',
      }),
    ],
  },

  // Content Script 配置
  {
    input: 'src/content/content.ts',
    output: {
      file: 'dist/content.js',
      format: 'iife',
      sourcemap: !isProduction,
    },
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        preventAssignment: true,
      }),
      resolve({
        browser: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },

  // Background Script 配置
  {
    input: 'src/background/background.ts',
    output: {
      file: 'dist/background.js',
      format: 'iife',
      sourcemap: !isProduction,
    },
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        preventAssignment: true,
      }),
      resolve({
        browser: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
]);
