
(function () {
  'use strict';

  const canvas = document.getElementById('team-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const CYAN = { r: 0, g: 212, b: 255 };
  const PURPLE = { r: 168, g: 85, b: 247 };
  const PINK = { r: 236, g: 72, b: 153 };
  const GREEN = { r: 16, g: 185, b: 129 };

  const codeChars = 'アイウエオカキクケコ01{}[]<>/=;:()ABCDEFabcdef0123456789#$@!%&*'.split('');
  const COLUMN_WIDTH = 18;
  let columns = [];

  function initCodeRain() {
    const numCols = Math.ceil(W / COLUMN_WIDTH);
    columns = [];
    for (let i = 0; i < numCols; i++) {
      columns.push({
        x: i * COLUMN_WIDTH,
        y: Math.random() * H * -1,
        speed: Math.random() * 1.5 + 0.5,
        chars: [],
        maxLen: Math.floor(Math.random() * 12 + 6),
        opacity: Math.random() * 0.12 + 0.03,
        hue: Math.random() > 0.7 ? 270 : 180, // cyan or purple
      });
    }
  }
  initCodeRain();
  window.addEventListener('resize', initCodeRain);

  function updateCodeRain() {
    for (const col of columns) {
      col.y += col.speed;

      if (Math.random() < 0.4) {
        col.chars.push({
          char: codeChars[Math.floor(Math.random() * codeChars.length)],
          y: col.y,
          alpha: 1,
        });
      }

      if (col.chars.length > col.maxLen) {
        col.chars.shift();
      }

      if (col.y > H + 200) {
        col.y = Math.random() * -100 - 50;
        col.chars = [];
        col.speed = Math.random() * 1.5 + 0.5;
      }
    }
  }

  function drawCodeRain() {
    ctx.font = `${12}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';

    for (const col of columns) {
      const len = col.chars.length;
      for (let i = 0; i < len; i++) {
        const ch = col.chars[i];
        const progress = i / len;
        const alpha = col.opacity * progress;

        if (col.hue === 180) {
          ctx.fillStyle = `rgba(0, 212, 255, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`;
        }

        if (i === len - 1) {
          ctx.fillStyle = col.hue === 180
            ? `rgba(0, 255, 255, ${col.opacity * 3})`
            : `rgba(200, 130, 255, ${col.opacity * 3})`;
          ctx.shadowColor = col.hue === 180 ? 'rgba(0, 212, 255, 0.5)' : 'rgba(168, 85, 247, 0.5)';
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillText(ch.char, col.x, ch.y);
        ctx.shadowBlur = 0;
      }
    }
  }

  const nodes = [];
  const NODE_COUNT = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 25000), 50);
  const CONNECT_DIST = 180;

  function createNode(initial = true) {
    return {
      x: Math.random() * W,
      y: initial ? Math.random() * H : -20,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2.5 + 1,
      color: [CYAN, PURPLE, PINK, GREEN][Math.floor(Math.random() * 4)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.03 + 0.01,
    };
  }

  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push(createNode(true));
  }

  const mouse = { x: -1000, y: -1000, active: false };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  window.addEventListener('mouseleave', () => {
    mouse.active = false;
  });

  const bursts = [];
  window.addEventListener('click', (e) => {
    for (let i = 0; i < 12; i++) {
      bursts.push(createBurstParticle(e.clientX, e.clientY));
    }
  });

  function createBurstParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 2;
    const colors = [CYAN, PURPLE, PINK];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 4 + 2,
      life: 1,
      decay: Math.random() * 0.025 + 0.015,
      color,
      isCode: Math.random() > 0.5,
      char: codeChars[Math.floor(Math.random() * codeChars.length)],
    };
  }

  function updateNodes() {
    for (const node of nodes) {
      node.x += node.vx;
      node.y += node.vy;
      node.pulse += node.pulseSpeed;

      if (node.x < 0 || node.x > W) node.vx *= -1;
      if (node.y < 0 || node.y > H) node.vy *= -1;

      if (mouse.active) {
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 10) {
          const force = 0.02 * (200 - dist) / 200;
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }
      }

      // Dampen velocity
      node.vx *= 0.998;
      node.vy *= 0.998;
    }
  }

  function drawConstellation() {
    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.15;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Mouse connections
      if (mouse.active) {
        const node = nodes[i];
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 250) {
          const alpha = (1 - dist / 250) * 0.25;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(node.x, node.y);
          ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const pulseFactor = 1 + 0.3 * Math.sin(node.pulse);
      const { r, g, b } = node.color;
      const radius = node.radius * pulseFactor;

      // Glow
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.06)`;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
      ctx.fill();
    }

    // Draw mouse glow
    if (mouse.active) {
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 6, 0, Math.PI * 2);
      const mouseGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 40);
      mouseGrad.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
      mouseGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = mouseGrad;
      ctx.fill();
    }
  }
  function updateBursts() {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.06;
      b.life -= b.decay;
      if (b.life <= 0) {
        bursts.splice(i, 1);
      }
    }
  }

  function drawBursts() {
    for (const b of bursts) {
      if (b.life <= 0) continue;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.globalAlpha = Math.max(0, b.life);
      const { r, g, bb } = b.color;

      if (b.isCode) {
        ctx.font = `${14 * b.life}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = `rgba(${b.color.r}, ${b.color.g}, ${b.color.b}, ${b.life})`;
        ctx.textAlign = 'center';
        ctx.fillText(b.char, 0, 0);
      } else {
        const radius = b.radius * b.life;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${b.color.r}, ${b.color.g}, ${b.color.b}, ${b.life * 0.8})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(0, 0, radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${b.color.r}, ${b.color.g}, ${b.color.b}, ${b.life * 0.2})`;
        ctx.fill();
      }
      ctx.restore();
    }
  }
  const snippets = [
    'const love = true;',
    'function create() {}',
    'class Team {}',
    'export default K4B;',
    'npm run dev',
    'git push origin',
    '// TODO: ship it!',
    'await deploy();',
    '<div>❤️</div>',
    'return success;',
  ];

  const floatingTexts = [];
  const MAX_FLOATING = 6;

  function spawnFloatingText() {
    if (floatingTexts.length >= MAX_FLOATING) return;
    floatingTexts.push({
      text: snippets[Math.floor(Math.random() * snippets.length)],
      x: Math.random() * W,
      y: H + 20,
      speed: Math.random() * 0.3 + 0.15,
      alpha: 0,
      maxAlpha: Math.random() * 0.08 + 0.03,
      fadeIn: true,
    });
  }

  function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= ft.speed;

      if (ft.fadeIn) {
        ft.alpha += 0.001;
        if (ft.alpha >= ft.maxAlpha) ft.fadeIn = false;
      }

      if (ft.y < H * 0.2) {
        ft.alpha -= 0.0008;
      }

      if (ft.alpha <= 0 || ft.y < -50) {
        floatingTexts.splice(i, 1);
      }
    }
  }

  function drawFloatingTexts() {
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    for (const ft of floatingTexts) {
      if (ft.alpha <= 0) continue;
      ctx.fillStyle = `rgba(0, 212, 255, ${ft.alpha})`;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
  }
  let frameCount = 0;

  function animate() {

    ctx.fillStyle = 'rgba(8, 5, 16, 0.92)';
    ctx.fillRect(0, 0, W, H);

    const grad = ctx.createRadialGradient(
      W * 0.5, H * 0.3, 0,
      W * 0.5, H * 0.5, Math.max(W, H) * 0.7
    );
    grad.addColorStop(0, 'rgba(168, 85, 247, 0.03)');
    grad.addColorStop(0.5, 'rgba(0, 212, 255, 0.01)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Draw layers
    updateCodeRain();
    drawCodeRain();

    updateNodes();
    drawConstellation();

    updateFloatingTexts();
    drawFloatingTexts();

    updateBursts();
    drawBursts();

    frameCount++;
    if (frameCount % 180 === 0) {
      spawnFloatingText();
    }

    requestAnimationFrame(animate);
  }

  animate();

  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {

        const delay = Array.from(entry.target.parentElement.children).indexOf(entry.target) * 120;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.member-card, .tech-stack-item').forEach((el) => {
    observer.observe(el);
  });

  function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-count'), 10);
          const duration = 2000;
          const startTime = performance.now();

          function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(target * eased);
            el.textContent = current.toLocaleString();

            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            } else {
              el.textContent = target.toLocaleString();
            }
          }
          requestAnimationFrame(updateCounter);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach((counter) => counterObserver.observe(counter));
  }

  animateCounters();

  document.querySelectorAll('.member-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      card.style.transform = `translateY(-8px) scale(1.02) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

})();

(() => {
  'use strict';

  const canvas = document.getElementById('solar-canvas');
  const tooltip = document.getElementById('planet-tooltip');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const wrapper = canvas.parentElement;
  if (!ctx || !wrapper) return;

  const planets = [
    {
      name: 'Sao Thủy',
      en: 'Mercury',
      color: '#b7b0a5',
      size: 3,
      orbit: 0.10,
      speed: 1.60,
      info: 'Hành tinh gần Mặt Trời nhất.'
    },
    {
      name: 'Sao Kim',
      en: 'Venus',
      color: '#f2c078',
      size: 4.5,
      orbit: 0.18,
      speed: 1.15,
      info: 'Hành tinh nóng nhất Hệ Mặt Trời.'
    },
    {
      name: 'Trái Đất',
      en: 'Earth',
      color: '#55aaff',
      size: 5,
      orbit: 0.26,
      speed: 0.90,
      info: 'Ngôi nhà của chúng ta.'
    },
    {
      name: 'Sao Hỏa',
      en: 'Mars',
      color: '#ff704d',
      size: 4,
      orbit: 0.34,
      speed: 0.72,
      info: 'Hành tinh đỏ.'
    },
    {
      name: 'Sao Mộc',
      en: 'Jupiter',
      color: '#e5bd91',
      size: 9,
      orbit: 0.45,
      speed: 0.38,
      info: 'Hành tinh lớn nhất Hệ Mặt Trời.'
    },
    {
      name: 'Sao Thổ',
      en: 'Saturn',
      color: '#e8d39a',
      size: 8,
      orbit: 0.57,
      speed: 0.27,
      info: 'Nổi tiếng với hệ thống vành đai.'
    },
    {
      name: 'Sao Thiên Vương',
      en: 'Uranus',
      color: '#8ce4e8',
      size: 6,
      orbit: 0.68,
      speed: 0.19,
      info: 'Một hành tinh băng khổng lồ.'
    },
    {
      name: 'Sao Hải Vương',
      en: 'Neptune',
      color: '#527dff',
      size: 6,
      orbit: 0.79,
      speed: 0.14,
      info: 'Hành tinh xa Mặt Trời nhất.'
    }
  ];

  let w = 0;
  let h = 0;
  let dpr = 1;
  let time = 0;
  let lastTime = 0;

  let speed = 1;
  let showOrbits = true;
  let showNames = true;
  let zoom = 1;

  let offsetX = 0;
  let offsetY = 0;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  let pointerX = -1000;
  let pointerY = -1000;
  let hovered = null;

  const stars = Array.from({ length: 180 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.2 + 0.2,
    phase: Math.random() * Math.PI * 2
  }));

  function resize() {
    const rect = wrapper.getBoundingClientRect();

    w = Math.max(280, rect.width);
    h = Math.max(350, rect.height || 520);

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function layout() {
    return {
      cx: w / 2 + offsetX,
      cy: h / 2 + offsetY,
      maxOrbit: Math.min(Math.min(w, h) * 0.44, 420) * zoom
    };
  }

  function drawBackground() {
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createRadialGradient(
      w / 2, h / 2, 0,
      w / 2, h / 2, Math.max(w, h) * 0.7
    );

    bg.addColorStop(0, '#101d3b');
    bg.addColorStop(0.55, '#080f24');
    bg.addColorStop(1, '#030610');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    for (const s of stars) {
      const a = 0.35 + 0.65 * (
        0.5 + 0.5 * Math.sin(time * 0.8 + s.phase)
      );

      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,225,255,${a})`;
      ctx.fill();
    }
  }

  function drawSun(cx, cy) {
    const glow = ctx.createRadialGradient(
      cx, cy, 2,
      cx, cy, 45
    );

    glow.addColorStop(0, 'rgba(255,255,190,.95)');
    glow.addColorStop(0.2, 'rgba(255,190,60,.55)');
    glow.addColorStop(0.55, 'rgba(255,125,20,.14)');
    glow.addColorStop(1, 'rgba(255,100,0,0)');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fill();

    const sun = ctx.createRadialGradient(
      cx - 5, cy - 6, 1,
      cx, cy, 14
    );

    sun.addColorStop(0, '#fffbd2');
    sun.addColorStop(0.45, '#ffd95a');
    sun.addColorStop(1, '#ff8c22');

    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();

    if (showNames) {
      ctx.font = '600 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe7a3';
      ctx.fillText('MẶT TRỜI', cx, cy + 29);
    }
  }

  function position(planet, i, l) {
    const radius = l.maxOrbit * planet.orbit;
    const angle = time * planet.speed + i * 0.72;

    return {
      x: l.cx + Math.cos(angle) * radius,
      y: l.cy + Math.sin(angle) * radius,
      radius
    };
  }

  function drawPlanet(p, pos) {
    const { x, y } = pos;
    const r = p.size;

    if (p.en === 'Saturn') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.3);

      ctx.beginPath();
      ctx.ellipse(
        0, 0,
        r * 1.8, r * 0.65,
        0, 0, Math.PI * 2
      );

      ctx.strokeStyle = '#d8bd85';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    const glow = ctx.createRadialGradient(
      x, y, 0,
      x, y, r * 2.5
    );

    glow.addColorStop(0, p.color + '66');
    glow.addColorStop(1, p.color + '00');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    const surface = ctx.createRadialGradient(
      x - r * 0.35,
      y - r * 0.35,
      0,
      x, y, r
    );

    surface.addColorStop(0, '#ffffff');
    surface.addColorStop(0.2, p.color);
    surface.addColorStop(1, '#172033');

    ctx.fillStyle = surface;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    if (p.en === 'Earth') {
      ctx.fillStyle = 'rgba(75,220,145,.9)';
      ctx.beginPath();
      ctx.ellipse(
        x + 1, y - 1,
        r * 0.38, r * 0.22,
        -0.5, 0, Math.PI * 2
      );
      ctx.fill();
    }

    if (hovered === p) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    if (showNames) {
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = hovered === p ? '#fff' : '#bdc9e8';
      ctx.fillText(p.name, x, y + r + 16);
    }
  }

  function updateTooltip(positions) {
    if (!tooltip || dragging) return;

    let found = null;
    let closest = Infinity;

    for (const item of positions) {
      const d = Math.hypot(
        pointerX - item.pos.x,
        pointerY - item.pos.y
      );

      if (d < item.p.size + 9 && d < closest) {
        found = item;
        closest = d;
      }
    }

    hovered = found ? found.p : null;

    if (!found) {
      tooltip.style.display = 'none';
      return;
    }

    tooltip.textContent = '';

    const strong = document.createElement('strong');
    strong.textContent = found.p.name;

    const english = document.createElement('span');
    english.textContent = found.p.en;

    const info = document.createElement('p');
    info.textContent = found.p.info;

    tooltip.append(strong, english, info);
    tooltip.style.display = 'block';

    const tw = tooltip.offsetWidth || 180;
    const th = tooltip.offsetHeight || 80;

    tooltip.style.left =
      Math.max(8, Math.min(pointerX + 15, w - tw - 8)) + 'px';

    tooltip.style.top =
      Math.max(8, Math.min(pointerY + 15, h - th - 8)) + 'px';
  }

  function animate(timestamp) {
    if (!canvas.isConnected) return;

    if (lastTime) {
      time += Math.min((timestamp - lastTime) / 1000, 0.05) * speed;
    }

    lastTime = timestamp;

    drawBackground();

    const l = layout();

    drawSun(l.cx, l.cy);

    const positions = planets.map((p, i) => ({
      p,
      pos: position(p, i, l)
    }));

    if (showOrbits) {
      for (const item of positions) {
        ctx.beginPath();

        ctx.arc(
          l.cx,
          l.cy,
          item.pos.radius,
          0,
          Math.PI * 2
        );

        ctx.strokeStyle = 'rgba(150,180,230,.22)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    positions.forEach(item => {
      drawPlanet(item.p, item.pos);
    });

    updateTooltip(positions);

    requestAnimationFrame(animate);
  }

  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();

    pointerX = e.clientX - rect.left;
    pointerY = e.clientY - rect.top;

    if (dragging) {
      offsetX += e.clientX - lastX;
      offsetY += e.clientY - lastY;

      lastX = e.clientX;
      lastY = e.clientY;

      if (tooltip) {
        tooltip.style.display = 'none';
      }
    }
  });

  canvas.addEventListener('pointerdown', e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;

    canvas.setPointerCapture?.(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });

  function stopDrag() {
    dragging = false;
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);

  canvas.addEventListener('pointerleave', () => {
    if (!dragging && tooltip) {
      tooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();

    zoom = Math.max(
      0.65,
      Math.min(
        2.5,
        zoom * (e.deltaY < 0 ? 1.1 : 0.9)
      )
    );
  }, { passive: false });

  document.getElementById('btn-speed-down')
    ?.addEventListener('click', () => {
      speed = Math.max(0.15, speed - 0.25);
    });

  document.getElementById('btn-speed-normal')
    ?.addEventListener('click', () => {
      speed = 1;
    });

  document.getElementById('btn-speed-up')
    ?.addEventListener('click', () => {
      speed = Math.min(3, speed + 0.5);
    });

  document.getElementById('btn-toggle-orbits')
    ?.addEventListener('click', e => {
      showOrbits = !showOrbits;
      e.currentTarget.classList.toggle('active', showOrbits);
    });

  document.getElementById('btn-toggle-names')
    ?.addEventListener('click', e => {
      showNames = !showNames;
      e.currentTarget.classList.toggle('active', showNames);
    });

  // Khởi tạo
  canvas.style.cursor = 'grab';

  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(wrapper);
  } else {
    window.addEventListener('resize', resize);
  }

  resize();
  requestAnimationFrame(animate);
})();

function handleFacebookClick(link, event) {
  event.preventDefault();

  const url = link.getAttribute('href')?.trim();

  if (!url || url === '#' || url === '') {
    alert('hãi quá phải ẩn link fb thôi');
    return false;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return false;
}
