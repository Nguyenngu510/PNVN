// canvas-effects.js - Canvas vẽ ảnh nền từ folder frontend + Hiệu ứng hạt Bông hoa 🌸 & Trái tim ❤️

export class CanvasParticleSystem {
  constructor(canvasId = 'bg-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      document.body.prepend(this.canvas);
    }
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.bursts = [];
    this.mouse = { x: -1000, y: -1000, isMoving: false };
    this.mouseTimeout = null;

    // Tải ảnh nền từ folder frontend (người dùng có thể thay đổi file ảnh trong folder)
    this.bgImage = null;
    this.loadBackgroundImage();

    this.init();
  }

  loadBackgroundImage() {
    const img = new Image();
    // Thử tải từ assets/bg.jpg, nếu không có thì thử bg.jpg
    img.src = 'assets/bg.jpg';
    img.onload = () => {
      this.bgImage = img;
    };
    img.onerror = () => {
      // Fallback thử tìm ở thư mục gốc frontend
      const fallbackImg = new Image();
      fallbackImg.src = 'bg.jpg';
      fallbackImg.onload = () => {
        this.bgImage = fallbackImg;
      };
      fallbackImg.onerror = () => {
        console.warn('Background image not found in frontend/assets/bg.jpg or frontend/bg.jpg, using velvet gradient fallback.');
      };
    };
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Khởi tạo các hạt bông hoa & trái tim
    const count = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 15000), 60);
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createRandomParticle(true));
    }

    // Tương tác chuột: rê chuột tạo vệt hoa & tim phát sáng
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.isMoving = true;

      if (Math.random() < 0.45) {
        this.bursts.push(new BurstParticle(this.mouse.x, this.mouse.y));
      }

      clearTimeout(this.mouseTimeout);
      this.mouseTimeout = setTimeout(() => {
        this.mouse.isMoving = false;
      }, 150);
    });

    // Click chuột tạo chùm bung nở cánh hoa và trái tim
    window.addEventListener('click', (e) => {
      for (let i = 0; i < 9; i++) {
        this.bursts.push(new BurstParticle(e.clientX, e.clientY, true));
      }
    });

    this.animate();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
  }

  createRandomParticle(initial = false) {
    const typeRoll = Math.random();
    const y = initial ? Math.random() * this.height : -30;
    const x = Math.random() * this.width;

    if (typeRoll < 0.48) {
      // 48% Bông hoa 5 cánh & Cánh hoa đào rơi bồng bềnh 🌸
      return new FlowerParticle(x, y, this.width, this.height);
    } else if (typeRoll < 0.85) {
      // 37% Trái tim nhỏ xinh bay lơ lửng ❤️
      return new HeartParticle(x, y, this.width, this.height);
    } else {
      // 15% Bụi sao lấp lánh ✨
      return new SparkleParticle(x, y, this.width, this.height);
    }
  }

  animate() {
    // 1. Vẽ ảnh nền (Background Image) phủ kín toàn màn hình (cover mode)
    if (this.bgImage && this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      const imgRatio = this.bgImage.width / this.bgImage.height;
      const canvasRatio = this.width / this.height;
      let drawW, drawH, drawX, drawY;

      if (canvasRatio > imgRatio) {
        drawW = this.width;
        drawH = this.width / imgRatio;
        drawX = 0;
        drawY = (this.height - drawH) / 2;
      } else {
        drawH = this.height;
        drawW = this.height * imgRatio;
        drawX = (this.width - drawW) / 2;
        drawY = 0;
      }

      this.ctx.drawImage(this.bgImage, drawX, drawY, drawW, drawH);

      // Phủ một lớp bóng tối mờ sang trọng để chữ và nội dung thiệp luôn dễ đọc
      this.ctx.fillStyle = 'rgba(18, 8, 20, 0.48)';
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      // Nền fallback nhung rượu vang Bordeaux
      const grad = this.ctx.createRadialGradient(
        this.width * 0.3, this.height * 0.2, 50,
        this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height)
      );
      grad.addColorStop(0, '#380e1b');
      grad.addColorStop(0.5, '#1e0811');
      grad.addColorStop(1, '#0c0307');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Vẽ & cập nhật các hạt bông hoa 🌸, trái tim ❤️, bụi sao ✨
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.update(this.width, this.height, this.mouse);
      p.draw(this.ctx);

      if (p.isDead(this.width, this.height)) {
        this.particles[i] = this.createRandomParticle(false);
      }
    }

    // 3. Vẽ hạt tương tác chuột (vệt hoa tim phát sáng)
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.update();
      b.draw(this.ctx);
      if (b.isDead()) {
        this.bursts.splice(i, 1);
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}

// ----------------------------------------------------
// 1. Bông hoa 5 cánh & Cánh hoa đào rơi (Flower & Petal Particle 🌸)
// ----------------------------------------------------
class FlowerParticle {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 10 + 9; // Kích thước hoa
    this.speedY = Math.random() * 0.85 + 0.55; // Tốc độ rơi dịu dàng
    this.speedX = Math.random() * 0.8 - 0.4;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.028;
    this.opacity = Math.random() * 0.55 + 0.4;
    this.swingSpeed = Math.random() * 0.02 + 0.012;
    this.isFullFlower = Math.random() > 0.45; // Đan xen hoa 5 cánh và cánh hoa lẻ

    const colors = ['#ffb7b2', '#ffccd5', '#ff94c2', '#ff80ab', '#fff0f3', '#ffe4e6'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update(width, height, mouse) {
    this.y += this.speedY;
    this.x += this.speedX + Math.sin(this.y * this.swingSpeed) * 0.7;
    this.rotation += this.rotationSpeed;

    // Gió đẩy khi chuột tới gần
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100) {
      const force = (100 - dist) / 100;
      this.x += (dx / dist) * force * 2.8;
      this.y += (dy / dist) * force * 2.8;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.opacity;

    if (this.isFullFlower) {
      // Vẽ bông hoa 5 cánh mềm mại
      ctx.fillStyle = this.color;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(0, -this.size * 0.58, this.size * 0.36, this.size * 0.56, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate((Math.PI * 2) / 5);
      }
      // Nhụy hoa vàng óng phát sáng
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe082';
      ctx.fill();
    } else {
      // Cánh hoa đào uốn lượn
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, -this.size * 0.7);
      ctx.bezierCurveTo(this.size * 0.55, -this.size * 0.45, this.size * 0.6, this.size * 0.35, 0, this.size * 0.75);
      ctx.bezierCurveTo(-this.size * 0.6, this.size * 0.35, -this.size * 0.55, -this.size * 0.45, 0, -this.size * 0.7);
      ctx.fill();
    }

    ctx.restore();
  }

  isDead(width, height) {
    return this.y > height + 40 || this.x < -40 || this.x > width + 40;
  }
}

// ----------------------------------------------------
// 2. Trái tim nhỏ xinh bay lơ lửng (Floating Hearts Particle ❤️)
// ----------------------------------------------------
class HeartParticle {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 7; // Trái tim nhỏ nhắn
    this.speedY = -(Math.random() * 0.75 + 0.45); // Bay lơ lửng nhẹ nhàng lên trên
    this.speedX = Math.random() * 0.6 - 0.3;
    this.opacity = Math.random() * 0.6 + 0.35;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = Math.random() * 0.04 + 0.02;
    this.rotation = (Math.random() - 0.5) * 0.35;

    const colors = ['#ff4081', '#ff80ab', '#f50057', '#ff6090', '#ffd700', '#f48fb1'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update(width, height, mouse) {
    this.y += this.speedY;
    this.x += this.speedX + Math.sin(this.pulsePhase) * 0.45;
    this.pulsePhase += this.pulseSpeed;

    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 90) {
      const force = (90 - dist) / 90;
      this.x += (dx / dist) * force * 2.2;
      this.y += (dy / dist) * force * 2.2;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.opacity;

    // Nhịp đập tim
    const scale = 1 + 0.14 * Math.sin(this.pulsePhase);
    ctx.scale(scale, scale);

    // Vẽ hình trái tim cong bezier chuẩn xác
    ctx.fillStyle = this.color;
    ctx.beginPath();
    const s = this.size;
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 0.55, -s * 0.25, -s * 0.9, s * 0.35, 0, s * 0.95);
    ctx.bezierCurveTo(s * 0.9, s * 0.35, s * 0.55, -s * 0.25, 0, s * 0.35);
    ctx.fill();

    // Điểm bóng sáng trên tim
    ctx.beginPath();
    ctx.arc(-s * 0.25, s * 0.2, s * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
    ctx.fill();

    ctx.restore();
  }

  isDead(width, height) {
    return this.y < -30 || this.x < -30 || this.x > width + 30;
  }
}

// ----------------------------------------------------
// 3. Bụi sao phát sáng (Starlight Sparkle ✨)
// ----------------------------------------------------
class SparkleParticle {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 4 + 2;
    this.speedY = (Math.random() - 0.5) * 0.3;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.alpha = Math.random();
    this.alphaSpeed = Math.random() * 0.03 + 0.012;
  }

  update(width, height) {
    this.x += this.speedX;
    this.y += this.speedY;
    this.alpha += this.alphaSpeed;
    if (this.alpha > 1 || this.alpha < 0.1) {
      this.alphaSpeed = -this.alphaSpeed;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const a = Math.max(0, Math.min(1, this.alpha));
    ctx.globalAlpha = a;

    ctx.fillStyle = `rgba(255, 235, 170, ${a})`;
    ctx.beginPath();
    const r = this.size;
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.quadraticCurveTo(0, 0, 0, r);
    ctx.quadraticCurveTo(0, 0, -r, 0);
    ctx.quadraticCurveTo(0, 0, 0, -r);
    ctx.fill();

    ctx.restore();
  }

  isDead(width, height) {
    return this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20;
  }
}

// ----------------------------------------------------
// 4. Hạt bung nở khi rê chuột & click (Burst Particle)
// ----------------------------------------------------
class BurstParticle {
  constructor(x, y, isClick = false) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = isClick ? Math.random() * 4 + 1.8 : Math.random() * 1.8 + 0.6;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - (isClick ? 1.6 : 0.4);
    this.size = Math.random() * 6 + 5;
    this.isHeart = Math.random() > 0.4;
    this.life = 1;
    this.decay = Math.random() * 0.024 + 0.016;
    this.rotation = Math.random() * Math.PI * 2;

    const colors = this.isHeart 
      ? ['#ff4081', '#ff80ab', '#f50057', '#ffd700'] 
      : ['#ffcdd2', '#f8bbd0', '#ffe082', '#fff'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.04;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = Math.max(0, this.life);

    ctx.fillStyle = this.color;
    if (this.isHeart) {
      const s = this.size * this.life;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(-s * 0.55, -s * 0.25, -s * 0.9, s * 0.35, 0, s * 0.95);
      ctx.bezierCurveTo(s * 0.9, s * 0.35, s * 0.55, -s * 0.25, 0, s * 0.35);
      ctx.fill();
    } else {
      const s = this.size * this.life;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.6, s * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}
