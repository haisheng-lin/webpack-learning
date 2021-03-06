// option1: 使用 npx webpack --config webpack.config.js 打包构建
// npx 的介绍可查阅: http://www.ruanyifeng.com/blog/2019/02/npx.html
// option2: 在 package.json 中写个 npm script

const path = require('path');
const glob = require('glob');
const Webpack = require('webpack');

// 如果我们更改了我们的一个入口起点的名称，甚至添加了一个新的名称，生成的包将被重命名在一个构建中
// 但是我们的 index.html 文件仍然会引用旧的名字。我们用 HtmlWebpackPlugin 来解决这个问题
const HtmlWebpackPlugin = require('html-webpack-plugin');

// 由于 dist 目录在过去的指南和代码实例导致混乱不堪，webpack 会将打包文件放置在 dist 中
// 但是 webpack 无法追踪哪些文件是实际项目中有用到的
// 所以每次构建前都应该清理 dist 目录，是比较推荐的做法，而 clean-webpack-plugin 是当中比较普及的管理插件
// 文档： https://github.com/johnagan/clean-webpack-plugin#options-and-defaults-optional
const CleanWebpackPlugin = require('clean-webpack-plugin');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserWebpackPlugin = require('terser-webpack-plugin');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const PurgeCSSWebpackPlugin = require('purgecss-webpack-plugin');

const SpeedMeasureWebpackPlugin = require('speed-measure-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const smp = new SpeedMeasureWebpackPlugin();

const PATHS = {
  src: path.resolve(__dirname, 'src'),
};

const setSPA = () => {
  // 通常一个页面对应一个 HtmlWebpackPlugin
  const entry = {};
  const htmlWebpackPlugins = [];

  const entryFiles = glob.sync(path.resolve(__dirname, 'src/*/index.js'));

  entryFiles.forEach(entryFile => {
    // 'E:/Work/Workspace/webpack-learning/src/search/index.js'
    const match = entryFile.match(/src\/(.*)\/index\.js/);
    const pageName = match && match[1];

    entry[pageName] = entryFile;
    htmlWebpackPlugins.push(
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
      })
    );
  });

  return {
    entry,
    htmlWebpackPlugins,
  };
};

const { entry, htmlWebpackPlugins } = setSPA();

module.exports = smp.wrap({
  mode: 'production',
  entry,
  devtool: 'inline-source-map',
  // 告知 webpack-dev-server: 在 localhost:8080 下建立服务，将 dist 目录下的文件作为可访问文件
  devServer: {
    contentBase: './dist',
    hot: true,
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name]_[contenthash:8].css',
    }),
    new OptimizeCssAssetsPlugin({
      assetNameRegExp: /\.css$/g,
      cssProcessor: require('cssnano'),
    }),
    new FriendlyErrorsWebpackPlugin(),
    function () {
      this.hooks.done.tap('done', stats => {
        if (
          stats.compilation.errors &&
          stats.compilation.errors.length &&
          process.argv.indexOf('--watch') === -1
        ) {
          console.log('build error');
          process.exit(1);
        }
      });
    },
    // new BundleAnalyzerPlugin(),
    // new Webpack.DllReferencePlugin({
    //   manifest: require('./build/library/library.json'),
    // }),
    new HardSourceWebpackPlugin(),
    new PurgeCSSWebpackPlugin({
      paths: glob.sync(`${PATHS.src}/**/*`, { nodir: true }),
    }),
    ...htmlWebpackPlugins,
  ],
  output: {
    filename: '[name]_[chunkhash:8].js', // 输出文件名，其中 [name] 根据 entry 中的键值决定
    path: path.resolve(__dirname, 'dist'), // 输出路径
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'),
        use: [
          {
            loader: 'thread-loader',
            options: {
              workers: 3,
            },
          },
          'babel-loader?cacheDirectory=true',
        ],
      },
      {
        // loader 是从后往前调用的
        // mini-css-extract-plugin 与 style-loader 互斥
        // style-loader 是把样式加入到 header 里面
        // 而 mini-css-extract-plugin 是把样式提取到其他文件中
        test: /\.css$/, // 匹配以 '.css' 为后缀的文件
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.less$/, // 匹配以 '.css' 为后缀的文件
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'less-loader',
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
          {
            loader: 'px2rem-loader',
            options: {
              remUnit: 75, // 1rem = 75px ?
              remPrecision: 8,
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/, // 匹配各种格式的图片
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 10240, // 10k 以下转 base64
            },
          },
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: {
                progressive: true,
                quality: 65,
              },
              // optipng.enabled: false will disable optipng
              optipng: {
                enabled: false,
              },
              pngquant: {
                quality: [0.65, 0.9],
                speed: 4,
              },
              gifsicle: {
                interlaced: false,
              },
              // the webp option will enable WEBP
              webp: {
                quality: 75,
              },
            },
          },
        ],
      },
    ],
  },
  optimization: {
    minimizer: [new TerserWebpackPlugin({ parallel: true, cache: true })],
    // splitChunks: {
    //   minSize: 0, // 最小的文件大小，小于它的话不会被分离打包
    //   cacheGroups: {
    //     commons: {
    //       test: /(react|react-dom)/,
    //       name: 'vendors',
    //       chunks: 'all',
    //       // minChunks: 2, // 最小的被引用次数
    //     },
    //   },
    // },
  },
  stats: 'errors-only',
});
