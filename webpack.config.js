// option1: 使用 npx webpack --config webpack.config.js 打包构建
// npx 的介绍可查阅: http://www.ruanyifeng.com/blog/2019/02/npx.html
// option2: 在 package.json 中写个 npm script 

const path = require('path');

module.exports = {
  entry: { // 入口文件
    app: './src/index.js',
    print: './src/print.js',
  },
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
