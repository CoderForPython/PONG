
import React from 'react';
import { GameSide } from '../types';

interface SideSelectorProps {
  onSelect: (side: GameSide) => void;
}

const SideSelector: React.FC<SideSelectorProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-col items-center space-y-8 p-10 bg-zinc-900 rounded-3xl border border-zinc-800">
      <h2 className="text-3xl font-bold text-white">Choose Your Side</h2>
      <div className="flex space-x-6">
        <button 
          onClick={() => onSelect('LEFT')}
          className="group relative w-40 h-60 bg-zinc-800 rounded-2xl border-4 border-transparent hover:border-blue-500 transition-all overflow-hidden flex flex-col items-center justify-center"
        >
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-24 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          <span className="text-zinc-500 group-hover:text-white font-bold">LEFT</span>
        </button>

        <button 
          onClick={() => onSelect('RIGHT')}
          className="group relative w-40 h-60 bg-zinc-800 rounded-2xl border-4 border-transparent hover:border-blue-500 transition-all overflow-hidden flex flex-col items-center justify-center"
        >
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-24 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          <span className="text-zinc-500 group-hover:text-white font-bold">RIGHT</span>
        </button>
      </div>
      <p className="text-zinc-400 text-sm">Opponent will get the other side.</p>
    </div>
  );
};

export default SideSelector;
