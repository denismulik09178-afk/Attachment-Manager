import { useEffect, useRef } from "react";

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let waves: Wave[] = [];
    const MAX_PARTICLES = 35;
    const MAX_WAVES = 3;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth * 2;
      canvas.height = window.innerHeight * 2;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx!.setTransform(2, 0, 0, 2, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    class Particle {
      x = 0; y = 0; baseX = 0; baseY = 0;
      size = 0; angle = 0; orbitRadius = 0; orbitSpeed = 0;
      opacity = 0; maxOpacity = 0; life = 0; maxLife = 0;
      breathSpeed = 0; breathOffset = 0; currentSize = 0;
      hue = 0;

      constructor() { this.reset(); }

      reset() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.baseX = this.x;
        this.baseY = this.y;
        this.size = 1.5 + Math.random() * 2.5;
        this.angle = Math.random() * Math.PI * 2;
        this.orbitRadius = 20 + Math.random() * 40;
        this.orbitSpeed = 0.004 + Math.random() * 0.008;
        this.opacity = 0;
        this.maxOpacity = 0.12 + Math.random() * 0.18;
        this.life = 0;
        this.maxLife = 500 + Math.random() * 800;
        this.breathSpeed = 0.01 + Math.random() * 0.008;
        this.breathOffset = Math.random() * Math.PI * 2;
        this.hue = 150 + Math.random() * 30;
      }

      update() {
        this.life++;
        this.angle += this.orbitSpeed;
        this.x = this.baseX + Math.cos(this.angle) * this.orbitRadius;
        this.y = this.baseY + Math.sin(this.angle) * this.orbitRadius;
        const breath = Math.sin(this.life * this.breathSpeed + this.breathOffset);
        this.currentSize = this.size * (0.85 + breath * 0.15);
        const fadeIn = 100;
        const fadeOut = 150;
        if (this.life < fadeIn) {
          this.opacity = this.maxOpacity * (this.life / fadeIn);
        } else if (this.life > this.maxLife - fadeOut) {
          this.opacity = this.maxOpacity * ((this.maxLife - this.life) / fadeOut);
        } else {
          this.opacity = this.maxOpacity + Math.sin(this.life * this.breathSpeed) * 0.02;
        }
        if (this.life >= this.maxLife) this.reset();
      }

      draw(ctx: CanvasRenderingContext2D) {
        const blur = this.currentSize * 4;
        const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, blur);
        glow.addColorStop(0, `hsla(${this.hue}, 70%, 60%, ${this.opacity * 0.5})`);
        glow.addColorStop(0.4, `hsla(${this.hue}, 60%, 50%, ${this.opacity * 0.2})`);
        glow.addColorStop(1, `hsla(${this.hue}, 50%, 40%, 0)`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, blur, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }
    }

    class Wave {
      index: number;
      points: { x: number; offset: number; speed: number; amplitude: number }[] = [];
      numPoints = 10;
      baseY = 0;
      opacity = 0;
      life = 0;

      constructor(index: number) {
        this.index = index;
        this.reset();
      }

      reset() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.points = [];
        this.baseY = h * 0.2 + (this.index * h * 0.25);
        for (let i = 0; i < this.numPoints; i++) {
          this.points.push({
            x: (w / (this.numPoints - 1)) * i,
            offset: Math.random() * Math.PI * 2,
            speed: 0.005 + Math.random() * 0.006,
            amplitude: 15 + Math.random() * 25,
          });
        }
        this.opacity = 0.05 + Math.random() * 0.06;
      }

      update() {
        this.life++;
        this.points.forEach((p) => { p.offset += p.speed; });
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.moveTo(0, this.baseY);
        for (let i = 0; i < this.points.length; i++) {
          const p = this.points[i];
          const y = this.baseY + Math.sin(this.life * p.speed + p.offset) * p.amplitude;
          if (i === 0) {
            ctx.lineTo(p.x, y);
          } else {
            const prevP = this.points[i - 1];
            const prevY = this.baseY + Math.sin(this.life * prevP.speed + prevP.offset) * prevP.amplitude;
            const cpX = (prevP.x + p.x) / 2;
            const cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevP.x, prevY, cpX, cpY);
            if (i === this.points.length - 1) ctx.lineTo(p.x, y);
          }
        }
        ctx.strokeStyle = `hsla(160, 60%, 45%, ${this.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = `hsla(160, 50%, 40%, ${this.opacity * 0.4})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = new Particle();
      p.life = Math.floor(Math.random() * p.maxLife);
      particles.push(p);
    }
    for (let i = 0; i < MAX_WAVES; i++) {
      waves.push(new Wave(i));
    }

    function animate() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx!.clearRect(0, 0, w, h);

      const vignette = ctx!.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.8);
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(0.7, "rgba(0, 0, 0, 0.01)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.05)");
      ctx!.fillStyle = vignette;
      ctx!.fillRect(0, 0, w, h);

      waves.forEach((w) => { w.update(); w.draw(ctx!); });
      particles.forEach((p) => { p.update(); p.draw(ctx!); });

      animId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
