const path = require('path'),
  yargs = require('yargs');

const isProductionBuild = yargs.argv.mode === 'production';
const commonConfig = {
  devtool: isProductionBuild ? 'none' : 'source-map',
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

// Bundle configuration: this includes both OPRF and libsodium
const bundle = Object.assign({
  entry: './src/oprf.ts',
  output: {
    filename: 'oprf.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'OPRF',
    libraryTarget: 'var'
  }
}, commonConfig);

// Slim configuration: only include OPRF, and require libsodium be passed to constructor
const slim = Object.assign({
  entry: './src/oprf.slim.ts',
  output: {
    filename: 'oprf.slim.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'OPRF',
    libraryTarget: 'var',
    libraryExport: 'OPRFSlim' // Expose OPRFSlim module so we don't have to call new OPRF.OPRFSlim()
  }
}, commonConfig);

module.exports = [
  bundle,
  slim
];
