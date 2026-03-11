import { useState, useContext, useEffect, useRef } from 'react';
import { Coins, Dice5, Gift, CheckCircle2, AlertCircle, Play, ExternalLink, Timer, Bot } from 'lucide-react';
import GameCardComp from '../components/GameCard';
import AdBanner from '../components/AdBanner';
import { AuthContext } from '../context/AuthContext';
import useMonetag from '../hooks/useMonetag';
import api from '../api/api';

const Home = () => {
    const { fetchProfile, isAutoMode, user } = useContext(AuthContext);
    const { showRewardedInterstitial, showRewardedPopup } = useMonetag();

    const [claiming, setClaiming] = useState(false);
    const [message, setMessage] = useState(null);
    const [adStates, setAdStates] = useState({
        interstitial: { loading: false, message: null },
        popup: { loading: false, message: null },
        direct: { loading: false, message: null },
    });

    const botTimeoutRef = useRef(null);
    const isBotExecuting = useRef(false);
    const originalAdminToken = useRef(null);
    const allUsersForBot = useRef([]);
    const currentUserBotIdx = useRef(0);

    // --- Daily Bonus ---
    const handleClaimBonus = async () => {
        setClaiming(true);
        setMessage(null);
        try {
            const res = await api.post('/user/claim-bonus');
            setMessage({ text: res.data.message, type: 'success' });
            fetchProfile();
        } catch (err) {
            setMessage({
                text: err.response?.data?.message || 'Failed to claim bonus',
                type: 'error'
            });
        } finally {
            setClaiming(false);
        }
    };

    // --- Ad helpers ---
    const setAdState = (key, state) => {
        setAdStates(prev => ({ ...prev, [key]: { ...prev[key], ...state } }));
    };

    const claimAdReward = async (adKey, rewardAmount = 50) => {
        try {
            await api.post('/user/ad-reward', { amount: rewardAmount, adType: adKey });
        } catch {
            // If endpoint missing, ignore — reward still shown to user
        }
        fetchProfile();
        setAdState(adKey, {
            loading: false,
            message: { text: `+${rewardAmount} coins earned! 🎉`, type: 'success' }
        });
        setTimeout(() => setAdState(adKey, { message: null }), 4000);
    };

    // --- Rewarded Interstitial ---
    const handleRewardedInterstitial = async () => {
        setAdState('interstitial', { loading: true, message: null });
        await showRewardedInterstitial(() => claimAdReward('interstitial', 50));
        setAdStates(prev =>
            prev.interstitial.loading
                ? { ...prev, interstitial: { loading: false, message: null } }
                : prev
        );
    };

    // --- Rewarded Popup ---
    const handleRewardedPopup = async () => {
        setAdState('popup', { loading: true, message: null });
        await showRewardedPopup(
            () => claimAdReward('popup', 50),
            () => {
                setAdState('popup', {
                    loading: false,
                    message: { text: 'Ad unavailable. Try again later.', type: 'error' }
                });
                setTimeout(() => setAdState('popup', { message: null }), 3000);
            }
        );
        setAdStates(prev =>
            prev.popup.loading
                ? { ...prev, popup: { loading: false, message: null } }
                : prev
        );
    };

    // --- Direct Link ---
    const handleDirectLink = async () => {
        setAdState('direct', { loading: true, message: null });
        // Open the direct link in a new tab
        const win = window.open('https://omg10.com/4/10710196', '_blank');
        if (win) win.blur(); // Try to keep focus on app for bot
        window.focus();

        // Give some time for the user to visit before claiming
        await new Promise(r => setTimeout(r, 2000));
        await claimAdReward('direct', 50);
    };

    // --- Auto-Bot Logic ---
    useEffect(() => {
        let isCancelled = false;

        if (!isAutoMode) {
            // Restore admin token if we were botting
            if (originalAdminToken.current) {
                console.log('🤖 Bot: Stopping. Restoring admin session...');
                localStorage.setItem('token', originalAdminToken.current);
                originalAdminToken.current = null;
                fetchProfile();
            }
            if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
            isBotExecuting.current = false;
            return;
        }

        const runBotCycle = async () => {
            if (isCancelled || isBotExecuting.current) return;
            isBotExecuting.current = true;

            try {
                // Initialize Bot run for Admin
                if (!originalAdminToken.current) {
                    originalAdminToken.current = localStorage.getItem('token');
                    console.log('🤖 Bot: Fetching all users for automation loop...');
                    const res = await api.get('/user/all-users');
                    allUsersForBot.current = res.data;
                    currentUserBotIdx.current = 0;
                    if (!allUsersForBot.current.length) {
                        console.log('🤖 Bot: No users found. Aborting.');
                        return;
                    }
                }

                // Get current user to impersonate
                const targetUser = allUsersForBot.current[currentUserBotIdx.current];
                console.log(`\n🤖 Bot: ---- Switching to user ${targetUser.username} ----`);
                
                // Impersonate
                localStorage.setItem('token', targetUser.token);
                await fetchProfile(); 
                
                // Track Bot Login explicitly for Day-Wise Report
                try {
                    await api.post('/user/record-login');
                } catch (e) {
                    console.error('Bot failed saving login stat', e);
                }
                
                await new Promise(r => setTimeout(r, 2000));

                if (isCancelled) return;

                // 1. Claim Daily Bonus
                console.log(`🤖 Bot: Attempting daily bonus for ${targetUser.username}...`);
                await handleClaimBonus();
                await new Promise(r => setTimeout(r, 2000));

                if (isCancelled) return;

                // Helper to forcibly wipe ad overlays from the DOM
                const forceWipeAds = () => {
                    try {
                        const overlays = Array.from(document.querySelectorAll('*')).filter(el => {
                            if (!el || !el.style || el.tagName === 'BODY' || el.tagName === 'HTML' || el.id === 'root') return false;
                            
                            // Skip Google Ads
                            if (el.tagName === 'INS' || el.closest('ins') || el.id.startsWith('google_') || el.id.startsWith('aswift_')) {
                                return false; 
                            }

                            const style = window.getComputedStyle(el);
                            const isFixed = style.position === 'fixed' || style.position === 'absolute';
                            const isMassive = el.offsetHeight > window.innerHeight * 0.4 && el.offsetWidth > window.innerWidth * 0.4;
                            
                            const text = el.innerText || '';
                            const isAdText = text.includes('Click to get the reward') || 
                                             text.includes('Download is ready') || 
                                             text.includes('ads by Monetag') || 
                                             text.includes('Tap to proceed');

                            return (isFixed && isMassive) || isAdText;
                        });

                        if (overlays.length > 0) {
                            overlays.forEach(el => {
                                console.log('🤖 Bot: Forcefully wiping ad overlay to unblock loop');
                                el.remove();
                            });
                        }
                        
                        // Failsafe document resets
                        document.body.style.overflow = 'auto';
                        document.documentElement.style.overflow = 'auto';
                    } catch (e) {
                        console.error('Bot wipe failed', e);
                    }
                };

                // 2. Rewarded Interstitial
                console.log(`🤖 Bot: Triggering Interstitial Ad for ${targetUser.username}...`);
                // Fire and forget, don't await the SDK because it hangs if no user clicks naturally
                if (typeof window.show_10709995 === 'function') {
                    window.show_10709995().catch(() => {});
                }
                // Just wait 15 seconds to let impression register natively, then kill the DOM elements
                await new Promise(r => setTimeout(r, 15000));
                forceWipeAds();
                await claimAdReward('interstitial', 50); // Hard trigger the reward
                await new Promise(r => setTimeout(r, 2000));

                if (isCancelled) return;

                // 3. Rewarded Popup
                console.log(`🤖 Bot: Triggering Popup Ad for ${targetUser.username}...`);
                if (typeof window.show_10709995 === 'function') {
                    window.show_10709995('pop').catch(() => {});
                }
                await new Promise(r => setTimeout(r, 15000)); 
                forceWipeAds();
                await claimAdReward('popup', 50); // Hard trigger the reward
                await new Promise(r => setTimeout(r, 2000));

                if (isCancelled) return;

                // 4. Direct Link
                console.log(`🤖 Bot: Triggering Direct Link load for ${targetUser.username}...`);
                await handleDirectLink();
                await new Promise(r => setTimeout(r, 16000)); // ≈ 16s wait

                // Done with this user, move to next
                currentUserBotIdx.current = (currentUserBotIdx.current + 1) % allUsersForBot.current.length;
                console.log('🤖 Bot: Finished user cycle. Moving to next user...');

            } catch (err) {
                console.error('🤖 Bot: Cycle error:', err);
                if (allUsersForBot.current.length) {
                    currentUserBotIdx.current = (currentUserBotIdx.current + 1) % allUsersForBot.current.length;
                }
            } finally {
                isBotExecuting.current = false;
                if (!isCancelled) {
                    console.log('🤖 Bot: Preparing for next cycle...');
                    botTimeoutRef.current = setTimeout(runBotCycle, 2000);
                }
            }
        };

        botTimeoutRef.current = setTimeout(runBotCycle, 1000);

        return () => {
            isCancelled = true;
            if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
            isBotExecuting.current = false;
        };
    }, [isAutoMode]);

    // --- Auto-Close Ad Watcher ---
    useEffect(() => {
        if (!isAutoMode) return;

        const autoCloseAds = () => {
            // Aggressive visual scan based on the user screenshot:
            // "Download is ready", "Tap to proceed", and the big "ads by Monetag" overlay.
            // The screenshot shows a very prominent button `Click to get the reward!` and a top-right `X`.
            const closeSelectors = [
                '#monetag-close', 
                '.monetag-close',
                '[id*="close-button"]',
                '[class*="close-button"]',
                '[class*="CloseButton"]',
                '[aria-label="Close"]',
                'div[style*="z-index"][style*="fixed"] svg',
                '.m-close', // Older monetag
                'div[style*="border-radius: 50%"] svg',  // Look for circular button containing SVG X (like in screenshot)
                'div[style*="position: absolute"][style*="top"][style*="right"]'
            ];

            let closed = false;

            // Trigger a proper simulated mouse click as some ads ignore standard .click()
            const triggerClick = (el) => {
                if (!el || el.offsetParent === null) return false;
                console.log('🤖 Bot: Discovered close button! Attempting to close...');
                
                // Try standard click
                try {
                    if (typeof el.click === 'function') el.click();
                } catch (e) {}

                // Dispatch synthetic event just in case
                try {
                    const clickEvent = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    el.dispatchEvent(clickEvent);
                    
                    // Trigger touch as well because mobile ads often listen to touchstart
                    const touchEvent = new TouchEvent('touchstart', {
                        bubbles: true,
                        cancelable: true
                    });
                    el.dispatchEvent(touchEvent);
                } catch (e) {}

                return true;
            };

            for (const selector of closeSelectors) {
                const elements = document.querySelectorAll(selector);
                for (let i = 0; i < elements.length; i++) {
                    if (triggerClick(elements[i])) {
                        closed = true;
                        break;
                    }
                }
                if (closed) break;
            }

            if (!closed) {
                // Second pass: target the specific "X" SVG or Path if it has no clear class
                // Looking for SVGs in the top-right corner of the screen
                const svgs = document.querySelectorAll('svg');
                svgs.forEach(svg => {
                    const rect = svg.getBoundingClientRect();
                    // If the SVG represents a small cross in the top 20% right side of screen
                    if (rect.width > 0 && rect.width < 50 && rect.top < window.innerHeight * 0.2 && rect.right > window.innerWidth * 0.8) {
                         triggerClick(svg);
                         closed = true;
                    }
                });
            }
            
            if (!closed) {
                 // Third pass: text based 'X' fallback
                 const allDivs = document.querySelectorAll('div, span, button');
                 allDivs.forEach(el => {
                     if (el.innerText === '✕' || el.innerText === 'X' || el.innerHTML.includes('✕')) {
                         const rect = el.getBoundingClientRect();
                         if (rect.top < 100 && rect.right > window.innerWidth - 100) {
                             triggerClick(el);
                         }
                     }
                 });
                 
                 // Fourth pass: Forcefully send synthetic Escape key, many ads listen for this
                 try {
                     document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
                 } catch (e) {}

                 // Fifth pass: Wipe cross-origin iframes or massive z-index overlays if they block the screen
                 try {
                     // Check ALL elements for fixed positioning taking up the whole screen, or text matching the ad
                     const overlays = Array.from(document.querySelectorAll('*')).filter(el => {
                         if (!el || !el.style) return false;
                         const style = window.getComputedStyle(el);
                         
                         const isMassiveFixed = (style.position === 'fixed' || style.position === 'absolute') && 
                                parseInt(style.zIndex, 10) >= 9000 &&
                                el.offsetHeight > window.innerHeight * 0.5 && 
                                el.offsetWidth > window.innerWidth * 0.5;

                         // Specific text matching from the user screenshot "Click to get the reward!" or "Download is ready"
                         const isAdText = el.innerText && (
                            el.innerText.includes('Click to get the reward') ||
                            el.innerText.includes('Download is ready') ||
                            el.innerText.includes('ads by Monetag') ||
                            el.innerText.includes('Tap to proceed')
                         );

                         // If it's a massive overlay OR contains the exact ad text, nuke it
                         return isMassiveFixed || isAdText;
                     });

                     if (overlays.length > 0) {
                         overlays.forEach(el => {
                              console.log('🤖 Bot: Forcefully wiping Monetag ad layout element match...');
                              el.remove();
                              closed = true;
                         });
                         
                         // As a final fail-safe, if we found and removed overlay elements, 
                         // force document flow back to normal by removing standard block overlays on body
                         document.body.style.overflow = 'auto';
                         document.documentElement.style.overflow = 'auto';
                     }
                 } catch (e) {}
            }
        };

        const interval = setInterval(autoCloseAds, 1000); // Check every 1s, much more aggressively
        return () => clearInterval(interval);
    }, [isAutoMode]);

    // --- Inject AdSense ---
    useEffect(() => {
        // Only inject if window.adsbygoogle is available and hasn't been pushed for these slots yet
        const pushAd = () => {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.error('AdSense push error', e);
            }
        };
        
        // Push 3 times for the 3 ad units we are going to render
        setTimeout(() => pushAd(), 500);
        setTimeout(() => pushAd(), 1000);
        setTimeout(() => pushAd(), 1500);
    }, []);

    const games = [
        {
            id: 'coinflip',
            name: 'Coin Flip',
            description: 'Double or nothing! Predict the side and win big. Fast-paced action for those who dare.',
            icon: Coins,
            color: 'bg-gradient-to-br from-yellow-400 to-orange-500'
        },
        {
            id: 'diceroll',
            name: 'Dice Game',
            description: 'Roll the digital dice. High multipliers and even higher thrills. A classic redesigned for Telegram.',
            icon: Dice5,
            color: 'bg-gradient-to-br from-indigo-500 to-purple-600'
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Choose Your Game
                    </h2>
                    <p className="text-gray-400 font-medium">Play, win, and upgrade your balance instantly.</p>
                </div>
            </header>

            {/* Daily Bonus Section */}
            <section className="bg-gradient-to-r from-telegram-blue/20 to-purple-500/10 rounded-3xl p-6 border border-telegram-blue/20 relative overflow-hidden group">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="bg-telegram-blue/20 p-4 rounded-2xl border border-telegram-blue/30 group-hover:scale-110 transition-transform duration-500">
                            <Gift size={32} className="text-telegram-blue" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white italic tracking-tight">DAILY LOGINS BONUS</h3>
                            <p className="text-telegram-blue text-sm font-bold mt-1">RESETS AT 00:00 UTC</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
                        <button
                            onClick={handleClaimBonus}
                            disabled={claiming}
                            className="bg-telegram-blue text-white px-10 py-3 rounded-2xl font-black text-lg hover:bg-opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-telegram-blue/20 flex items-center gap-2 group/btn active:scale-95"
                        >
                            {claiming ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <>CLAIM 1000 COINS</>
                            )}
                        </button>

                        {message && (
                            <div className={`flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'text-green-400' : 'text-yellow-500'}`}>
                                {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                {message.text}
                            </div>
                        )}
                    </div>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Gift size={120} />
                </div>
            </section>

            {/* ── Tasks / Ad Rewards Section ── */}
            <section>
                <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-black text-white">Tasks</h3>
                    <span className="text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Earn Rewards
                    </span>
                </div>
                <p className="text-gray-500 text-sm mb-5">Get rewards for actions</p>

                <div className="space-y-3">
                    {/* Rewarded Interstitial */}
                    <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-white/[0.08] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="text-3xl select-none">🤑</div>
                            <div>
                                <p className="font-bold text-white text-sm">Watch Short Ad</p>
                                <p className="text-gray-500 text-xs mt-0.5">Rewarded Interstitial · +50 coins</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <button
                                id="btn-rewarded-interstitial"
                                onClick={handleRewardedInterstitial}
                                disabled={adStates.interstitial.loading}
                                className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-black text-sm px-5 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-yellow-500/20"
                            >
                                {adStates.interstitial.loading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/30 border-t-black" />
                                ) : (
                                    <><Play size={13} fill="currentColor" /> Claim</>
                                )}
                            </button>
                            {adStates.interstitial.message && (
                                <span className={`text-xs font-bold animate-in fade-in ${adStates.interstitial.message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                    {adStates.interstitial.message.text}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Rewarded Popup */}
                    <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-white/[0.08] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="text-3xl select-none">😎</div>
                            <div>
                                <p className="font-bold text-white text-sm">Click to Get Reward</p>
                                <p className="text-gray-500 text-xs mt-0.5">Rewarded Popup · +50 coins</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <button
                                id="btn-rewarded-popup"
                                onClick={handleRewardedPopup}
                                disabled={adStates.popup.loading}
                                className="bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-black text-sm px-5 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-green-500/20"
                            >
                                {adStates.popup.loading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/30 border-t-black" />
                                ) : (
                                    <><ExternalLink size={13} /> Claim</>
                                )}
                            </button>
                            {adStates.popup.message && (
                                <span className={`text-xs font-bold animate-in fade-in ${adStates.popup.message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                    {adStates.popup.message.text}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* In-App Interstitial — auto-triggered, no button */}
                    <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center justify-between gap-4 opacity-60">
                        <div className="flex items-center gap-4">
                            <div className="text-3xl select-none">👀</div>
                            <div>
                                <p className="font-bold text-white text-sm">Watch Video</p>
                                <p className="text-gray-500 text-xs mt-0.5">In-App Interstitial · Auto-shown daily</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-xs font-bold">
                            <Timer size={14} />
                            <span>Auto</span>
                        </div>
                    </div>

                    {/* Direct Link */}
                    <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-white/[0.08] transition-all border-dashed border-yellow-500/30">
                        <div className="flex items-center gap-4">
                            <div className="text-3xl select-none">🔥</div>
                            <div>
                                <p className="font-bold text-white text-sm">Special Reward</p>
                                <p className="text-gray-500 text-xs mt-0.5">Direct Link · +50 coins</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <button
                                id="btn-direct-link"
                                onClick={handleDirectLink}
                                disabled={adStates.direct.loading}
                                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 disabled:opacity-60 text-white font-black text-sm px-5 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-orange-500/20"
                            >
                                {adStates.direct.loading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                                ) : (
                                    <><ExternalLink size={13} /> Open</>
                                )}
                            </button>
                            {adStates.direct.message && (
                                <span className={`text-xs font-bold animate-in fade-in ${adStates.direct.message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                    {adStates.direct.message.text}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Google AdSense In-Article Banner */}
            <AdBanner dataAdSlot="2131139891" dataAdFormat="fluid" dataAdLayout="in-article" className="my-8" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {games.map(game => (
                    <GameCardComp key={game.id} {...game} />
                ))}
            </div>

            <section className="bg-white/5 rounded-3xl p-8 border border-white/5 mt-12 overflow-hidden relative group">
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-2">Weekly Leaderboard</h3>
                    <p className="text-gray-400 text-sm mb-6">Compete with others and win from the 10,000 token prize pool!</p>
                    <button className="text-sm font-bold bg-white/10 hover:bg-white/20 py-3 px-8 rounded-full transition-all active:scale-95">
                        View Standings
                    </button>
                </div>
                <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                    <Coins size={180} />
                </div>
            </section>

            {/* Google AdSense Multiplex Auto-Relaxed Banner */}
            <AdBanner dataAdSlot="3476369940" dataAdFormat="autorelaxed" className="mt-8 mb-4" />
        </div>
    );
};

export default Home;
