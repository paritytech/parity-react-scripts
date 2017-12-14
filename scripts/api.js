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

const Api = require('@parity/api');
const Contracts = require('@parity/shared/lib/contracts').default;

const chalk = require('chalk');

const nodeUrl = 'http://localhost:8545';
const provider = new Api.Provider.Http(nodeUrl);
const api = new Api(provider);

async function setup () {
  try {
    const blockNumber = await api.eth.blockNumber();
    const contentHash = await api.parity.hashContent('http://github.com/paritytech');

    console.log(`Connected to a local Parity node, at block ${blockNumber.toFormat()}\nHash: ${contentHash}\n`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || /Method not found/i.test(error.message)) {
      console.error(chalk.bold.red(`You must have a local Parity node running at ${nodeUrl} with "--jsonrpc-apis=all" flag\n`));
    } else {
      console.error(chalk.bold.red(error.message));
    }

    process.exit(1);
  }
}

async function getAccounts () {
  const accounts = await api.eth.accounts();

  return accounts;
}

async function getContracts () {
  const contracts = Contracts.get(api);

  const dappReg = await contracts.dappReg.getContract();
  const githubHint = await contracts.githubHint.getContract();

  return { dappReg, githubHint };
}

module.exports = {
  api,
  getAccounts,
  getContracts,
  setup
};
