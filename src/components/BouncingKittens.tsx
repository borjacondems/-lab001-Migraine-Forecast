import React, { useEffect, useRef, useState } from 'react';

interface Kitten {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const BouncingKittens = ({ imageUrl }: { imageUrl: string }) => {
  const [kittens, setKittens] = useState<Kitten[]>([]);
  const requestRef = useRef<number>();
  const kittensRef = useRef<Kitten[]>([]);

  useEffect(() => {
    const initialKittens: Kitten[] = Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      x: Math.random() * (window.innerWidth - 56),
      y: Math.random() * (window.innerHeight - 56),
      vx: (Math.random() - 0.5) * 1.5, // Even slower
      vy: (Math.random() - 0.5) * 1.5,
    }));
    kittensRef.current = initialKittens;
    setKittens(initialKittens);

    const animate = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      kittensRef.current = kittensRef.current.map((k) => {
        let nextX = k.x + k.vx;
        let nextY = k.y + k.vy;
        let nextVx = k.vx;
        let nextVy = k.vy;

        if (nextX <= 0) {
          nextVx = Math.abs(k.vx);
          nextX = 0;
        } else if (nextX >= width - 56) {
          nextVx = -Math.abs(k.vx);
          nextX = width - 56;
        }

        if (nextY <= 0) {
          nextVy = Math.abs(k.vy);
          nextY = 0;
        } else if (nextY >= height - 56) {
          nextVy = -Math.abs(k.vy);
          nextY = height - 56;
        }

        return { ...k, x: nextX, y: nextY, vx: nextVx, vy: nextVy };
      });

      setKittens([...kittensRef.current]);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: -5 }}
    >
      {kittens.map((k) => (
        <img
          key={k.id}
          src={imageUrl}
          alt="bouncing kitten"
          className="absolute"
          style={{
            width: '56px',
            height: '56px',
            left: `${k.x}px`,
            top: `${k.y}px`,
            imageRendering: 'pixelated',
            filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.5))'
          }}
          referrerPolicy="no-referrer"
        />
      ))}
    </div>
  );
};
