export default function manifest() {
  return {
    name: 'Jamaat Attendance',
    short_name: 'Attendance',
    description: 'Smart attendance tracking for Jamaat events with NFC scanning, live monitoring, and CSV export.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0d4a28',
    theme_color: '#1a6b3c',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
