// File: sw.js

self.addEventListener('push', function(event) {
  // Ambil data notifikasi yang dikirim dari server
  const data = event.data.json();
  
  const title = data.title;
  const options = {
    body: data.body,
    icon: data.icon, // Gunakan ikon yang dikirim dari server
    badge: 'https://i.ibb.co/bFqgT5x/icon-192.png' // Ikon kecil di status bar
  };

  // Tampilkan notifikasi
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  // Aksi saat notifikasi di-klik (misalnya membuka aplikasi)
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});