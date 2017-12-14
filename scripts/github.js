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

const githubClient = require('release-it/lib/github-client');
const git = require('release-it/lib/git');
const parseRepo = require('parse-repo');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');

const argv = require('minimist')(process.argv.slice(2));

async function getToken () {
  const token = process.env.GITHUB_TOKEN;

  if (token) {
    return token;
  }

  // Pass the token containing file with `-t` or `--token`
  if (argv.t || argv.token) {
    const filepath = path.resolve(argv.t || argv.token);

    if (!await fs.exists(filepath)) {
      throw new Error(`The file ${filepath} does not exists.`);
    }

    const content = (await fs.readFile(filepath)).toString().split('\n')[0].trim();

    if (content) {
      return content;
    }
  }

  throw new Error(`No Github token can be found.
Please use the "GITHUB_TOKEN" environment variable or specify the path of a file containing the token with -t or --token.`);
}

async function release ({ changelog, tagName, version, zipPath }) {
  const token = await getToken();
  const remoteUrl = await git.getRemoteUrl();
  const repo = parseRepo(remoteUrl);
  const github = {
    releaseName: 'Release %s',
    assets: zipPath,
    token
  };

  const spinner = ora('Publishing the release').start();
  const releaseInfo = await githubClient.release({ version, tagName, repo, changelog, github });

  spinner.succeed();
  spinner.start('Uploading the zip file');
  const [ assetInfo ] = await githubClient.uploadAssets({ releaseId: releaseInfo.id, repo, github });

  spinner.succeed();

  const assetUrl = assetInfo['browser_download_url'];
  const releaseUrl = releaseInfo['html_url'];

  return { assetUrl, releaseUrl };
}

module.exports = { getToken, release };
