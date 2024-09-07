importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing the app's Firebase config.
firebase.initializeApp({
    apiKey: "AIzaSyCHnv-1r0sG9ZoSYEEzq4vO_n52g-k49ZA",
    authDomain: "kwits-push-notification.firebaseapp.com",
    projectId: "kwits-push-notification",
    storageBucket: "kwits-push-notification.appspot.com",
    messagingSenderId: "794018476607",
    appId: "1:794018476607:web:c9fbf9382bc80ceeea7e8a",
    measurementId: "G-JLCJPN6D1T"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  // Customize notification here
  const notificationTitle = 'Background Message Title';
  const notificationOptions = {
    body: 'Background Message body.',
    icon: '/img/message.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

