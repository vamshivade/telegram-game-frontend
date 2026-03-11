import React, { useEffect } from 'react';

const AdBanner = ({ dataAdSlot, dataAdFormat = "auto", dataAdLayout, className = "" }) => {
    useEffect(() => {
        try {
            if (window) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (err) {
            console.error('Error loading AdSense:', err);
        }
    }, []);

    return (
        <div className={`ad-container w-full flex justify-center overflow-hidden rounded-xl border border-white/5 bg-white/5 ${className}`}>
            <ins 
                className="adsbygoogle"
                style={{ display: 'block', textAlign: 'center', width: '100%' }}
                data-ad-client="ca-pub-5386820827836187"
                data-ad-slot={dataAdSlot}
                data-ad-format={dataAdFormat}
                {...(dataAdLayout ? { 'data-ad-layout': dataAdLayout } : {})}
                data-full-width-responsive="true"
            ></ins>
        </div>
    );
};

export default AdBanner;
