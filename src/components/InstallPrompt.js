'use client';

import { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOS() {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(true);
  const [dismissed, setDismissed] = useState(true);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    
    // eslint-disable-next-line
    setInstalled(isStandalone());
    setIos(isIOS());
    setDismissed(sessionStorage.getItem('pwa_install_dismissed') === '1');

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_install_dismissed', '1');
  };

  if (installed || dismissed) return null;
  if (!deferredPrompt && !ios) return null;

  return (
    <div className="install-banner" role="complementary" aria-label="Install application">
      <div className="install-banner-icon"><Download /></div>
      <div className="install-banner-text">
        <div className="install-banner-title">Install the app</div>
        <div className="install-banner-sub">
          {ios ? (
            <>Tap <Share size={12} /> Share, then &quot;Add to Home Screen&quot;</>
          ) : (
            'Add to your home screen for quick, full-screen access'
          )}
        </div>
      </div>
      {deferredPrompt && (
        <button className="install-btn" onClick={handleInstall}>Install</button>
      )}
      <button className="install-dismiss" onClick={dismiss} aria-label="Dismiss">
        <X />
      </button>
    </div>
  );
}
