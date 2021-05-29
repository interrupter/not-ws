#!/bin/bash
echo 'building for' $ENV 'environment'
for i in "$@"
do
case $i in
    --env=*)
    ENV="${i#*=}"
    ;;
    --out-node=*)
    OUT_NODE="${i#*=}"
    ;;
    --out-browser=*)
    OUT_BROWSER="${i#*=}"
    ;;
esac
done

NODE_ENV=$ENV ./bin/not-ws.js --out-node $OUT_NODE --out-browser $OUT_BROWSER
NODE_ENV=$ENV ./node_modules/.bin/rollup -c ./rollup/client.browser.js
NODE_ENV=$ENV ./node_modules/.bin/terser --compress --mangle -- build/client.js > ./build/client.min.js
cp ./build/client.js ./example/node-browser/public
