const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
module.exports = {
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