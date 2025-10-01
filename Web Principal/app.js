window.addEventListener('DOMContentLoaded', () => {
  // Íconos
  if (window.lucide && lucide.createIcons) {
    lucide.createIcons();
  }

  // Año
  const yy = document.getElementById('yy');
  if (yy) yy.textContent = new Date().getFullYear();

  // Menú móvil
  const mobile = document.getElementById('mobileMenu');
  const openBtn = document.getElementById('openMenu');
  const closeBtn = document.getElementById('closeMenu');
  const closeSheetBtn = document.getElementById('closeSheet');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      mobile.classList.add('open');
      mobile.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll'); // bloquea scroll
      openBtn.setAttribute('aria-expanded', 'true');
    });
  }
  const closeMenu = (e) => {
    if (e) e.preventDefault();
    mobile.classList.remove('open');
    mobile.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll'); // restaura scroll
    openBtn?.setAttribute('aria-expanded', 'false');
    openBtn?.focus();
  };
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      closeMenu(e);
    });
  }
  if (closeSheetBtn) {
    closeSheetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu(e);
    });
  }
  // Cerrar al tocar fuera de la hoja
  if (mobile) {
    mobile.addEventListener('click', (e) => {
      if (e.target === mobile) {
        closeMenu(e);
      }
    });
  }

  // Scroll suave + cerrar menú móvil al navegar
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id && id.length > 1) {
        e.preventDefault();
        const target = document.querySelector(id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        closeMenu(e);
      }
    });
  });

  // Testimonials autoplay (simple slider)
  const carousel = document.querySelector('.testimonials.carousel');
  if (carousel) {
    // Duplicate slides to have more items
    const original = Array.from(carousel.querySelectorAll('.tcard'));
    if (original.length) {
      original.forEach(card => carousel.appendChild(card.cloneNode(true)));
    }
    let idx = 0;
    const step = () => {
      idx = (idx + 1) % carousel.children.length;
      const x = carousel.clientWidth * idx;
      carousel.scrollTo({ left: x, behavior: 'smooth' });
      if (idx === carousel.children.length - 1) {
        // reset soon after reaching the end
        setTimeout(() => { carousel.scrollTo({ left: 0, behavior: 'auto' }); idx = 0; }, 400);
      }
    };
    let timer = setInterval(step, 3500);
    carousel.addEventListener('mouseenter', () => { clearInterval(timer); });
    carousel.addEventListener('mouseleave', () => { timer = setInterval(step, 3500); });
  }
  
  // Scroll reveal: mark and observe elements
  const toReveal = document.querySelectorAll('.section-title, .card, .hero-card, .badge, .lead, .kicker, .tcard, .cta-panel, .contact-form, .form-title, .chip-row, .brand-showcase, .hero-actions');
  toReveal.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        obs.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Scroll progress bar
  const bar = document.createElement('div');
  bar.id = 'scrollbar';
  bar.className = 'scrollbar';
  document.body.appendChild(bar);
  const updateBar = () => {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const height = doc.scrollHeight - doc.clientHeight;
    const pct = height > 0 ? (scrollTop / height) * 100 : 0;
    bar.style.width = pct + '%';
  };
  window.addEventListener('scroll', updateBar, { passive: true });
  updateBar();

  // Subtle 3D tilt on hero card (pointer devices only)
  const heroCard = document.querySelector('.hero-card');
  if (heroCard && window.matchMedia('(pointer:fine)').matches) {
    const damp = 6;
    heroCard.addEventListener('mousemove', (e) => {
      const r = heroCard.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / (r.width / 2);
      const dy = (e.clientY - cy) / (r.height / 2);
      heroCard.style.transform = `rotateX(${(-dy * damp).toFixed(2)}deg) rotateY(${(dx * damp).toFixed(2)}deg)`;
    });
    heroCard.addEventListener('mouseleave', () => {
      heroCard.style.transform = '';
    });
  }

  // Formulario de contacto (mailto)
  const form = document.getElementById('contactForm');
  const feedback = document.getElementById('cf_feedback');

  // Ripple en botones
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - rect.left) + 'px';
      span.style.top = (e.clientY - rect.top) + 'px';
      btn.appendChild(span);
      setTimeout(() => span.remove(), 650);
    }, { passive: true });
  });
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('cf_name');
      const email = document.getElementById('cf_email');
      const msg = document.getElementById('cf_msg');
      if (!name.checkValidity() || !email.checkValidity() || !msg.checkValidity()) {
        form.reportValidity();
        return;
      }
      const to = 'dtechsolutions@gmail.com';
      const subject = encodeURIComponent('Contacto web - D TECH SOLUTIONS');
      const body = encodeURIComponent(`Nombre: ${name.value}\nCorreo: ${email.value}\n\nMensaje:\n${msg.value}`);
      const href = `mailto:${to}?subject=${subject}&body=${body}`;
      window.location.href = href;
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'Abriendo tu cliente de correo para enviar el mensaje…';
        setTimeout(() => { feedback.hidden = true; }, 5000);
      }
    });
  }

  // Botón usuario (placeholder para futuro SEO / perfil)
  const openUser = document.getElementById('openUser');
  if (openUser) {
    openUser.addEventListener('click', () => {
      // Placeholder: aquí abriremos el panel SEO / usuario
      alert('Próximamente: panel de usuario / SEO');
    });
  }
  // Redirección del botón usuario al Panel Adminstrador (captura para anular handler previo)
  try {
    const _openUser = document.getElementById('openUser');
    if (_openUser) {
      _openUser.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        // Overlay de transición sutil antes de ir al panel
        let ov = document.querySelector('.transition-overlay');
        if(!ov){
          ov = document.createElement('div');
          ov.className = 'transition-overlay';
          ov.innerHTML = '<div class="transition-card"><div class="ring"></div><b>Ingresando a zona de trabajo con acceso restringido. Solo para administradores y empleados🔒</b></div>';
          document.body.appendChild(ov);
        } else {
          ov.classList.remove('hidden');
        }
        setTimeout(()=>{ window.location.href = '../Panel%20Adminstrador/index.html'; }, 550);
      }, { capture: true });
    }
  } catch {}
});
