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
 * Class untuk simulasi fluktuasi angka pengguna online secara alami & realistis
 */
class OnlineCounterManager {
  constructor(elementId, initialCount = 124) {
    this.countEl = document.getElementById(elementId);
    this.currentCount = initialCount;
    this.init();
  }

  init() {
    if (!this.countEl) return;

    const updateCounter = () => {
      // 1. Tentukan lonjakan angka acak (-6 sampai +7)
      const variations = [-6, -4, -2, -1, 0, 0, 1, 2, 3, 5, 7];
      const delta = variations[Math.floor(Math.random() * variations.length)];
      
      // Batasi rentang angka agar tetap masuk akal (misal: antara 85 - 160)
      this.currentCount = Math.min(160, Math.max(85, this.currentCount + delta));
      
      // Update angka di layar
      this.countEl.textContent = this.currentCount;

      // 2. Acak jeda waktu pembaruan berikutnya (antara 2.5 hingga 7.5 detik)
      const nextInterval = Math.floor(Math.random() * 5000) + 2500;
      setTimeout(updateCounter, nextInterval);
    };

    // Jalankan pembaruan pertama
    updateCounter();
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
  }
}

// Jalankan aplikasi saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
