// option1: 使用 npx webpack --config webpack.config.js 打包构建
// npx 的介绍可查阅: http://www.ruanyifeng.com/blog/2019/02/npx.html
// option2: 在 package.json 中写个 npm script 

const path = require('path');

// 如果我们更改了我们的一个入口起点的名称，甚至添加了一个新的名称，生成的包将被重命名在一个构建中
// 但是我们的 index.html 文件仍然会引用旧的名字。我们用 HtmlWebpackPlugin 来解决这个问题
const HtmlWebpackPlugin = require('html-webpack-plugin');

// 由于 dist 目录在过去的指南和代码实例导致混乱不堪，webpack 会将打包文件放置在 dist 中
// 但是 webpack 无法追踪哪些文件是实际项目中有用到的
// 所以每次构建前都应该清理 dist 目录，是比较推荐的做法，而 clean-webpack-plugin 是当中比较普及的管理插件
// 文档： https://github.com/johnagan/clean-webpack-plugin#options-and-defaults-optional
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  entry: { // 入口文件
    app: './src/index.js',
    print: './src/print.js',
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: 'Output Management',
    })
  ],
  output: {
    filename: '[name].bundle.js', // 输出文件名，其中 [name] 根据 entry 中的键值决定
    path: path.resolve(__dirname, 'dist'), // 输出路径
  },
  module: {
    rules: [
      {
        test: /\.css$/, // 匹配以 '.css' 为后缀的文件
        use: [
          'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/, // 匹配各种格式的图片
        use: [
          'file-loader',
        ],
      },
    ],
  },
};
