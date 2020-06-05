### 渣渣成长之路之 - 学习 webpack

纸上得来终觉浅，绝知此事要躬行。老老实实照着文档过一遍加深印象以及理解，毕竟好记性不如烂笔头。

### TODO

- SSR
- eslint
- 持续集成与 Travis CI
- 发布构建包至 npm
- git commit 规范与 changelog
- 语义化版本规范格式

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

这种做法的弊端是，如果基础库有很多，那么就得创建很多个 script 标签

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

### 进一步分包，预编译资源模块

思路：将 react, react-dom, redux 等基础包与业务包打包成一个文件
方法：使用 `DLLPlugin` 进行分包，DllReferencePlugin 对 manifest.json 引用，然后会关联 DLLPlugin 里面的包
文档：https://www.webpackjs.com/plugins/dll-plugin/

**一般会把这个文件单独抽离成 `webpack.dll.js`**

```javascript
module.exports = {
  context: process.cwd(),
  entry: {
    library: ['react', 'react-dom', 'redux', 'react-redux'],
  },
  output: {
    filename: '[name].dll.js',
    path: path.join(__dirname, 'build/library'),
    library: '[name]',
  },
  plugins: [
    new Webpack.DllPlugin({
      name: '[name]',
      path: './build/library/[name].json',
    }),
  ],
};
```

那么就可以 `webpack --config webpack.dll.js` 命令进行基础包的预编译了，以后的打包时如果遇到这些基础库则可以直接引用

然后在 `webpack.config.js` 引入：

```javascript
module.exports = {
  plugins: [
    new Webpack.DllReferencePlugin({
      manifest: require('./build/library/manifest.json'),
    }),
  ],
};
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

### 构建异常与中断处理

幸运的是 webpack4 构建失败会抛出带错误码信息的异常

NodeJs `process.exit` 规范

- 0 表示成功完成，回调函数中，err 为 null
- 非 0 表示执行失败，回调函数中 err 不为 null，且 err.code 就是传给 exit 的数字

如何主动捕获并处理构建错误？

- compiler 每次构建结束后都会触发 done 这个 hook
- process.exit 主动处理构建报错
- 异常处理可以根据自身需要决定，譬如数据上报

```javascript
plugins: [
  function () {
    this.hooks.done.tap('done', stats => {
      if (
        stats.compilation.errors &&
        stats.compilations.errors.length &&
        process.argv.indexOf('--watch') === -1
      ) {
        console.log('build error');
        process.exit(1);
      }
    });
  },
];
```

### 构建配置抽离成 npm 包的意义

通用性

- 业务开发者无需关注构建配置
- 统一团队构建脚本

可维护性

- 构建配置合理的拆分
- README 文档、ChangeLog 文档等

质量

- 冒烟测试、单元测试、测试覆盖率
- 持续集成

构建配置管理的方案

- 通过多个配置文件管理不同环境的构建，webpack --config 进行参数控制
- 将构建配置设计成一个库，比如：hjs-webpack, Neutrino, webpack-blocks
- 抽成一个工具进行管理，比如：create-react-app, kyt, nwb
- 把所有配置放在一个文件，通过 --env 参数控制分支选择

### 功能模块设计

基础配置 `webpack.base.js`

- 解析 ES6
- 解析 React
- 解析 css, less, autoprefixer, pxtorem 等, css 提取单独文件
- 解析图片、字体等
- 目录清理
- 多页面打包
- 命令行信息提示优化
- 错误捕获与处理

开发阶段配置 `webpack.dev.js`

- 代码热更新
- sourcemap

生成阶段配置 `webpack.prod.js`

- 代码压缩
- 文件指纹（哈希）
- tree shaking
- scope hoisting
- 速度优化（基础 cdn）
- 体积优化（代码分割）

SSR 配置 `webpack.ssr.js`

- output libraryTarget
- css 解析 ignore

通过 `webpack-merge` 合并参数

测试：

- 判断是否构建成功
- 判断基本功能是否正常：编写 mocha 测试用例，是否有 js, css, html 文件等

### 持续集成 (CI)

- 快速发现错误
- 防止分支大幅偏离主干

核心措施：代码集成到主干之前，必须通过自动化测试。只要有一个测试用例失败，就不能集成

流行的 CI 方案包括但不限于：Travis, Circle, Jenkins, CodeShip 等等，在这里我们采用 travis 方案

### 接入 travis

- https://travis-ci.org 使用 github 登录
- 在 https://travis-ci.org/accounts/repositories 为项目开启
- 项目根目录下加 `.travis.yml`

### 构建速度与体积优化策略

#### 初级分析

使用 webpack 内置的 stats，例如在 `package.json` 增加：

```
"scripts": {
  "build:stats": "webpack --env production --json > stats.json"
}
```

或者在 NodeJs 中使用：

```javascript
const webpack = require('webpack');
const config = require('./webpack.config.js');

webpack(config, (err, stats) => {
  if (err) {
    return console.error(err);
  }

  if (stats.hasErrors()) {
    return console.error(stats.toString('errors-only'));
  }

  console.log(stats); // 输出统计分析结果
});
```

缺点：只能看到构建时间、每个文件的大小，无法看出为什么文件会这么大、哪个组件比较大、哪个 loader 耗时长等等。颗粒度较粗，看不出问题所在

### 速度分析

使用 `speed-measure-webpack-plugin`

- 分析整个打包总耗时
- 每个 loader 和 plugin 的耗时情况

优化方案：

- 多进程、多实例构建 (thread-loader, parallel-webpack, HappyPack)
- 多进程并行压缩代码 (webpack-parallel-uglify-plugin, uglify-webpack-plugin, terser-webpack-plugin)

多进程构建以 `thread-loader` 为例：

```javascript
module: {
  rules: [
    {
      test: /\.js$/,
      use: [
        {
          loader: 'thread-loader',
          options: {
            workers: 3, // 对 js 解析开启 3 个进程
          },
        },
        'babel-loader',
      ],
    },
  ];
}
```

多进程并行压缩使用 `terser-webpack-plugin` 开启 parallel 参数：

```javascript
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: 4,
      }),
    ],
  },
};
```

### 体积分析

使用 `webpack-bundle-analyzer`

- 依赖的第三方模块文件大小
- 业务里的组件代码大小

### 使用高版本的 webpack 和 node

- webpack4 采用高版本的 v8 带来的优化 (for of 替代 forEach，Map 和 Set 替代 Object，includes 替代 indexOf)
- 默认使用更快的 md4 hash 算法
- webpack AST 可以直接从 loader 传递给 AST，减少传递时间
- 使用字符串方法替代正则表达式
