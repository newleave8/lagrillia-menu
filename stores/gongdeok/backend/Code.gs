/** Company-owned menu backend. Secrets belong only in Script Properties. */
const BOOK_ID='1QovwwcSvJecpq8v6Wys_hWTattgRhfwbMOd5OljgCig';
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
function publicCatalog_(){const db=readDb_(),groups=db.groups,items=db.items;const categories=categorySettings_(),wineCategories=wineCategories_(),preorderOpen=preorderOpen_();return {schemaVersion:3,store:{id:PRE_STORE.id,name:PRE_STORE.name},categories,wineCategories,preorderOpen,revision:String(preorderOpen)+'-'+db.revision+'-display-v1-'+hashRecords_([categories,wineCategories]),menus:db.menus.filter(m=>m['메뉴ID']&&!menuDeleted_(m)).map(m=>({id:String(m['메뉴ID']),category:m['카테고리'],section:m['섹션'],sweetness:wineRating_(m['당도']),body:wineRating_(m['바디']),name:spicyName_(m['메뉴명'],m['매운맛']),plainName:m['메뉴명'],en:m['영문명'],price:m['판매가(원)']===''?null:Number(m['판매가(원)']),tag:m['배지'],discounted:m['할인제품']==='Y',originalPrice:m['할인제품']==='Y'?Number(m['정상가(원)'])||null:null,spicy:Number(m['매운맛'])||0,listDesc:m['간단설명'],detail:detailFields_(m).detail,origin:detailFields_(m).origin,allergens:detailFields_(m).allergens,imageUrl:asset_(m['이미지URL'],m['이미지파일명']),caption:m['이미지하단문구'],active:String(m['판매여부']).toUpperCase()==='Y',order:Number(m['노출순서'])||9999,options:ids_(m['옵션그룹ID']).flatMap(id=>groups.filter(g=>g['옵션그룹ID']===id&&g['사용여부']!=='N').map(g=>({id,name:g['그룹명'],min:Number(g['최소선택'])||0,max:Number(g['최대선택'])||0,allowDuplicate:g['중복선택허용']==='Y',items:items.filter(o=>o['옵션그룹ID']===id&&o['사용여부']!=='N').sort((a,b)=>Number(a['노출순서'])-Number(b['노출순서'])).map(o=>({id:o['옵션ID'],name:spicyName_(o['옵션명'],o['매운맛']),plainName:o['옵션명'],extra:Number(o['추가금액(원)'])||0,spicy:Number(o['매운맛'])||0,imageUrl:asset_(o['이미지URL'],o['이미지파일명'])}))})))})).sort((a,b)=>a.order-b.order)}}
function doGet(e){if(e?.parameter?.page==='preorder-switch')return preorderSwitchPage_(e.parameter);if(e?.parameter?.page==='checkout')return checkoutPage_(e.parameter.channel);if(e?.parameter?.page==='admin')return HtmlService.createHtmlOutputFromFile('Admin').setTitle('라그릴리아 관리자').addMetaTag('viewport','width=device-width,initial-scale=1');const cb=String(e?.parameter?.callback||'');if(cb&&cb!=='lagMenuCallback')throw Error('잘못된 callback');const payload=publicCatalog_();const json=JSON.stringify(payload).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');return ContentService.createTextOutput(cb?cb+'('+json+');':json).setMimeType(cb?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON)}
function signin(pin){const lock=LockService.getUserLock();if(!lock.tryLock(5000))throw Error('로그인 처리 중입니다. 잠시 후 다시 시도하세요.');try{const c=CacheService.getScriptCache(),key='signin-attempts',n=Number(c.get(key)||0);if(n>=10)throw Error('로그인 시도 제한. 5분 후 다시 시도하세요');const correct=PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');if(!correct)throw Error('관리자 비밀번호를 서버 속성에 설정하세요');if(String(pin)!==correct){c.put(key,String(n+1),300);throw Error('관리자 인증 실패')}c.remove(key);const token=Utilities.getUuid()+Utilities.getUuid();const props=PropertiesService.getScriptProperties();const now=Date.now();const sessions=props.getProperties();for(const key of Object.keys(sessions)){if(key.startsWith('admin-session:')&&Number(sessions[key])<=now)props.deleteProperty(key)}props.setProperty('admin-session:'+token,String(now+ADMIN_SESSION_MS));return token}finally{lock.releaseLock()}}
const ADMIN_SESSION_MS = 16 * 60 * 60 * 1000;
function requireAuth_(token){
 if(typeof token!=='string'||!(/^[a-f0-9-]{72}$/i.test(token)))throw Error('인증이 만료됐습니다. 다시 로그인하세요');
 const expiry=PropertiesService.getScriptProperties().getProperty('admin-session:'+token);
 if(expiry!==null?Number(expiry)>Date.now():CacheService.getScriptCache().get('auth:'+token)==='1')return;
 throw Error('인증이 만료됐습니다. 다시 로그인하세요');
}
function signout(token){
 requireAuth_(token);
 PropertiesService.getScriptProperties().deleteProperty('admin-session:'+token);
 CacheService.getScriptCache().remove('auth:'+token);
 return true;
}
function loadAdmin(token){requireAuth_(token);const lock=writeLock_();try{const db=readDb_();return {menus:db.menus.filter(m=>!menuDeleted_(m)),deletedMenus:db.menus.filter(menuDeleted_),groups:db.groups,items:db.items,categories:categorySettings_(),wineCategories:wineCategories_(),revision:db.revision}}finally{lock.releaseLock()}}
function text_(v,max){const s=String(v??'');if(s.length>(max||5000))throw Error('입력 길이 초과');return s}
function number_(v,label,max){if(v===''||v===null||v===undefined||!Number.isSafeInteger(Number(v))||Number(v)<0||Number(v)>(max||10000000))throw Error(label+' 입력 오류');return Number(v)}
function url_(v){v=text_(v,2000);if(v&&!/^https:\/\/(?:drive\.google\.com|lh3\.googleusercontent\.com|newleave8\.github\.io)\//.test(v))throw Error('허용되지 않은 사진 주소');return v}
function photo_(f){if(!f?.data)return null;if(!/^image\/(png|jpeg|webp)$/.test(f.mime)||typeof f.data!=='string'||f.data.length>4300000)throw Error('사진은 JPG/PNG/WebP 3MB 이하');const raw=Utilities.base64Decode(f.data.replace(/^data:[^,]*,/,''));if(!raw.length||raw.length>3*1024*1024)throw Error('사진 크기 오류');const b=raw.map(x=>(x+256)%256);if(!(f.mime==='image/jpeg'&&b[0]===255&&b[1]===216||f.mime==='image/png'&&b.slice(0,8).join(',')==='137,80,78,71,13,10,26,10'||f.mime==='image/webp'&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP'))throw Error('사진 파일 형식 불일치');return {raw,mime:f.mime,name:text_(f.name||'menu.jpg',150)}}
function upload_(photo,created){if(!photo)return '';const folder=PropertiesService.getScriptProperties().getProperty('IMAGE_FOLDER_ID');if(!folder)throw Error('사진 폴더 초기화 필요');const f=DriveApp.getFolderById(folder).createFile(Utilities.newBlob(photo.raw,photo.mime,photo.name.replace(/[\\/]/g,'_')));created.push(f);f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);return 'https://drive.google.com/thumbnail?id='+f.getId()+'&sz=w1000'}
function safeCell_(v){return typeof v==='string'&&/^[=+@-]/.test(v)?"'"+v:v}
function upsert_(name,key,value){const sh=sheet_(name),a=sh.getDataRange().getValues(),h=a[0],idx=h.indexOf(key);if(idx<0)throw Error('열 누락: '+key);let r=a.findIndex((v,i)=>i>0&&String(v[idx])===String(value[key]));const next=h.map((k,i)=>Object.hasOwnProperty.call(value,k)?safeCell_(value[k]):r>0?a[r][i]:'');sh.getRange(r>0?r+1:sh.getLastRow()+1,1,1,h.length).setValues([next])}
function saveAdmin(token,input){requireAuth_(token);if(!input?.menu)throw Error('메뉴 데이터 없음');const d=input.menu;const name=text_(d.name,150).trim();if(!name)throw Error('메뉴명 필수');const price=number_(d.price,'판매가');const discounted=d.discounted===true;const originalPrice=discounted?number_(d.originalPrice,'정상가'):null;if(discounted&&(!originalPrice||originalPrice<=price))throw Error('할인가는 정상가보다 낮아야 합니다');const spicy=number_(d.spicy??0,'매운맛',3);const gs=input.groups||[];if(!Array.isArray(gs)||gs.length>10)throw Error('옵션 그룹 최대 10개');let size=0;const photo=photo_(input.photo);size+=photo?.raw.length||0;const prepared=gs.map(g=>{const min=number_(g.min,'최소 선택',100),max=number_(g.max,'최대 선택',100);if(min>max)throw Error('최소 선택이 최대 선택보다 큽니다');if(!text_(g.name,150).trim()||!Array.isArray(g.items)||g.items.length>50||!g.items.length)throw Error('그룹명과 옵션 항목 필요');if((!g.allowDuplicate&&max>g.items.length))throw Error('중복 불가 그룹의 최대 선택 오류');return {...g,name:text_(g.name,150),min,max,items:g.items.map(o=>{if(!text_(o.name,150).trim())throw Error('옵션명 필수');const p=photo_(o.photo);size+=p?.raw.length||0;return {...o,name:text_(o.name,150),extra:number_(o.extra,'추가금액'),spicy:number_(o.spicy??0,'옵션 매운맛',3),imageUrl:url_(o.imageUrl),preparedPhoto:p}})}});if(size>12*1024*1024)throw Error('한 번에 저장할 사진은 총 12MB 이하');['en','summary','detail','caption','category','section','tag','origin','allergens'].forEach(k=>text_(d[k]));url_(d.imageUrl);if(d.id&&!/^[a-zA-Z0-9_-]{1,100}$/.test(d.id))throw Error('메뉴 ID 오류');if(d.placement!=null&&!['top','bottom'].includes(d.placement))throw Error('등록 위치 오류');const order=number_(d.order??100,'노출순서');const id=d.id||'menu-'+Utilities.getUuid();const created=[];let result,retainUploads=false;
 try{
 // Drive work can be slow: never hold the database lock while uploading.
 const image=upload_(photo,created)||d.imageUrl||'';const groupRows=[],itemRows=[],groupIds=[];
 prepared.forEach((g,i)=>{const gid='grp-'+Utilities.getUuid();groupIds.push(gid);groupRows.push({'옵션그룹ID':gid,'그룹명':g.name,'최소선택':g.min,'최대선택':g.max,'중복선택허용':g.allowDuplicate?'Y':'N','필수여부':g.min?'Y':'N','노출순서':i+1,'사용여부':'Y'});g.items.forEach((o,j)=>itemRows.push({'옵션그룹ID':gid,'옵션ID':'opt-'+Utilities.getUuid(),'옵션명':o.name,'추가금액(원)':o.extra,'매운맛':o.spicy,'이미지파일명':o.preparedPhoto?.name||o.imageName||'','이미지URL':upload_(o.preparedPhoto,created)||o.imageUrl||'','노출순서':j+1,'사용여부':'Y'}))});
 const value={'메뉴ID':id,'카테고리':d.category||'그릴','섹션':d.section==null?(d.category||'그릴'):text_(d.section).trim(),'메뉴명':name,'영문명':d.en||'','판매가(원)':price,'할인제품':discounted?'Y':'N','정상가(원)':originalPrice??'','배지':d.tag||'','간단설명':d.summary||'','상세설명':d.detail||'','이미지파일명':photo?.name||d.imageName||'','이미지URL':image,'이미지하단문구':d.caption||'','판매여부':d.active===false?'N':'Y','노출순서':order,'옵션그룹ID':groupIds.join(','),'검증상태':'관리자 저장','매운맛':spicy,'원산지':text_(d.origin),'알레르기정보':text_(d.allergens)};
 const lock=writeLock_();const writes=[];let menuRange=null,menuBefore=null,orderChange=null;
 try{
 const db=readDb_();if(input.revision!==db.revision)throw Error('다른 관리자가 변경했습니다. 다시 불러온 후 저장하세요');
 let table=db.tables[0];
 if(d.category==='와인'){
  if(!wineCategories_().includes(d.section))throw Error('와인 카테고리를 선택하세요.');
  value['당도']=wineRating_(d.sweetness)??'';
  value['바디']=wineRating_(d.body)??'';
  value['매운맛']=0;
  const missing=['당도','바디'].filter(key=>!table.values[0].includes(key));
  if(missing.length){
   const needed=table.values[0].length+missing.length;
   if(needed>table.sh.getMaxColumns())table.sh.insertColumnsAfter(table.sh.getMaxColumns(),needed-table.sh.getMaxColumns());
   table.sh.getRange(1,table.values[0].length+1,1,missing.length).setValues([missing]);
   table=readDb_().tables[0];
  }
 }
 const headers=table.values[0],key=headers.indexOf('메뉴ID'),idx=table.values.findIndex((r,i)=>i>0&&String(r[key])===id);
 if(d.id&&idx<1)throw Error('기존 메뉴를 찾을 수 없습니다');
 if(idx>0&&menuDeleted_(db.menus.find(m=>String(m['메뉴ID'])===id)||{}))throw Error('삭제된 메뉴입니다. 삭제 목록에서 복원한 뒤 수정하세요.');
 // Append complete option batches; switch the menu reference only after both are flushed.
 appendPrepared_(db.tables[1],groupRows,writes);appendPrepared_(db.tables[2],itemRows,writes);SpreadsheetApp.flush();
 const row=headers.map((h,i)=>Object.hasOwnProperty.call(value,h)?safeCell_(value[h]):idx>0?table.values[idx][i]:'');
 menuRange=table.sh.getRange(idx>0?idx+1:table.values.length+1,1,1,headers.length);menuBefore=idx>0?[table.values[idx]]:[headers.map(()=> '')];
 menuRange.setValues([row]);SpreadsheetApp.flush();if(d.placement){const latest=readDb_();orderChange=menuOrderColumn_(latest.tables[0],categoryPlacementIds_(latest.menus,value,d.placement));orderChange.range.setValues(orderChange.after);SpreadsheetApp.flush();}result={success:true,id,imageUrl:image};
 }catch(e){
 // Restore only this transaction's cells, never clear whole production tabs.
 try{if(orderChange)orderChange.range.setValues(orderChange.before);if(menuRange)menuRange.setValues(menuBefore);writes.reverse().forEach(r=>r.clearContent());SpreadsheetApp.flush()}catch(rollbackError){retainUploads=true;console.error('메뉴 저장 복구 실패: '+rollbackError.message)}
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

function preorderOpen_(){
 return PropertiesService.getScriptProperties().getProperty('PREORDER_OPEN')!=='OFF';
}
function setPreorderOpen(pin,open){
 if(typeof open!=='boolean')throw Error('접수 상태가 올바르지 않습니다.');
 const token=signin(pin);
 try{
  const lock=writeLock_();
  try{
   PropertiesService.getScriptProperties().setProperty('PREORDER_OPEN',open?'ON':'OFF');
   return open;
  }finally{lock.releaseLock()}
 }finally{signout(token)}
}
function preorderSwitchPage_(parameters){
 const channel=String(parameters.channel||'');
 if(!/^[a-f0-9]{32}$/.test(channel))throw Error('설정 화면을 다시 열어주세요.');
 const template=HtmlService.createTemplateFromFile('PreorderSwitch');
 template.openJson=JSON.stringify(parameters.open==='true');
 template.channelJson=JSON.stringify(channel);
 return template.evaluate().setTitle('선주문 접수 설정')
  .addMetaTag('viewport','width=device-width,initial-scale=1')
  .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function wineRating_(value){
 if(value===''||value==null)return null;
 const n=Number(value);
 return Number.isInteger(n)&&n>=1&&n<=5?n:null;
}
function wineCategories_(){
 const saved=PropertiesService.getScriptProperties().getProperty('WINE_CATEGORIES');
 return saved?JSON.parse(saved):['글라스 & 하프 와인(375ml)','스파클링 와인','레드 와인','화이트 와인','스페셜 와인 프로모션'];
}
function updateWineCategory(token,name,remove){
 requireAuth_(token);
 name=text_(name,40).trim();
 if(!name||/^[=+@-]/.test(name))throw Error('와인 카테고리 이름을 확인하세요.');
 const lock=writeLock_();
 try{
  const categories=wineCategories_();
  const exists=categories.includes(name);
  if(remove){
   if(!exists)throw Error('이미 삭제된 카테고리입니다.');
   if(readDb_().menus.some(m=>m['카테고리']==='와인'&&m['섹션']===name))
    throw Error('등록된 와인을 다른 카테고리로 옮긴 뒤 삭제하세요.');
  }else if(exists||categories.length>=50)throw Error('이미 등록된 이름이거나 카테고리 수가 50개입니다.');
  const next=remove?categories.filter(category=>category!==name):[...categories,name];
  PropertiesService.getScriptProperties().setProperty('WINE_CATEGORIES',JSON.stringify(next));
  return next;
 }finally{lock.releaseLock()}
}

// Keep category sections together and preserve the displayed order for equal values.
function orderedCategoryMenus_(menus, category) {
 const sorted=menus.filter(menu=>menu['메뉴ID']&&!menuDeleted_(menu)&&String(menu['카테고리']||'')===category)
  .slice().sort((a,b)=>(Number(a['노출순서'])||9999)-(Number(b['노출순서'])||9999));
 const sections=new Map();
 for(const menu of sorted){
  const section=String(menu['섹션']||'').trim();
  if(!sections.has(section))sections.set(section,[]);
  sections.get(section).push(menu);
 }
 return Array.from(sections.values()).flat();
}
function categoryPlacementIds_(menus, value, placement) {
 const category=String(value['카테고리']||'');
 const section=String(value['섹션']||'').trim();
 const ordered=orderedCategoryMenus_(menus.filter(menu=>menu['메뉴ID']!==value['메뉴ID']),category);
 const members=ordered.filter(menu=>String(menu['섹션']||'').trim()===section);
 let index=ordered.length;
 if(members.length){
  const anchor=placement==='top'?members[0]:members[members.length-1];
  index=ordered.indexOf(anchor)+(placement==='top'?0:1);
 }
 ordered.splice(index,0,value);
 return ordered.map(menu=>String(menu['메뉴ID']));
}
function menuOrderColumn_(table, ids) {
 const headers=table.values[0],idColumn=headers.indexOf('메뉴ID'),orderColumn=headers.indexOf('노출순서');
 if(idColumn<0||orderColumn<0)throw Error('메뉴 시트의 메뉴ID·노출순서 열을 확인하세요.');
 const positions=new Map(ids.map((id,index)=>[id,(index+1)*10]));
 const rows=table.values.slice(1);
 return {range:table.sh.getRange(2,orderColumn+1,rows.length,1),
  before:rows.map(row=>[row[orderColumn]]),
  after:rows.map(row=>[positions.has(String(row[idColumn]))?positions.get(String(row[idColumn])):row[orderColumn]])};
}
function menuDeleted_(menu){return !!String(menu['삭제일시']||'').trim()}
function changeMenuDeletion(token,input){
 requireAuth_(token);
 if(!input||typeof input.id!=='string'||!input.id||!['delete','restore'].includes(input.action))throw Error('메뉴와 작업을 확인하세요.');
 const lock=writeLock_();let change=null;
 try{
  const db=readDb_();
  if(input.revision!==db.revision)throw Error('다른 관리자가 변경했습니다. 최신 목록을 불러온 뒤 다시 시도하세요.');
  const menu=db.menus.find(row=>String(row['메뉴ID'])===input.id);
  if(!menu)throw Error('메뉴를 찾을 수 없습니다.');
  const deleted=menuDeleted_(menu);
  if(input.action==='delete'&&deleted)throw Error('이미 삭제된 메뉴입니다.');
  if(input.action==='restore'&&!deleted)throw Error('이미 복원된 메뉴입니다.');
  let table=db.tables[0];
  if(!table.values[0].includes('삭제일시')){
   const column=table.values[0].length+1;
   if(column>table.sh.getMaxColumns())table.sh.insertColumnsAfter(table.sh.getMaxColumns(),column-table.sh.getMaxColumns());
   table.sh.getRange(1,column).setValues([['삭제일시']]);
   SpreadsheetApp.flush();table=readDb_().tables[0];
  }
  const headers=table.values[0],idColumn=headers.indexOf('메뉴ID'),activeColumn=headers.indexOf('판매여부'),deletedColumn=headers.indexOf('삭제일시');
  const index=table.values.findIndex((row,i)=>i>0&&String(row[idColumn])===input.id);
  if(index<1||activeColumn<0||deletedColumn<0)throw Error('메뉴 시트의 필수 열을 확인하세요.');
  const before=[table.values[index].slice()],after=before[0].slice();
  after[activeColumn]='N';after[deletedColumn]=input.action==='delete'?new Date().toISOString():'';
  change={range:table.sh.getRange(index+1,1,1,headers.length),before};
  change.range.setValues([after]);SpreadsheetApp.flush();
  return {revision:readDb_().revision};
 }catch(error){
  if(change){try{change.range.setValues(change.before);SpreadsheetApp.flush()}catch(rollbackError){console.error('메뉴 삭제·복원 복구 실패: '+rollbackError.message)}}
  throw error;
 }finally{lock.releaseLock()}
}

function saveMenuOrder(token,input) {
 requireAuth_(token);
 if(!input||!Array.isArray(input.ids)||!input.ids.length||input.ids.length>5000)throw Error('순서를 변경할 메뉴를 확인하세요.');
 const category=text_(input.category,100),ids=input.ids;
 if(ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw Error('중복되거나 잘못된 메뉴입니다.');
 const lock=writeLock_();let change;
 try{
  const db=readDb_();
  if(input.revision!==db.revision)throw Error('다른 관리자가 메뉴를 변경했습니다. 최신 목록을 불러온 뒤 다시 정렬하세요.');
  const current=orderedCategoryMenus_(db.menus,category);
  const byId=new Map(current.map(menu=>[String(menu['메뉴ID']),menu]));
  if(current.length!==ids.length||ids.some(id=>!byId.has(id)))throw Error('메뉴 목록이 변경되었습니다. 최신 목록을 불러오세요.');
  const seenSections=new Set();let previousSection=null;
  for(const id of ids){
   const section=String(byId.get(id)['섹션']||'').trim();
   if(section!==previousSection){
    if(seenSections.has(section))throw Error('같은 구분의 메뉴는 한 묶음으로 유지해 주세요.');
    seenSections.add(section);previousSection=section;
   }
  }
  change=menuOrderColumn_(db.tables[0],ids);
  change.range.setValues(change.after);SpreadsheetApp.flush();
  return {revision:readDb_().revision};
 }catch(error){
  if(change){try{change.range.setValues(change.before);SpreadsheetApp.flush()}catch(rollbackError){console.error('메뉴 순서 복구 실패: '+rollbackError.message)}}
  throw error;
 }finally{lock.releaseLock()}
}

/** One-time initializer for this copied store only. Safe to rerun. */
function setupGongdeokStore(){
 if(BOOK_ID!=='1QovwwcSvJecpq8v6Wys_hWTattgRhfwbMOd5OljgCig'||PRE_STORE.id!=='gongdeok')throw Error('공덕점 연결을 확인하세요');
 const props=PropertiesService.getScriptProperties();
 if(props.getProperty('GONGDEOK_INITIALIZED')==='1'){console.log('공덕점 초기화 완료 상태. 관리자 비밀번호 설정 여부: '+Boolean(props.getProperty('ADMIN_PIN')));return;}
 const source=UrlFetchApp.fetch('https://script.google.com/macros/s/AKfycbycYRZyQo36lFSunl9xnM4Oc1dKFIim3xnDz8sNQ0xd92KvzC5ZCLvs3cpypOb6BbSE/exec');
 const catalog=JSON.parse(source.getContentText());
 if(!Array.isArray(catalog.categories)||!Array.isArray(catalog.wineCategories))throw Error('원본 카테고리 정보를 확인할 수 없습니다');
 const b=book_();
 Object.values(PRE_SHEETS).forEach(name=>{
  const sh=b.getSheetByName(name),backup='복제원본_'+name;
  if(!sh)throw Error('주문 탭 없음: '+name);
  if(!b.getSheetByName(backup)){
   const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues();
   sh.setName(backup);
   b.insertSheet(name).getRange(1,1,1,headers[0].length).setValues(headers);
  }
 });
 props.setProperty('MENU_CATEGORIES',JSON.stringify(catalog.categories));
 props.setProperty('WINE_CATEGORIES',JSON.stringify(catalog.wineCategories));
 props.setProperty('PREORDER_OPEN','OFF');
 props.deleteProperty('PREORDER_PUSH_DEVICE');
 props.deleteProperty('PREORDER_PUSH_LAST');
 props.setProperty('IMAGE_FOLDER_ID',DriveApp.createFolder('라그릴리아 공덕점 메뉴 사진').getId());
 props.setProperty('INITIAL_BACKUP_DONE','1');
 props.setProperty('GONGDEOK_INITIALIZED','1');
 SpreadsheetApp.flush();
 console.log('공덕점 초기화 완료. 메뉴 '+readDb_().menus.length+'개. 관리자 비밀번호 설정 여부: '+Boolean(props.getProperty('ADMIN_PIN'))+'. 선주문 접수 OFF.');
}
