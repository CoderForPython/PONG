
import React, { useState, useEffect, useCallback } from 'react';
import Menu from './components/Menu';
import Game from './components/Game';
import Lobby from './components/Lobby';
import SideSelector from './components/SideSelector';
import { GameState, GameSide } from './types';

declare const Peer: any;

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
    const onOpen = () => {
      console.log("Connection established!");
      setConn(connection);
      if (hostStatus) {
        setGameState('SELECTING_SIDE');
      }
    };

    if (connection.open) {
      onOpen();
    } else {
      connection.on('open', onOpen);
    }

    connection.on('data', (data: any) => {
      console.log("Data received:", data.type);
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
      console.error("Conn Error:", err);
      setError("Ошибка передачи данных");
    });
  }, []);

  const createLobby = useCallback(() => {
    // Используем 5 символов для уменьшения вероятности коллизии
    const id = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newPeer = new Peer(id);

    newPeer.on('open', (id: string) => {
      console.log("Peer opened with ID:", id);
      setLobbyId(id);
      setIsHost(true);
      setPeer(newPeer);
    });

    newPeer.on('connection', (connection: any) => {
      console.log("Incoming connection...");
      setupConnection(connection, true);
    });

    newPeer.on('error', (err: any) => {
      console.error("Peer Error:", err);
      if (err.type === 'unavailable-id') {
        createLobby(); // Пробуем другой ID
      } else {
        setError("Не удалось создать лобби. Попробуйте обновить страницу.");
      }
    });
  }, [setupConnection]);

  const joinLobby = useCallback((id: string) => {
    setError(null);
    const newPeer = new Peer();
    
    newPeer.on('open', () => {
      console.log("Guest peer opened, connecting to:", id);
      const connection = newPeer.connect(id.trim().toUpperCase(), {
        reliable: true
      });
      setIsHost(false);
      setPeer(newPeer);
      setupConnection(connection, false);
    });

    newPeer.on('error', (err: any) => {
      console.error("Join Error:", err);
      setError("Лобби не найдено или сервер недоступен");
    });
  }, [setupConnection]);

  const handleSideSelect = (side: GameSide) => {
    setHostSide(side);
    if (conn) {
      conn.send({ type: 'SIDE_SELECTED', side: side });
    }
    setGameState('COUNTDOWN');
  };

  const cleanup = () => {
    if (conn) conn.close();
    if (peer) peer.destroy();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center overflow-hidden font-sans selection:bg-blue-500/30">
      {error && (
        <div className="fixed top-6 bg-red-600/90 text-white px-6 py-3 rounded-full z-50 shadow-2xl backdrop-blur-md animate-bounce">
          {error}
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
        <div className="flex flex-col items-center space-y-8">
          <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-3xl font-bold tracking-widest animate-pulse">ОЖИДАНИЕ ВЫБОРА СТОРОНЫ...</p>
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
        <div className="flex flex-col items-center space-y-10">
          <h1 className="text-8xl font-black text-white italic">GAME OVER</h1>
          <button 
            onClick={() => window.location.reload()}
            className="px-16 py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-2xl transform hover:scale-105"
          >
            В МЕНЮ
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
