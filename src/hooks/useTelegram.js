import { useEffect, useState } from 'react';

export const useTelegram = () => {
    const [tg, setTg] = useState(null);

    useEffect(() => {
        if (window.Telegram?.WebApp) {
            const webapp = window.Telegram.WebApp;
            webapp.expand();
            setTg(webapp);
        }
    }, []);

    const onClose = () => {
        tg?.close();
    };

    const onToggleButton = () => {
        if (tg?.MainButton.isVisible) {
            tg.MainButton.hide();
        } else {
            tg.MainButton.show();
        }
    };

    // isTelegram: true only when running inside Telegram Mini App with valid initData
    const isTelegram = !!(window.Telegram?.WebApp && window.Telegram.WebApp.initData);

    return {
        onClose,
        onToggleButton,
        tg,
        isTelegram,
        user: tg?.initDataUnsafe?.user,
        initDataUnsafe: tg?.initDataUnsafe,
        queryId: tg?.initDataUnsafe?.query_id,
        initData: tg?.initData || '',
    };
};
