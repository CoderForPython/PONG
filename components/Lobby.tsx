
import React, { useState } from 'react';

interface LobbyProps {
  lobbyId: string;
  onCancel: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ lobbyId, onCancel }) => {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(lobbyId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col items-center">
        <p className="text-blue-500 font-bold tracking-[0.3em] text-xs mb-4 uppercase">Lobby Code</p>
        <button 
          onClick={copyId}
          className="group relative flex items-center space-x-4 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 p-6 rounded-3xl transition-all active:scale-95 shadow-2xl"
        >
          <span className="text-7xl font-mono font-black text-white tracking-widest">{lobbyId}</span>
          <div className="w-12 h-12 bg-zinc-800 group-hover:bg-blue-600/20 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-blue-400 transition-colors">
            {copied ? '✓' : '❐'}
          </div>
          {copied && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs py-1 px-3 rounded-full font-bold animate-bounce">
              COPIED!
            </div>
          )}
        </button>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="flex space-x-1">
          {[1, 2, 3].map(i => (
            <div key={i} className={`w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-${i * 150}`} />
          ))}
        </div>
        <p className="text-zinc-400 font-medium tracking-tight">Waiting for Challenger to join...</p>
      </div>

      <button 
        onClick={onCancel}
        className="text-zinc-600 hover:text-red-500 text-sm font-bold tracking-widest uppercase transition-colors"
      >
        Cancel Lobby
      </button>
    </div>
  );
};

export default Lobby;
