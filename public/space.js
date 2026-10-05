// Space background (starfield + shooting stars + astronaut parallax) and the wireframe globe for the contact page.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = { x: 0, y: 0 };

  // ---------------------------------------------------------- starfield
  const canvas = document.getElementById('stars');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const COLORS = ['#ffffff', '#e0f2fe', '#fdf4ff', '#fbcfe8', '#bae6fd'];
    let w = 0, h = 0, stars = [], shooting = [], tick = 0, cx = 0, cy = 0, tx = 0, ty = 0, raf = 0;

    const init = () => {
      w = canvas.width = innerWidth; h = canvas.height = innerHeight;
      const density = w < 700 ? 5200 : 3400;
      const n = Math.floor((w * h) / density);
      stars = Array.from({ length: n }, () => {
        const sparkle = Math.random() < 0.08;
        const base = sparkle ? 0.6 + Math.random() * 0.4 : 0.2 + Math.random() * 0.7;
        return { x: Math.random() * w, y: Math.random() * h, size: sparkle ? Math.random() * 1.8 + 1.2 : Math.random() * 1.3 + 0.5, base, o: base, speed: 0.008 + Math.random() * 0.02, color: COLORS[(Math.random() * COLORS.length) | 0], sparkle };
      });
    };

    const frame = () => {
      tick++;
      cx += (tx - cx) * 0.05; cy += (ty - cy) * 0.05;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.o = s.base + (reduce ? 0 : Math.sin(tick * s.speed + i) * 0.35);
        ctx.globalAlpha = Math.max(0.1, Math.min(1, s.o));
        ctx.fillStyle = s.color;
        const px = s.x + cx * s.size * 0.8, py = s.y + cy * s.size * 0.8;
        if (s.sparkle) {
          const k = s.size * 2.2;
          ctx.beginPath();
          ctx.moveTo(px, py - k); ctx.lineTo(px + k * 0.25, py - k * 0.25); ctx.lineTo(px + k, py); ctx.lineTo(px + k * 0.25, py + k * 0.25);
          ctx.lineTo(px, py + k); ctx.lineTo(px - k * 0.25, py + k * 0.25); ctx.lineTo(px - k, py); ctx.lineTo(px - k * 0.25, py - k * 0.25);
          ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, s.size * 0.8, 0, 6.2832); ctx.fill();
        } else { ctx.beginPath(); ctx.arc(px, py, s.size, 0, 6.2832); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      if (!reduce) {
        if (Math.random() < 0.012 && shooting.length < 2) shooting.push({ x: Math.random() * w, y: Math.random() * h * 0.5, len: Math.random() * 80 + 40, sp: Math.random() * 9 + 7, a: Math.PI / 4 + (Math.random() * 0.2 - 0.1), life: 1 });
        for (let i = shooting.length - 1; i >= 0; i--) {
          const s = shooting[i];
          s.x += Math.cos(s.a) * s.sp; s.y += Math.sin(s.a) * s.sp; s.life -= 0.015;
          if (s.life <= 0 || s.x > w + 100 || s.y > h + 100) { shooting.splice(i, 1); continue; }
          ctx.strokeStyle = `rgba(255,255,255,${s.life * 0.8})`; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - Math.cos(s.a) * s.len, s.y - Math.sin(s.a) * s.len); ctx.stroke();
        }
        raf = requestAnimationFrame(frame);
      }
    };

    init(); frame();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { cancelAnimationFrame(raf); init(); frame(); }, 150); });
    if (!reduce) addEventListener('pointermove', (e) => { tx = (e.clientX - w / 2) * 0.03; ty = (e.clientY - h / 2) * 0.03; mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; document.documentElement.style.setProperty('--ax', (mouse.x * 30) + 'px'); document.documentElement.style.setProperty('--ay', (mouse.y * 30) + 'px'); }, { passive: true });
  }

  // ---------------------------------------------------------- wireframe globe (contact page)
  const gc = document.getElementById('globe');
  if (gc && window.d3 && window.topojson) {
    const d3 = window.d3, topojson = window.topojson;
    const ctx = gc.getContext('2d');
    const proj = d3.geoOrthographic().precision(0.5);
    const path = d3.geoPath(proj, ctx);
    const grat = d3.geoGraticule10();
    let land = null, size = 0, visible = false, dragging = false, last = [0, 0], raf = 0;
    let rot = [-78, -22]; // starts facing India

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      size = gc.clientWidth || 300;
      gc.width = size * dpr; gc.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const draw = () => {
      if (!land) return;
      const R = size / 2 * 0.9, c = size / 2;
      proj.scale(R).translate([c, c]).rotate([rot[0], rot[1]]);
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath(); path({ type: 'Sphere' });
      const g = ctx.createRadialGradient(c - R * 0.3, c - R * 0.35, R * 0.1, c, c, R);
      g.addColorStop(0, 'rgba(120,140,255,.16)'); g.addColorStop(1, 'rgba(20,30,90,.05)');
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); path(grat); ctx.strokeStyle = 'rgba(180,195,255,.13)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); path(land); ctx.strokeStyle = 'rgba(205,217,255,.75)'; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.3; ctx.stroke();
    };

    const spin = () => {
      if (visible && !dragging && !reduce) { rot[0] = (rot[0] + 0.32) % 360; draw(); }
      raf = requestAnimationFrame(spin);
    };

    gc.addEventListener('pointerdown', (e) => { dragging = true; last = [e.clientX, e.clientY]; gc.setPointerCapture(e.pointerId); });
    gc.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      rot[0] += (e.clientX - last[0]) * 0.5;
      rot[1] = Math.max(-90, Math.min(90, rot[1] - (e.clientY - last[1]) * 0.5));
      last = [e.clientX, e.clientY]; draw();
    });
    const end = () => { dragging = false; };
    gc.addEventListener('pointerup', end); gc.addEventListener('pointercancel', end);

    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0.05 }).observe(gc);
    new ResizeObserver(resize).observe(gc);

    fetch('/vendor/world-110m.json').then((r) => r.json()).then((world) => {
      land = topojson.mesh(world, world.objects.countries);
      resize(); spin();
    }).catch(() => { gc.style.display = 'none'; });
  }
})();
