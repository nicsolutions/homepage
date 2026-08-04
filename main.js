/**
 * Class untuk mengelola animasi latar belakang Circuit Board pada Canvas
 */
class CircuitBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.gap = 46;
    this.nodes = [];
    this.paths = [];
    this.pulses = [];
    this.palette = ['#2ee6ff', '#ff3ec8', '#ffc93c'];
    this.resizeTimeout = null;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.resize(), 200);
    });

    if (!this.reduceMotion) {
      this.animate();
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawGrid();
      this.drawPaths();
    }
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = document.documentElement.scrollHeight;
    this.buildGrid();
  }

  buildGrid() {
    this.cols = Math.ceil(this.width / this.gap) + 1;
    this.rows = Math.ceil(this.height / this.gap) + 1;
    this.nodes = [];

    for (let x = 0; x < this.cols; x++) {
      this.nodes[x] = [];
      for (let y = 0; y < this.rows; y++) {
        this.nodes[x][y] = Math.random() > 0.62;
      }
    }
    this.buildPaths();
  }

  buildPaths() {
    this.paths = [];
    const pathCount = Math.min(26, Math.floor((this.width * this.height) / 70000) + 10);

    for (let i = 0; i < pathCount; i++) {
      let x = Math.floor(Math.random() * this.cols);
      let y = Math.floor(Math.random() * this.rows);
      const pts = [{ x, y }];
      const steps = 6 + Math.floor(Math.random() * 10);
      let lastDir = null;

      for (let s = 0; s < steps; s++) {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(
          d => !lastDir || (d[0] !== -lastDir[0] || d[1] !== -lastDir[1])
        );
        const d = dirs[Math.floor(Math.random() * dirs.length)];
        x = Math.min(this.cols - 1, Math.max(0, x + d[0]));
        y = Math.min(this.rows - 1, Math.max(0, y + d[1]));
        pts.push({ x, y });
        lastDir = d;
      }
      this.paths.push({ pts, color: this.palette[i % this.palette.length] });
    }

    this.pulses = this.paths.map((p, i) => ({
      pathIndex: i,
      t: Math.random(),
      speed: 0.0022 + Math.random() * 0.0028
    }));
  }

  drawGrid() {
    this.ctx.strokeStyle = 'rgba(120,150,220,0.05)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (!this.nodes[x][y]) continue;
        if (x + 1 < this.cols && this.nodes[x + 1][y]) {
          this.ctx.moveTo(x * this.gap, y * this.gap);
          this.ctx.lineTo((x + 1) * this.gap, y * this.gap);
        }
        if (y + 1 < this.rows && this.nodes[x][y + 1]) {
          this.ctx.moveTo(x * this.gap, y * this.gap);
          this.ctx.lineTo(x * this.gap, (y + 1) * this.gap);
        }
      }
    }
    this.ctx.stroke();
  }

  getPointAt(path, t) {
    const segs = path.pts.length - 1;
    const total = segs * t;
    const i = Math.min(segs - 1, Math.floor(total));
    const localT = total - i;
    const a = path.pts[i];
    const b = path.pts[i + 1];

    return {
      x: (a.x + (b.x - a.x) * localT) * this.gap,
      y: (a.y + (b.y - a.y) * localT) * this.gap
    };
  }

  drawPaths() {
    this.paths.forEach(p => {
      this.ctx.beginPath();
      this.ctx.strokeStyle = p.color + '22';
      this.ctx.lineWidth = 1.4;
      p.pts.forEach((pt, i) => {
        const px = pt.x * this.gap;
        const py = pt.y * this.gap;
        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      });
      this.ctx.stroke();
    });
  }

  drawPulses() {
    this.pulses.forEach(pu => {
      pu.t += pu.speed;
      if (pu.t > 1) pu.t = 0;
      const path = this.paths[pu.pathIndex];
      const pos = this.getPointAt(path, pu.t);

      this.ctx.beginPath();
      this.ctx.fillStyle = path.color;
      this.ctx.shadowColor = path.color;
      this.ctx.shadowBlur = 14;
      this.ctx.arc(pos.x, pos.y, 2.4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawGrid();
    this.drawPaths();
    this.drawPulses();
    requestAnimationFrame(() => this.animate());
  }
}

/**
 * Class untuk mengelola animasi Reveal saat di-scroll
 */
class ScrollObserver {
  constructor(targetSelector = '.reveal') {
    this.targets = document.querySelectorAll(targetSelector);
    this.init();
  }

  init() {
    if (!this.targets.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    this.targets.forEach(el => observer.observe(el));
  }
}

/**
 * Class untuk fitur Interaksi Kontak & Notifikasi Toast
 */
class ContactManager {
  constructor(phoneBtnId, toastId, phoneNumber) {
    this.phoneBtn = document.getElementById(phoneBtnId);
    this.toast = document.getElementById(toastId);
    this.phoneNumber = phoneNumber;
    this.toastTimer = null;

    this.init();
  }

  init() {
    if (!this.phoneBtn || !this.toast) return;

    this.phoneBtn.addEventListener('click', () => this.copyToClipboard());
  }

  copyToClipboard() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.phoneNumber).catch(() => {});
    }
    this.showToast();
  }

  showToast() {
    this.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.classList.remove('show');
    }, 2200);
  }
}

/**
 * Class untuk simulasi fluktuasi angka pengguna online
 */
class OnlineCounterManager {
  constructor(elementId, initialCount = 128) {
    this.countEl = document.getElementById(elementId);
    this.currentCount = initialCount;
    this.init();
  }

  init() {
    if (!this.countEl) return;

    setInterval(() => {
      // Perubahan acak: -2, -1, 0, +1, atau +2
      const delta = Math.floor(Math.random() * 5) - 2;
      this.currentCount = Math.max(90, this.currentCount + delta);
      this.countEl.textContent = this.currentCount;
    }, 4000);
  }
}

/**
 * Class untuk mengelola animasi Easter Egg Penguin — versi "absurd deluxe"
 * Setiap kemunculan dipilih acak dari kumpulan "aksi" berbeda supaya polanya
 * susah ditebak: arah bolak-balik, jalur atas/bawah, gaya jalan berbeda-beda,
 * kadang berhenti mikir sejenak, dan sesekali diculik UFO.
 */
class PenguinManager {
  constructor(containerId, ufoId) {
    this.container = document.getElementById(containerId);
    this.inner = this.container?.querySelector('.penguin-inner');
    this.emojiEl = this.container?.querySelector('.penguin-emoji');
    this.thoughtEl = this.container?.querySelector('.penguin-thought');
    this.ufo = document.getElementById(ufoId);
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.moveTimer = null;
    this.init();
  }

  init() {
    if (!this.container || !this.inner || this.reduceMotion) return;
    // Kemunculan pertama antara 4-8 detik setelah halaman dimuat
    this.scheduleNext(this.rand(4000, 8000));
  }

  rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  scheduleNext(delayMs) {
    clearTimeout(this.moveTimer);
    this.moveTimer = setTimeout(() => this.spawnEvent(), delayMs);
  }

  spawnEvent() {
    // ~15% kemungkinan penguin diculik UFO alih-alih jalan biasa
    if (this.ufo && Math.random() < 0.15) {
      this.ufoAbduction();
    } else {
      this.walkAcross();
    }
  }

  walkAcross() {
    const dir = Math.random() > 0.5 ? 1 : -1; // 1 = kiri→kanan, -1 = kanan→kiri
    const style = this.pick(['waddle', 'hop', 'moonwalk', 'dash', 'sneaky']);
    const onCeiling = Math.random() < 0.16; // sesekali "jalan" menyusuri bagian atas layar
    const scale = this.rand(0.55, 2.1).toFixed(2);
    let duration;
    switch (style) {
      case 'dash': duration = this.rand(3.2, 5); break;
      case 'moonwalk': duration = this.rand(12, 17); break;
      case 'sneaky': duration = this.rand(9, 15); break;
      default: duration = this.rand(7, 12);
    }

    // Reset kelas gaya sebelumnya
    this.inner.classList.remove('penguin-hop', 'penguin-moonwalk', 'penguin-dash', 'penguin-sneaky');
    this.emojiEl.textContent = '🐧';
    this.container.classList.toggle('penguin-onceiling', onCeiling);

    if (style === 'hop') this.inner.classList.add('penguin-hop');
    if (style === 'moonwalk') this.inner.classList.add('penguin-moonwalk');
    if (style === 'dash') { this.inner.classList.add('penguin-dash'); this.emojiEl.textContent = '🐧💨'; }
    if (style === 'sneaky') this.inner.classList.add('penguin-sneaky');

    // Posisi vertikal: dasar layar, atau menyusuri langit-langit
    this.container.style.bottom = onCeiling ? 'auto' : `${this.rand(4, 22)}px`;
    this.container.style.top = onCeiling ? `${this.rand(64, 118)}px` : 'auto';

    // Titik awal & akhir horizontal
    const startLeft = dir === 1 ? '-120px' : '100vw';
    const endLeft = dir === 1 ? '100vw' : '-120px';

    this.container.style.transition = 'none';
    this.container.style.display = 'block';
    this.container.style.left = startLeft;
    this.inner.style.transform = `scale(${scale}) scaleX(${dir === 1 ? 1 : -1})`;

    // Paksa reflow lalu mulai transisi
    void this.container.offsetWidth;
    this.container.style.transition = `left ${duration}s linear`;
    requestAnimationFrame(() => {
      this.container.style.left = endLeft;
    });

    // Kadang berhenti di tengah jalan untuk "mikir" sejenak — bikin gerakannya makin susah ditebak
    const willPause = style !== 'dash' && Math.random() < 0.3;
    let pauseExtra = 0;
    if (willPause) {
      const pauseAtFraction = this.rand(0.3, 0.65);
      const pauseDelay = duration * 1000 * pauseAtFraction;
      const pauseLength = this.rand(700, 1800);
      pauseExtra = pauseLength;

      setTimeout(() => {
        const rect = this.container.getBoundingClientRect();
        this.container.style.transition = 'none';
        this.container.style.left = `${rect.left}px`;
        this.thoughtEl?.classList.add('show');
        void this.container.offsetWidth;

        setTimeout(() => {
          this.thoughtEl?.classList.remove('show');
          const remaining = duration * (1 - pauseAtFraction);
          this.container.style.transition = `left ${remaining}s linear`;
          requestAnimationFrame(() => {
            this.container.style.left = endLeft;
          });
        }, pauseLength);
      }, pauseDelay);
    }

    setTimeout(() => {
      this.container.style.display = 'none';
      this.thoughtEl?.classList.remove('show');
      // Jeda acak sebelum kemunculan berikutnya (8-30 detik)
      this.scheduleNext(this.rand(8000, 30000));
    }, duration * 1000 + pauseExtra + 400);
  }

  ufoAbduction() {
    const dir = Math.random() > 0.5 ? 1 : -1;
    const ufoY = this.rand(60, 140);
    const abductX = this.rand(30, 70); // posisi penculikan dalam vw

    this.container.classList.remove('penguin-onceiling');
    this.inner.classList.remove('penguin-hop', 'penguin-moonwalk', 'penguin-dash', 'penguin-sneaky');
    this.emojiEl.textContent = '🐧';
    this.inner.style.transform = `scale(1.1) scaleX(${dir === 1 ? 1 : -1})`;
    this.container.style.bottom = '10px';
    this.container.style.top = 'auto';
    this.container.style.transition = 'none';
    this.container.style.display = 'block';
    this.container.style.left = dir === 1 ? '-120px' : '100vw';

    void this.container.offsetWidth;
    this.container.style.transition = `left 3.2s linear`;
    requestAnimationFrame(() => {
      this.container.style.left = `${abductX}vw`;
    });

    // UFO muncul melayang dari atas
    this.ufo.style.transition = 'none';
    this.ufo.style.left = `${abductX}vw`;
    this.ufo.style.top = '-100px';
    this.ufo.style.display = 'block';
    this.ufo.classList.remove('ufo-beaming', 'ufo-leaving');
    void this.ufo.offsetWidth;
    this.ufo.style.transition = 'top 1.4s ease-out';
    requestAnimationFrame(() => {
      this.ufo.style.top = `${ufoY}px`;
    });

    // Setelah penguin sampai titik penculikan + UFO turun, mulai sinar penculik
    setTimeout(() => {
      this.ufo.classList.add('ufo-beaming');
      this.container.style.transition = 'bottom 1.6s ease-in, transform 1.6s ease-in';
      requestAnimationFrame(() => {
        this.container.style.bottom = `${window.innerHeight - ufoY - 10}px`;
        this.inner.style.opacity = '0';
        this.inner.style.transform += ' scale(0.2)';
      });
    }, 3300);

    // Penguin "hilang", UFO kabur membawa penguin
    setTimeout(() => {
      this.ufo.classList.remove('ufo-beaming');
      this.ufo.classList.add('ufo-leaving');
      this.ufo.style.transition = 'left 2.4s ease-in, top 2.4s ease-in';
      requestAnimationFrame(() => {
        this.ufo.style.left = dir === 1 ? '110vw' : '-150px';
        this.ufo.style.top = '-40px';
      });
    }, 5200);

    setTimeout(() => {
      this.container.style.display = 'none';
      this.ufo.style.display = 'none';
      this.inner.style.opacity = '';
      this.scheduleNext(this.rand(10000, 34000));
    }, 7700);
  }
}

/**
 * Class untuk sesekali menampilkan "bintang jatuh" melintas di latar belakang.
 * Murni dekoratif, acak posisi/kecepatan/sudutnya supaya tidak monoton.
 */
class ShootingStarManager {
  constructor() {
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reduceMotion) return;
    this.schedule();
  }

  rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  schedule() {
    setTimeout(() => {
      this.spawn();
      this.schedule();
    }, this.rand(9000, 22000));
  }

  spawn() {
    const wrap = document.createElement('div');
    wrap.className = 'shooting-star';
    const track = document.createElement('div');
    track.className = 'star-track';
    wrap.appendChild(track);

    const topStart = this.rand(0, 45);
    const leftStart = this.rand(0, 70);
    const travel = this.rand(180, 340);
    const angle = this.rand(14, 38) * (Math.random() > 0.5 ? 1 : -1);
    const duration = this.rand(0.8, 1.5);

    wrap.style.top = `${topStart}vh`;
    wrap.style.left = `${leftStart}vw`;
    wrap.style.transform = `rotate(${angle}deg)`;
    track.style.setProperty('--travel', `${travel}px`);
    track.style.animationDuration = `${duration}s`;

    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), duration * 1000 + 200);
  }
}

/**
 * Inisialisasi Utama Aplikasi
 */
class App {
  static init() {
    // Dynamic Year Update
    const yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }

    // Inisialisasi Komponen
    new CircuitBackground('circuit-canvas');
    new ScrollObserver('.reveal');
    new ContactManager('phoneLine', 'toast', '082149094777');
    new OnlineCounterManager('onlineCount', 128);
    new PenguinManager('penguin-container', 'ufo-container');
    new ShootingStarManager();
  }
}

// Jalankan aplikasi saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});