const path = require('path');
const fs = require('fs-extra');

// Delete test/dist
if ( fs.existsSync(path.resolve(__dirname, 'test', 'dist')) ) {

  fs.removeSync(path.join(__dirname, 'test', 'dist'));

}
