import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {analyzeTable,chunkRows,mergeMappings,AnalysisError,type Table} from './analysis.js';
import {fields,type Mapping} from '../src/shared.js';
import {workbookTables} from '../src/workbook.js';
import {inputSchema} from './schema.js';
import {sampleTable} from './sampling.js';
const mappings:Mapping[]=fields.map(([field])=>({field,column:field==='item'?'c0':null,status:field==='item'?'recommended':'missing',reason:'자료 확인'}));
const response=()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({mappings})}]}]}));
test('all rows and full cell values are retained through chunking',()=>{
 const table:Table={name:'구매',header:0,columns:[{id:'c0',name:'품목'}],rows:Array.from({length:70},(_,i)=>[`${i}:`+'가'.repeat(700)])};
 assert.equal(inputSchema.safeParse(table).success,true);
 const chunks=chunkRows(table,2500);assert.ok(chunks.length>1);assert.deepEqual(chunks.flatMap(c=>c.rows),table.rows);assert.equal(chunks[1].start,chunks[0].rows.length);
});
test('every data sheet, including hidden sheets, is included; trailing data columns are retained',()=>{
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['품목','금액','수량'],['종이',100,2,'추가정보']]),'구매');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['기간'],['품목','금액','수량'],['서비스',200,1]]),'서비스');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([]),'빈 시트');wb.Workbook={Sheets:[{name:'구매'},{name:'서비스',Hidden:1},{name:'빈 시트'}]};
 const tables=workbookTables(wb,{서비스:1});assert.deepEqual(tables.map(t=>t.name),['구매','서비스']);assert.equal(tables[0].rows[0][3],'추가정보');assert.equal(tables[0].columns[3].id,'c3');assert.equal(tables[1].rows.length,1);
});
test('LLM receives bounded examples across the sheet and retains original row count',async()=>{
 const table:Table={name:'구매',header:0,columns:[{id:'c0',name:'품목'}],rows:Array.from({length:240},(_,i)=>[`${i}:`+'a'.repeat(1000)])};const sent:string[][]=[];const counts:number[]=[];
 const fake:typeof fetch=async(_url,init)=>{const request=JSON.parse(String(init?.body));sent.push(...JSON.parse(request.input[1].content).rows);return response();};
 const result=await analyzeTable(table,{apiKey:'test',model:'test'},new AbortController().signal,n=>counts.push(n),fake);
 assert.deepEqual(sent,sampleTable(table).table.rows);assert.equal(result.rowCount,240);assert.equal(result.sampledRowCount,24);assert.equal(result.chunkCount,1);assert.equal(counts.at(-1),24);assert.equal(sent[0][0].slice(0,2),"0:");assert.ok(sent.at(-1)![0].startsWith("239:"));
});
test('authentication rejection is preserved instead of reported as success',async()=>{
 const fake:typeof fetch=async()=>new Response(JSON.stringify({error:{code:'invalid_api_key',message:'secret must never be echoed'}}),{status:401});
 await assert.rejects(analyzeTable({name:'구매',header:0,columns:[{id:'c0',name:'품목'}],rows:[['종이']]},{apiKey:'test',model:'test'},new AbortController().signal,()=>assert.fail('No progress on failure'),fake),(e:unknown)=>e instanceof AnalysisError&&e.code==='OPENAI_AUTH_REJECTED'&&!e.message.includes('secret'));
});
test('failed sampled request does not produce a success result',async()=>{
 let calls=0;const fake:typeof fetch=async()=>{calls++;return new Response(JSON.stringify({error:{code:'insufficient_quota'}}),{status:429});};
 await assert.rejects(analyzeTable({name:'購入',header:0,columns:[{id:'c0',name:'품목'}],rows:Array.from({length:600},()=>['a'.repeat(1000)])},{apiKey:'test',model:'test'},new AbortController().signal,()=>assert.fail('No progress on failure'),fake));assert.equal(calls,1);
});
test('conflicting per-chunk mappings require review',()=>{
 const other=mappings.map(m=>m.field==='item'?{...m,column:'c1'}:m);assert.equal(mergeMappings([{mappings},{mappings:other}])[1].status,'review');
});
test('IP restriction is distinguished from an invalid key',async()=>{
 const fake:typeof fetch=async()=>new Response(JSON.stringify({error:{code:'ip_not_authorized'}}),{status:401});
 await assert.rejects(analyzeTable({name:'구매',header:0,columns:[{id:'c0',name:'품목'}],rows:[['종이']]},{apiKey:'test',model:'test'},new AbortController().signal,()=>{},fake),(e:unknown)=>e instanceof AnalysisError&&e.code==='OPENAI_IP_REJECTED');
});
test('sampling keeps small sheets intact and bounds wide-sheet examples without changing source values',()=>{
 const small:Table={name:'구매',header:0,columns:[{id:'c0',name:'품목'}],rows:[['종이'],['0'],['']]};
 assert.deepEqual(sampleTable(small).table.rows,small.rows);
 const wide:Table={name:'구매',header:0,columns:Array.from({length:200},(_,i)=>({id:`c${i}`,name:`열${i}`})),rows:Array.from({length:100},()=>Array.from({length:200},()=>'가'.repeat(1000)))};
 const sampled=sampleTable(wide);
 assert.equal(sampled.table.rows.length,3);assert.deepEqual(sampled.rowNumbers,[1,51,100]);assert.equal(sampled.truncatedCells,600);assert.equal(wide.rows[0][0].length,1000);assert.ok(JSON.stringify(sampled.table.rows).length<100000);
});

test('selected-sheet analysis ignores other sheets including invalid tables',async()=>{
 const {parsedWorkbookTables}=await import('../src/workbook.ts');
 const book={SheetNames:['안내','구매','기타'],sheets:{안내:[['설명만 있는 시트']],구매:[['품목','수량','금액'],['종이','2','100']],기타:[Array.from({length:201},()=> '열'),Array.from({length:201},()=> '값')]}};
 const tables=parsedWorkbookTables(book, {구매:0}, '구매');
 assert.deepEqual(tables.map(table=>table.name),['구매']);
 assert.deepEqual(tables[0].rows,[['종이','2','100']]);
 assert.throws(()=>parsedWorkbookTables(book,{},'없는 시트'));
 assert.throws(()=>parsedWorkbookTables(book,{},'안내'));
});
