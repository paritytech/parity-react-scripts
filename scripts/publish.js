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

const inquirer = require('inquirer');
const path = require('path');
const ora = require('ora');
const fs = require('fs-extra');
const archiver = require('archiver');
const ReleaseIt = require('release-it');

const { getToken, release } = require('./github');
const { getAccounts, setup } = require('./api');
const { getDappOwner, updateDapp } = require('./dapp-utils');

const DAPP_DIRECTORY = fs.realpathSync(process.cwd());
const BUILD_DIRECTORY = path.join(DAPP_DIRECTORY, 'build');

const MANIFEST_FILE = path.join(DAPP_DIRECTORY, 'manifest.json');
const PACKAGE_FILE = path.join(DAPP_DIRECTORY, 'package.json');

delete require.cache[require.resolve(MANIFEST_FILE)];
delete require.cache[require.resolve(PACKAGE_FILE)];

const manifest = require(MANIFEST_FILE);
const appPackage = require(PACKAGE_FILE);

function isHex (value) {
  return /^0x([0-9a-g]{2})*$/i.test(value);
}

async function publish () {
  await setup();

  // Verify that the Github token is available
  await getToken();

  const dappId = manifest.id;

  if (!dappId || !isHex(dappId)) {
    throw new Error('You must have the `id` field in the Manifest set to a valid dapp id. Please update.');
  }

  const dappOwner = await getDappOwner({ id: dappId });
  const accounts = (await getAccounts()).map((a) => a.toLowerCase());

  if (!accounts.includes(dappOwner.toLowerCase())) {
    throw new Error(`This dapp is owned by ${dappOwner}, which is not in your local accounts.`);
  }

  const { increment } = await inquirer.prompt([ {
    type: 'list',
    name: 'increment',
    message: 'Choose the release type: ',
    choices: [
      { name: 'Patch', value: 'patch' },
      { name: 'Minor', value: 'minor' },
      { name: 'Major', value: 'major' }
    ],
    default: 'patch'
  } ]);

  const { changelog, tagName, version } = await ReleaseIt({
    npm: {
      publish: false
    },
    github: {
      release: false
    },
    increment: increment,
    'dry-run': false
  });

  if (!await fs.exists(BUILD_DIRECTORY)) {
    throw new Error(`The build directory ${BUILD_DIRECTORY} does not exist.\nBuild the project first.`);
  }

  if (!await fs.exists(MANIFEST_FILE)) {
    throw new Error(`The manifest file at ${MANIFEST_FILE} does not exist.\nCreate it first.`);
  }

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
  manifest.author = appPackage.author || '';
  manifest.version = appPackage.version;

  if (!manifest.description) {
    manifest.description = appPackage.description || '';
  }

  if (!manifest.name) {
    manifest.name = appPackage.name || '';
  }

  // Update the manifest file in the build folder and in the dapp root folder
  await fs.writeFile(path.join(BUILD_DIRECTORY, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(DAPP_DIRECTORY, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.copyFile(ICON_FILE, path.join(BUILD_DIRECTORY, manifest.iconUrl));

  spinner.succeed();

  spinner.start('Compressing the project');
  const zipPath = await zip();

  spinner.succeed();

  const { assetUrl, releaseUrl } = await release({ changelog, tagName, version, zipPath });

  ora(`Release published at ${releaseUrl}`).start().succeed();

  const baseUrl = releaseUrl
    .replace('://github.com/', '://raw.githubusercontent.com/')
    .replace('releases/tag/', '');

  const manifestUrl = `${baseUrl}/manifest.json`;
  const imageUrl = `${baseUrl}/${manifest.iconUrl}`;

  const requestIds = await updateDapp({
    id: dappId,
    manifest: manifestUrl,
    image: imageUrl,
    content: assetUrl
  });

  console.log(`  You have to accept ${requestIds.length} requests in order to finish the process.`);
}

async function zip () {
  return new Promise((resolve, reject) => {
    const filepath = path.join(DAPP_DIRECTORY, 'build.zip');
    const output = fs.createWriteStream(filepath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => {
      resolve(filepath);
    });

    archive.on('error', (error) => {
      reject(error);
    });

    archive.pipe(output);
    archive.directory(BUILD_DIRECTORY, false);
    archive.finalize();
  });
}

module.exports = publish;
