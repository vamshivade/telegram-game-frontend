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

    return {
        onClose,
        onToggleButton,
        tg,
        isTelegram: !!window.Telegram?.WebApp?.initData, // Simple detection
        user: tg?.initDataUnsafe?.user,
        queryId: tg?.initDataUnsafe?.query_id,
        initData: tg?.initData,
    };
};
