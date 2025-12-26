
import React, { useState, useEffect, useCallback } from 'react';
import Menu from './components/Menu';
import Game from './components/Game';
import Lobby from './components/Lobby';
import SideSelector from './components/SideSelector';
import { GameState, GameSide } from './types';

declare const Peer: any;

// Конфигурация для пробития NAT (необходимо для мобильных сетей)
const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ]
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
    console.log("Initializing data connection...");

    const onOpen = () => {
      console.log("P2P Data Channel Opened!");
      setConn(connection);
      setError(null);
      if (hostStatus) {
        setGameState('SELECTING_SIDE');
      }
    };

    // Сначала вешаем слушатели, потом проверяем состояние
    connection.on('data', (data: any) => {
      console.log("Network Message:", data.type);
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
      console.error("Connection Data Error:", err);
      setError("Ошибка передачи данных: " + (err.type || "unknown"));
    });

    if (connection.open) {
      onOpen();
    } else {
      connection.once('open', onOpen);
    }
  }, []);

  const createLobby = useCallback(() => {
    const id = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newPeer = new Peer(id, PEER_CONFIG);

    newPeer.on('open', (id: string) => {
      console.log("Host Peer Ready:", id);
      setLobbyId(id);
      setIsHost(true);
      setPeer(newPeer);
    });

    newPeer.on('connection', (connection: any) => {
      console.log("Remote peer attempting to connect...");
      setupConnection(connection, true);
    });

    newPeer.on('error', (err: any) => {
      console.error("Host Node Error:", err);
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
    console.log("Joining lobby:", targetId);
    const newPeer = new Peer(PEER_CONFIG);
    
    newPeer.on('open', (myId: string) => {
      console.log("Client Peer Ready, connecting to host...");
      const connection = newPeer.connect(targetId, {
        reliable: true
      });
      setIsHost(false);
      setPeer(newPeer);
      setupConnection(connection, false);
    });

    newPeer.on('error', (err: any) => {
      console.error("Client Node Error:", err);
      if (err.type === 'peer-unavailable') {
        setError("Лобби не найдено");
      } else {
        setError("Ошибка подключения: " + err.type);
      }
    });
  }, [setupConnection]);

  const handleSideSelect = (side: GameSide) => {
    if (conn && conn.open) {
      setHostSide(side);
      conn.send({ type: 'SIDE_SELECTED', side: side });
      setGameState('COUNTDOWN');
    } else {
      setError("Соединение не готово");
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
        <div className="fixed top-6 bg-red-600/95 text-white px-6 py-4 rounded-2xl z-50 shadow-2xl backdrop-blur-md animate-in slide-in-from-top duration-300 flex items-center space-x-4">
          <span className="font-bold">⚠️ {error}</span>
          <button onClick={() => setError(null)} className="bg-white/20 hover:bg-white/40 w-8 h-8 rounded-full flex items-center justify-center transition-colors">×</button>
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
        <div className="flex flex-col items-center space-y-8 p-16 bg-zinc-900 rounded-[3rem] border border-zinc-800 shadow-2xl">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-white text-3xl font-black italic tracking-tighter animate-pulse uppercase">Ожидание хоста</p>
            <p className="text-zinc-500 text-sm mt-3 font-medium uppercase tracking-widest">Выбирается сторона игрового поля</p>
          </div>
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
          <h1 className="text-9xl font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">GAME OVER</h1>
          <button 
            onClick={() => window.location.reload()}
            className="px-20 py-8 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-2xl rounded-3xl transition-all shadow-2xl transform hover:scale-105 active:scale-95 uppercase tracking-widest"
          >
            В главное меню
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
