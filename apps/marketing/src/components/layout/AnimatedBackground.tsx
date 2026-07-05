"use client";
import React, { useEffect, useRef, useState } from 'react';

export const AnimatedBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
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

        // Gradient blobs
        const blobs = [
            { x: window.innerWidth * 0.2, y: window.innerHeight * 0.3, radius: 500, vx: 0.2, vy: 0.15, color1: 'rgba(20, 184, 166, 0.08)', color2: 'rgba(20, 184, 166, 0.03)' },
            { x: window.innerWidth * 0.8, y: window.innerHeight * 0.2, radius: 600, vx: -0.15, vy: 0.2, color1: 'rgba(6, 182, 212, 0.08)', color2: 'rgba(6, 182, 212, 0.03)' },
            { x: window.innerWidth * 0.5, y: window.innerHeight * 0.7, radius: 550, vx: 0.15, vy: -0.15, color1: 'rgba(249, 115, 22, 0.05)', color2: 'rgba(249, 115, 22, 0.01)' },
        ];

        // Pixel arrangement effect
        const gridSize = 30;
        const pixels: {x: number, y: number, alpha: number, speed: number}[] = [];
        const cols = Math.ceil(window.innerWidth / gridSize);
        const rows = Math.ceil(window.innerHeight / gridSize);
        
        for(let i = 0; i < 50; i++) {
            pixels.push({
                x: Math.floor(Math.random() * cols) * gridSize,
                y: Math.floor(Math.random() * rows) * gridSize,
                alpha: Math.random(),
                speed: 0.01 + Math.random() * 0.02
            });
        }

        let angle = 0;
        let animationFrame: number;

        const animate = () => {
            // Base background
            ctx.fillStyle = '#030303';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw blobs
            blobs.forEach((blob) => {
                blob.x += blob.vx;
                blob.y += blob.vy;

                if (blob.x < 0 || blob.x > canvas.width) blob.vx *= -1;
                if (blob.y < 0 || blob.y > canvas.height) blob.vy *= -1;

                const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
                gradient.addColorStop(0, blob.color1);
                gradient.addColorStop(0.5, blob.color2);
                gradient.addColorStop(1, 'transparent');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw pixel grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
            ctx.lineWidth = 1;
            for(let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for(let y = 0; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Draw arranged pixels
            pixels.forEach(p => {
                p.alpha += p.speed;
                if(p.alpha > 1 || p.alpha < 0) p.speed *= -1;
                
                ctx.fillStyle = `rgba(20, 184, 166, ${Math.max(0, p.alpha * 0.3)})`;
                ctx.fillRect(p.x, p.y, gridSize, gridSize);
            });

            // Radar scan effect
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const radarRadius = Math.max(canvas.width, canvas.height);
            
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            
            const radarGradient = ctx.createConicGradient(0, 0, 0);
            radarGradient.addColorStop(0, 'rgba(20, 184, 166, 0)');
            radarGradient.addColorStop(0.1, 'rgba(20, 184, 166, 0.05)');
            radarGradient.addColorStop(0.12, 'rgba(20, 184, 166, 0.15)');
            radarGradient.addColorStop(0.13, 'rgba(20, 184, 166, 0)');
            radarGradient.addColorStop(1, 'rgba(20, 184, 166, 0)');
            
            ctx.fillStyle = radarGradient;
            ctx.beginPath();
            ctx.arc(0, 0, radarRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            
            angle += 0.005;

            animationFrame = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrame);
        };
    }, [mounted]);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
            />
            {/* Grain overlay for premium texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030303]/50 to-[#030303]" />
        </div>
    );
};
