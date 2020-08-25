const path = require('path');
const fs = require('fs-extra');
const uglify = require('uglify-es');
const _ = require('lodash');
const package = require('./package.json');

// Copy all assets
if ( package && package.assets && typeof package.assets === 'object' && package.assets.constructor === Array ) {

  for ( const asset of package.assets ) {

    fs.copySync(path.join(__dirname, 'src', asset), path.join(__dirname, 'dist', asset));

  }

}
