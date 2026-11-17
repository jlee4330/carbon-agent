import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
export function loadConfig(){
 let local:Record<string,string|undefined>={};
 try{local=parseEnv(readFileSync(fileURLToPath(new URL('../.env',import.meta.url)),'utf8'));}catch{}
 return {apiKey:(local.OPENAI_API_KEY??process.env.OPENAI_API_KEY??'').trim(),model:(local.OPENAI_MODEL??process.env.OPENAI_MODEL??'gpt-6.1-sol').trim(),port:Number(local.PORT??process.env.PORT)||3001,chunkChars:Math.max(24000,Math.min(96000,Number(local.ANALYSIS_CHUNK_CHARS??process.env.ANALYSIS_CHUNK_CHARS)||96000)),concurrency:Math.max(1,Math.min(3,Math.floor(Number(local.ANALYSIS_CONCURRENCY??process.env.ANALYSIS_CONCURRENCY)||3)))};
}
