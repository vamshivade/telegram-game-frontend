/**
 * useMonetag - Hook to interact with the Monetag Ad SDK (show_10709995)
 *
 * Provides three ad formats:
 *  1. showRewardedInterstitial() - Native banner ad, rewards user after viewing
 *  2. showRewardedPopup()        - Opens ad in new tab, rewards user after viewing
 *  3. initInAppInterstitial()    - Auto-shows timed ads (no reward required)
 */

const SDK_FN = 'show_10709995';

/**
 * Wait for the Monetag SDK to be ready on window.
 * The SDK script is async, so it may not be available immediately.
 */
const waitForSdk = (timeout = 5000) => {
    return new Promise((resolve, reject) => {
        if (typeof window[SDK_FN] === 'function') {
            return resolve(window[SDK_FN]);
        }
        const start = Date.now();
        const interval = setInterval(() => {
            if (typeof window[SDK_FN] === 'function') {
                clearInterval(interval);
                resolve(window[SDK_FN]);
            } else if (Date.now() - start > timeout) {
                clearInterval(interval);
                reject(new Error('Monetag SDK not loaded'));
            }
        }, 100);
    });
};

const useMonetag = () => {
    /**
     * Rewarded Interstitial
     * Shows a native banner ad inside the app.
     * onReward() is called after the user watches the ad.
     */
    const showRewardedInterstitial = async (onReward) => {
        try {
            const show = await waitForSdk();
            await show();
            console.log('[Monetag] Rewarded Interstitial completed');
            if (typeof onReward === 'function') onReward();
        } catch (err) {
            console.warn('[Monetag] Rewarded Interstitial skipped or failed:', err?.message);
        }
    };

    /**
     * Rewarded Popup
     * Opens ad in a new tab/browser window.
     * onReward() is called after user watches or closes; onError() on failure.
     */
    const showRewardedPopup = async (onReward, onError) => {
        try {
            const show = await waitForSdk();
            await show('pop');
            console.log('[Monetag] Rewarded Popup completed');
            if (typeof onReward === 'function') onReward();
        } catch (err) {
            console.warn('[Monetag] Rewarded Popup failed:', err?.message);
            if (typeof onError === 'function') onError(err);
        }
    };

    /**
     * In-App Interstitial
     * Automatically shows timed ads in the background — no user interaction required.
     * Call once when the app mounts.
     *
     * Settings:
     *   frequency: 2 ads per session capping window
     *   capping: 0.1 hours (= 6 minutes) per capping window
     *   interval: 30 seconds between ads
     *   timeout: 5 seconds delay before first ad
     *   everyPage: false — session continues across page navigations
     */
    const initInAppInterstitial = async () => {
        try {
            const show = await waitForSdk();
            show({
                type: 'inApp',
                inAppSettings: {
                    frequency: 2,
                    capping: 0.1,
                    interval: 30,
                    timeout: 5,
                    everyPage: false,
                },
            });
            console.log('[Monetag] In-App Interstitial initialized');
        } catch (err) {
            console.warn('[Monetag] In-App Interstitial failed to init:', err?.message);
        }
    };

    return {
        showRewardedInterstitial,
        showRewardedPopup,
        initInAppInterstitial,
    };
};

export default useMonetag;
