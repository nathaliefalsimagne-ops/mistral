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
    // Exclure les modules Electron natifs
    'better-sqlite3': 'commonjs better-sqlite3',
    'sqlite3': 'commonjs sqlite3',
    'electron': 'commonjs electron'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: [
              ['@babel/plugin-transform-runtime', {
                useESModules: false
              }]
            ]
          }
        }
      },
      {
        test: /\.node$/,
        use: 'node-loader'
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ['**/*', '!assets/**']
    })
  ],
  node: {
    __dirname: false,
    __filename: false
  }
};
