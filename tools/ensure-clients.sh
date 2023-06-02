#!/bin/sh

if test -f "./src/support/clients.js"; then
  echo "clients.js already exists"
  exit 0
fi

echo "module.exports = $FINDY_OIDC_CLIENTS_JSON;" >./src/support/clients.js

cat ./src/support/clients.js
