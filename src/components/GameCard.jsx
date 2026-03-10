import { Link } from 'react-router-dom';
import { Play, TrendingUp } from 'lucide-react';

const GameCard = ({ id, name, description, icon: Icon, color }) => {
    return (
        <div className="group relative bg-telegram-card rounded-2xl overflow-hidden border border-white/5 hover:border-telegram-blue/30 transition-all duration-300 hover:transform hover:scale-[1.02] game-card-shadow">
            <div className={`h-24 flex items-center justify-center ${color}`}>
                <Icon size={48} className="text-white/90 group-hover:scale-110 transition-transform duration-500" />
            </div>

            <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{name}</h3>
                    <div className="flex items-center text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                        <TrendingUp size={12} className="mr-1" />
                        2x Payout
                    </div>
                </div>
                <p className="text-gray-400 text-sm mb-5 line-clamp-2">
                    {description}
                </p>

                <Link
                    to={`/lobby/${id}`}
                    className="flex items-center justify-center gap-2 w-full bg-telegram-blue hover:bg-opacity-90 py-3 rounded-xl font-bold transition-all shadow-lg shadow-telegram-blue/20"
                >
                    <Play size={18} fill="currentColor" />
                    Play Now
                </Link>
            </div>
        </div>
    );
};

export default GameCard;
