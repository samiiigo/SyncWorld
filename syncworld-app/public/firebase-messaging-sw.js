/* SyncWorld web push service worker (Windows/Mac web build).
 * Shows the alarm notification when the SyncWorld tab is closed.
 * The page registers it as /firebase-messaging-sw.js?config=<firebase web config JSON>
 * because service workers cannot read build-time environment variables. */
/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

var params = new URL(self.location.href).searchParams;
var config = null;
try {
  config = JSON.parse(params.get('config') || 'null');
} catch (e) {
  config = null;
}

if (config && config.apiKey && config.messagingSenderId) {
  firebase.initializeApp(config);
  // Messages with a `notification` payload (what fireAlarms sends) are shown
  // automatically; this only handles clicks.
  firebase.messaging();
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        if ('focus' in clients[i]) return clients[i].focus();
      }
      return self.clients.openWindow('/');
    }),
  );
});
