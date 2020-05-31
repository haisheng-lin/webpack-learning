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

### css 压缩

使用 optimize-css-assets-webpack-plugin 与 cssnano

### html 压缩

使用 html-webpack-plugin 压缩
