const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './app/renderer.js',
  target: 'electron-renderer',
  // `target: 'electron-renderer'` traite automatiquement les modules Node
  // (dont `events`) comme externes, en supposant nodeIntegration activé.
  // Cette fenêtre a nodeIntegration désactivé : il n'y a pas de vrai
  // `require` Node disponible, donc ce module doit être empaqueté (voir
  // resolve.fallback ci-dessous) plutôt que laissé externe.
  externalsPresets: { electron: false, node: false },
  output: {
    filename: 'renderer.js',
    path: path.resolve(__dirname, 'dist'),
    // Chemin relatif requis pour que les chunks se chargent correctement une
    // fois l'app servie en file:// (mode production packagée), où l'inférence
    // automatique du publicPath ne fonctionne pas de façon fiable. En
    // développement, webpack-dev-server a besoin d'un publicPath absolu
    // ('/') pour servir index.html à la racine — sinon "Cannot GET /".
    publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
    // `target: 'electron-renderer'` fait supposer à webpack un environnement
    // Node (son runtime interne de chargement de chunks référence `global`),
    // mais cette fenêtre a nodeIntegration désactivé : `global` n'existe pas
    // réellement. `globalThis` fonctionne dans les deux cas.
    globalObject: 'globalThis'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.scss'],
    alias: {
      '@': path.resolve(__dirname, 'app/src')
    },
    // Cette fenêtre a nodeIntegration désactivé : le module Node `events`
    // (utilisé par le client de rechargement à chaud de webpack-dev-server,
    // en développement uniquement) doit être fourni par un équivalent
    // navigateur plutôt que traité comme un module Node externe.
    fallback: {
      events: require.resolve('events/')
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react'
            ],
            plugins: [
              ['@babel/plugin-transform-runtime', {
                useESModules: true
              }]
            ]
          }
        }
      },
      {
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        }
      },
      {
        test: /\.(scss|css)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[hash:8].[ext]',
              outputPath: 'images'
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[hash:8].[ext]',
              outputPath: 'fonts'
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'app/public/index.html'),
      filename: 'index.html'
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[hash:8].css',
      chunkFilename: '[id].[hash:8].css'
    }),
    // Webpack 5 ne polyfille plus automatiquement les globales Node pour les
    // cibles navigateur ; certaines dépendances bundlées référencent encore
    // `global` (alias Node de `globalThis`).
    new webpack.DefinePlugin({
      global: 'globalThis'
    })
  ],
  devServer: {
    static: path.join(__dirname, 'dist'),
    compress: true,
    port: 3000,
    hot: true,
    historyApiFallback: true
  },
  devtool: 'source-map'
};
