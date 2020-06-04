### 渣渣成长之路之 - 学习 webpack

纸上得来终觉浅，绝知此事要躬行。老老实实照着文档过一遍加深印象以及理解，毕竟好记性不如烂笔头。

### webpack 原理

https://juejin.im/post/5badd0c5e51d450e4437f07a#heading-0

### 热更新原理 (hot module replacement)

首先，我们要知道包括了热更新功能后，整个流程涵盖了哪些角色：

- 文件编辑器
- 文件系统、
- 服务端：webpack 编译器、bundle 服务器、HMR 服务器
- 客户端：bundle.js (内置 HMR runtime 代码)

其中 HMR 服务端与客户端 runtime 部分通常通过 websocket 形式进行连接，方便服务端推送消息给客户端进行响应

那么我们在编辑文件时，webpack 编译器就会重新打包文件，打包后的文件会传到 bundle 服务器，更新的文件也会被传到 HMR 服务器，HMR 服务器会告知客户端 runtime 有哪些文件更新了，那么 runtime 就会重新向 bundle 服务器请求文件资源，这就是整个 HMR 的流程

### 自动清理构建目录

使用 `clean-webpack-plugin`，每次构建前，先清空原有的构建目录

### 解析 less, scss 等预处理器

以 less 为例：引入 less 与 less-loader

```javascript
{
  test: /\.less$/,
  use: [
    'css-loader',
    'less-loader',
  ],
},
```

### css 压缩

使用 `optimize-css-assets-webpack-plugin` 与 `cssnano`

```javascript
// plugins 下增加
new OptimizeCssAssetsPlugin({
  assetNameRegExp: /\.css$/g,
  cssProcessor: require('cssnano'),
}),
```

### css 自动补全前缀

引入 `postcss-loader` 与 `autoprefixer`

```javascript
// 在 css 等样式文件规则下增加
{
  loader: 'postcss-loader',
  options: {
    plugins: [
      require('autoprefixer')({
        overrideBrowserslist: ['last 2 version', '>1%', 'ios 7'],
      }),
    ],
  },
},
```

### html 压缩

使用 `html-webpack-plugin` 压缩

```javascript
// plugins 下增加
new HtmlWebpackPlugin({
  template: path.join(__dirname, 'src/search.html'), // 可以使用 ejs
  filename: 'search.html',
  chunks: ['search'],
  inject: true,
  minify: {
    html5: true,
    collapseWhitespace: true,
    preserveLineBreaks: false,
    minifyCSS: true,
    minifyJS: true,
    removeComments: true,
  },
}),
```

### html 内联

使用 `raw-loader`: 把一段 html 代码被引入到另一个 html 文件中达到复用

```html
<!-- 在你想要引入的地方按这种格式写就行了，! 后面是要引入的文件路径 -->
<!-- 由于 webpack 默认使用的模板是 ejs，所以可以这么用 ejs 语法 -->
${ require('raw-loader!./meta.html') }
```

### px 转 rem

- 引入 amfe-flexible，它会帮我们计算并注入根元素的 font-size 大小
- 引入 `px2rem-loader` (也可以用 `postcss-pxtorem`)

在项目 (如 index.js) 引入 `amfe-flexible`

```javascript
{
  loader: 'px2rem-loader',
  options: {
    remUnit: 75, // 1rem = 75px
    remPrecision: 8,
  },
},
```

### 多页面打包通用方案

第一种

使用 webpack entry 指定多文件入口。但是每次新增、删除页面都要改配置，显然不是优雅的方案

第二种：动态获取 entry 和设置 `html-webpack-plugin` 数量

- 利用 `glob` 这个库，glob.sync 同步获取所有 entry 文件

然后设置进 entry 属性，htmlWebpackPlugins 设置进 plugins 即可

```javascript
// 动态获取 entry 以及设置 HtmlWebpackPlugin
const setSPA = () => {
  const entry = {};
  const htmlWebpackPlugins = [];

  const entryFiles = glob.sync(path.resolve(__dirname, 'src/*/index.js'));

  entryFiles.forEach(entryFile => {
    // 'E:/Work/Workspace/webpack-learning/src/search/index.js'
    const match = entryFile.match(/src\/(.*)\/index\.js/); // 约定了入口是 xxx/index.js
    const pageName = match && match[1];

    entry[pageName] = entryFile;
    htmlWebpackPlugins.push(
      new HtmlWebpackPlugin({
        template: path.join(__dirname, `src/${pageName}/index.html`), // 可以使用 ejs
        filename: `${pageName}.html`,
        chunks: [pageName],
        inject: true,
        minify: {
          html5: true,
          collapseWhitespace: true,
          preserveLineBreaks: false,
          minifyCSS: true,
          minifyJS: true,
          removeComments: true,
        },
      })
    );
  });

  return {
    entry,
    htmlWebpackPlugins,
  };
};
```

### 基础库分离

- 思路：将基础库通过 cdn 引入，不打入 bundle
- 方法：使用 `html-webpack-externals-plugin`
- 方法：webpack4 也可以利用 `SplitChunksPlugin` 进行公共脚本分离

#### 使用 HtmlWebpackExternalsPlugin

```javascript
// 忽略 react 与 react-dom 的打包
new HtmlWebpackExternalsPlugin({
  externals: [
    {
      module: 'react',
      entry: 'xxx', // 这里填 react.min.js cdn 地址
      global: 'React',
    },
    {
      module: 'react-dom',
      entry: 'xxx', // 这里填 react-dom.min.js cdn 地址
      global: 'ReactDOM',
    },
  ],
});
```

然后在你的 html 文件手动加上 react 与 react-dom 脚本:

```html
<script type="text/javascript" src="xxx/react.min.js"></script>
<script type="text/javascript" src="xxx/react-dom.min.js"></script>
```

#### 使用 SplitChunksPlugin

```javascript
optimization: {
  splitChunks: {
    minSize: 0, // 最小的文件大小，小于它的话不会被分离打包
    cacheGroups: {
      commons: {
        test: /(react|react-dom)/,
        name: 'vendors',
        chunks: 'all',
        minChunks: 2, // 最小的被引用次数
      },
    },
  },
},
```

同时记得在 HtmlWebpackPlugin 补上：

```javascript
new HtmlWebpackPlugin({
  template: path.join(__dirname, `src/${pageName}/index.html`), // 可以使用 ejs
  filename: `${pageName}.html`,
  chunks: ['vendors', pageName], // vendors 是下面基础库分离出来的
  inject: true,
  minify: {
    html5: true,
    collapseWhitespace: true,
    preserveLineBreaks: false,
    minifyCSS: true,
    minifyJS: true,
    removeComments: true,
  },
});
```

### tree-shaking

- `mode: 'production'` 默认开启了
- 要求你的方法不能有 "副作用"，否则摇树失效（当然是可修改配置的）

### 模块转换分析

```javascript
// 源码
import { helloWorld } from './hello-world';
import './common';

document.write(helloWorld());
```

会被转换成：

```javascript
/* 0 */
/***/ (function (module, __webpack_exports__, __webpack_require__) {
  'use strict';
  __webpack_require__.r(__webpack_exports__);
  /* harmony import */ var _common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    1
  );
  /* harmony import */ var _helloworld__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    2
  );
  document.write(_helloworld__WEBPACK_IMPORTED_MODULE_1__('helloWorld'));
  /***/
});
```

可以看出：

- 被 webpack 转换后的模块会带上一层包裹，IIFE(匿名闭包)
- import 会被转换成 **webpack_require**，用来加载模块（接受参数 moduleId 通过 jsonp 加载）
- 通常来说 moduleId 为 0 的模块是主程序的入口

### scope hoisting

https://zhuanlan.zhihu.com/p/27980441

原理：将所有模块代码按照引用顺序放在一个函数作用域里，然后适当的重命名一些变量以避免命名冲突

譬如 b 模块引用了 a 模块，如果没有对顺序做处理的话，a 和 b 都会产生一个包裹 (即使 b 模块在 a 之前也没影响)；如果开启了 scope hoisting，则会在 b 之前声明 a 模块，且不会产生包裹

> 可以简单的把 scope hoisting 理解为是把每个模块被 webpack 处理成的模块初始化函数整理到一个统一的包裹函数里，也就是把多个作用域用一个作用域取代，以减少内存消耗并减少包裹块代码，从每个模块有一个包裹函数变成只有一个包裹函数包裹所有的模块，但是有一个前提就是，当模块的引用次数大于 1 时，比如被引用了两次或以上，那么这个效果会无效，也就是被引用多次的模块在被 webpack 处理后，会被独立的包裹函数所包裹

个人理解：就是把被引用依赖的模块，提升至最前面优先声明

- 对比：通过 scope hoisting 可以减少函数声明代码和内存开销
- `mode: 'production'` 会默认开启 (webpack4)，必须是 ES6 语法，CommonJS 不支持
- webpack3 的话需在 plugins 加上 `new Webpack.optimize.ModuleConcatenationPlugin()`

### 代码分割

- 抽离相同代码到一个共享块
- 脚本懒加载，使得初始下载的代码更小

懒加载的方式：

- CommonJS: require.ensure
- ES6: 动态 import，webpack 推荐方案 (目前还没有原生支持，需要 babel 转换)

如何使用动态 import?

1. 安装 babel 插件：`yarn add --dev @babel/plugin-syntax-dynamic-import`

2. 在 `.babelrc` 添加

```
{
  "plugins": [
    "@babel/plugin-syntax-dynamic-import"
  ]
}
```

### 对基础库进行打包

要求打包压缩版和非压缩版的文件，同时支持 esmodule、CommonJS 等引入方式

```javascript
entry: {
  algorithm: path.resolve(__dirname, 'src/index'),
  'algorithm.min': path.resolve(__dirname, 'src/index'),
},
output: {
  filename: '[name].js', // 输出文件名，其中 [name] 根据 entry 中的键值决定
  library: 'algorithm', // 库名称
  libraryTarget: 'umd',
  libraryExport: 'default',
  path: path.resolve(__dirname, 'dist'), // 输出路径
},
```

如何只针对 min.js 文件进行压缩？

- 首先设置 `mode: none` 禁止默认的代码压缩功能
- 通过 include 设置只压缩 min.js 结尾的文件

```javascript
optimization: {
  minimize: true,
  minimizer: [
    new TerserPlugin({
      include: /\.min\.js$/,
    })
  ]
}
```

如何设置入口文件？

在 `package.json` 的 main 属性设为 `index.js`

```javascript
// index.js
// 如果 webpack.config.js 设置的 mode 是 production，则 env 就是 production
// 否则是 development
const env = process.env.NODE_ENV;

const entry =
  env === 'production'
    ? require('./dist/algorithm.min')
    : require('./dist/algorithm');

module.exports = entry;
```

### 优化构建日志

[文档](https://www.webpackjs.com/configuration/stats/) 统计信息: 配置 `stats` 字段

使用 `friendly-errors-webpack-plugin`
