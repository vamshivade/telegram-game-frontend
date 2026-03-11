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
        isPlayingAll: false,
        currentAd: null, // 'interstitial', 'popup', 'direct', or null
        loading: false,
        message: null,
    });

    const botTimeoutRef = useRef(null);
    const isBotExecuting = useRef(false);

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
    const claimAdReward = async (adName, rewardAmount = 50) => {
        try {
            await api.post('/user/ad-reward', { amount: rewardAmount });
        } catch {
            // Ignore error
        }
        fetchProfile();
        setAdStates(prev => ({
            ...prev,
            message: { text: `+${rewardAmount} coins earned from ${adName}! 🎉`, type: 'success' }
        }));
    };

    // --- Play All Ads Sequence ---
    const handlePlayAllAds = async () => {
        if (adStates.isPlayingAll) return;
        
        setAdStates({ isPlayingAll: true, currentAd: 'interstitial', loading: true, message: null });
        
        try {
            // 1. Rewarded Interstitial
            await showRewardedInterstitial(() => claimAdReward('Interstitial Ad', 50));
            
            setAdStates(prev => ({ ...prev, currentAd: 'waiting', message: { text: 'Waiting 40s for next ad...', type: 'success' } }));
            await new Promise(r => setTimeout(r, 40000)); // 40 seconds delay
            
            // 2. Rewarded Popup
            setAdStates(prev => ({ ...prev, currentAd: 'popup', message: { text: 'Playing Popup Ad...', type: 'success' } }));
            await showRewardedPopup(
                () => claimAdReward('Popup Ad', 50),
                () => console.log('Popup ad not available')
            );
            
            setAdStates(prev => ({ ...prev, currentAd: 'waiting', message: { text: 'Waiting 40s for next ad...', type: 'success' } }));
            await new Promise(r => setTimeout(r, 40000)); // 40 seconds delay
            
            // 3. Direct Link
            setAdStates(prev => ({ ...prev, currentAd: 'direct', message: { text: 'Opening Direct Link...', type: 'success' } }));
            const win = window.open('https://omg10.com/4/10710196', '_blank');
            if (win) {
                win.blur();
                window.focus();
            }
            await new Promise(r => setTimeout(r, 2000)); // Wait for visit
            await claimAdReward('Direct Link', 50);
            
            setAdStates({ isPlayingAll: false, currentAd: null, loading: false, message: { text: 'All ads completed! 🎉', type: 'success' } });
            setTimeout(() => setAdStates(prev => ({ ...prev, message: null })), 5000);
            
        } catch (error) {
            console.error('Error in Play All Ads sequence:', error);
            setAdStates({ isPlayingAll: false, currentAd: null, loading: false, message: { text: 'Ads sequence interrupted.', type: 'error' } });
            setTimeout(() => setAdStates(prev => ({ ...prev, message: null })), 5000);
        }
    };

    // --- Auto-Bot Logic ---
    useEffect(() => {
        if (!isAutoMode || !user) {
            if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
            isBotExecuting.current = false;
            return;
        }

        const runBotCycle = async () => {
            if (!isAutoMode || isBotExecuting.current) return;
            isBotExecuting.current = true;

            console.log('🤖 Bot: Starting new cycle...');

            try {
                // 1. Claim Daily Bonus (Try every cycle, server handles 24h limit)
                console.log('🤖 Bot: Attempting daily bonus...');
                await handleClaimBonus();
                await new Promise(r => setTimeout(r, 3000));

                if (!isAutoMode) return;

                // 2. Rewarded Interstitial
                console.log('🤖 Bot: Triggering Interstitial Ad...');
                await handleRewardedInterstitial();
                await new Promise(r => setTimeout(r, 5000));

                if (!isAutoMode) return;

                // 3. Rewarded Popup
                console.log('🤖 Bot: Triggering Popup Ad...');
                await handleRewardedPopup();
                await new Promise(r => setTimeout(r, 5000));

                if (!isAutoMode) return;

                // 4. Direct Link
                console.log('🤖 Bot: Triggering Direct Link...');
                await handleDirectLink();
                
            } catch (err) {
                console.error('🤖 Bot: Cycle error', err);
            } finally {
                isBotExecuting.current = false;
                if (isAutoMode) {
                    console.log('🤖 Bot: Waiting for next cycle (30s)...');
                    botTimeoutRef.current = setTimeout(runBotCycle, 30000);
                }
            }
        };

        runBotCycle();

        return () => {
            if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
            isBotExecuting.current = false;
        };
    }, [isAutoMode, user]);

    // --- Auto-Close Ad Watcher ---
    useEffect(() => {
        if (!isAutoMode) return;

        const autoCloseAds = () => {
            // Common Monetag close button selectors
            const selectors = [
                '.monetag-close',
                '.m-close',
                '[class*="close-button"]',
                '[id*="close-button"]',
                '[aria-label="Close"]',
                'div[style*="z-index"][style*="fixed"] [class*="close"]', // Generic high z-index close
            ];

            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el && typeof el.click === 'function' && el.offsetParent !== null) {
                        console.log('🤖 Bot: Auto-closing ad overlay...', selector);
                        el.click();
                    }
                });
            });

            // Target the specific "X" in the user screenshot if it's a div/span with 'X'
            const allDivs = document.querySelectorAll('div, span, button');
            allDivs.forEach(el => {
                if (el.innerText === '✕' || el.innerText === 'X' || el.getAttribute('aria-label') === 'Close') {
                    // Check if it's part of a fixed overlay
                    const rect = el.getBoundingClientRect();
                    if (rect.top < 100 && rect.right > window.innerWidth - 100) {
                        console.log('🤖 Bot: Auto-closing ad via X text/top-right check');
                        el.click();
                    }
                }
            });
        };

        const interval = setInterval(autoCloseAds, 2000); // Check every 2s
        return () => clearInterval(interval);
    }, [isAutoMode]);

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

            {/* Google AdSense Banner */}
            <AdBanner dataAdSlot="1220907544" className="my-6" />

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
                    <div className="bg-white/5 border border-white/8 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-white/[0.08] transition-all text-center">
                        <div className="text-4xl mb-2 select-none">🍿</div>
                        <div>
                            <p className="font-bold text-white text-lg">Watch All Ads Automatically</p>
                            <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">Click once to play all 3 available ad types in sequence. A 40-second rest period happens between ads so you don't have to keep clicking.</p>
                        </div>
                        
                        <div className="mt-4 flex flex-col items-center gap-3">
                            <button
                                onClick={handlePlayAllAds}
                                disabled={adStates.isPlayingAll}
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg px-8 py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 w-full sm:w-auto min-w-[200px]"
                            >
                                {adStates.isPlayingAll ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                                        <span>{adStates.currentAd === 'waiting' ? 'Waiting 40s...' : 'Ad sequence running...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Play fill="currentColor" size={18} />
                                        <span>Play All Ads (+150 coins)</span>
                                    </>
                                )}
                            </button>
                            
                            {adStates.message && (
                                <div className={`text-sm font-bold animate-in fade-in slide-in-from-top-2 ${adStates.message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                    {adStates.message.text}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

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
