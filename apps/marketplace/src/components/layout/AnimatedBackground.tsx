"use client";
import React, { useEffect, useRef } from 'react';

export const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Gradient mesh animation
    const createGradient = (x: number, y: number, radius: number) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
      gradient.addColorStop(0.5, 'rgba(8, 145, 178, 0.08)');
      gradient.addColorStop(1, 'transparent');
      return gradient;
    };

    const blobs = [
      { x: window.innerWidth * 0.2, y: window.innerHeight * 0.3, radius: 400, vx: 0.3, vy: 0.2 },
      { x: window.innerWidth * 0.8, y: window.innerHeight * 0.2, radius: 500, vx: -0.2, vy: 0.3 },
      { x: window.innerWidth * 0.5, y: window.innerHeight * 0.7, radius: 450, vx: 0.2, vy: -0.2 },
    ];

    let animationFrame: number;
    const animate = () => {
      ctx.fillStyle = '#0a0e27';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach((blob, i) => {
        blob.x += blob.vx;
        blob.y += blob.vy;

        if (blob.x < 0 || blob.x > canvas.width) blob.vx *= -1;
        if (blob.y < 0 || blob.y > canvas.height) blob.vy *= -1;

        const gradient = createGradient(blob.x, blob.y, blob.radius);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: 'linear-gradient(to bottom, #0a0e27 0%, #0f172a 50%, #020617 100%)' }}
      />
      {/* Additional gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-sky-500/5" />
    </div>
  );
};
