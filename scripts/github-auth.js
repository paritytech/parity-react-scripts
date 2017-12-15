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
const fetch = require('node-fetch');
const config = require('./config');

const AUTH_URL = 'https://api.github.com/authorizations';
const GITHUB_SCOPES = [ 'repo' ];

const CLIENT_ID = 'b'.padStart(20, 'a');

async function connect ({ username, password, clientSecret, otp = null }) {
  const options = {
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      'X-GitHub-OTP': otp,
      'User-Agent': 'parity-react-scripts authenticator',
      'Content-type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      scopes: GITHUB_SCOPES,
      note: `Parity React Scripts (${new Date().toJSON()})`,
      'client_id': CLIENT_ID,
      'client_secret': clientSecret
    })
  };

  const req = await fetch(AUTH_URL, options);

  return req;
}

async function isAuthorised ({ clientId, clientSecret, token }) {
  const url = `https://api.github.com/applications/${clientId}/tokens/${token}`;

  const request = await fetch(url, {
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'User-Agent': 'parity-react-scripts authenticator'
    }
  });

  if (request.status === 401) {
    console.warn('no luck...', await request.text());
    return false;
  }

  await check(request);

  const data = await request.json();

  console.warn(data);
  return true;
}

async function check (request) {
  const { status } = request;

  if (status >= 300 || status < 200) {
    const text = await request.text();
    let json;

    try {
      json = JSON.parse(text);
    } catch (error) {
    }

    const message = json
      ? json.message
      : text;

    console.error({ json, text, status });
    throw new Error(message || `Unkown error occured (status code ${status})`);
  }
}

async function auth () {
  const { github } = await config.read();

  if (github && github.token && github.clientId && github.clientSecret) {
    const { clientId, clientSecret, token } = github;
    const authorized = await isAuthorised({ clientId, clientSecret, token });

    if (authorized) {
      return token;
    }
  }

  const { username, password } = await inquirer.prompt([
    { type: 'input', name: 'username', message: 'Enter your Github username:' },
    { type: 'password', name: 'password', message: 'Enter your Github password:' }
  ]);

  const clientSecret = 'a'.padStart(40, 'a');
  let request = await connect({ username, password, clientSecret });

  if (request.status === 401) {
    const otpHeader = request.headers.get('X-GitHub-OTP');

    // 2-FA required
    if (/required/.test(otpHeader)) {
      const { otp } = await inquirer.prompt([
        { type: 'input', name: 'otp', message: 'Enter your Github OTP/2FA Code:' }
      ]);

      request = await connect({ username, password, otp, clientSecret });
    }
  }

  if (request.status === 401) {
    throw new Error(`Invalid credentials for Github user "${username}".`);
  }

  await check(request);

  const { app, token } = await request.json();
  const { client_id: clientId } = app;

  await config.write({ github: { clientId, clientSecret, username, token } });
  return token;
}

auth().then(console.log).catch(console.error);

module.exports = auth;
