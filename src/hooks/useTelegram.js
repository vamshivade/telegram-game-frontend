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

    // isTelegram: true if running inside any Telegram WebApp environment
    const isTelegram = !!(window.Telegram?.WebApp);

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
