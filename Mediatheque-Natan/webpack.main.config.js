const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './app/main.js',
  target: 'electron-main',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.js', '.json', '.node'],
    alias: {
      '@': path.resolve(__dirname, 'app/src')
    }
  },
  externals: {
    'sqlite3': 'commonjs sqlite3',
    'electron': 'commonjs electron'
  },
  module: {
    rules: [
      {
        test: /\.node$/, 
        use: 'node-loader'
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, 'app/preload.js'), to: 'preload.js' },
        { from: path.resolve(__dirname, 'app/public/icon.png'), to: 'public/icon.png', noErrorOnMissing: true }
      ]
    })
  ],
  node: {
    __dirname: false,
    __filename: false
  }
};
