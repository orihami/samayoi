cd "$(dirname "$0")" && npx esbuild game.js --bundle --minify --format=iife --target=es2020 --outfile=game.min.js 2>&1 | grep -iE "error|✘" ; node -e "
const fs=require('fs');let js=fs.readFileSync('game.min.js','utf8').replace(/<\/script/gi,'<\\\\/script');
const h=fs.readFileSync('template.html','utf8').split('/*GAME*/');fs.writeFileSync("../index.html",h[0]+js+h[1]);console.log('built',fs.statSync('samayoi.html').size)"
