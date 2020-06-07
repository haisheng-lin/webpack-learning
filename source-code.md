### webpack 原理

https://juejin.im/post/5e0fef78e51d4541296e9fbd

webpack 本质：可以理解成基于事件流（发布订阅）的编程范例，一系列的插件运行

#### 从 webpack 命令说起：

- 通过 npm script 运行 webpack
- 通过 webpack 直接运行 `webpack entry.js bundle.js`

查找 webpack 入口文件：npm 会进入 node_modules/.bin 目录查找是否存在 webpack.sh 或 webpack.cmd 文件。通过查看 webpack.cmd 文件发现，实际入口文件是：`node_modules/webpack/bin/webpack.js` (webpack package.json bin 指定)

通过分析 `webpack/bin/webpack.js` 发现，它会检查是否安装了 `webpack-cli` 或 `webpack-command`。如果两个都装了，就提示用户删掉其中一个，如果两个都没装，则提示用户装其中一个。否则对这两个包其中一个，执行 CLI

#### webpack-cli 源码

结论：

- 引入 yargs，对命令行进行定制
- 分析命令行参数，对各个参数进行转换，组成编译配置项
- 引用 webpack，根据配置项进行编译和构建

从 `NON_COMPILATION_CMD` 分析出不需要编译的命令（因为有的命令不需要实例化一个 webpack 去编译构建，这些命令在 `utils/constants` 下的 `NON_COMPILATION_ARGS` 进行维护）

如果有 `NON_COMPILATION_CMD` 则运行 `utils/prompt-command` 文件，这个文件的逻辑是：

```javascript
module.exports = function promptForInstallation(packages, ...args) {
  const nameOfPackage = '@webpack-cli/' + packages; // 譬如 init, migrate 等
  // ...
  // 如果本地找到这个包的路径，则运行；否则到全局下查找和运行
  if (!fs.existsSync(pathForCmd)) {
    const globalModules = require('global-modules');
    pathForCmd = globalModules + '/@webpack-cli/' + packages;
    require.resolve(pathForCmd);
  } else {
    require.resolve(pathForCmd);
  }
  // 如果包没安装，则提示用户安装；否则运行命令
  if (!packageIsInstalled) {
    // ...
  } else {
    return runWhenInstalled(packages, pathForCmd, ...args);
  }
};
```

`NON_COMPILATION_CMD` 包括的命令：

- init: 创建一份 webpack 配置文件
- migrate: 进行 webpack 版本迁移
- add: 往 webpack 配置文件增加属性 (似乎后来的版本删掉了)
- remove: 往 webpack 配置文件删除属性 (似乎后来的版本删掉了)
- serve: 运行 `webpack --serve`
- generate-loader: 生成 webpack loader 代码模板
- generate-plugin: 生成 webpack plugin 代码模板
- info: 返回本地环境相关的信息

通过 `config-yargs` 看出，把命令分成多个组：

```javascript
const CONFIG_GROUP = 'Config options:'; // 配置相关参数（文件名称、运行环境等）
const BASIC_GROUP = 'Basic options:'; // 基础参数（entry, debug, watch, devtool 等配置）
const MODULE_GROUP = 'Module options:'; // 模块参数，给 loader 设置扩展
const OUTPUT_GROUP = 'Output options:'; // 输出参数（输出文件名称、路径）
const ADVANCED_GROUP = 'Advanced options:'; // 高级用法（记录设置、缓存设置、监听频率、bail 等）
const RESOLVE_GROUP = 'Resolving options:'; // 解析参数（alias 和解析的文件后缀设置）
const OPTIMIZE_GROUP = 'Optimizing options:'; // 优化参数
const DISPLAY_GROUP = 'Stats options:'; // 统计参数？展示？
```

得到最终的配置参数后，实例化 webpack 进入构建流程：

```javascript
try {
  compiler = webpack(options);
} catch (err) {
  // ...
}

if (argv.progress) {
  const ProgressPlugin = require('webpack').ProgressPlugin;
  new ProgressPlugin({
    profile: argv.profile,
  }).apply(compiler);
}
```

所以最终回到了 `webpack/lib/webpack.js` 里面实例化：

```javascript
let compiler;
if (Array.isArray(options)) {
  compiler = new MultiCompiler(
    Array.from(options).map(options => webpack(options))
  );
} else if (typeof options === 'object') {
  // ...
}
```

通过 `Compiler` 和 `Compilation` 得知它们都继承自 `Tapable` 这个类：

> Tapable 是类似于 NodeJS 的 EventEmitter，主要控制钩子函数的发布订阅，控制着 webpack 的插件系统

Tapable 暴露了很多钩子类，为插件提供挂载的钩子，每个钩子代表了流程中的某一个事件节点：

```javascript
const {
  SyncHook, // 同步钩子
  SyncBailHook, // 同步熔断钩子，当函数有返回值，就会在当前执行函数停止
  SyncWaterFallHook, // 同步流水钩子，将上一个钩子的结果作为参数传递给下一个钩子
  SyncLoopHook, // 同步循环钩子，如果函数返回 true 则继续循环，undefined 则结束循环
  AsyncParallelHook, // 异步并发钩子
  AsyncParallelBailHook, // 异步并发熔断钩子
  AsyncSeriesHook, // 异步串行钩子
  AsyncSeriesBailHook, // 异步串行熔断钩子
  AsyncSeriesWaterFallHook, // 异步串行流水钩子
} = require('tapable');
```

同步和异步钩子的绑定事件和执行事件对应的方法：

| 同步       | 异步                          |
| ---------- | ----------------------------- |
| 绑定：tap  | 绑定：tapAsync/tapPromise/tap |
| 执行：call | 执行：callAsync/promise       |

基础用法示例：

```javascript
const hook1 = new SyncHook(['arg1', 'arg2', 'arg3']);

hook1.tap('hook1', (arg1, arg2, arg3) => {
  console.log(arg1, arg2, arg3);
});

hook1.call(1, 2, 3);
```

实际例子演示，定义一个 Car 方法，在内部 hooks 新建钩子，分别是同步钩子 accelerate (接受一个参数), brake、异步钩子 calculateRoutes；使用钩子对应的绑定和执行方法，calculateRoutes 使用 tapPromise 可以返回一个 promise 对象。

```javascript
const { SyncHook, AsyncSeriesHook } = require('tapable');

class Car {
  constructor() {
    this.hooks = {
      accelerate: new SyncHook(['speed']),
      brake: new SyncHook(),
      calculateRoutes: new AsyncSeriesHook(['source', 'target', 'routes']),
    };
  }
}

const car = new Car();

car.hooks.accelerate.tap('WarningLampPlugin', speed => {
  console.log(speed);
});

car.hooks.brake.tap('WarningLampPlugin', speed => {
  console.log('brake');
});

car.hooks.calculateRoutes.tapPromise('calculateRoutes', () => {
  return new Promise((resolve, reject) => {
    resolve('??');
  });
});

// 使用

car.hooks.brake.call();
car.hooks.accelerate.call(10);

car.hooks.calculateRoutes.promise('Async', 'hook', 'demo').then(
  () => {
    console.log('cost');
  },
  err => {
    console.error(err);
  }
);
```
