"use client";

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface HolographicAvatarProps {
  avatar: string;
  progress: number; // 0-100
  className?: string;
}

export const HolographicAvatar: React.FC<HolographicAvatarProps> = ({
  avatar,
  progress,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const baseRadius = Math.min(rect.width, rect.height) * 0.35;
    const progressRadius = baseRadius * (0.5 + (progress / 100) * 0.5);

    const draw = (time: number) => {
      timeRef.current = time;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Base glow effect
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        progressRadius * 0.3,
        centerX,
        centerY,
        progressRadius * 1.5
      );
      
      const hue = (progress / 100) * 60 + 200; // Blue to purple
      gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, ${0.3 + progress / 100 * 0.4})`);
      gradient.addColorStop(0.5, `hsla(${hue}, 80%, 50%, ${0.2 + progress / 100 * 0.3})`);
      gradient.addColorStop(1, `hsla(${hue}, 90%, 40%, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, progressRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Animated rings
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const ringProgress = ((time / 2000) + (i / ringCount)) % 1;
        const ringRadius = progressRadius * (0.8 + ringProgress * 0.4);
        const ringAlpha = (1 - ringProgress) * 0.6 * (progress / 100);

        ctx.strokeStyle = `hsla(${hue + i * 20}, 80%, 60%, ${ringAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Holographic scan lines
      const scanSpeed = time / 100;
      for (let i = 0; i < 20; i++) {
        const y = (centerY - progressRadius) + ((scanSpeed + i * 0.1) % 1) * progressRadius * 2;
        if (y >= centerY - progressRadius && y <= centerY + progressRadius) {
          const alpha = Math.sin((y - centerY + progressRadius) / (progressRadius * 2) * Math.PI) * 0.3;
          ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(centerX - progressRadius, y);
          ctx.lineTo(centerX + progressRadius, y);
          ctx.stroke();
        }
      }

      // Particle effects
      const particleCount = Math.floor(progress / 5);
      for (let i = 0; i < particleCount; i++) {
        const angle = (time / 1000 + i * 0.5) % (Math.PI * 2);
        const distance = progressRadius * (0.5 + (i % 3) * 0.2);
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        const size = 2 + (i % 3);
        const alpha = 0.6 * (progress / 100);

        ctx.fillStyle = `hsla(${hue + i * 10}, 90%, 70%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Avatar container with holographic border
      const avatarSize = progressRadius * 1.2;
      const avatarX = centerX - avatarSize / 2;
      const avatarY = centerY - avatarSize / 2;

      // Holographic border gradient
      const borderGradient = ctx.createLinearGradient(
        avatarX,
        avatarY,
        avatarX + avatarSize,
        avatarY + avatarSize
      );
      borderGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.8)`);
      borderGradient.addColorStop(0.5, `hsla(${hue + 60}, 100%, 70%, 0.8)`);
      borderGradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0.8)`);

      // Helper function for rounded rectangle
      const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      ctx.strokeStyle = borderGradient;
      ctx.lineWidth = 3;
      roundRect(avatarX, avatarY, avatarSize, avatarSize, 12);
      ctx.stroke();

      // Avatar background with glow
      const bgGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        avatarSize * 0.3,
        centerX,
        centerY,
        avatarSize * 0.7
      );
      bgGradient.addColorStop(0, `hsla(${hue}, 50%, 20%, 0.4)`);
      bgGradient.addColorStop(1, `hsla(${hue}, 50%, 10%, 0.2)`);

      ctx.fillStyle = bgGradient;
      roundRect(avatarX, avatarY, avatarSize, avatarSize, 12);
      ctx.fill();

      // Draw avatar emoji/text
      ctx.font = `${avatarSize * 0.6}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `hsla(${hue}, 100%, 90%, 1)`;
      ctx.fillText(avatar, centerX, centerY);

      // Progress indicator ring
      const ringProgress = progress / 100;
      ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        progressRadius * 1.3,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2 * ringProgress)
      );
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [avatar, progress]);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'crisp-edges' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-6xl md:text-8xl opacity-90 drop-shadow-2xl">
          {avatar}
        </div>
      </div>
    </div>
  );
};

