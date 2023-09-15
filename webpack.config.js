const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
	  publicPath: '/dist/'
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: '/node_modules/',
        loader: 'ts-loader',
      },
      {
        test: /\.glsl$/,
        loader: 'ts-shader-loader'
      }
    ]
  },

  plugins: [
  ],

  devServer: {
    open: ['/index.html'],
    client: {
      overlay: true,
    },
    static: {
      directory: __dirname,
    },
  }
};