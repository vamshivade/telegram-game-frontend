import { useState, useContext, useEffect, useRef } from 'react';
import { Coins, Dice5, Gift, CheckCircle2, AlertCircle, Play, ExternalLink, Timer, Bot } from 'lucide-react';
import GameCardComp from '../components/GameCard';
import AdBanner from '../components/AdBanner';
import { AuthContext } from '../context/AuthContext';
import useMonetag from '../hooks/useMonetag';
import api from '../api/api';

const Home = () => {
    const { fetchProfile, isAutoMode, user } = useContext(AuthContext);
    const { showRewardedInterstitial, showRewardedPopup, initInAppInterstitial } = useMonetag();

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
            const res = await api.post('/user/ad-reward', { amount: rewardAmount, adType: adKey });
            console.log(`🤖 Bot: Successfully claimed ${rewardAmount} for ${adKey}. Status: ${res.status}`);
        } catch (err) {
            console.error(`🤖 Bot: Failed to claim ${adKey} reward:`, err.response?.data?.message || err.message);
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
        // Open the direct link using Telegram WebApp API if available
        const url = 'https://omg10.com/4/10710196';
        if (window.Telegram?.WebApp) {
            console.log('🤖 Bot: Opening Direct Link via Telegram WebApp API');
            window.Telegram.WebApp.openLink(url);
        } else {
            const win = window.open(url, '_blank');
            if (win) win.blur();
            window.focus();
        }

        // Give some time for the user to visit before claiming
        await new Promise(r => setTimeout(r, 2000));
        await claimAdReward('direct', 50);
    };

    // --- Auto-Bot Logic ---
    useEffect(() => {
        let isCancelled = false;

        if (!isAutoMode) {
            if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
            isBotExecuting.current = false;
            return;
        }

        const runBotCycle = async () => {
            if (isCancelled || isBotExecuting.current) return;
            isBotExecuting.current = true;

            try {
                // Initialize Bot: Fetch users and save original admin token
                if (!localStorage.getItem('bot_admin_token')) {
                    console.log('🤖 Bot: Initial start. Saving admin token and fetching users...');
                    localStorage.setItem('bot_admin_token', localStorage.getItem('token'));
                    
                    const res = await api.get('/user/all-users');
                    allUsersForBot.current = res.data;
                    console.log(`🤖 Bot: Successfully fetched ${res.data.length} users from database.`);
                    
                    if (!res.data.length) {
                         console.error('🤖 Bot: No users found in database!');
                         return;
                    }
                    localStorage.setItem('bot_user_list', JSON.stringify(res.data));
                    localStorage.setItem('bot_current_idx', '0');
                } else {
                    // Resume: Load list from localStorage
                    const savedList = localStorage.getItem('bot_user_list');
                    if (savedList) {
                        allUsersForBot.current = JSON.parse(savedList);
                    } else {
                        // Failsafe if list missing
                        const res = await api.get('/user/all-users');
                        allUsersForBot.current = res.data;
                        localStorage.setItem('bot_user_list', JSON.stringify(res.data));
                    }
                }

                const savedIdx = parseInt(localStorage.getItem('bot_current_idx') || '0', 10);
                currentUserBotIdx.current = savedIdx;

                if (currentUserBotIdx.current >= allUsersForBot.current.length) {
                    currentUserBotIdx.current = 0;
                    localStorage.setItem('bot_current_idx', '0');
                }

                const targetUser = allUsersForBot.current[currentUserBotIdx.current];
                console.log(`\n🤖 Bot: [USER ${currentUserBotIdx.current + 1}/${allUsersForBot.current.length}] Switching to ${targetUser.username}`);
                
                localStorage.setItem('token', targetUser.token);
                await fetchProfile(); 
                
                try { await api.post('/user/record-login'); } catch (e) {}
                
                // --- Start Dynamic Session (Max 2 Minutes) ---
                const sessionStartTime = Date.now();
                const envDuration = parseInt(import.meta.env.VITE_BOT_SESSION_DURATION, 10);
                const maxDuration = 120000; // 2 minutes in ms
                const sessionDuration = (!isNaN(envDuration) && envDuration > 0) 
                                        ? Math.min(envDuration, maxDuration) 
                                        : maxDuration;
                
                console.log(`🤖 Bot: Starting dynamic session for ${sessionDuration / 1000} seconds...`);

                // 1. Daily Bonus (3s)
                console.log('🤖 Bot: Step 1 - Daily Bonus');
                await handleClaimBonus();
                await new Promise(r => setTimeout(r, 3000));
                if (isCancelled) return;

                const forceWipeAds = () => {
                     // Only wipe blocking overlays that have been active for a while or specifically target the SDK shell
                     const overlays = document.querySelectorAll('.monetag-overlay, #monetag-shell, [class*="overlay"]');
                     overlays.forEach(el => {
                         // Only remove if it's truly blocking (covers most of viewport)
                         const rect = el.getBoundingClientRect();
                         if (rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8) {
                             el.remove();
                         }
                     });
                     document.body.style.overflow = 'auto';
                };

                // 2. Rewarded Interstitial (~20s)
                console.log('🤖 Bot: Step 2 - Rewarded Interstitial');
                handleRewardedInterstitial();
                await new Promise(r => setTimeout(r, 20000));
                // Optional wipe after specific tasks
                forceWipeAds(); 
                await new Promise(r => setTimeout(r, 2000));
                if (isCancelled) return;

                // 3. Rewarded Popup (~20s)
                console.log('🤖 Bot: Step 3 - Rewarded Popup');
                handleRewardedPopup();
                await new Promise(r => setTimeout(r, 20000)); 
                forceWipeAds();
                await new Promise(r => setTimeout(r, 2000));
                if (isCancelled) return;

                // 4. Direct Link (~20s)
                console.log('🤖 Bot: Step 4 - Direct Link');
                handleDirectLink();
                await new Promise(r => setTimeout(r, 20000)); 
                if (isCancelled) return;

                // 5. Idle Period to reach 5 minutes (allows background ads to rotate)
                const elapsedSinceStart = Date.now() - sessionStartTime;
                const remainingSessionTime = sessionDuration - elapsedSinceStart;

                if (remainingSessionTime > 0) {
                    console.log(`🤖 Bot: Sequence done. Staying active on page for remaining ${Math.floor(remainingSessionTime/1000)}s for background ads...`);
                    // We don't wipe here to allow Vignettes/Popunders to breathe
                    await new Promise(r => setTimeout(r, remainingSessionTime));
                }

                if (isCancelled) return;

                // Move to next user after 5 minutes
                const nextIdx = (currentUserBotIdx.current + 1) % allUsersForBot.current.length;
                localStorage.setItem('bot_current_idx', nextIdx.toString());
                currentUserBotIdx.current = nextIdx;

                const minutes = Math.round(sessionDuration / 60000);
                console.log(`🤖 Bot: ${minutes}-minute session complete for ${targetUser.username}. Rotating to next user...`);

            } catch (err) {
                console.error('🤖 Bot: Error:', err);
                if (allUsersForBot.current.length) {
                    const nextIdx = (currentUserBotIdx.current + 1) % allUsersForBot.current.length;
                    localStorage.setItem('bot_current_idx', nextIdx.toString());
                    currentUserBotIdx.current = nextIdx;
                }
            } finally {
                isBotExecuting.current = false;
                if (!isCancelled && isAutoMode) {
                    botTimeoutRef.current = setTimeout(runBotCycle, 3000);
                }
            }
        };

        runBotCycle();
        return () => {
            isCancelled = true;
            if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
            isBotExecuting.current = false;
        };
    }, [isAutoMode]); 

    // --- Auto-Bot Ad Assistant (Clicker/Closer/Simulator) ---
    useEffect(() => {
        if (!isAutoMode) return;

        const botAdAssistant = () => {
             // 1. Interactive Button Clicker
             const interactiveElements = document.querySelectorAll('button, div, span, a');
             interactiveElements.forEach(el => {
                 const text = (el.innerText || '').toLowerCase();
                 if (text.includes('proceed') || text.includes('continue') || text.includes('tap to') || text.includes('get reward')) {
                     const rect = el.getBoundingClientRect();
                     if (rect.width > 0 && rect.height > 0) {
                         console.log('🤖 Bot: Assistant clicking "Proceed" button');
                         el.click();
                     }
                 }
             });

             // 2. SVG Close Icon Clicker
             const svgs = document.querySelectorAll('svg');
             svgs.forEach(svg => {
                 const rect = svg.getBoundingClientRect();
                 if (rect.width > 5 && rect.width < 50 && rect.top < 100 && rect.right > window.innerWidth - 100) {
                     console.log('🤖 Bot: Assistant clicking close icon');
                     try { svg.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true })); } catch(e) {}
                 }
             });

             // 3. Document "Background Click" Simulator (Triggers Popunders/Vignettes)
             // Increased frequency for better triggering
             if (Math.random() > 0.4) {
                 console.log('🤖 Bot: Simulating background click for Popunders...');
                 const x = Math.floor(Math.random() * (window.innerWidth - 100)) + 50;
                 const y = Math.floor(Math.random() * (window.innerHeight - 100)) + 50;
                 const evt = new MouseEvent('click', { view: window, bubbles: true, cancelable: true, clientX: x, clientY: y });
                 document.body.dispatchEvent(evt);
             }

             // 4. Common Text Closers
             const buttons = document.querySelectorAll('button');
             buttons.forEach(el => {
                const text = el.innerText.toUpperCase();
                if (text === '✕' || text === 'X' || text === 'CLOSE' || text === 'SKIP') {
                    // Slight delay before closing to ensure view counts
                    setTimeout(() => el.click(), 1000);
                }
             });

             // 5. Random Interaction (Trigger Popunders)
             if (Math.random() > 0.6) {
                 const interactables = document.querySelectorAll('a, button, .game-card-class'); // Simplified selector
                 if (interactables.length) {
                     const target = interactables[Math.floor(Math.random() * interactables.length)];
                     console.log('🤖 Bot: Simulating interaction to trigger popenders...');
                     target.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
                 }
             }

             // 6. Monetag In-Page Push Specialist (Target those floating banners)
             const pushBanners = document.querySelectorAll('[id^="og-"], [id^="monetag-"], [class*="push-banner"]');
             pushBanners.forEach(banner => {
                 const rect = banner.getBoundingClientRect();
                 if (rect.width > 100 && rect.height > 50 && rect.top > 0) {
                     console.log('🤖 Bot: Specialist clicking In-Page Push banner...');
                     banner.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
                 }
             });
        };

        // --- Random Engagement Simulator (Scrolling) ---
        const engagementInterval = setInterval(() => {
            const scrollAmount = Math.random() > 0.5 ? 200 : -200;
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            console.log('🤖 Bot: Simulating user scroll engagement...');
        }, 15000);

        const interval = setInterval(botAdAssistant, 2500);
        return () => {
            clearInterval(interval);
            clearInterval(engagementInterval);
        };
    }, [isAutoMode]);

    // --- Restore Admin on Stop (Persistence) ---
    useEffect(() => {
        if (!isAutoMode) {
            const adminToken = localStorage.getItem('bot_admin_token');
            if (adminToken) {
                console.log('🤖 Bot: Stopping. Restoring admin session...');
                localStorage.setItem('token', adminToken);
                localStorage.removeItem('bot_admin_token');
                localStorage.removeItem('bot_user_list');
                localStorage.removeItem('bot_current_idx');
                fetchProfile();
            }
            if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
            isBotExecuting.current = false;
        }
    }, [isAutoMode, fetchProfile]);

    // --- Inject AdSense & Initialize Monetag In-App ---
    useEffect(() => {
        // Initialize Monetag background ads
        initInAppInterstitial();

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
                        Choose Your Game, {user?.username || user?.firstName || 'User'}
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
