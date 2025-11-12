
module.exports = {
  entry: './src/index.ts',
  mode: "production",
  //mode: "development",
  output: {
    library: 'Drawflow',
    libraryTarget: 'umd',
    libraryExport: 'default',
    filename: 'drawflow.min.js',
    globalObject: `(typeof self !== 'undefined' ? self : this)`
  },
  optimization: {
    minimize: false
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  }
};
