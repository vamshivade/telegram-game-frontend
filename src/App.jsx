import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import useMonetag from './hooks/useMonetag';
import { AuthContext } from './context/AuthContext';
import { useTelegram } from './hooks/useTelegram';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Navbar from './components/Navbar';
import { LucideShieldAlert } from 'lucide-react';

function App() {
    const { user, loginWithTelegram, loading } = useContext(AuthContext);
    const { initData, isTelegram } = useTelegram();
    const APP_MODE = import.meta.env.VITE_APP_MODE || 'production';
    const { initInAppInterstitial } = useMonetag();

    useEffect(() => {
        // Wait until loading is complete before attempting login
        if (loading) return;
        // Already logged in
        if (user) return;

        if (isTelegram && initData) {
            // Real Telegram user with valid initData
            loginWithTelegram(initData, true);
        } else if (!isTelegram && APP_MODE === 'development') {
            // Mock login for browser in development
            loginWithTelegram(null, false);
        }
    }, [initData, isTelegram, user, APP_MODE, loading]);

    // Start In-App Interstitial once user is authenticated
    useEffect(() => {
        if (user) {
            initInAppInterstitial();
        }
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-telegram-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-telegram-blue"></div>
            </div>
        );
    }

    // Show strict mode warning if in production and not inside Telegram
    if (APP_MODE === 'production' && !isTelegram && !user) {
        return (
            <div className="min-h-screen bg-telegram-dark flex items-center justify-center p-6 bg-gradient-to-b from-telegram-dark to-black">
                <div className="bg-telegram-card p-8 rounded-3xl border border-white/10 max-w-sm w-full text-center space-y-6 shadow-2xl">
                    <div className="bg-yellow-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto border border-yellow-500/20">
                        <LucideShieldAlert size={40} className="text-yellow-500" />
                    </div>
                    <h1 className="text-2xl font-black text-white">Open in Telegram</h1>
                    <p className="text-gray-400 leading-relaxed">
                        This application is currently in <strong>Production Mode</strong> and can only be accessed through the Telegram Mini App.
                    </p>
                    <div className="pt-4">
                        <button className="w-full bg-telegram-blue py-4 rounded-xl font-bold hover:bg-opacity-90 transition-all">
                            Support Contact
                        </button>
                        <p className="text-[10px] text-gray-500 mt-4 uppercase tracking-widest">Strict Security Mode Active</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Router>
            <div className="min-h-screen bg-telegram-dark text-white pb-10">
                <Navbar />
                <main className="container mx-auto px-4 py-6">
                    <Routes>
                        <Route path="/home" element={<Home />} />
                        <Route path="/lobby/:gameId" element={<Lobby />} />
                        <Route path="/game/:sessionId" element={<Game />} />
                        <Route path="*" element={<Navigate to="/home" />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
