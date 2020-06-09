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

### loader

多 loader 时的执行顺序：从后往前

如何调试自己写的 loader？使用 `loader-runner`！它可以允许你不安装 webpack 的情况下运行 loader

作用：

- 作为 webpack 依赖，webpack 使用它执行 loader
- 进行 loader 的开发与调试

以下是自己编写的一个 `raw-loader` 示例

```javascript
// raw-loader.js
module.exports = function (source) {
  const json = JSON.stringify(source)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `export default ${json}`;
};

// demo.txt
// foobar

// run-loader.js
const path = require('path');
const fs = require('fs');
const { runLoaders } = require('loader-runner');

runLoaders(
  {
    resource: path.resolve(__dirname, 'src/demo.txt'),
    loaders: [path.resolve(__dirname, 'src/raw-loader')],
    context: { minimize: true },
    readResource: fs.readFile.bind(fs),
  },
  function (err, result) {
    if (err) {
      return console.error(err);
    }

    console.log(result);
  }
);
```

#### loaders 参数获取

通过 `loader-utils` 的 `getOptions` 获取

```javascript
// raw-loader.js
const loaderUtils = require('loader-utils');

module.exports = function (source) {
  const { name } = loaderUtils.getOptions(this);
  console.log(`name = ${name}`);

  const json = JSON.stringify(source)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `export default ${json}`;
};

// run-loader.js
runLoaders(
  {
    resource: path.resolve(__dirname, 'src/demo.txt'),
    loaders: [
      {
        loader: path.resolve(__dirname, 'src/raw-loader'),
        options: {
          name: 'test',
        },
      },
    ],
    context: { minimize: true },
    readResource: fs.readFile.bind(fs),
  },
  function (err, result) {
    if (err) {
      return console.error(err);
    }

    console.log(result);
  }
);
```

#### loader 异常同步处理：

直接通过 throw 抛出

通过 `this.callback` 传递错误 (也可以用来传结果)

```javascript
module.exports = function (source) {
  this.callback(new Error('error'), null);
};
```

loader 异常异步处理：

通过 `this.async` 返回一个异步函数

```javascript
const fs = require('fs');
const path = require('path');
const loaderUtils = require('loader-utils');

module.exports = function (source) {
  const callback = this.async();

  fs.readFile(path.resolve(__dirname, 'async.txt'), 'utf-8', (err, data) => {
    callback(err, data);
  });
};
```

#### loader 使用缓存

webpack 默认开启 loader 缓存，可使用 `this.cacheable(false)` 关掉

缓存条件，loader 的结果在相同的输入下有确定的输出；但是有依赖的 loader 无法使用缓存

#### loader 如何进行文件输出

通过 `this.emitFile` 进行文件写入 (可查看 file-loader 源码，但是 loader-runner 没有该方法)

### 实战开发一个合成雪碧图的 loader

支持的语法：`background: url('a.png?__sprite')` 转成 `background: url('sprite.png')`

准备：如何将两个图片合成一个？使用 [spritesmith](https://www.npmjs.com/package/spritesmith)

```css
.img1 {
  background: url('./assets/1.jpg?__sprite');
}

.img2 {
  background: url('./assets/2.jpg?__sprite');
}
```

```javascript
// sprite-loader.js
const fs = require('fs');
const path = require('path');

const Spritesmith = require('spritesmith');

/**
 * @param {string} source
 */
module.exports = function (source) {
  const callback = this.async();

  const reg = /url\(('|")?(\S*)\?__sprite('|")?\)/g;
  const imgs = source.match(reg);

  const matchedImgs = Array.from(imgs).map(img => {
    const matchedRes = img.replace(/'|"/g, '').match(/url\(([^']*)\?__sprite/);
    return path.resolve(__dirname, matchedRes[1]);
  });

  Spritesmith.run(
    {
      src: matchedImgs,
    },
    (err, result) => {
      source = source.replace(reg, `url('dist/sprite.jpg')`);

      fs.writeFileSync(
        path.join(process.cwd(), 'dist/sprite.jpg'),
        result.image
      );

      fs.writeFileSync(path.join(process.cwd(), 'dist/index.css'), source);

      callback(null, source);
    }
  );
};

// run-loader.js
runLoaders(
  {
    resource: path.resolve(__dirname, 'src/index.css'),
    loaders: [path.resolve(__dirname, 'src/sprite-loader')],
    readResource: fs.readFile.bind(fs),
  },
  (err, result) => {
    if (err) {
      return console.error(err);
    }

    console.log(result);
  }
);
```

### plugin

- 每个 plugin 内部必须有 `apply` 方法
- 插件没有像 loader 那样的独立运行环境，只能在 webpack 里面运行

#### 插件的参数获取

`apply` 方法接受 compiler 参数，也可以从自身 `this` 中获取

#### 插件的错误处理

- 参数校验阶段可通过 `throw` 方式抛出
- 通过 `compilation` 对象的 warnings 和 errors 接收

```javascript
compilation.warnings.push('warning');
compilation.errors.push('error');
```

#### 通过 compilation 进行文件写入

- `compilation` 上的 assets 可以用于文件写入
- 需要用到 `webpack-sources`

```javascript
const { RawSource } = require('webpack-sources');

class DemoPlugin {
  apply(compiler) {
    compiler.hooks.emit('emit', (compilation, callback) => {
      compilation.assets['my-name'] = new RawSource('demo');
      callback();
    });
  }
}
```

#### 编写插件的插件

插件自身也可以通过暴露 hooks 方式进行扩展，以 `html-webpack-plugin` 为例：

- html-webpack-plugin-alter-chunks (Sync)
- html-webpack-plugin-before-html-generation (Async)
- html-webpack-plugin-after-asset-tags (Async)

#### 实战编写一个压缩构建资源为 zip 包的插件

要求

- 生成的 zip 包文件名称可通过插件传入
- 需要使用 compiler 对象的特地 hooks 进行资源生成 (不能用 NodeJS fs.writeFile)

准备：如何文件压缩成 zip？使用 [jszip](https://www.npmjs.com/package/jszip)

准备：Compiler 上负责文件生成的 hooks

- hooks 是 emit，是一个异步的 hook (AsyncSeriesHook)
- emit 是文件生成阶段，读取的是 compilation.assets 对象的值，所以可以将 zip 包设置到 `compilation.assets` 对象上

```javascript
const path = require('path');
const RawSource = require('webpack-sources').RawSource;
const JsZip = require('jszip');

const zip = new JsZip();

class ZipPlugin {
  constructor(options) {
    this.options = options;
  }

  apply(compiler) {
    // 因为 emit 是异步钩子，所以用 tapAsync
    compiler.hooks.emit.tapAsync('ZipPlugin', (compilation, callback) => {
      const folder = zip.folder(this.options.filename);

      for (const filename in compilation.assets) {
        const source = compilation.assets[filename].source();
        folder.file(filename, source);
      }

      const actualFilename = this.options.filename + '.zip';

      zip.generateAsync({ type: 'nodebuffer' }).then(content => {
        const outputAbsolutePath = path.resolve(
          compilation.options.output.path,
          actualFilename
        );
        const outputRelativePath = path.relative(
          compilation.options.output.path,
          outputAbsolutePath
        );

        compilation.assets[outputRelativePath] = new RawSource(content);
        callback();
      });
    });
  }
}

module.exports = ZipPlugin;
```
