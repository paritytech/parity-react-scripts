# Parity React Scripts

A set of scripts for build React apps and dapps.
It uses the famous `create-react-app` scripts, and adds some Parity specific
configuration (custom eslint, stylelint, Babel config..)

It also enable publishing the dapps to the Dapp Registry with a simple script.
It releases a new relase on Github with the bundled dapp as an asset, and
writes on the contract the new values.

## Github Authentication

To authenticate to Github, an OAuth token is generated, and stored local in the
default platform specific config directory (see https://github.com/LinusU/node-application-config-path)
