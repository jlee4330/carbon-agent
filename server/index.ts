import {createServer} from 'node:http';
import {handler} from './handler';
import {loadConfig} from './config';
const server=createServer(handler);
server.on('error',(error:NodeJS.ErrnoException)=>{console.error(error.code==='EADDRINUSE'?'포트가 사용 중입니다. .env의 PORT를 확인해주세요.':'서버를 실행할 수 없습니다. 로컬 터미널에서 npm run dev를 실행해주세요.');process.exitCode=1;});
server.listen(loadConfig().port,'127.0.0.1',()=>console.log(`Carbon Agent 1 API http://127.0.0.1:${loadConfig().port}`));
