import { getReactionVisualProfile } from './reaction-visuals.mjs';

const TAU = Math.PI * 2;
const randomBetween = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function readRgb(hex) {
  const value = String(hex || '#8bdacb').replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((part) => part + part).join('')
    : value;
  const number = Number.parseInt(normalized, 16);
  if (!Number.isFinite(number)) return [139, 218, 203];
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

function roundedClip(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
  context.clip();
}

export class ReactionFxRenderer {
  constructor({ canvas, stage, vessel }) {
    this.canvas = canvas;
    this.stage = stage;
    this.vessel = vessel;
    this.context = canvas?.getContext?.('2d', { alpha: true }) || null;
    this.profile = null;
    this.colour = '#8bdacb';
    this.rgb = readRgb(this.colour);
    this.durationMs = 0;
    this.elapsed = 0;
    this.lastFrame = 0;
    this.frameId = 0;
    this.active = false;
    this.geometry = null;
    this.bubbles = [];
    this.foam = [];
    this.droplets = [];
    this.sediment = [];
    this.currents = [];
    this.pigments = [];
    this.bubbleAccumulator = 0;
    this.foamAccumulator = 0;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    this.onResize = () => this.resize();
    this.resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(this.onResize)
      : null;
    this.resizeObserver?.observe(stage);
    this.resizeObserver?.observe(vessel);
    window.addEventListener('resize', this.onResize, { passive: true });
    this.resize();
  }

  resize() {
    if (!this.context || !this.canvas || !this.stage) return;
    const rect = this.stage.getBoundingClientRect();
    const ratio = clamp(window.devicePixelRatio || 1, 1, 2);
    this.width = Math.max(1, Math.round(rect.width));
    this.height = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.measureVessel();
    if (!this.active) this.draw();
  }

  measureVessel() {
    if (!this.stage || !this.vessel) return;
    const stageRect = this.stage.getBoundingClientRect();
    const bodyRect = this.vessel.getBoundingClientRect();
    const x = bodyRect.left - stageRect.left + 4;
    const y = bodyRect.top - stageRect.top + 4;
    const width = Math.max(20, bodyRect.width - 8);
    const height = Math.max(20, bodyRect.height - 8);
    const fill = Number.parseFloat(this.profile?.liquidHeight || '44') / 100;
    const bottom = y + height - 3;
    const surface = clamp(y + height * (1 - fill), y + 5, bottom - 8);
    this.geometry = {
      x, y, width, height, bottom, surface,
      cx: x + width / 2,
      cy: surface + (bottom - surface) * 0.48
    };
  }

  activate(effect, colour, durationMs) {
    this.stop();
    if (!this.context) return;
    const profile = getReactionVisualProfile(effect);
    if (!profile?.fx) return;
    this.profile = profile;
    this.colour = colour || '#8bdacb';
    this.rgb = readRgb(this.colour);
    this.durationMs = Math.max(500, durationMs || profile.phaseDurationMs);
    this.elapsed = 0;
    this.lastFrame = 0;
    this.bubbleAccumulator = 0;
    this.foamAccumulator = 0;
    this.bubbles = [];
    this.foam = [];
    this.droplets = [];
    this.sediment = [];
    this.currents = [];
    this.pigments = [];
    this.measureVessel();

    const fx = profile.fx;
    for (let i = 0; i < fx.currentCount; i += 1) {
      this.currents.push({
        angle: randomBetween(0, TAU),
        radius: randomBetween(7, this.geometry.width * 0.4),
        spin: i % 2 ? -1 : 1,
        speed: randomBetween(0.7, 1.4),
        phase: randomBetween(0, TAU),
        x: null,
        y: null
      });
    }
    for (let i = 0; i < fx.sedimentCount; i += 1) this.spawnSediment(true);
    for (let i = 0; i < fx.pigmentCount; i += 1) {
      this.pigments.push({
        angle: randomBetween(0, TAU),
        radius: randomBetween(5, this.geometry.width * 0.34),
        speed: randomBetween(0.45, 1.3),
        size: randomBetween(13, 31)
      });
    }
    for (let i = 0; i < fx.sprayCount; i += 1) this.spawnDroplet();

    this.active = true;
    if (this.reducedMotion) {
      this.update(1 / 60);
      this.draw();
      this.active = false;
      return;
    }
    this.frameId = window.requestAnimationFrame((time) => this.frame(time));
  }

  spawnBubble() {
    const g = this.geometry;
    this.bubbles.push({
      x: randomBetween(g.x + 12, g.x + g.width - 12),
      y: randomBetween(g.surface + 12, g.bottom - 8),
      vx: randomBetween(-10, 10),
      vy: -randomBetween(42, 92),
      radius: randomBetween(3.2, 8.5),
      phase: randomBetween(0, TAU),
      age: 0,
      shine: randomBetween(0.45, 0.95)
    });
  }

  spawnFoam() {
    const g = this.geometry;
    this.foam.push({
      x: randomBetween(g.cx - g.width * 0.22, g.cx + g.width * 0.22),
      y: g.surface + randomBetween(-2, 9),
      vx: randomBetween(-44, 44),
      vy: -randomBetween(56, 132),
      radius: randomBetween(4, 10),
      age: 0,
      life: randomBetween(1.15, 2.0),
      wobble: randomBetween(0, TAU)
    });
  }

  spawnDroplet() {
    const g = this.geometry;
    const angle = -Math.PI / 2 + randomBetween(-1.05, 1.05);
    const speed = randomBetween(74, 205);
    this.droplets.push({
      x: g.cx + randomBetween(-g.width * 0.12, g.width * 0.12),
      y: g.surface + randomBetween(-5, 9),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: randomBetween(1.8, 4.8),
      age: 0,
      life: randomBetween(0.8, 1.4)
    });
  }

  spawnSediment(initial = false) {
    const g = this.geometry;
    this.sediment.push({
      x: randomBetween(g.x + 8, g.x + g.width - 8),
      y: initial
        ? randomBetween(g.surface + 3, g.surface + g.height * 0.24)
        : randomBetween(g.surface + 4, g.surface + g.height * 0.12),
      vx: randomBetween(-7, 7),
      vy: initial ? randomBetween(8, 28) : randomBetween(10, 24),
      radius: randomBetween(1.2, 3.3),
      alpha: randomBetween(0.38, 0.88),
      settled: false
    });
  }

  update(dt) {
    const g = this.geometry;
    const fx = this.profile.fx;
    const progress = clamp(this.elapsed / (this.durationMs / 1000), 0, 1);
    const attack = clamp(progress / 0.18, 0, 1);
    const release = clamp((1 - progress) / 0.32, 0, 1);
    const intensity = Math.min(attack, release);

    this.bubbleAccumulator += fx.bubbleRate * dt * Math.max(0.18, intensity);
    while (this.bubbleAccumulator >= 1 && this.bubbles.length < fx.maxBubbles) {
      this.spawnBubble();
      this.bubbleAccumulator -= 1;
    }
    this.foamAccumulator += fx.foamRate * dt * Math.max(0.12, intensity);
    while (this.foamAccumulator >= 1 && this.foam.length < fx.maxFoam) {
      this.spawnFoam();
      this.foamAccumulator -= 1;
    }

    for (const bubble of this.bubbles) {
      bubble.age += dt;
      bubble.x += (bubble.vx + Math.sin(this.elapsed * 3.2 + bubble.phase) * 9) * dt;
      bubble.y += bubble.vy * dt;
    }
    this.bubbles = this.bubbles.filter((bubble) => bubble.y > g.surface - bubble.radius && bubble.age < 3.2);

    for (const blob of this.foam) {
      blob.age += dt;
      blob.vy += 58 * dt;
      blob.x += (blob.vx + Math.sin(this.elapsed * 4 + blob.wobble) * 14) * dt;
      blob.y += blob.vy * dt;
    }
    this.foam = this.foam.filter((blob) => blob.age < blob.life && blob.y < this.height + 25);

    for (const drop of this.droplets) {
      drop.age += dt;
      drop.vy += 390 * dt;
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
    }
    this.droplets = this.droplets.filter((drop) => drop.age < drop.life && drop.y < this.height + 12);

    for (const particle of this.sediment) {
      if (particle.settled) continue;
      particle.vy += 38 * dt;
      particle.x += (particle.vx + Math.sin(this.elapsed * 2.8 + particle.y * 0.04) * 8) * dt;
      particle.y += particle.vy * dt;
      if (particle.y >= g.bottom - particle.radius) {
        particle.y = g.bottom - particle.radius;
        particle.vy = 0;
        particle.vx *= 0.08;
        particle.settled = true;
      }
    }

    for (const current of this.currents) {
      current.angle += current.spin * current.speed * fx.vortexSpeed * dt;
      current.radius += Math.sin(this.elapsed * 2 + current.phase) * fx.turbulence * dt * 3;
      current.radius = clamp(current.radius, 4, g.width * 0.42);
      current.x = g.cx + Math.cos(current.angle) * current.radius;
      current.y = g.cy + Math.sin(current.angle) * current.radius * 0.64;
    }
    for (const pigment of this.pigments) pigment.angle += pigment.speed * fx.vortexSpeed * dt;
  }

  drawVortex(context, g) {
    const fx = this.profile.fx;
    const [r, green, b] = this.rgb;
    const radius = Math.min(g.width, g.bottom - g.surface) * 0.44;
    context.save();
    context.globalCompositeOperation = 'screen';
    for (let strand = 0; strand < 5; strand += 1) {
      context.beginPath();
      const turns = 3.4 * Math.PI;
      for (let step = 0; step <= 66; step += 1) {
        const t = step / 66;
        const angle = t * turns + this.elapsed * fx.vortexSpeed * (strand % 2 ? -1 : 1) + strand * 1.2;
        const distance = 3 + t * radius * (0.68 + strand * 0.055);
        const x = g.cx + Math.cos(angle) * distance;
        const y = g.cy + Math.sin(angle) * distance * 0.62;
        if (step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = `rgba(${r},${green},${b},${0.12 + fx.turbulence * 0.055})`;
      context.lineWidth = 1.1 + (strand % 3) * 0.65;
      context.stroke();
    }
    context.beginPath();
    context.ellipse(g.cx, g.surface + 2, g.width * 0.43, 5 + Math.sin(this.elapsed * 7) * 2.1, 0, 0, TAU);
    context.strokeStyle = `rgba(241,255,251,${0.35 + Math.sin(this.elapsed * 8) * 0.08})`;
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();
  }

  drawCurrents(context) {
    const [r, green, b] = this.rgb;
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const current of this.currents) {
      if (current.x === null) continue;
      const tailX = current.x - Math.cos(current.angle) * 9;
      const tailY = current.y - Math.sin(current.angle) * 6;
      context.beginPath();
      context.moveTo(tailX, tailY);
      context.quadraticCurveTo(
        (tailX + current.x) * 0.5 + current.spin * 4,
        (tailY + current.y) * 0.5 - 3,
        current.x,
        current.y
      );
      context.strokeStyle = `rgba(${r},${green},${b},0.34)`;
      context.lineWidth = 0.8 + (current.phase % 1.8);
      context.stroke();
    }
    context.restore();
  }

  drawPigments(context, g) {
    if (!this.pigments.length) return;
    const [r, green, b] = this.rgb;
    context.save();
    context.filter = 'blur(8px)';
    context.globalCompositeOperation = 'screen';
    for (const pigment of this.pigments) {
      const x = g.cx + Math.cos(pigment.angle) * pigment.radius;
      const y = g.cy + Math.sin(pigment.angle) * pigment.radius * 0.62;
      const gradient = context.createRadialGradient(x, y, 1, x, y, pigment.size);
      gradient.addColorStop(0, `rgba(${r},${green},${b},0.48)`);
      gradient.addColorStop(0.62, 'rgba(151,107,196,0.19)');
      gradient.addColorStop(1, 'rgba(151,107,196,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, pigment.size, 0, TAU);
      context.fill();
    }
    context.restore();
  }

  drawBubbles(context) {
    context.save();
    context.globalCompositeOperation = 'screen';
    for (const bubble of this.bubbles) {
      const gradient = context.createRadialGradient(
        bubble.x - bubble.radius * 0.3,
        bubble.y - bubble.radius * 0.35,
        0.5,
        bubble.x,
        bubble.y,
        bubble.radius
      );
      gradient.addColorStop(0, 'rgba(255,255,255,0.72)');
      gradient.addColorStop(0.28, 'rgba(216,255,246,0.22)');
      gradient.addColorStop(0.78, 'rgba(164,246,226,0.16)');
      gradient.addColorStop(1, 'rgba(231,255,249,0.02)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(bubble.x, bubble.y, bubble.radius, 0, TAU);
      context.fill();
      context.strokeStyle = `rgba(237,255,250,${bubble.shine})`;
      context.lineWidth = 0.8;
      context.stroke();
      context.beginPath();
      context.arc(bubble.x - bubble.radius * 0.32, bubble.y - bubble.radius * 0.38, Math.max(0.8, bubble.radius * 0.18), 0, TAU);
      context.fillStyle = 'rgba(255,255,255,0.72)';
      context.fill();
    }
    context.restore();
  }

  drawSediment(context) {
    for (const particle of this.sediment) {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, TAU);
      context.fillStyle = `rgba(249,251,239,${particle.settled ? particle.alpha * 0.94 : particle.alpha})`;
      context.shadowColor = 'rgba(255,255,245,0.58)';
      context.shadowBlur = particle.settled ? 3 : 5;
      context.fill();
    }
    context.shadowBlur = 0;
  }

  drawFoamAndSpray(context) {
    context.save();
    context.globalCompositeOperation = 'screen';
    for (const blob of this.foam) {
      const fade = clamp(1 - blob.age / blob.life, 0, 1);
      const radius = blob.radius * (1 + Math.sin(blob.age * 8 + blob.wobble) * 0.12);
      const gradient = context.createRadialGradient(
        blob.x - radius * 0.28, blob.y - radius * 0.32, 0.5,
        blob.x, blob.y, radius
      );
      gradient.addColorStop(0, 'rgba(255,255,255,0.96)');
      gradient.addColorStop(0.55, `rgba(230,255,246,${0.82 * fade})`);
      gradient.addColorStop(1, 'rgba(184,244,222,0.08)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(blob.x, blob.y, radius, 0, TAU);
      context.fill();
    }
    for (const drop of this.droplets) {
      const fade = clamp(1 - drop.age / drop.life, 0, 1);
      context.save();
      context.translate(drop.x, drop.y);
      context.rotate(Math.atan2(drop.vy, drop.vx) + Math.PI / 2);
      context.scale(0.78, 1.55);
      const gradient = context.createRadialGradient(-1, -1.5, 0.3, 0, 0, drop.radius * 1.6);
      gradient.addColorStop(0, 'rgba(255,255,255,0.98)');
      gradient.addColorStop(0.48, `rgba(${this.rgb[0]},${this.rgb[1]},${this.rgb[2]},${0.74 * fade})`);
      gradient.addColorStop(1, 'rgba(227,255,247,0.08)');
      context.fillStyle = gradient;
      context.beginPath();
      context.ellipse(0, 0, drop.radius, drop.radius * 1.65, 0, 0, TAU);
      context.fill();
      context.restore();
    }
    context.restore();
  }

  draw() {
    if (!this.context || !this.width || !this.height || !this.geometry || !this.profile) return;
    const context = this.context;
    const g = this.geometry;
    context.clearRect(0, 0, this.width, this.height);
    context.save();
    roundedClip(context, g.x, g.y, g.width, g.height, 22);
    this.drawVortex(context, g);
    this.drawCurrents(context);
    this.drawPigments(context, g);
    this.drawBubbles(context);
    this.drawSediment(context);
    context.restore();
    this.drawFoamAndSpray(context);
  }

  frame(timestamp) {
    if (!this.active) return;
    const dt = this.lastFrame
      ? clamp((timestamp - this.lastFrame) / 1000, 0.001, 0.04)
      : 1 / 60;
    this.lastFrame = timestamp;
    this.elapsed += dt;
    this.measureVessel();
    this.update(dt);
    this.draw();
    if (this.elapsed * 1000 >= this.durationMs) {
      this.active = false;
      this.frameId = 0;
      return;
    }
    this.frameId = window.requestAnimationFrame((time) => this.frame(time));
  }

  stop() {
    this.active = false;
    if (this.frameId) window.cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.context?.clearRect(0, 0, this.width || 0, this.height || 0);
    this.profile = null;
    this.bubbles = [];
    this.foam = [];
    this.droplets = [];
    this.sediment = [];
    this.currents = [];
    this.pigments = [];
  }

  destroy() {
    this.stop();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onResize);
  }
}
