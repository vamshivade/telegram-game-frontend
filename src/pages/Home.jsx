import { useState, useContext } from 'react';
import { Coins, Dice5, Gift, CheckCircle2, AlertCircle, Play, ExternalLink, Timer } from 'lucide-react';
import GameCardComp from '../components/GameCard';
import { AuthContext } from '../context/AuthContext';
import useMonetag from '../hooks/useMonetag';
import api from '../api/api';

const Home = () => {
    const { fetchProfile } = useContext(AuthContext);
    const { showRewardedInterstitial, showRewardedPopup } = useMonetag();

    const [claiming, setClaiming] = useState(false);
    const [message, setMessage] = useState(null);
    const [adStates, setAdStates] = useState({
        interstitial: { loading: false, message: null },
        popup: { loading: false, message: null },
    });

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
            await api.post('/user/ad-reward', { amount: rewardAmount });
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
        </div>
    );
};

export default Home;
