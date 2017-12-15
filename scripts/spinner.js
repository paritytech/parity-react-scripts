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

const ora = require('ora');

let spinner = null;

function fail (text) {
  if (spinner) {
    spinner.fail(text);
  }
}

function succeed (text) {
  if (spinner) {
    spinner.succeed(text);
  }
}

function start (text) {
  spinner = ora(text).start();

  return { succeed, fail };
}

module.exports = {
  start,
  fail,
  succeed
};
