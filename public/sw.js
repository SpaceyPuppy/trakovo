self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'New Booking', {
      body: data.body ?? '',
      icon: data.icon ?? '/favicon.ico',
      badge: data.icon ?? '/favicon.ico',
      data: { url: data.url ?? '/admin/bookings' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const url = event.notification.data?.url ?? '/admin/bookings'
      for (const client of windowClients) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      return clients.openWindow(url)
    })
  )
})
