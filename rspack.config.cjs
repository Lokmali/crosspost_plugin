const { container } = require('@rspack/core');

module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  target: 'web',
  devtool: 'source-map',
  devServer: {
    port: 3999,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Near-Account',
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new container.ModuleFederationPlugin({
      name: 'crosspostPlugin',
      filename: 'remoteEntry.js',
      exposes: {
        './plugin': './src/index.ts',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
      },
    }),
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  output: {
    path: require('path').resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
};