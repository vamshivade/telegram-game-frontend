import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Coins, User as UserIcon, Bot, Power } from 'lucide-react';

const Navbar = () => {
    const { user, isAutoMode, setIsAutoMode } = useContext(AuthContext);

    return (
        <nav className="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
                <div className="bg-telegram-blue p-1.5 rounded-lg shadow-lg shadow-telegram-blue/20">
                    <Coins size={20} className="text-white" />
                </div>
                <h1 className="font-bold text-lg tracking-tight">TG Games</h1>
            </div>

            <div className="flex items-center gap-3">
                {/* Auto-Bot Toggle */}
                {user && user.role === 'admin' && (
                    <button
                        onClick={() => setIsAutoMode(!isAutoMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                            isAutoMode 
                            ? 'bg-green-500/20 border-green-500/40 text-green-400' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                        title={isAutoMode ? 'Disable Auto-Bot' : 'Enable Auto-Bot'}
                    >
                        <Bot size={16} className={isAutoMode ? 'animate-pulse' : ''} />
                        <span className="text-xs font-black uppercase tracking-wider hidden xs:inline">
                            {isAutoMode ? 'Bot Active' : 'Start Bot'}
                        </span>
                        <Power size={12} className={isAutoMode ? 'text-green-400' : 'text-gray-500'} />
                    </button>
                )}

                {user && (
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-1.5 bg-white/5 py-1 px-3 rounded-full border border-white/10">
                            <span className="text-sm font-medium text-gray-400">
                                <UserIcon size={14} className="inline mr-1" />
                                {user.username || user.firstName}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-telegram-blue/10 py-1 px-3 rounded-full border border-telegram-blue/20">
                            <Coins size={14} className="text-telegram-blue" />
                            <span className="text-sm font-bold text-telegram-blue">
                                {user.balance.toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
