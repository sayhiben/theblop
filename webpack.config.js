// webpack.config.js
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

module.exports = [
  // 1) SERVER (Node) BUILD CONFIG
  {
    name: 'server',
    mode: 'production',
    target: 'node',
    entry: './src/main.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'build.js',
    },
    externals: [nodeExternals()],  // Don’t bundle node_modules
    externalsPresets: { node: true },
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: 'babel-loader',
        }
      ],
    },
    plugins: [
     new WebpackShellPluginNext({
        onAfterDone: {
          scripts: ['node dist/build.js'],
          blocking: false,
          parallel: true
        }
      })
    ],
    cache: { type: 'filesystem' },
  },

  // 2) CLIENT (Browser) BUILD CONFIG
  {
    name: 'client',
    mode: 'production',
    target: 'web', // <-- for browsers
    entry: {
      parseDates: './src/tasks/parseDates.js',
      filters: './src/scripts/filters.js',
      modal: './src/scripts/modal.js',
      menus: './src/scripts/menus.js',
      clipboard: './src/scripts/clipboard.js',
      maps: './src/scripts/maps.js',
    },
    output: {
      path: path.resolve(__dirname, 'dist', 'scripts'),
      filename: '[name].js', 
    },
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: 'babel-loader'
        }
      ]
    },
    // No nodeExternals here, because we *want* to bundle up dayjs, etc. for the browser.
    cache: { type: 'filesystem' },
  }
];