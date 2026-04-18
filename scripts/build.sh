#!/bin/bash
set -e

npm run build --prefix frontend
npm run build --prefix server
go build -C worker -o ./bin/worker ./cmd/worker
