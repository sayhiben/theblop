// webpack.config.js
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

module.exports = {
  mode: 'production',             // or 'development'
  target: 'node',                 // Important! We’re bundling for Node.js, not the browser
  entry: './src/main.js',         // Your primary entry point (or wherever your "main" orchestration is)
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'build.js',         // The final bundled file
  },
  externals: [nodeExternals()],   // Exclude all node_modules from the bundle
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,  // Don’t transpile node_modules
        use: {
          loader: 'babel-loader',
          // We can rely on .babelrc, so no additional options needed here
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  // Optional if you’re dealing with native modules or want to ensure certain
  // built-in modules remain external:
  externalsPresets: { node: true },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/scripts'),
          to: 'scripts', // copies to dist/scripts
        },
      ],
    }),
    new WebpackShellPluginNext({
      onAfterDone: {
        scripts: ['node dist/build.js'],
        blocking: false, // runs asynchronously so it won’t block the next build
        parallel: true  // run in parallel with webpack's watch process
      }
    })
  ],
  cache: { type: 'filesystem' },  // enable persistent caching for faster rebuilds
};
