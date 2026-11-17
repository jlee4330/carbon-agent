import type {IncomingMessage} from 'node:http';

export function allowedOrigin(req:IncomingMessage){
 const origin=req.headers.origin;
 if(!origin)return true;
 try{
  const url=new URL(origin);
  if(url.origin!==origin)return false;
  if(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)&&!process.env.VERCEL)return true;
  return url.protocol==='https:'&&url.host===req.headers.host;
 }catch{return false;}
}

/** Vercel parses JSON bodies before invoking Node handlers; local HTTP does not. */
export async function* requestChunks(req:IncomingMessage & {body?:unknown}){
 if(req.body!==undefined){
  yield Buffer.isBuffer(req.body)?req.body:Buffer.from(typeof req.body==='string'?req.body:JSON.stringify(req.body));
  return;
 }
 for await(const chunk of req)yield Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
}
