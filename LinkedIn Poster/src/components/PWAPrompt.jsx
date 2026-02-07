import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

function PWAPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needUpdate: [needUpdate, setNeedUpdate],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedUpdate(false);
    };

    if (!offlineReady && !needUpdate) return null;

    return (
        <div className="pwa-toast" style={{
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            margin: '16px',
            padding: '16px',
            border: '1px solid #8885',
            borderRadius: '12px',
            zIndex: 1000,
            textAlign: 'left',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            maxWidth: '300px',
            animation: 'slideIn 0.3s ease-out'
        }}>
            <div className="pwa-message" style={{ marginBottom: '12px' }}>
                {offlineReady ? (
                    <span>App ready to work offline</span>
                ) : (
                    <span>New content available, click on reload button to update.</span>
                )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                {needUpdate && (
                    <button
                        onClick={() => updateServiceWorker(true)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#0a66c2',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Reload
                    </button>
                )}
                <button
                    onClick={() => close()}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #8885',
                        backgroundColor: 'transparent',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    Close
                </button>
            </div>
            <style>{`
        @keyframes slideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
        </div>
    );
}

export default PWAPrompt;
