import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Coins, User as UserIcon } from 'lucide-react';

const Navbar = () => {
    const { user } = useContext(AuthContext);

    return (
        <nav className="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
                <div className="bg-telegram-blue p-1.5 rounded-lg shadow-lg shadow-telegram-blue/20">
                    <Coins size={20} className="text-white" />
                </div>
                <h1 className="font-bold text-lg tracking-tight">TG Games</h1>
            </div>

            {user && (
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 bg-white/5 py-1 px-3 rounded-full border border-white/10">
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
        </nav>
    );
};

export default Navbar;
