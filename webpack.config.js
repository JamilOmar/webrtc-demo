const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    main: "./dist/ui/index.js",
  },
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name]-bundle.js',
  },
  plugins: [
    new CopyWebpackPlugin({patterns:[
      
      {
        from: './ui/html',
      }
    ]}),
  ],
};