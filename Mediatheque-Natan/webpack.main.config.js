const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: 'development',
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
    new CleanWebpackPlugin()
  ],
  node: {
    __dirname: false,
    __filename: false
  }
};
