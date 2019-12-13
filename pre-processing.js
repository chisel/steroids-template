const path = require('path');
const fs = require('fs-extra');

// Delete dist
fs.remove(path.join(__dirname, 'dist'));

// Add tsconfig paths to src/paths.json
const tsconfigPaths = require('./tsconfig.json').compilerOptions.paths || {};

// Remove ./src/ from the beginning
for ( const alias in tsconfigPaths ) {

  for ( let i = 0; i < tsconfigPaths[alias].length; i++ ) {

    tsconfigPaths[alias][i] = tsconfigPaths[alias][i].replace(/^\.?\/?src\//, '');

  }

}

fs.writeFileSync(path.resolve(__dirname, 'src', 'paths.json'), JSON.stringify(tsconfigPaths, null, 2));
