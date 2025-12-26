
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameSide } from '../types';

interface GameProps {
  conn: any;
  isHost: boolean;
  hostSide: GameSide;
  onFinish: () => void;
  isMobile: boolean;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 90;
const BALL_SIZE = 10;
const PADDLE_SPEED = 10;
const INITIAL_BALL_SPEED = 7;

const Game: React.FC<GameProps> = ({ conn, isHost, hostSide, onFinish, isMobile }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [score, setScore] = useState({ left: 0, right: 0 });
  const [isLandscape, setIsLandscape] = useState(true);

  const p1Y = useRef(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const p2Y = useRef(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const ball = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: INITIAL_BALL_SPEED, vy: 0 });
  const keys = useRef<Set<string>>(new Set());
  const mobileInput = useRef<number>(0); 

  const resetBall = useCallback(() => {
    ball.current.x = CANVAS_WIDTH / 2;
    ball.current.y = CANVAS_HEIGHT / 2;
    const direction = Math.random() > 0.5 ? 1 : -1;
    ball.current.vx = direction * INITIAL_BALL_SPEED;
    ball.current.vy = (Math.random() - 0.5) * 8;
  }, []);

  useEffect(() => {
    const checkOrientation = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', checkOrientation);
    checkOrientation();
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  useEffect(() => {
    if (!conn) return;
    const handleData = (data: any) => {
      if (data.type === 'SYNC_STATE' && !isHost) {
        ball.current = data.ball;
        if (hostSide === 'LEFT') p1Y.current = data.hostPaddleY;
        else p2Y.current = data.hostPaddleY;
        setScore({ left: data.hostScore, right: data.guestScore });
      } else if (data.type === 'INPUT_UPDATE' && isHost) {
        if (hostSide === 'LEFT') p2Y.current = data.guestPaddleY;
        else p1Y.current = data.guestPaddleY;
      }
    };
    conn.on('data', handleData);
    return () => conn.off('data', handleData);
  }, [conn, isHost, hostSide]);

  useEffect(() => {
    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count > 0 ? count : null);
      if (count <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keys.current.add(e.key);
    const handleKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationFrame: number;
    let lastSent = 0;

    const update = () => {
      if (countdown !== null) return;

      const myPaddleY = hostSide === 'LEFT' ? (isHost ? p1Y : p2Y) : (isHost ? p2Y : p1Y);
      let move = 0;
      if (keys.current.has('w') || keys.current.has('W') || keys.current.has('ArrowUp')) move = -PADDLE_SPEED;
      if (keys.current.has('s') || keys.current.has('S') || keys.current.has('ArrowDown')) move = PADDLE_SPEED;
      if (mobileInput.current !== 0) move = mobileInput.current * PADDLE_SPEED;

      myPaddleY.current = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, myPaddleY.current + move));

      if (isHost) {
        ball.current.x += ball.current.vx;
        ball.current.y += ball.current.vy;

        if (ball.current.y <= 0 || ball.current.y >= CANVAS_HEIGHT - BALL_SIZE) {
          ball.current.vy *= -1;
        }

        const checkCollision = (px: number, py: number, isLeft: boolean) => {
          if (
            ball.current.y + BALL_SIZE > py &&
            ball.current.y < py + PADDLE_HEIGHT &&
            ((isLeft && ball.current.x <= px + PADDLE_WIDTH && ball.current.x >= px && ball.current.vx < 0) ||
             (!isLeft && ball.current.x + BALL_SIZE >= px && ball.current.x + BALL_SIZE <= px + PADDLE_WIDTH && ball.current.vx > 0))
          ) {
            ball.current.vx *= -1.08;
            const hitPos = (ball.current.y + BALL_SIZE / 2) - (py + PADDLE_HEIGHT / 2);
            ball.current.vy += hitPos * 0.2;
            return true;
          }
          return false;
        };

        checkCollision(20, p1Y.current, true);
        checkCollision(CANVAS_WIDTH - 20 - PADDLE_WIDTH, p2Y.current, false);

        if (ball.current.x < -100) {
          setScore(prev => {
            const next = { ...prev, right: prev.right + 1 };
            if (next.right >= 10) onFinish();
            return next;
          });
          resetBall();
        } else if (ball.current.x > CANVAS_WIDTH + 100) {
          setScore(prev => {
            const next = { ...prev, left: prev.left + 1 };
            if (next.left >= 10) onFinish();
            return next;
          });
          resetBall();
        }

        // Ограничиваем частоту отправки до ~60fps
        const now = Date.now();
        if (now - lastSent > 16) {
          conn.send({
            type: 'SYNC_STATE',
            ball: ball.current,
            hostPaddleY: hostSide === 'LEFT' ? p1Y.current : p2Y.current,
            hostScore: score.left,
            guestScore: score.right
          });
          lastSent = now;
        }
      } else {
        const now = Date.now();
        if (now - lastSent > 16) {
          conn.send({
            type: 'INPUT_UPDATE',
            guestPaddleY: hostSide === 'LEFT' ? p2Y.current : p1Y.current
          });
          lastSent = now;
        }
      }
    };

    const draw = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.setLineDash([10, 15]);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      const drawRect = (x: number, y: number, w: number, h: number, color: string, glow: boolean = false) => {
        ctx.fillStyle = color;
        if (glow) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = color;
        }
        ctx.fillRect(x, y, w, h);
        ctx.shadowBlur = 0;
      };

      const myColor = '#3b82f6';
      const enemyColor = '#f43f5e';

      const leftColor = hostSide === 'LEFT' ? (isHost ? myColor : enemyColor) : (isHost ? enemyColor : myColor);
      drawRect(20, p1Y.current, PADDLE_WIDTH, PADDLE_HEIGHT, leftColor, true);

      const rightColor = hostSide === 'RIGHT' ? (isHost ? myColor : enemyColor) : (isHost ? enemyColor : myColor);
      drawRect(CANVAS_WIDTH - 20 - PADDLE_WIDTH, p2Y.current, PADDLE_WIDTH, PADDLE_HEIGHT, rightColor, true);

      drawRect(ball.current.x, ball.current.y, BALL_SIZE, BALL_SIZE, '#fff', true);

      ctx.font = 'bold 150px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillText(score.left.toString(), CANVAS_WIDTH / 4, CANVAS_HEIGHT / 2);
      ctx.fillText(score.right.toString(), (CANVAS_WIDTH * 3) / 4, CANVAS_HEIGHT / 2);
    };

    const loop = () => {
      update();
      draw();
      animationFrame = requestAnimationFrame(loop);
    };
    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, [isHost, hostSide, countdown, score, onFinish, conn, resetBall]);

  if (isMobile && !isLandscape) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-12 z-50 text-center">
        <div className="w-32 h-32 mb-10 border-8 border-dashed border-blue-500 rounded-3xl animate-[spin_5s_linear_infinite]"></div>
        <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter">Переверните устройство</h2>
        <p className="text-zinc-500 text-xl">Для игры необходим ландшафтный режим.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[1000px] aspect-[8/5] bg-black rounded-[2rem] overflow-hidden border-[12px] border-zinc-900 shadow-2xl">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full" />

      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-40">
          <div className="text-[15rem] font-black text-white italic animate-ping">
            {countdown}
          </div>
        </div>
      )}

      {isMobile && (
        <div className="absolute inset-0 flex justify-between pointer-events-none p-6">
          <div className="flex flex-col justify-end space-y-6 pointer-events-auto h-full">
             <button 
                onTouchStart={(e) => { e.preventDefault(); mobileInput.current = -1; }}
                onTouchEnd={() => mobileInput.current = 0}
                className="w-28 h-28 bg-white/5 active:bg-blue-500/40 border-2 border-white/10 rounded-full flex items-center justify-center text-4xl backdrop-blur-md transition-all active:scale-90"
             >
                ▲
             </button>
             <button 
                onTouchStart={(e) => { e.preventDefault(); mobileInput.current = 1; }}
                onTouchEnd={() => mobileInput.current = 0}
                className="w-28 h-28 bg-white/5 active:bg-blue-500/40 border-2 border-white/10 rounded-full flex items-center justify-center text-4xl backdrop-blur-md transition-all active:scale-90"
             >
                ▼
             </button>
          </div>
          <div className="w-32 h-full opacity-10 pointer-events-none">
             {/* Индикаторы или декор */}
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
