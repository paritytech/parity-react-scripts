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

const path = require('path');
const { spawn } = require('child_process');
const ora = require('ora');
const fs = require('fs-extra');
const archiver = require('archiver');
const ReleaseIt = require('release-it');

const DAPP_DIRECTORY = fs.realpathSync(process.cwd());
const BUILD_DIRECTORY = path.join(DAPP_DIRECTORY, 'build');

const MANIFEST_FILE = path.join(DAPP_DIRECTORY, 'manifest.json');
const PACKAGE_FILE = path.join(DAPP_DIRECTORY, 'package.json');

/**
 * ToDo:
 *   - Check if connection to Parity node is OK
 *   - Ask what kind of release before calling Release-IT (patch, major, etc.)
 *   - Fork Release-It : don't ask for Github Release if no token, enable force push
 *   - Create a release after the zip : put the zip content hash in body ?
 *   - Update the dapp registry: if no ID in manifest, create a new one, then as usual
 */
async function publish () {
  await ReleaseIt({
    npm: {
      private: true
    },
    github: {
      release: false
    },
    increment: 'patch'
  });

  if (!await fs.exists(BUILD_DIRECTORY)) {
    throw new Error(`The build directory ${BUILD_DIRECTORY} does not exist.\nBuild the project first.`);
  }

  if (!await fs.exists(MANIFEST_FILE)) {
    throw new Error(`The manifest file at ${MANIFEST_FILE} does not exist.\nCreate it first.`);
  }

  delete require.cache[require.resolve(MANIFEST_FILE)]
  delete require.cache[require.resolve(PACKAGE_FILE)]

  const manifest = require(MANIFEST_FILE);
  const appPackage = require(PACKAGE_FILE);

  const ICON_FILE = path.join(DAPP_DIRECTORY, manifest.iconUrl);

  if (!await fs.exists(ICON_FILE)) {
    throw new Error(`The icon file at ${ICON_FILE} does not exist.\nCreate it first.`);
  }

  const spinner = ora('Copying files').start();

  // Delete dev local_url field
  if (manifest.localUrl) {
    delete manifest.localUrl;
  }

  if (manifest['local_url']) {
    delete manifest['local_url'];
  }

  // Copy fields from package.json file
  manifest.author = appPackage.author;
  manifest.version = appPackage.version;

  await fs.writeFile(path.join(BUILD_DIRECTORY, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.copyFile(ICON_FILE, path.join(BUILD_DIRECTORY, manifest.iconUrl));

  spinner.succeed();

  spinner.start('Compressing the project');
  await zip();
  spinner.succeed();
}

async function zip () {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(path.join(DAPP_DIRECTORY, 'build.zip'));
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => {
      resolve();
    });

    archive.on('error', (error) => {
      reject(error)
    });

    archive.pipe(output);
    archive.directory(BUILD_DIRECTORY, false);
    archive.finalize();
  });
}

module.exports = publish;
