import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download, WifiOff, X } from 'lucide-react';
import { Button } from '../../components/ui';

export function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  if (online) return null;
  return <span className="badge bg-amber-500/15 text-amber-300"><WifiOff size={13} className="mr-1" />Offline</span>;
}

export function PwaControls() {
  const [deferred, setDeferred] = useState<any>(null);
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      setDeferred(registration ?? null);
    },
  });

  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setDeferred(event); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferred?.prompt) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <>
      {deferred?.prompt && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl border border-blood/40 bg-panel/95 p-3 shadow-glow">
          <Download size={18} className="text-red-400" />
          <span className="text-sm text-slate-200">Install LAST LESSON</span>
          <Button className="px-3 py-1.5" onClick={install}>Install</Button>
          <button className="text-slate-500 hover:text-white" onClick={() => setDeferred(null)}><X size={16} /></button>
        </div>
      )}
      {needRefresh && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-sky-500/40 bg-panel/95 p-3 shadow-xl">
          <span className="text-sm text-slate-200">A new version is available</span>
          <Button variant="secondary" className="px-3 py-1.5" onClick={() => updateServiceWorker(true)}>Update</Button>
        </div>
      )}
    </>
  );
}
