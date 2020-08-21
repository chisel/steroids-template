import path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
import child from 'child_process';

let serverProcess: child.ChildProcess;

// Reconfigure the server for testing
before(function(done) {

  this.timeout(5000);

  // Activate test mode
  process.env.STEROIDS_TEST = 'active';

  // Run the server
  serverProcess = child.spawn('node', ['@steroids/main'], {
    cwd: path.resolve(__dirname, '..', '..', 'dist'),
    windowsHide: true,
    stdio: 'inherit'
  });

  // Give the server some time to initialize before starting the tests
  setTimeout(done, 2000);

});

describe('Server', function() {

  // Scan the test directory for spec files and import them here
  let files = fs.readdirSync(__dirname, { withFileTypes: true });
  let prefixes = files.map(() => '.');

  while ( files.length ) {

    const file = files.shift();
    const prefix = prefixes.shift();

    // If file
    if ( file.isFile() ) {

      // Skip files without .spec.js extension and main.spec.js
      if ( ! file.name.match(/^.+\.spec\.js$/) || file.name === 'main.spec.js') continue;

      // Import test
      import(path.resolve(__dirname, prefix, file.name));

    }
    // If directory
    else if ( file.isDirectory() ) {

      // Scan the directory
      const childFiles = fs.readdirSync(path.resolve(__dirname, prefix, file.name), { withFileTypes: true });
      const childPrefixes = childFiles.map(() => path.join(prefix, file.name));

      files = files.concat(childFiles);
      prefixes = prefixes.concat(childPrefixes);

    }

  }

});

// Kill the server
after(function() {

  serverProcess.kill();

});
