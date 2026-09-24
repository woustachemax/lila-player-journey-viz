export type PlaybackSpeed = 1 | 2 | 4 | 8;

export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [1, 2, 4, 8];
export const DEFAULT_PLAYBACK_SPEED: PlaybackSpeed = 4;

export interface PlaybackSnapshot {
  time: number;
  playing: boolean;
  duration: number;
}

export class PlaybackClock {
  readonly id: string;
  readonly duration: number;
  private time = 0;
  private playing = false;
  private speed: PlaybackSpeed = DEFAULT_PLAYBACK_SPEED;
  private rafId = 0;
  private lastFrame = 0;
  private listeners = new Set<() => void>();
  private snapshot: PlaybackSnapshot;

  constructor(id: string, duration: number) {
    this.id = id;
    this.duration = duration;
    this.snapshot = { time: 0, playing: false, duration };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): PlaybackSnapshot => this.snapshot;

  getTime(): number {
    return this.time;
  }

  setSpeed(speed: PlaybackSpeed) {
    this.speed = speed;
  }

  play() {
    if (this.playing) return;
    if (this.time >= this.duration) this.time = 0;
    this.playing = true;
    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
    this.emit();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.rafId);
    this.emit();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  restart() {
    this.pause();
    this.time = 0;
    this.play();
  }

  seek(time: number) {
    const next = Math.min(this.duration, Math.max(0, time));
    if (next === this.time) return;
    this.time = next;
    if (this.playing && next >= this.duration) {
      this.playing = false;
      cancelAnimationFrame(this.rafId);
    }
    this.emit();
  }

  step(delta: number) {
    this.seek(this.time + delta);
  }

  private tick = (now: number) => {
    const elapsed = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    this.time = Math.min(this.duration, this.time + elapsed * this.speed);
    if (this.time >= this.duration) {
      this.playing = false;
    } else {
      this.rafId = requestAnimationFrame(this.tick);
    }
    this.emit();
  };

  private emit() {
    this.snapshot = { time: this.time, playing: this.playing, duration: this.duration };
    this.listeners.forEach((listener) => listener());
  }
}
