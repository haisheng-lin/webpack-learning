// option1: 使用 npx webpack --config webpack.config.js 打包构建
// npx 的介绍可查阅: http://www.ruanyifeng.com/blog/2019/02/npx.html
// option2: 在 package.json 中写个 npm script 

const path = require('path');

module.exports = {
  entry: './src/index.js', // 入口文件
  output: {
    filename: 'main.js', // 输出文件名
    path: path.resolve(__dirname, 'dist'), // 输出路径
  },
};
