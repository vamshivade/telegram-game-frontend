import { createContext, useState, useEffect } from 'react';
import api from '../api/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAutoMode, setIsAutoMode] = useState(false);

    const loginWithTelegram = async (initData, isTelegram = true) => {
        try {
            console.log('--- Login Attempt ---');
            console.log('isTelegram:', isTelegram);
            console.log('initData:', initData ? 'present' : 'missing');

            const res = await api.post('/auth/telegram', { initData, isTelegram });
            localStorage.setItem('token', res.data.token);
            setUser(res.data.user);
            return res.data.user;
        } catch (err) {
            console.error('Login failed', err);
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const fetchProfile = async () => {
        try {
            const res = await api.get('/user/profile');
            setUser(res.data);
        } catch (err) {
            logout();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // If the user's browser has Telegram data natively, 
        // aggressively wipe any previous token stored in localStorage so they
        // don't get stuck impersonating a bot account from a previous crashed session.
        if (window.Telegram?.WebApp?.initData) {
            localStorage.removeItem('token');
        }

        if (localStorage.getItem('token')) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ 
            user, setUser, loading, loginWithTelegram, logout, fetchProfile,
            isAutoMode, setIsAutoMode 
        }}>
            {children}
        </AuthContext.Provider>
    );
};
