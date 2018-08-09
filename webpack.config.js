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
    libraryExport: 'OPRF' // Expose OPRF module so we don't have to call new OPRF.OPRF(window.sodium)
  },
  devtool: isProductionBuild ? 'none' : 'source-map',
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
  },
  plugins: [{
    apply: (compiler) => {
      compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
        exec('rm -rf dist-web/types && mv dist-web/dist dist-web/types', (err, stdout, stderr) => {
          if (stdout) {
            process.stdout.write(stdout);
          }
          if (stderr) {
            process.stderr.write(stderr);
          }
        });
      });
    }
  }]
};
