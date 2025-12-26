
import React, { useState } from 'react';

interface MenuProps {
  onCreate: () => void;
  onJoin: (id: string) => void;
}

const Menu: React.FC<MenuProps> = ({ onCreate, onJoin }) => {
  const [joinId, setJoinId] = useState('');

  return (
    <div className="flex flex-col items-center p-12 bg-zinc-900 rounded-[3rem] shadow-2xl border border-zinc-800 max-w-sm w-full mx-4">
      <div className="relative mb-12">
        <h1 className="text-8xl font-black italic tracking-tighter text-white">
          PONG<span className="text-blue-600">.</span>
        </h1>
        <div className="absolute -bottom-2 right-0 bg-blue-600 text-[10px] px-2 py-0.5 rounded font-black text-white uppercase tracking-widest">Multiplayer</div>
      </div>
      
      <button 
        onClick={onCreate}
        className="w-full py-6 mb-8 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all transform hover:-translate-y-1 active:scale-95 shadow-[0_15px_30px_rgba(37,99,235,0.3)]"
      >
        СОЗДАТЬ ЛОББИ
      </button>

      <div className="w-full flex items-center mb-8">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="mx-4 text-zinc-600 text-xs font-bold uppercase">ИЛИ</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      <div className="w-full space-y-4">
        <input 
          type="text"
          placeholder="КОД"
          value={joinId}
          maxLength={6}
          onChange={(e) => setJoinId(e.target.value.toUpperCase().trim())}
          className="w-full px-6 py-5 bg-zinc-800 text-white rounded-2xl border-2 border-transparent focus:border-blue-500 focus:outline-none text-center font-mono text-3xl tracking-[0.3em] transition-all"
        />
        <button 
          disabled={joinId.length < 4}
          onClick={() => onJoin(joinId)}
          className="w-full py-6 bg-white hover:bg-zinc-200 disabled:opacity-20 disabled:grayscale text-black font-black rounded-2xl transition-all transform active:scale-95"
        >
          ПОДКЛЮЧИТЬСЯ
        </button>
      </div>

      <p className="mt-12 text-zinc-600 text-[10px] font-bold uppercase tracking-widest text-center">
        PC: W/S или Стрелки<br/>
        Mobile: Горизонтальный режим
      </p>
    </div>
  );
};

export default Menu;
