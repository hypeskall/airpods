import {build} from 'esbuild';
import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=path.join(root,'.vercel','output');
// This fixed generated directory is the only directory the build ever removes.
if(output!==path.join(root,'.vercel','output'))throw new Error('Invalid build output');
await rm(output,{recursive:true,force:true});
const functionDirectory=path.join(output,'functions','server.func');
await mkdir(functionDirectory,{recursive:true});
await cp(path.join(root,'public'),path.join(output,'static'),{recursive:true});
await build({
  absWorkingDir:root,
  entryPoints:['vercel/server.ts'],
  outfile:path.join(functionDirectory,'index.mjs'),
  platform:'node',target:'node22',format:'esm',bundle:true,minify:false,
  banner:{js:"import {createRequire} from 'node:module'; const require = createRequire(import.meta.url);"},
  sourcemap:false,legalComments:'eof',
  plugins:[{name:'raw-files',setup(builder){
    builder.onResolve({filter:/\?raw$/},args=>({path:path.resolve(args.resolveDir,args.path.slice(0,-4)),namespace:'raw-file'}));
    builder.onLoad({filter:/.*/,namespace:'raw-file'},async args=>({contents:await readFile(args.path,'utf8'),loader:'text'}));
  }}],
});
await writeFile(path.join(functionDirectory,'.vc-config.json'),JSON.stringify({runtime:'nodejs22.x',handler:'index.mjs',launcherType:'Nodejs',maxDuration:30,regions:['dub1']},null,2));
await writeFile(path.join(functionDirectory,'package.json'),JSON.stringify({type:'module'}));
await writeFile(path.join(output,'config.json'),JSON.stringify({version:3,routes:[
  {src:'/(.*)',headers:{'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'},continue:true},
  {handle:'filesystem'},
  {src:'/(.*)',dest:'/server'},
]},null,2));
console.log('Vercel build complete: public assets + standalone Node.js commerce function.');
