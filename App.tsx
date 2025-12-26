
import React, { useState, useEffect, useCallback } from 'react';
import Menu from './components/Menu';
import Game from './components/Game';
import Lobby from './components/Lobby';
import SideSelector from './components/SideSelector';
import { GameState, GameSide } from './types';

declare const Peer: any;

// Расширенная конфигурация для обхода NAT и файрволов
const PEER_CONFIG = {
  debug: 2, // Поможет увидеть детали в консоли разработчика
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.services.mozilla.com' }
    ],
    iceCandidatePoolSize: 10
  }
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [peer, setPeer] = useState<any>(null);
  const [conn, setConn] = useState<any>(null);
  const [lobbyId, setLobbyId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [hostSide, setHostSide] = useState<GameSide | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const setupConnection = useCallback((connection: any, hostStatus: boolean) => {
    console.log("Setting up data channel...");

    const onOpen = () => {
      console.log("Connection successfully established!");
      setConn(connection);
      setError(null);
      if (hostStatus) {
        setGameState('SELECTING_SIDE');
      }
    };

    connection.on('data', (data: any) => {
      if (data.type === 'SIDE_SELECTED') {
        setHostSide(data.side);
        setGameState('COUNTDOWN');
      }
    });

    connection.on('close', () => {
      setError("Соединение разорвано");
      setTimeout(() => window.location.reload(), 2000);
    });

    connection.on('error', (err: any) => {
      console.error("Connection error:", err);
      // Обработка специфической ошибки согласования
      if (err.type === 'negotiation-failed') {
        setError("Сбой согласования WebRTC. Попробуйте сменить сеть (Wi-Fi/4G)");
      } else {
        setError("Ошибка данных: " + (err.type || "unknown"));
      }
    });

    if (connection.open) {
      onOpen();
    } else {
      connection.once('open', onOpen);
    }
  }, []);

  const createLobby = useCallback(() => {
    setError(null);
    const id = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newPeer = new Peer(id, PEER_CONFIG);

    newPeer.on('open', (id: string) => {
      setLobbyId(id);
      setIsHost(true);
      setPeer(newPeer);
    });

    newPeer.on('connection', (connection: any) => {
      setupConnection(connection, true);
    });

    newPeer.on('error', (err: any) => {
      if (err.type === 'unavailable-id') {
        createLobby();
      } else {
        setError("Ошибка сервера: " + err.type);
      }
    });
  }, [setupConnection]);

  const joinLobby = useCallback((id: string) => {
    const targetId = id.trim().toUpperCase();
    if (!targetId) return;

    setError(null);
    const newPeer = new Peer(PEER_CONFIG);
    
    newPeer.on('open', () => {
      // Используем дополнительные опции для повышения стабильности на мобильных устройствах
      const connection = newPeer.connect(targetId, {
        reliable: true,
        serialization: 'json' // Принудительный JSON часто работает лучше в нестабильных сетях
      });
      setIsHost(false);
      setPeer(newPeer);
      setupConnection(connection, false);
    });

    newPeer.on('error', (err: any) => {
      if (err.type === 'peer-unavailable') {
        setError("Лобби " + targetId + " не найдено");
      } else {
        setError("Ошибка инициализации: " + err.type);
      }
    });
  }, [setupConnection]);

  const handleSideSelect = (side: GameSide) => {
    if (conn && conn.open) {
      setHostSide(side);
      conn.send({ type: 'SIDE_SELECTED', side: side });
      setGameState('COUNTDOWN');
    } else {
      setError("Соединение потеряно, обновите страницу");
    }
  };

  const cleanup = () => {
    if (conn) conn.close();
    if (peer) peer.destroy();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center overflow-hidden font-sans selection:bg-blue-500/30">
      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-red-600/95 text-white px-6 py-4 rounded-2xl z-50 shadow-2xl backdrop-blur-md animate-in slide-in-from-top duration-300 flex items-center justify-between">
          <span className="font-bold text-sm">⚠️ {error}</span>
          <button onClick={() => setError(null)} className="ml-4 bg-white/20 hover:bg-white/40 w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0">×</button>
        </div>
      )}

      {gameState === 'LOBBY' && !lobbyId && (
        <Menu onCreate={createLobby} onJoin={joinLobby} />
      )}

      {gameState === 'LOBBY' && lobbyId && !conn && (
        <Lobby lobbyId={lobbyId} onCancel={cleanup} />
      )}

      {gameState === 'SELECTING_SIDE' && isHost && (
        <SideSelector onSelect={handleSideSelect} />
      )}

      {gameState === 'SELECTING_SIDE' && !isHost && (
        <div className="flex flex-col items-center space-y-8 p-12 bg-zinc-900 rounded-[3rem] border border-zinc-800 shadow-2xl mx-4">
          <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-2xl font-black italic tracking-tighter animate-pulse uppercase text-center">Хост выбирает сторону...</p>
        </div>
      )}

      {(gameState === 'COUNTDOWN' || gameState === 'PLAYING') && (
        <Game 
          conn={conn} 
          isHost={isHost} 
          hostSide={hostSide!} 
          onFinish={() => setGameState('FINISHED')}
          isMobile={isMobile}
        />
      )}

      {gameState === 'FINISHED' && (
        <div className="flex flex-col items-center space-y-12 animate-in fade-in zoom-in duration-500">
          <h1 className="text-8xl font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">МАТЧ ОКОНЧЕН</h1>
          <button 
            onClick={() => window.location.reload()}
            className="px-16 py-6 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-2xl transition-all shadow-2xl transform hover:scale-105 active:scale-95 uppercase"
          >
            В главное меню
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
