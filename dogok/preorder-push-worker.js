self.addEventListener('notificationclick',event=>{
  if (!event.notification.data?.link) return;
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(clients.openWindow(new URL('admin.html',self.location.href).href));
});
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');
firebase.initializeApp({"apiKey":"AIzaSyB0qajyHbXezJbhUPhnaaVmHeMy70JNy2E","projectId":"lag-push","messagingSenderId":"211486586221","appId":"1:211486586221:web:e0df90dfe20caddae61664"});
firebase.messaging();
