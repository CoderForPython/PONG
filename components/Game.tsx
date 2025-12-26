
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
const PADDLE_SPEED = 9;
const INITIAL_BALL_SPEED = 6;

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
    ball.current.vy = (Math.random() - 0.5) * 6;
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
          const paddleLeft = px;
          const paddleRight = px + PADDLE_WIDTH;
          const paddleTop = py;
          const paddleBottom = py + PADDLE_HEIGHT;

          if (
            ball.current.y + BALL_SIZE > paddleTop &&
            ball.current.y < paddleBottom &&
            ((isLeft && ball.current.x <= paddleRight && ball.current.x >= paddleLeft && ball.current.vx < 0) ||
             (!isLeft && ball.current.x + BALL_SIZE >= paddleLeft && ball.current.x + BALL_SIZE <= paddleRight && ball.current.vx > 0))
          ) {
            ball.current.vx *= -1.05;
            const hitPos = (ball.current.y + BALL_SIZE / 2) - (py + PADDLE_HEIGHT / 2);
            ball.current.vy += hitPos * 0.15;
            return true;
          }
          return false;
        };

        checkCollision(20, p1Y.current, true);
        checkCollision(CANVAS_WIDTH - 20 - PADDLE_WIDTH, p2Y.current, false);

        if (ball.current.x < -50) {
          setScore(prev => {
            const next = { ...prev, right: prev.right + 1 };
            if (next.right >= 10) onFinish();
            return next;
          });
          resetBall();
        } else if (ball.current.x > CANVAS_WIDTH + 50) {
          setScore(prev => {
            const next = { ...prev, left: prev.left + 1 };
            if (next.left >= 10) onFinish();
            return next;
          });
          resetBall();
        }

        conn.send({
          type: 'SYNC_STATE',
          ball: ball.current,
          hostPaddleY: hostSide === 'LEFT' ? p1Y.current : p2Y.current,
          hostScore: score.left,
          guestScore: score.right
        });
      } else {
        conn.send({
          type: 'INPUT_UPDATE',
          guestPaddleY: hostSide === 'LEFT' ? p2Y.current : p1Y.current
        });
      }
    };

    const draw = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Center dash line
      ctx.setLineDash([10, 15]);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      const drawRect = (x: number, y: number, w: number, h: number, color: string, glow: boolean = false) => {
        ctx.fillStyle = color;
        if (glow) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = color;
        }
        ctx.fillRect(x, y, w, h);
        ctx.shadowBlur = 0;
      };

      const myColor = '#3b82f6';
      const enemyColor = '#f43f5e';
      const neutralColor = '#ffffff';

      // Left Paddle
      const p1Color = hostSide === 'LEFT' ? (isHost ? myColor : enemyColor) : (isHost ? enemyColor : myColor);
      drawRect(20, p1Y.current, PADDLE_WIDTH, PADDLE_HEIGHT, p1Color, true);

      // Right Paddle
      const p2Color = hostSide === 'RIGHT' ? (isHost ? myColor : enemyColor) : (isHost ? enemyColor : myColor);
      drawRect(CANVAS_WIDTH - 20 - PADDLE_WIDTH, p2Y.current, PADDLE_WIDTH, PADDLE_HEIGHT, p2Color, true);

      // Ball
      drawRect(ball.current.x, ball.current.y, BALL_SIZE, BALL_SIZE, neutralColor, true);

      // Scores
      ctx.font = 'bold 120px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
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
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-8 z-50 text-center">
        <div className="w-24 h-24 mb-6 border-4 border-dashed border-blue-500 rounded-2xl animate-[spin_4s_linear_infinite]"></div>
        <h2 className="text-3xl font-black mb-4 tracking-tighter uppercase">Rotate Device</h2>
        <p className="text-zinc-500 font-medium">Please turn your phone horizontally to start the match.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[1000px] aspect-[8/5] bg-zinc-900/50 rounded-3xl overflow-hidden border-8 border-zinc-800/50 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full" />

      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-40">
          <div className="text-[12rem] font-black text-white italic drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      {isMobile && (
        <div className="absolute inset-0 flex justify-between pointer-events-none p-4 select-none">
          <div className="flex flex-col justify-end space-y-4 pointer-events-auto h-full w-1/4">
             <button 
                onTouchStart={(e) => { e.preventDefault(); mobileInput.current = -1; }}
                onTouchEnd={() => mobileInput.current = 0}
                className="w-24 h-24 bg-white/5 active:bg-blue-500/20 border border-white/10 rounded-full flex items-center justify-center text-3xl backdrop-blur-sm transition-colors"
             >
                ▲
             </button>
             <button 
                onTouchStart={(e) => { e.preventDefault(); mobileInput.current = 1; }}
                onTouchEnd={() => mobileInput.current = 0}
                className="w-24 h-24 bg-white/5 active:bg-blue-500/20 border border-white/10 rounded-full flex items-center justify-center text-3xl backdrop-blur-sm transition-colors"
             >
                ▼
             </button>
          </div>
          <div className="w-1/4 h-full" />
        </div>
      )}
    </div>
  );
};

export default Game;
