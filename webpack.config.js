const path = require('path'),
  yargs = require('yargs'),
  exec = require('child_process').exec;

const isProductionBuild = yargs.argv.mode === 'production';

module.exports = {
  entry: './src/oprf.ts',
  output: {
    filename: 'oprf.js',
    path: path.resolve(__dirname, 'dist-web'),
    library: 'OPRF',
    libraryTarget: 'var',
    libraryExport: 'OPRF' // Expose OPRF module so we don't have to call new OPRF.OPRF()
  },
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
