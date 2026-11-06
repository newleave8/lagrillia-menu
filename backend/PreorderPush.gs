const PREORDER_PUSH_DEVICE = 'PREORDER_PUSH_DEVICE';
const PREORDER_PUSH_ORIGIN = 'https://newleave8.github.io';

function doPost(e) {
  const input = e.parameter;
  const channel = String(input.channel || '');
  if (input.action !== 'register-preorder-tablet' || !/^[a-f0-9]{32}$/.test(channel)) {
    return HtmlService.createHtmlOutput('Invalid request');
  }

  let message;
  try {
    const device = String(input.device || '');
    if (!/^[\w:-]{20,2048}$/.test(device)) throw Error('태블릿 등록 정보가 올바르지 않습니다.');
    const token = signin(input.pin);
    try {
      const lock = writeLock_();
      try {
        const props = PropertiesService.getScriptProperties();
        if (props.getProperty(PREORDER_PUSH_DEVICE) !== device) {
          props.setProperty(PREORDER_PUSH_DEVICE, device);
          props.deleteProperty('PREORDER_PUSH_LAST');
        }
        message = '이 태블릿을 등록했습니다.';
      } finally {
        lock.releaseLock();
      }
    } finally {
      signout(token);
    }
  } catch (error) {
    message = error.message;
  }
  const response = JSON.stringify({type:'lag-tablet-registration',channel,message}).replace(/</g,'\\u003c');
  return HtmlService.createHtmlOutput('<script>window.top.postMessage('+response+','+JSON.stringify(PREORDER_PUSH_ORIGIN)+')</script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Run once from the Apps Script editor as the authorized deployment account.
function installPreorderPushTrigger_() {
  const handler = 'sendPendingPreorderPush_';
  if (!ScriptApp.getProjectTriggers().some(trigger => trigger.getHandlerFunction() === handler)) {
    ScriptApp.newTrigger(handler).timeBased().everyMinutes(1).create();
  }
}

function sendPendingPreorderPush_() {
  const lock = writeLock_();
  try {
    const props = PropertiesService.getScriptProperties();
    const device = props.getProperty(PREORDER_PUSH_DEVICE);
    if (!device) return;
    const unread = preTable_(PRE_SHEETS.orders).records.filter(row =>
      row['접수ID'] && row['점포ID'] === PRE_STORE.id && row['상태'] === '신규');
    if (!unread.length) {
      props.deleteProperty('PREORDER_PUSH_LAST');
      return;
    }

    const last = JSON.parse(props.getProperty('PREORDER_PUSH_LAST') || '{}');
    const latest = Math.max(...unread.map(row => Number(String(row['주문번호']).replace(/^LAG/,'')) || 0));
    const now = Date.now();
    if (latest <= last.latest && now - last.sentAt < 5 * 60 * 1000) return;

    const response = UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/lag-push/messages:send', {
      method:'post',
      contentType:'application/json',
      headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
      muteHttpExceptions:true,
      payload:JSON.stringify({message:{
        token:device,
        webpush:{
          headers:{TTL:'60'},
          notification:{title:'라그릴리아 판교점 선주문',body:'미확인 선주문 '+unread.length+'건을 확인해 주세요.',tag:'lag-preorders',renotify:true},
          fcm_options:{link:PREORDER_PUSH_ORIGIN+'/lagrillia-menu/admin.html'}
        }
      }})
    });
    if (response.getResponseCode() !== 200) {
      const error = JSON.parse(response.getContentText()).error || {};
      if ((error.details || []).some(detail => detail.errorCode === 'UNREGISTERED')) {
        props.deleteProperty(PREORDER_PUSH_DEVICE);
        props.deleteProperty('PREORDER_PUSH_LAST');
      }
      throw Error('선주문 푸시 발송 실패: HTTP '+response.getResponseCode());
    }
    props.setProperty('PREORDER_PUSH_LAST',JSON.stringify({latest,sentAt:now}));
  } finally {
    lock.releaseLock();
  }
}
