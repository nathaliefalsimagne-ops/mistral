const path = require('path');

module.exports = {
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'app/src')
    }
  },
  externals: {
    // Modules natifs qui ne doivent pas être bundle
    'better-sqlite3': 'commonjs better-sqlite3',
    'sqlite3': 'commonjs sqlite3',
    'electron': 'commonjs electron',
    'fs': 'commonjs fs',
    'path': 'commonjs path',
    'child_process': 'commonjs child_process'
  }
};
