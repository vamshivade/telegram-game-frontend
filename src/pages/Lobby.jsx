import { useState, useContext, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/api';
import { ArrowLeft, Coins, AlertCircle, PlayCircle } from 'lucide-react';

const Lobby = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { user, fetchProfile } = useContext(AuthContext);
    const [amount, setAmount] = useState(10);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const gameNames = {
        'coinflip': 'Coin Flip',
        'diceroll': 'Dice Game'
    };

    const handleStart = async () => {
        if (amount < 10) {
            setError('Minimum bet is 10 tokens');
            return;
        }
        if (amount > user.balance) {
            setError('Insufficient balance');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await api.post('/game/start', { gameId, amount });
            fetchProfile(); // Update balance
            navigate(`/game/${res.data.sessionId}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to start game');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
                onClick={() => navigate('/home')}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
            >
                <ArrowLeft size={18} />
                Back to Home
            </button>

            <div className="bg-telegram-card rounded-3xl p-8 border border-white/5 game-card-shadow">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black mb-1">{gameNames[gameId]} Lobby</h2>
                        <p className="text-gray-400 text-sm">Set your bet and start the machine</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-medium text-gray-400">Current Balance</span>
                            <div className="flex items-center gap-1.5 text-telegram-blue font-bold">
                                <Coins size={16} />
                                {user?.balance?.toLocaleString()}
                            </div>
                        </div>

                        <label className="block text-sm font-medium text-gray-400 mb-3">
                            Bet Amount
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full bg-black/30 border border-white/10 rounded-xl py-4 px-5 text-xl font-bold focus:outline-none focus:border-telegram-blue transition-colors"
                                placeholder="0.00"
                                min="10"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                                <button
                                    onClick={() => setAmount(Math.floor(user.balance / 2))}
                                    className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                >
                                    1/2
                                </button>
                                <button
                                    onClick={() => setAmount(user.balance)}
                                    className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                >
                                    MAX
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleStart}
                        disabled={loading || !user}
                        className="w-full bg-telegram-blue hover:bg-opacity-90 disabled:opacity-50 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-xl shadow-telegram-blue/30"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <PlayCircle size={24} />
                                START GAME
                            </>
                        )}
                    </button>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl text-center">
                        <span className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Min Bet</span>
                        <span className="font-bold">10</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl text-center">
                        <span className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Multiplier</span>
                        <span className="font-bold text-green-400">2.00x</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Lobby;
