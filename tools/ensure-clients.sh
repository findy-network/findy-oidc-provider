#!/bin/bash

if test -f "./src/support/clients.js"; then
    echo "clients.js already exists"
    exit 0
fi

echo "module.exports = [];" > ./src/support/clients.js
