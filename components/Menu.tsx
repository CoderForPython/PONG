
import React, { useState } from 'react';

interface MenuProps {
  onCreate: () => void;
  onJoin: (id: string) => void;
}

const Menu: React.FC<MenuProps> = ({ onCreate, onJoin }) => {
  const [joinId, setJoinId] = useState('');

  return (
    <div className="flex flex-col items-center p-12 bg-gradient-to-b from-zinc-900 to-black rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-800/50 max-w-sm w-full mx-4">
      <div className="relative mb-12">
        <h1 className="text-7xl font-black italic tracking-tighter text-white">
          PONG<span className="text-blue-600">.</span>
        </h1>
        <div className="absolute -bottom-2 right-0 bg-blue-600 text-[10px] px-2 py-0.5 rounded font-black text-white uppercase tracking-widest">Multiplayer</div>
      </div>
      
      <button 
        onClick={onCreate}
        className="w-full py-5 mb-8 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all transform hover:-translate-y-1 active:scale-95 shadow-[0_10px_20px_rgba(37,99,235,0.3)]"
      >
        CREATE MATCH
      </button>

      <div className="w-full flex items-center mb-8">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="mx-4 text-zinc-600 text-xs font-bold uppercase tracking-widest">Or Join</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      <div className="w-full space-y-4">
        <input 
          type="text"
          placeholder="ENTER CODE"
          value={joinId}
          maxLength={4}
          onChange={(e) => setJoinId(e.target.value.toUpperCase())}
          className="w-full px-6 py-4 bg-zinc-800/50 text-white rounded-2xl border-2 border-transparent focus:border-blue-500 focus:outline-none focus:bg-zinc-800 text-center font-mono text-2xl tracking-[0.5em] transition-all placeholder:tracking-normal placeholder:text-zinc-700"
        />
        <button 
          disabled={joinId.length < 4}
          onClick={() => onJoin(joinId)}
          className="w-full py-5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all transform active:scale-95"
        >
          CONNECT
        </button>
      </div>

      <div className="mt-12 flex flex-col items-center space-y-2 opacity-30 group cursor-help">
        <div className="flex space-x-4">
          <div className="px-2 py-1 border border-white rounded text-[10px] font-bold">W / S</div>
          <div className="px-2 py-1 border border-white rounded text-[10px] font-bold">ARROWS</div>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Controls Guide</p>
      </div>
    </div>
  );
};

export default Menu;
