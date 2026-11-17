import {mkdtempSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const output=mkdtempSync(join(tmpdir(),'carbon-server-'));
try{
 const build=spawnSync(resolve('node_modules/.bin/tsc'),['--noEmit','false','--allowImportingTsExtensions','true','--rewriteRelativeImportExtensions','true','--outDir',output],{stdio:'inherit'});
 if(build.status!==0)throw new Error('Server compilation failed');
 writeFileSync(join(output,'package.json'),'{"type":"module"}');
 symlinkSync(resolve('node_modules'),join(output,'node_modules'),'dir');
 for(const route of ['health','analyze','factors','classify-products','product-identities','review-repeats']){
  const entry=await import(pathToFileURL(join(output,'api',route+'.js')).href);
  if(typeof entry.default!=='function')throw new Error(`Missing handler: ${route}`);
 }
 console.log('All six compiled API entries load in native Node ESM.');
}finally{rmSync(output,{recursive:true,force:true});}
