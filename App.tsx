
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  const cleanup = useCallback(() => {
    if (conn) conn.close();
    if (peer) peer.destroy();
    setConn(null);
    setPeer(null);
    setLobbyId('');
    setError(null);
  }, [conn, peer]);

  const setupConnection = useCallback((connection: any, hostStatus: boolean) => {
    connection.on('open', () => {
      setConn(connection);
      if (hostStatus) {
        setGameState('SELECTING_SIDE');
      }
    });

    connection.on('data', (data: any) => {
      if (data.type === 'SIDE_SELECTED') {
        setHostSide(data.side);
        // If I am not host, my side is the opposite
        setGameState('COUNTDOWN');
      }
    });

    connection.on('close', () => {
      alert("Connection lost");
      window.location.reload();
    });

    connection.on('error', (err: any) => {
      setError("Connection error occurred.");
      console.error(err);
    });
  }, []);

  const createLobby = useCallback(() => {
    const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newPeer = new Peer(shortId);

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
        // Retry with a different ID if taken
        createLobby();
      } else {
        setError("Could not create lobby.");
      }
    });
  }, [setupConnection]);

  const joinLobby = useCallback((id: string) => {
    const newPeer = new Peer();
    newPeer.on('open', () => {
      const connection = newPeer.connect(id.toUpperCase(), { reliable: true });
      setIsHost(false);
      setPeer(newPeer);
      setupConnection(connection, false);
    });

    newPeer.on('error', (err: any) => {
      setError("Lobby not found or connection failed.");
    });
  }, [setupConnection]);

  const handleSideSelect = (side: GameSide) => {
    setHostSide(side);
    if (conn) {
      conn.send({ type: 'SIDE_SELECTED', side: side });
    }
    setGameState('COUNTDOWN');
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center overflow-hidden font-sans selection:bg-blue-500/30">
      {error && (
        <div className="fixed top-4 bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg z-50 backdrop-blur-md">
          {error} <button onClick={() => setError(null)} className="ml-2 font-bold underline">Dismiss</button>
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
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
          <div className="text-white text-2xl font-medium tracking-tight animate-pulse">
            Host is choosing sides...
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
        <div className="flex flex-col items-center space-y-8 animate-in fade-in zoom-in duration-500">
          <h1 className="text-7xl font-black text-white italic tracking-tighter">GAME OVER</h1>
          <button 
            onClick={() => window.location.reload()}
            className="px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] transform hover:scale-105 active:scale-95"
          >
            RETURN TO MENU
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
