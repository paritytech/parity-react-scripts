#!/usr/bin/env node
// Copyright 2015-2017 Parity Technologies (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

'use strict';

const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const lint = require('./scripts/lint');
const publish = require('./scripts/publish');

const DAPP_DIRECTORY = fs.realpathSync(process.cwd());
const MANIFEST_FILE = path.join(DAPP_DIRECTORY, 'manifest.json');

async function main () {
  const command = process.argv[2];

  // If linting, spawn a new process and pass all the arguments
  if (command === 'lint') {
    return lint();
  }

  if (command === 'publish') {
    return publish();
  }

  delete require.cache[require.resolve(MANIFEST_FILE)];
  const manifest = require(MANIFEST_FILE);

  // The base public URL will be the `http://localhost:8545/:dappId/`
  process.env.PUBLIC_URL = `/${manifest.id.replace(/^0x/, '')}`;

  // Do not use React-Script own paths
  process.env.RS_SKIP_OWN = 1;

  // Set the configuration path
  process.env.CONFIG = path.resolve(__dirname, 'config.js');

  // Run the main React Scripts
  require('react-scripts-config/bin/react-scripts');
}

main()
  .then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(chalk.bold.red(error.message) + '\n');
    process.exit(1);
  });
