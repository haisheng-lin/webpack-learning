const path = require('path');
const Webpack = require('webpack');

module.exports = {
  entry: {
    library: ['react', 'react-dom'],
  },
  output: {
    filename: '[name].[chunkhash].dll.js', // library.dll.js
    path: path.join(__dirname, 'build/library'),
    library: '[name]', // 库名称，[name] 就是 library 了
  },
  plugins: [
    new Webpack.DllPlugin({
      name: '[name].[hash]',
      path: path.join(__dirname, 'build/library/[name].json'),
    }),
  ],
};
