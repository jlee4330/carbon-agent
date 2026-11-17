export function codeInRange(value:string,start:string,end:string):boolean{
 const parse=(text:string)=>text.trim().match(/^(.*?)(\d+)$/);
 const a=parse(start),b=parse(end),v=parse(value);
 if(!a||!b||!v||a[1]!==b[1]||v[1]!==a[1])return false;
 const low=Number(a[2]),high=Number(b[2]),current=Number(v[2]);
 return [low,high,current].every(Number.isSafeInteger)&&low<=high&&current>=low&&current<=high;
}
export function validCodeRange(start:string,end:string){return codeInRange(start,start,end)&&codeInRange(end,start,end);}
export function listedCodes(text:string){return new Set(text.split(/[\n,]+/).map(value=>value.trim()).filter(Boolean));}
