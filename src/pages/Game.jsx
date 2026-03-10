import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/api';
import { Square, History, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

const Game = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { fetchProfile } = useContext(AuthContext);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stopping, setStopping] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/game/status');
            if (res.data.playing) {
                setStatus(res.data);
                // Sync user profile to update balance in Navbar
                fetchProfile();
            } else if (status?.playing) {
                // Game ended elsewhere or timed out
                navigate('/home');
            }
        } catch (err) {
            console.error('Failed to fetch status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const handleStop = async () => {
        setStopping(true);
        try {
            await api.post('/game/stop');
            await fetchProfile();
            navigate('/home');
        } catch (err) {
            console.error('Failed to stop game');
        } finally {
            setStopping(false);
        }
    };

    if (loading && !status) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-telegram-blue"></div>
                <p className="text-gray-400 font-medium">Connecting to game engine...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-500 pb-20">
            {/* Main Stack: Game Visualizer & Stop Button */}
            <div className="flex flex-col gap-6 mb-12">
                {/* Game Visualizer */}
                <div className="bg-telegram-card rounded-3xl p-8 border border-white/5 relative overflow-hidden flex flex-col items-center justify-center min-h-[350px] game-card-shadow">
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        LIVE ENGINE
                    </div>

                    <div className="text-center">
                        {status?.logs?.[0]?.result === 'win' ? (
                            <div className="animate-bounce">
                                <TrendingUp size={100} className="text-green-400 mx-auto mb-4" />
                                <h3 className="text-5xl font-black text-green-400">WINNER!</h3>
                                <p className="text-green-400/60 font-medium font-mono text-2xl mt-2">+{status?.logs?.[0]?.payout}</p>
                            </div>
                        ) : status?.logs?.[0]?.result === 'loss' ? (
                            <div className="animate-pulse">
                                <TrendingDown size={100} className="text-red-400 mx-auto mb-4" />
                                <h3 className="text-5xl font-black text-red-400">LOST</h3>
                                <p className="text-red-400/60 font-medium font-mono text-2xl mt-2">0</p>
                            </div>
                        ) : (
                            <div>
                                <RefreshCw size={100} className="text-telegram-blue mx-auto mb-4 animate-spin-slow" />
                                <h3 className="text-5xl font-black text-white">PLAYING</h3>
                                <p className="text-gray-500 font-medium mt-2">Waiting for next round...</p>
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-8 left-0 right-0 px-8 flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-black">Active Bet</span>
                            <span className="font-bold text-2xl tracking-tighter">{status?.amount}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-500 uppercase font-black">Game ID</span>
                            <span className="font-mono text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">#{sessionId.slice(-8)}</span>
                        </div>
                    </div>
                </div>

                {/* Stop Button - Centered/Full in Stack */}
                <button
                    onClick={handleStop}
                    disabled={stopping}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-red-500/20 active:scale-[0.98]"
                >
                    {stopping ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                    ) : (
                        <>
                            <Square size={24} fill="currentColor" />
                            STOP & CLAIM
                        </>
                    )}
                </button>
            </div>

            {/* Game Logs - Now displayed BELOW */}
            <div className="bg-telegram-card rounded-3xl border border-white/5 overflow-hidden flex flex-col game-card-shadow">
                <div className="p-5 border-b border-white/5 bg-white/5 flex items-center gap-2">
                    <History size={18} className="text-telegram-blue" />
                    <h3 className="font-bold text-base tracking-tight">Recent Rounds</h3>
                </div>
                <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                    {status?.logs?.map((log, i) => (
                        <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${log.result === 'win' ? 'bg-green-500/5 border-green-500/10 text-green-400' : 'bg-red-500/5 border-red-500/10 text-red-500'}`}>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{log.time}</span>
                                <span className="font-black text-lg uppercase tracking-tight italic">{log.result}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] block opacity-40 mb-1 font-bold">PAYOUT</span>
                                <span className="font-mono font-black text-xl">
                                    {log.result === 'win' ? `+${log.payout}` : '0'}
                                </span>
                            </div>
                        </div>
                    ))}
                    {(!status?.logs || status.logs.length === 0) && (
                        <div className="text-center py-12 text-gray-500 text-sm italic">
                            The engine is preparing the first round...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Game;
