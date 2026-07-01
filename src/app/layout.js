import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata = {
  title: 'Jamaat Attendance',
  description: 'Smart attendance tracking system for Jamaat events with NFC scanning, live monitoring, and CSV export.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#1a6b3c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Attendance" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
