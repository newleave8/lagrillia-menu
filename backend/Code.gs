/**
 * LAGRILLIA MENU - company owned Apps Script backend.
 * Bound to company spreadsheet: 1_e-pykxxQZQx9RecVSJuecst7Uqmq98fGHc5yqB4m6A
 * Set Script Properties: ADMIN_PIN (do NOT put in public GitHub), IMAGE_FOLDER_ID.
 * Deploy as web app: execute as me, access anyone. Never send secrets in public endpoints.
 */
const BOOK_ID='1_e-pykxxQZQx9RecVSJuecst7Uqmq98fGHc5yqB4m6A';
const COL={menu:'메뉴_DB',group:'옵션그룹_DB',item:'옵션항목_DB'};
function sheet_(name){const sh=SpreadsheetApp.openById(BOOK_ID).getSheetByName(name);if(!sh)throw Error('탭 없음: '+name);return sh}
function records_(name){const sh=sheet_(name);const all=sh.getDataRange().getValues();if(!all.length)return [];return all.slice(1).map((v,i)=>({row:i+2,data:Object.fromEntries(all[0].map((h,j)=>[String(h),v[j]]))})).filter(x=>Object.values(x.data).some(v=>v!==''))}
function publicCatalog_(){
 const entries=records_(COL.menu),groups=records_(COL.group),options=records_(COL.item);
 return {updatedAt:new Date().toISOString(),menus:entries.filter(x=>String(x.data['판매여부']).toUpperCase()==='Y').map(x=>{
  const d=x.data,id=String(d['메뉴ID']||'');
  const gid=String(d['옵션그룹ID']||'');
  const gr=groups.filter(g=>String(g.data['옵션그룹ID'])===gid);
  return {id,category:d['카테고리'],section:d['섹션'],name:d['메뉴명'],en:d['영문명'],price:Number(d['판매가(원)']),tag:d['배지'],listDesc:d['간단설명'],detail:d['상세설명'],imageUrl:d['이미지URL'],caption:d['이미지하단문구'],order:Number(d['노출순서'])||9999,
   options:gr.map(g=>({id:gid,name:g.data['그룹명'],min:Number(g.data['최소선택']),max:Number(g.data['최대선택']),items:options.filter(y=>String(y.data['옵션그룹ID'])===gid&&String(y.data['사용여부']).toUpperCase()!=='N').map(y=>({id:y.data['옵션ID'],name:y.data['옵션명'],extra:Number(y.data['추가금액(원)'])||0,imageUrl:y.data['이미지URL']}))}))}
 })).sort((a,b)=>a.order-b.order)}
}
function doGet(e){
 if(e&&e.parameter&&e.parameter.page==='admin')return HtmlService.createHtmlOutputFromFile('Admin').setTitle('라그릴리아 관리자').addMetaTag('viewport','width=device-width,initial-scale=1');
 const payload=publicCatalog_();const prefix=String(e?.parameter?.callback||'');
 if(prefix&&!/^lagMenuCallback$/.test(prefix))throw Error('callback not allowed');
 return ContentService.createTextOutput(prefix?prefix+'('+JSON.stringify(payload)+');':JSON.stringify(payload)).setMimeType(prefix?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON);
}
function signin(pin){
 const correct=PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');
 if(!correct)throw Error('스크립트 속성 ADMIN_PIN을 먼저 설정하세요');
 if(String(pin)!==correct)throw Error('관리자 인증 실패');
 const token=Utilities.getUuid()+Utilities.getUuid();
 CacheService.getScriptCache().put('lagadmin:'+token,'1',3600);
 return token;
}
function requireAuth_(token){if(!token||CacheService.getScriptCache().get('lagadmin:'+token)!=='1')throw Error('인증이 만료됐습니다. 다시 로그인하세요')}
function loadAdmin(token){requireAuth_(token);return {menus:records_(COL.menu).map(x=>x.data),groups:records_(COL.group).map(x=>x.data),items:records_(COL.item).map(x=>x.data)}}
function saveImage_(file){
 if(!file||!file.data)return '';
 const props=PropertiesService.getScriptProperties(),folderId=props.getProperty('IMAGE_FOLDER_ID');
 if(!folderId)throw Error('스크립트 속성 IMAGE_FOLDER_ID가 없습니다');
 if(!/^image\/(png|jpeg|webp)$/.test(file.mime))throw Error('지원하지 않는 이미지 형식');
 const raw=Utilities.base64Decode(String(file.data).replace(/^data:[^,]*,/,''));
 if(raw.length>3*1024*1024)throw Error('이미지는 3MB 이하로 올려주세요');
 const blob=Utilities.newBlob(raw,file.mime, String(file.name||'menu.jpg').replace(/[\\/]/g,'_'));
 const out=DriveApp.getFolderById(folderId).createFile(blob);
 out.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
 return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(out.getId())+'&sz=w1000';
}
function upsert_(sheet,identity,value,columns){
 const sh=sheet_(sheet);const all=sh.getDataRange().getValues();const headers=all[0];const keyIdx=headers.indexOf(identity);if(keyIdx<0)throw Error('ID 열 누락 '+identity);
 const key=String(value[identity]||'');if(!key)throw Error('메뉴/옵션 ID 필요');
 let row=all.findIndex((r,i)=>i>0&&String(r[keyIdx])===key)+1;
 const existing=row?all[row-1].slice():Array(headers.length).fill('');
 const next=headers.map((h,i)=>columns.includes(h)&&Object.prototype.hasOwnProperty.call(value,h)?value[h]:existing[i]);
 if(row)sh.getRange(row,1,1,headers.length).setValues([next]);else sh.appendRow(next);
}
function saveAdmin(token,input){
 requireAuth_(token);if(!input||!input.menu)throw Error('메뉴 데이터가 없습니다');
 const lock=LockService.getScriptLock();lock.waitLock(15000);
 try{
 const d=input.menu;
 if(!String(d.name||'').trim())throw Error('메뉴명 필수');
 if(!Number.isFinite(Number(d.price))||Number(d.price)<0)throw Error('판매가 오류');
 const id=String(d.id||'MENU-'+Utilities.getUuid().slice(0,8));
 const url=input.photo?.data?saveImage_(input.photo):String(d.imageUrl||'');
 const gid=String(d.groupId||(input.groups?.length?(input.groups[0].id||'GRP-'+Utilities.getUuid().slice(0,8)):''));
 upsert_(COL.menu,'메뉴ID',{'메뉴ID':id,'카테고리':d.category||'그릴','섹션':d.section||d.category||'그릴','메뉴명':d.name,'영문명':d.en||'','판매가(원)':Number(d.price),'배지':d.tag||'','간단설명':d.summary||'','상세설명':d.detail||'','이미지파일명':input.photo?.name||d.imageName||'','이미지URL':url,'이미지하단문구':d.caption||'','판매여부':'Y','노출순서':Number(d.order)||100,'옵션그룹ID':gid,'검증상태':'관리자 등록'},['메뉴ID','카테고리','섹션','메뉴명','영문명','판매가(원)','배지','간단설명','상세설명','이미지파일명','이미지URL','이미지하단문구','판매여부','노출순서','옵션그룹ID','검증상태']);
 // Option groups are upserted, never wholesale erased. Shared groups remain intact.
 (input.groups||[]).forEach((g,i)=>{
  const groupId=String(g.id||gid||('GRP-'+Utilities.getUuid().slice(0,8)));
  upsert_(COL.group,'옵션그룹ID',{'옵션그룹ID':groupId,'그룹명':g.name||'옵션 선택','최소선택':Number(g.min)||0,'최대선택':Number(g.max)||0,'중복선택허용':g.allowDuplicate?'Y':'N','필수여부':Number(g.min)>0?'Y':'N','노출순서':i+1,'사용여부':'Y'},['옵션그룹ID','그룹명','최소선택','최대선택','중복선택허용','필수여부','노출순서','사용여부']);
  (g.items||[]).forEach((item,j)=>{
   const optId=String(item.id||('OPT-'+Utilities.getUuid().slice(0,8)));
   const image=item.photo?.data?saveImage_(item.photo):String(item.imageUrl||'');
   upsert_(COL.item,'옵션ID',{'옵션그룹ID':groupId,'옵션ID':optId,'옵션명':item.name||'','추가금액(원)':Number(item.extra)||0,'이미지파일명':item.photo?.name||'','이미지URL':image,'노출순서':j+1,'사용여부':'Y'},['옵션그룹ID','옵션ID','옵션명','추가금액(원)','이미지파일명','이미지URL','노출순서','사용여부']);
  })
 });
 SpreadsheetApp.flush();return {success:true,id,imageUrl:url,updatedAt:new Date().toISOString()};
 }finally{lock.releaseLock()}
}
