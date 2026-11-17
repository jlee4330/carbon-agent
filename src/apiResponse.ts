export async function readApiJson(response:Response){
 const text=await response.text();
 let data;
 try{data=JSON.parse(text);}catch{
  throw new Error(response.status===404
   ?'분석 API를 찾을 수 없습니다. 서버 배포 설정을 확인해주세요. (404)'
   :`서버 응답을 읽을 수 없습니다. 잠시 후 다시 시도해주세요. (${response.status})`);
 }
 if(!response.ok)throw new Error(data?.error||`서버 요청에 실패했습니다. (${response.status})`);
 return data;
}
