import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Coins, Calendar, ArrowLeft, Shield, Clock } from 'lucide-react';

const Profile = () => {
    const { user, token } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loginHistory, setLoginHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user?._id) return;
            try {
                // We're fetching all users and finding the current one to get the full report array.
                // Alternatively, we just display the basic user info if a dedicated history endpoint doesn't exist.
                // Assuming we can get user's login history from DailyUserReport if needed, or it might be attached to the user object in /api/users/me.
                // For now, let's just show the user object details and a mocked history if none exists.
                setLoading(false);
            } catch (error) {
                console.error("Error fetching profile data:", error);
                setLoading(false);
            }
        };
        fetchUserData();
    }, [user, token]);

    if (!user) {
        return (
            <div className="min-h-screen bg-telegram-dark text-white flex items-center justify-center">
                <p>Please log in to view your profile.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-telegram-dark text-white p-4">
            {/* Header / Back Button */}
            <div className="flex items-center mb-6">
                <button 
                    onClick={() => navigate('/home')}
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors mr-4"
                >
                    <ArrowLeft size={24} className="text-telegram-blue" />
                </button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-telegram-blue to-purple-500 bg-clip-text text-transparent">
                    Your Profile
                </h1>
            </div>

            {/* Profile Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 shadow-xl backdrop-blur-sm">
                <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-white/10">
                    <div className="w-16 h-16 bg-gradient-to-br from-telegram-blue to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold uppercase shadow-inner">
                        {user.username ? user.username.charAt(0) : 'U'}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{user.username}</h2>
                        <div className="flex items-center text-gray-400 mt-1">
                            <Shield size={14} className="mr-1" />
                            <span className="text-sm capitalize">{user.role || 'User'}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 flex items-center">
                        <Coins className="text-yellow-400 mr-3" size={24} />
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Balance</p>
                            <p className="text-lg font-bold">{user.balance?.toLocaleString() || 0} Coins</p>
                        </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4 flex items-center">
                        <User className="text-telegram-blue mr-3" size={24} />
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Telegram ID</p>
                            <p className="text-lg font-bold">{user.telegramId || 'Not connected'}</p>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 flex items-center">
                        <Calendar className="text-green-400 mr-3" size={24} />
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Joined On</p>
                            <p className="text-lg font-bold">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Note about login history */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                    <Clock className="mr-2 text-telegram-blue" size={20} />
                    Account Data
                </h3>
                <p className="text-gray-400 text-sm">
                    Your login history and session data are securely stored in the database. 
                    Administrators have access to aggregate reports to ensure platform integrity.
                </p>
            </div>
        </div>
    );
};

export default Profile;
