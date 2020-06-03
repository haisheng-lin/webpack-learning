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
