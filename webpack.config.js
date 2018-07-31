module.exports = {
  entry: './src/oprf.ts',
  output: {
    filename: 'oprf.js',
    library: 'oprf'
  },
  externals: {
    'libsodium-wrappers-sumo': {
      commonjs: 'libsodium-wrappers-sumo',
      commonjs2: 'libsodium-wrappers-sumo',
      amd: 'libsodium-wrappers-sumo',
      root: 'sodium'
    }
  },
  resolve: {
    // Add '.ts' and '.tsx' as a resolvable extension.
    extensions: [".ts", ".tsx", ".js"]
  },
  module: {
    rules: [
      // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
      {test: /\.tsx?$/, loader: "ts-loader"}
    ]
  }
};
