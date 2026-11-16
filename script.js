// ===== SPLASH SECTION (curtain + greetings overlay) =====
const splash = document.getElementById('splash');
const curtainLeft = document.getElementById('curtainLeft');
const curtainRight = document.getElementById('curtainRight');
const greetingText = document.getElementById('greetingText');
const heroRevealEls = document.querySelectorAll('.hero-reveal');

const greetings = [
  'Hello World',
  'Hola Mundo',
  'Bonjour le monde',
  'Ciao mondo',
  'Habari dunia',
  'Hallo Welt',
  'こんにちは世界'
];

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function showHeroContent() {
  for (let i = 0; i < heroRevealEls.length; i++) {
    const el = heroRevealEls[i];
    if (prefersReducedMotion) {
      el.classList.add('show');
    } else {
      setTimeout(function () {
        el.classList.add('show');
      }, i * 170);
    }
  }
}

function runCurtainSequence() {
  let step = 0;

  // the curtain starts parting right away and takes about as long as all
  // the greetings together, so it is fully open as the last one finishes
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      curtainLeft.classList.add('opening');
      curtainRight.classList.add('opening');
    });
  });

  function finish() {
    greetingText.classList.remove('show');

    setTimeout(function () {
      showHeroContent();
    }, 250);

    setTimeout(function () {
      splash.classList.add('hide');
    }, 400);
  }

  function showStep() {
    step++;
    greetingText.classList.remove('show');

    setTimeout(function () {
      greetingText.textContent = greetings[step - 1];
      greetingText.classList.add('show');

      if (step < greetings.length) {
        setTimeout(showStep, 450);
      } else {
        setTimeout(finish, 600);
      }
    }, 100);
  }

  showStep();
}

window.addEventListener('load', function () {
  if (prefersReducedMotion) {
    splash.classList.add('hide');
    showHeroContent();
  } else {
    runCurtainSequence();
  }
});

// ===== CURTAIN FABRIC RIPPLE SECTION =====
// Draws a woven fold pattern on each panel's canvas, then distorts rows of
// it toward where the pointer touches, using a spring chain so nearby rows
// ripple together and settle back — a cheap stand-in for real cloth physics.
function initCurtainRipple(canvas, panel) {
  let startRipple = function () {};
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  const sliceHeight = 6;
  let rows = [];
  let baseCanvas = document.createElement('canvas');
  let baseCtx = baseCanvas.getContext('2d');

  function drawBaseTexture() {
    baseCanvas.width = width;
    baseCanvas.height = height;
    baseCtx.clearRect(0, 0, width, height);

    // tiny repeating "LeeLee" weave pattern, drawn on a transparent
    // canvas so the fold stripes underneath (CSS) always show through
    baseCtx.fillStyle = 'rgba(201,167,232,0.3)';
    baseCtx.font = '12px Inter, sans-serif';
    const stepX = 65;
    const stepY = 40;
    let rowIndex = 0;
    for (let y = 20; y < height; y += stepY) {
      const offsetX = (rowIndex % 2 === 0) ? 0 : stepX / 2;
      for (let x = offsetX; x < width; x += stepX) {
        baseCtx.fillText('LeeLee', x, y);
      }
      rowIndex++;
    }
  }

  function resize() {
    width = panel.clientWidth;
    height = panel.clientHeight;
    canvas.width = width;
    canvas.height = height;
    drawBaseTexture();

    const rowCount = Math.ceil(height / sliceHeight);
    rows = [];
    for (let i = 0; i < rowCount; i++) {
      rows.push({ offset: 0, velocity: 0 });
    }
  }

  function applyTouch(localY, strength) {
    const rowIndex = Math.floor(localY / sliceHeight);
    const radius = 6;
    for (let i = rowIndex - radius; i <= rowIndex + radius; i++) {
      if (i >= 0 && i < rows.length) {
        const falloff = 1 - Math.abs(i - rowIndex) / radius;
        rows[i].velocity += strength * falloff;
      }
    }
    startRipple();
  }

  let lastPointerX = null;
  let lastPointerY = null;

  function handlePointer(clientX, clientY) {
    const rect = panel.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    if (lastPointerX !== null) {
      const deltaX = localX - lastPointerX;
      applyTouch(localY, deltaX * 1.4);
    }

    lastPointerX = localX;
    lastPointerY = localY;
  }

  panel.addEventListener('mousemove', function (e) {
    handlePointer(e.clientX, e.clientY);
  });
  panel.addEventListener('mouseleave', function () {
    lastPointerX = null;
    lastPointerY = null;
  });
  panel.addEventListener('touchmove', function (e) {
    if (e.touches.length > 0) {
      handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });
  panel.addEventListener('touchend', function () {
    lastPointerX = null;
    lastPointerY = null;
  });

  const springK = 0.008;
  const couplingK = 0.18;
  const damping = 0.94;

  function step() {
    for (let i = 0; i < rows.length; i++) {
      const above = rows[i - 1] ? rows[i - 1].offset : rows[i].offset;
      const below = rows[i + 1] ? rows[i + 1].offset : rows[i].offset;
      const coupling = (above - rows[i].offset) + (below - rows[i].offset);
      const accel = (-springK * rows[i].offset) + (couplingK * coupling);
      rows[i].velocity = (rows[i].velocity + accel) * damping;
      rows[i].offset += rows[i].velocity;
    }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < rows.length; i++) {
      const y = i * sliceHeight;
      const offsetX = rows[i].offset;
      ctx.drawImage(baseCanvas, 0, y, width, sliceHeight, offsetX, y, width, sliceHeight);
    }
  }

  let running = false;

  function isSettled() {
    for (let i = 0; i < rows.length; i++) {
      if (Math.abs(rows[i].offset) > 0.05 || Math.abs(rows[i].velocity) > 0.05) {
        return false;
      }
    }
    return true;
  }

  function loop() {
    step();
    render();
    if (isSettled()) {
      for (let i = 0; i < rows.length; i++) {
        rows[i].offset = 0;
        rows[i].velocity = 0;
      }
      render();
      running = false;
      return;
    }
    requestAnimationFrame(loop);
  }

  startRipple = function () {
    if (!running && !prefersReducedMotion) {
      running = true;
      requestAnimationFrame(loop);
    }
  };

  resize();
  render();
  window.addEventListener('resize', function () {
    resize();
    render();
  });
}

const canvasLeft = document.getElementById('canvasLeft');
const canvasRight = document.getElementById('canvasRight');

if (canvasLeft && canvasRight) {
  initCurtainRipple(canvasLeft, curtainLeft);
  initCurtainRipple(canvasRight, curtainRight);
}

// ===== CONTACT SECTION =====
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const sendButton = contactForm.querySelector('button');

contactForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const message = document.getElementById('message').value.trim();

  if (!name || !email || !message) {
    formStatus.textContent = 'Please fill in your name, email, and message.';
    return;
  }

  formStatus.textContent = 'Sending...';
  sendButton.disabled = true;

  fetch(contactForm.action, {
    method: 'POST',
    body: new FormData(contactForm),
    headers: { 'Accept': 'application/json' }
  })
    .then(function (response) {
      if (response.ok) {
        formStatus.textContent = 'Thanks, ' + name + '! Your message has been sent.';
        contactForm.reset();
      } else {
        formStatus.textContent = 'Something went wrong. Please try again or use WhatsApp.';
      }
      sendButton.disabled = false;
    })
    .catch(function () {
      formStatus.textContent = 'Could not send. Check your connection or use WhatsApp.';
      sendButton.disabled = false;
    });
});

// ===== SCROLL REVEAL SECTION =====
const revealElements = document.querySelectorAll('.reveal');

function checkReveal() {
  for (let i = 0; i < revealElements.length; i++) {
    const el = revealElements[i];
    const position = el.getBoundingClientRect().top;
    const screenHeight = window.innerHeight;

    if (position < screenHeight - 100) {
      el.classList.add('visible');
    }
  }
}

window.addEventListener('scroll', checkReveal);
checkReveal();

// ===== PROJECT CARD TILT SECTION =====
const projectCards = document.querySelectorAll('.project-card');

for (let i = 0; i < projectCards.length; i++) {
  const card = projectCards[i];

  card.addEventListener('mousemove', function (e) {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    card.style.transform = 'perspective(600px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-6px)';
  });

  card.addEventListener('mouseleave', function () {
    card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  });
}

// ===== NAV SECTION =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', function () {
  navLinks.classList.toggle('show');
});

// close mobile menu after clicking a link
const navLinkItems = navLinks.querySelectorAll('a');
for (let i = 0; i < navLinkItems.length; i++) {
  navLinkItems[i].addEventListener('click', function () {
    navLinks.classList.remove('show');
  });
}

// highlight the nav link for the section currently in view
const sections = document.querySelectorAll('section[id]');

function highlightActiveLink() {
  let currentSection = '';

  for (let i = 0; i < sections.length; i++) {
    const sectionTop = sections[i].offsetTop;
    if (window.scrollY >= sectionTop - 200) {
      currentSection = sections[i].getAttribute('id');
    }
  }

  for (let i = 0; i < navLinkItems.length; i++) {
    navLinkItems[i].classList.remove('active');
    if (navLinkItems[i].getAttribute('href') === '#' + currentSection) {
      navLinkItems[i].classList.add('active');
    }
  }
}

window.addEventListener('scroll', highlightActiveLink);

// ===== WHATSAPP SECTION =====
// put your number here: country code first, no + sign, no spaces, no leading 0
// example: 0801 234 5678 becomes 2348012345678
const whatsappNumber = '2347010191231';
const whatsappMessage = 'Hi Leah, I saw your portfolio.';

const whatsappLinks = document.querySelectorAll('[data-whatsapp]');
for (let i = 0; i < whatsappLinks.length; i++) {
  whatsappLinks[i].href = 'https://wa.me/' + whatsappNumber + '?text=' + encodeURIComponent(whatsappMessage);
}

// ===== PROJECT VIDEO POP-UP SECTION (paste at the very bottom of script.js) =====
const videoModal = document.getElementById('videoModal');
const modalVideo = document.getElementById('modalVideo');
const videoTriggers = document.querySelectorAll('[data-video]');

function openVideo(src) {
  videoModal.classList.remove('no-video');
  modalVideo.src = src;
  videoModal.classList.add('open');
  document.body.style.overflow = 'hidden';
  modalVideo.play().catch(function () {});
}

function closeVideo() {
  modalVideo.pause();
  modalVideo.removeAttribute('src');
  modalVideo.load();
  videoModal.classList.remove('open');
  document.body.style.overflow = '';
}

for (let i = 0; i < videoTriggers.length; i++) {
  videoTriggers[i].addEventListener('click', function () {
    openVideo(videoTriggers[i].getAttribute('data-video'));
  });
}

modalVideo.addEventListener('error', function () {
  if (modalVideo.getAttribute('src')) {
    videoModal.classList.add('no-video');
  }
});

videoModal.addEventListener('click', function (e) {
  if (e.target !== modalVideo) {
    closeVideo();
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeVideo();
  }
});