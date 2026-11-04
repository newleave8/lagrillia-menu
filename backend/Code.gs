/** Company-owned menu backend. Secrets belong only in Script Properties. */
const BOOK_ID='1_e-pykxxQZQx9RecVSJuecst7Uqmq98fGHc5yqB4m6A';
const COL={menu:'메뉴_DB',group:'옵션그룹_DB',item:'옵션항목_DB'};
function book_(){return SpreadsheetApp.openById(BOOK_ID)}
function sheet_(n){const s=book_().getSheetByName(n);if(!s)throw Error('탭 없음: '+n);return s}
function records_(n){const a=sheet_(n).getDataRange().getValues();return a.slice(1).filter(r=>r.some(v=>v!=='')).map(r=>Object.fromEntries(a[0].map((h,i)=>[h,r[i] instanceof Date?r[i].toISOString():r[i]])))}
function ids_(s){return String(s||'').split(',').map(x=>x.trim()).filter(Boolean)}
function hashRecords_(rows){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(rows)))}
function rowsToRecords_(a){return a.slice(1).filter(r=>r.some(v=>v!=='')).map(r=>Object.fromEntries(a[0].map((h,i)=>[h,r[i] instanceof Date?r[i].toISOString():r[i]])))}
function readDb_(){const b=book_();const tables=Object.values(COL).map(name=>{const sh=b.getSheetByName(name);if(!sh)throw Error('탭 없음: '+name);const values=sh.getDataRange().getValues();return {name,sh,values,records:rowsToRecords_(values)}});const [menus,groups,items]=tables.map(t=>t.records);return {tables,menus,groups,items,revision:hashRecords_([menus,groups,items])}}
function revision_(){return readDb_().revision}
function writeLock_(){const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw Error('다른 관리자가 저장 중입니다. 입력 내용은 유지되니 잠시 후 다시 저장하세요.');return lock}
function appendPrepared_(table,objects,writes){if(!objects.length)return;const headers=table.values[0],rows=objects.map(o=>headers.map(h=>safeCell_(o[h]??'')));const range=table.sh.getRange(table.values.length+1,1,rows.length,headers.length);writes.push(range);range.setValues(rows)}

function asset_(url,name){return url|| (name?'https://newleave8.github.io/lagrillia-menu/assets/'+encodeURIComponent(name):'')}
function detailFields_(m){const raw=String(m['상세설명']||'');const match=raw.match(/\[\s*알레르기\s*정보\s*(?::\s*([^\]]*))?\]\s*([\s\S]*)$/);return {detail:match?raw.slice(0,match.index).trimEnd():raw,allergens:String(m['알레르기정보']||(match?(match[1]||match[2]||'').trim():'')),origin:String(m['원산지']||'')}}
function spicyName_(name,level){const n=Number(level);return String(name||'')+(Number.isInteger(n)&&n>0&&n<=3?' '+'🔥'.repeat(n):'')}
function publicCatalog_(){const db=readDb_(),groups=db.groups,items=db.items;const categories=categorySettings_();return {schemaVersion:3,categories,revision:db.revision+'-display-v1-'+hashRecords_(categories),menus:db.menus.filter(m=>m['메뉴ID']).map(m=>({id:String(m['메뉴ID']),category:m['카테고리'],section:m['섹션'],name:spicyName_(m['메뉴명'],m['매운맛']),plainName:m['메뉴명'],en:m['영문명'],price:m['판매가(원)']===''?null:Number(m['판매가(원)']),tag:m['배지'],discounted:m['할인제품']==='Y',originalPrice:m['할인제품']==='Y'?Number(m['정상가(원)'])||null:null,spicy:Number(m['매운맛'])||0,listDesc:m['간단설명'],detail:detailFields_(m).detail,origin:detailFields_(m).origin,allergens:detailFields_(m).allergens,imageUrl:asset_(m['이미지URL'],m['이미지파일명']),caption:m['이미지하단문구'],active:String(m['판매여부']).toUpperCase()==='Y',order:Number(m['노출순서'])||9999,options:ids_(m['옵션그룹ID']).flatMap(id=>groups.filter(g=>g['옵션그룹ID']===id&&g['사용여부']!=='N').map(g=>({id,name:g['그룹명'],min:Number(g['최소선택'])||0,max:Number(g['최대선택'])||0,allowDuplicate:g['중복선택허용']==='Y',items:items.filter(o=>o['옵션그룹ID']===id&&o['사용여부']!=='N').sort((a,b)=>Number(a['노출순서'])-Number(b['노출순서'])).map(o=>({id:o['옵션ID'],name:spicyName_(o['옵션명'],o['매운맛']),plainName:o['옵션명'],extra:Number(o['추가금액(원)'])||0,spicy:Number(o['매운맛'])||0,imageUrl:asset_(o['이미지URL'],o['이미지파일명'])}))})))})).sort((a,b)=>a.order-b.order)}}
function doGet(e){if(e?.parameter?.page==='checkout')return checkoutPage_(e.parameter.channel);if(e?.parameter?.page==='admin')return HtmlService.createHtmlOutputFromFile('Admin').setTitle('라그릴리아 관리자').addMetaTag('viewport','width=device-width,initial-scale=1');const cb=String(e?.parameter?.callback||'');if(cb&&cb!=='lagMenuCallback')throw Error('잘못된 callback');const payload=publicCatalog_();const json=JSON.stringify(payload).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');return ContentService.createTextOutput(cb?cb+'('+json+');':json).setMimeType(cb?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON)}
function signin(pin){const lock=LockService.getUserLock();if(!lock.tryLock(5000))throw Error('로그인 처리 중입니다. 잠시 후 다시 시도하세요.');try{const c=CacheService.getScriptCache(),key='signin-attempts',n=Number(c.get(key)||0);if(n>=10)throw Error('로그인 시도 제한. 5분 후 다시 시도하세요');const correct=PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');if(!correct)throw Error('관리자 비밀번호를 서버 속성에 설정하세요');if(String(pin)!==correct){c.put(key,String(n+1),300);throw Error('관리자 인증 실패')}c.remove(key);const token=Utilities.getUuid()+Utilities.getUuid();c.put('auth:'+token,'1',3600);return token}finally{lock.releaseLock()}}
function requireAuth_(t){if(typeof t!=='string'||CacheService.getScriptCache().get('auth:'+t)!=='1')throw Error('인증이 만료됐습니다. 다시 로그인하세요')}
function signout(token){requireAuth_(token);CacheService.getScriptCache().remove('auth:'+token);return true}
function loadAdmin(token){requireAuth_(token);const lock=writeLock_();try{const db=readDb_();return {menus:db.menus,groups:db.groups,items:db.items,categories:categorySettings_(),revision:db.revision}}finally{lock.releaseLock()}}
function text_(v,max){const s=String(v??'');if(s.length>(max||5000))throw Error('입력 길이 초과');return s}
function number_(v,label,max){if(v===''||v===null||v===undefined||!Number.isSafeInteger(Number(v))||Number(v)<0||Number(v)>(max||10000000))throw Error(label+' 입력 오류');return Number(v)}
function url_(v){v=text_(v,2000);if(v&&!/^https:\/\/(?:drive\.google\.com|lh3\.googleusercontent\.com|newleave8\.github\.io)\//.test(v))throw Error('허용되지 않은 사진 주소');return v}
function photo_(f){if(!f?.data)return null;if(!/^image\/(png|jpeg|webp)$/.test(f.mime)||typeof f.data!=='string'||f.data.length>4300000)throw Error('사진은 JPG/PNG/WebP 3MB 이하');const raw=Utilities.base64Decode(f.data.replace(/^data:[^,]*,/,''));if(!raw.length||raw.length>3*1024*1024)throw Error('사진 크기 오류');const b=raw.map(x=>(x+256)%256);if(!(f.mime==='image/jpeg'&&b[0]===255&&b[1]===216||f.mime==='image/png'&&b.slice(0,8).join(',')==='137,80,78,71,13,10,26,10'||f.mime==='image/webp'&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP'))throw Error('사진 파일 형식 불일치');return {raw,mime:f.mime,name:text_(f.name||'menu.jpg',150)}}
function upload_(photo,created){if(!photo)return '';const folder=PropertiesService.getScriptProperties().getProperty('IMAGE_FOLDER_ID');if(!folder)throw Error('사진 폴더 초기화 필요');const f=DriveApp.getFolderById(folder).createFile(Utilities.newBlob(photo.raw,photo.mime,photo.name.replace(/[\\/]/g,'_')));created.push(f);f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);return 'https://drive.google.com/thumbnail?id='+f.getId()+'&sz=w1000'}
function safeCell_(v){return typeof v==='string'&&/^[=+@-]/.test(v)?"'"+v:v}
function upsert_(name,key,value){const sh=sheet_(name),a=sh.getDataRange().getValues(),h=a[0],idx=h.indexOf(key);if(idx<0)throw Error('열 누락: '+key);let r=a.findIndex((v,i)=>i>0&&String(v[idx])===String(value[key]));const next=h.map((k,i)=>Object.hasOwnProperty.call(value,k)?safeCell_(value[k]):r>0?a[r][i]:'');sh.getRange(r>0?r+1:sh.getLastRow()+1,1,1,h.length).setValues([next])}
function saveAdmin(token,input){requireAuth_(token);if(!input?.menu)throw Error('메뉴 데이터 없음');const d=input.menu;const name=text_(d.name,150).trim();if(!name)throw Error('메뉴명 필수');const price=number_(d.price,'판매가');const discounted=d.discounted===true;const originalPrice=discounted?number_(d.originalPrice,'정상가'):null;if(discounted&&(!originalPrice||originalPrice<=price))throw Error('할인가는 정상가보다 낮아야 합니다');const spicy=number_(d.spicy??0,'매운맛',3);const gs=input.groups||[];if(!Array.isArray(gs)||gs.length>10)throw Error('옵션 그룹 최대 10개');let size=0;const photo=photo_(input.photo);size+=photo?.raw.length||0;const prepared=gs.map(g=>{const min=number_(g.min,'최소 선택',100),max=number_(g.max,'최대 선택',100);if(min>max)throw Error('최소 선택이 최대 선택보다 큽니다');if(!text_(g.name,150).trim()||!Array.isArray(g.items)||g.items.length>50||!g.items.length)throw Error('그룹명과 옵션 항목 필요');if((!g.allowDuplicate&&max>g.items.length))throw Error('중복 불가 그룹의 최대 선택 오류');return {...g,name:text_(g.name,150),min,max,items:g.items.map(o=>{if(!text_(o.name,150).trim())throw Error('옵션명 필수');const p=photo_(o.photo);size+=p?.raw.length||0;return {...o,name:text_(o.name,150),extra:number_(o.extra,'추가금액'),spicy:number_(o.spicy??0,'옵션 매운맛',3),imageUrl:url_(o.imageUrl),preparedPhoto:p}})}});if(size>12*1024*1024)throw Error('한 번에 저장할 사진은 총 12MB 이하');['en','summary','detail','caption','category','section','tag','origin','allergens'].forEach(k=>text_(d[k]));url_(d.imageUrl);if(d.id&&!/^[a-zA-Z0-9_-]{1,100}$/.test(d.id))throw Error('메뉴 ID 오류');const order=number_(d.order??100,'노출순서');const id=d.id||'menu-'+Utilities.getUuid();const created=[];let result,retainUploads=false;
 try{
 // Drive work can be slow: never hold the database lock while uploading.
 const image=upload_(photo,created)||d.imageUrl||'';const groupRows=[],itemRows=[],groupIds=[];
 prepared.forEach((g,i)=>{const gid='grp-'+Utilities.getUuid();groupIds.push(gid);groupRows.push({'옵션그룹ID':gid,'그룹명':g.name,'최소선택':g.min,'최대선택':g.max,'중복선택허용':g.allowDuplicate?'Y':'N','필수여부':g.min?'Y':'N','노출순서':i+1,'사용여부':'Y'});g.items.forEach((o,j)=>itemRows.push({'옵션그룹ID':gid,'옵션ID':'opt-'+Utilities.getUuid(),'옵션명':o.name,'추가금액(원)':o.extra,'매운맛':o.spicy,'이미지파일명':o.preparedPhoto?.name||o.imageName||'','이미지URL':upload_(o.preparedPhoto,created)||o.imageUrl||'','노출순서':j+1,'사용여부':'Y'}))});
 const value={'메뉴ID':id,'카테고리':d.category||'그릴','섹션':d.section==null?(d.category||'그릴'):text_(d.section).trim(),'메뉴명':name,'영문명':d.en||'','판매가(원)':price,'할인제품':discounted?'Y':'N','정상가(원)':originalPrice??'','배지':d.tag||'','간단설명':d.summary||'','상세설명':d.detail||'','이미지파일명':photo?.name||d.imageName||'','이미지URL':image,'이미지하단문구':d.caption||'','판매여부':d.active===false?'N':'Y','노출순서':order,'옵션그룹ID':groupIds.join(','),'검증상태':'관리자 저장','매운맛':spicy,'원산지':text_(d.origin),'알레르기정보':text_(d.allergens)};
 const lock=writeLock_();const writes=[];let menuRange=null,menuBefore=null;
 try{
 const db=readDb_();if(input.revision!==db.revision)throw Error('다른 관리자가 변경했습니다. 다시 불러온 후 저장하세요');
 const table=db.tables[0],headers=table.values[0],key=headers.indexOf('메뉴ID'),idx=table.values.findIndex((r,i)=>i>0&&String(r[key])===id);
 if(d.id&&idx<1)throw Error('기존 메뉴를 찾을 수 없습니다');
 // Append complete option batches; switch the menu reference only after both are flushed.
 appendPrepared_(db.tables[1],groupRows,writes);appendPrepared_(db.tables[2],itemRows,writes);SpreadsheetApp.flush();
 const row=headers.map((h,i)=>Object.hasOwnProperty.call(value,h)?safeCell_(value[h]):idx>0?table.values[idx][i]:'');
 menuRange=table.sh.getRange(idx>0?idx+1:table.values.length+1,1,1,headers.length);menuBefore=idx>0?[table.values[idx]]:[headers.map(()=> '')];
 menuRange.setValues([row]);SpreadsheetApp.flush();result={success:true,id,imageUrl:image};
 }catch(e){
 // Restore only this transaction's cells, never clear whole production tabs.
 try{if(menuRange)menuRange.setValues(menuBefore);writes.reverse().forEach(r=>r.clearContent());SpreadsheetApp.flush()}catch(rollbackError){retainUploads=true;console.error('메뉴 저장 복구 실패: '+rollbackError.message)}
 throw e;
 }finally{lock.releaseLock()}
 }catch(e){if(!retainUploads)created.forEach(f=>{try{f.setTrashed(true)}catch(_){}});throw e}
 return {...result,revision:revision_()};
}
/** Run once as company owner. Does not contain or generate a password. */
function setupBackend(){const p=PropertiesService.getScriptProperties();if(p.getProperty('INITIAL_BACKUP_DONE'))throw Error('이미 초기화된 프로젝트입니다');if(!p.getProperty('IMAGE_FOLDER_ID')){const f=DriveApp.createFolder('라그릴리아 메뉴북 사진');p.setProperty('IMAGE_FOLDER_ID',f.getId())}if(!p.getProperty('INITIAL_BACKUP_DONE')){const b=book_();Object.values(COL).forEach(n=>sheet_(n).copyTo(b).setName('원본백업_'+n));p.setProperty('INITIAL_BACKUP_DONE','1')}const sh=sheet_(COL.menu),data=sh.getDataRange().getValues(),h=data[0];data.forEach((r,i)=>{if(i&& !r[h.indexOf('메뉴ID')]&&String(r[h.indexOf('메뉴명')]).includes('본인립아이'))sh.getRange(i+1,h.indexOf('메뉴ID')+1).setValue('ribeye')});const opts=records_(COL.item);if(!opts.some(o=>o['옵션그룹ID']==='rib-sides'))opts.filter(o=>o['옵션그룹ID']==='tbone-sides').forEach(o=>upsert_(COL.item,'옵션ID',{...o,'옵션ID':'rib-'+o['옵션ID'],'옵션그룹ID':'rib-sides'}));console.log('초기화 완료. ADMIN_PIN을 프로젝트 설정의 스크립트 속성에 설정하세요.')}



function categorySettings_(){
 const saved=PropertiesService.getScriptProperties().getProperty('MENU_CATEGORIES');
 return saved?JSON.parse(saved):['그릴','프로모션','시즌 메뉴','세트','파스타','라이스','피자','샐러드','사이드','디저트','음료','맥주','와인'].map(id=>({id,name:id,banner:''}));
}
function saveCategory(token,input){
 requireAuth_(token);
 const name=String(input.name||'').trim();
 if(!input.remove&&(!name||name.length>40))throw Error('카테고리 이름을 1~40자로 입력하세요.');
 const photo=photo_(input.photo);
 const lock=writeLock_(),created=[];
 try{
  const rows=categorySettings_(),row=rows.find(c=>c.id===input.id&&!c.deleted);
  if((input.id||input.remove)&&!row)throw Error('카테고리가 변경되었습니다. 다시 불러오세요.');
  if(input.remove){row.deleted=true;row.banner=''}
  else{
   if(rows.some(c=>!c.deleted&&c!==row&&c.name===name))throw Error('이미 사용 중인 카테고리 이름입니다.');
   const category=row||{id:'cat-'+Utilities.getUuid(),banner:''};
   category.name=name;
   if(photo)category.banner=upload_(photo,created);
   else if(input.clearBanner)category.banner='';
   if(!row)rows.push(category);
  }
  PropertiesService.getScriptProperties().setProperty('MENU_CATEGORIES',JSON.stringify(rows));
  return rows;
 }catch(error){
  created.forEach(file=>{try{file.setTrashed(true)}catch(_){}});
  throw error;
 }finally{lock.releaseLock()}
}
