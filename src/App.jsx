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
        } else if (initData === '' || !isTelegram) {
            // Default to guest/web login if no initData found
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
