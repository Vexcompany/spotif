/**
 * Notification Service Worker
 * Handles push notifications in the background
 * Save this as: public/service-worker.js
 */

self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      data: {
        notificationId: data.notificationId,
        actionUrl: data.actionUrl || '/'
      },
      actions: [
        {
          action: 'open',
          title: 'Buka',
          icon: '/icon-open.png'
        },
        {
          action: 'close',
          title: 'Tutup',
          icon: '/icon-close.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.actionUrl);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  const notificationId = event.notification.data.notificationId;
  
  // Optional: Send read status to backend
  fetch(`${process.env.REACT_APP_BACKEND_URL}/api/notifications/mark-read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notificationId: notificationId,
      userId: 'user-id' // Replace with actual user ID
    })
  }).catch(err => console.log('Failed to mark as read:', err));
});
