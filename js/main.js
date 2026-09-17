/* ============================================================
   Portfolio main script:
   1) Lucide icons init
   2) Constellation background animation (theme-aware)
   3) Theme toggle (light <-> dark, persisted)
   4) Unified lightbox + gallery modals logic
   ============================================================ */

/* 1) Icons */
lucide.createIcons();

/* 2) Constellation background animation */
(function () {
    var canvas = document.getElementById('geo-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var LINK_DIST = 140;
    var w = 0, h = 0, dots = [];
    var dotA = '160, 92, 44', dotB = '63, 93, 70', linkRGB = '139, 107, 74', linkA = 0.16;

    /* Read particle colors from the active theme variables */
    function readThemeColors() {
        var cs = getComputedStyle(document.documentElement);
        dotA = (cs.getPropertyValue('--dot-a') || '').trim() || dotA;
        dotB = (cs.getPropertyValue('--dot-b') || '').trim() || dotB;
        linkRGB = (cs.getPropertyValue('--link-rgb') || '').trim() || linkRGB;
        linkA = parseFloat((cs.getPropertyValue('--link-a') || '').trim()) || linkA;
    }

    function seed() {
        var count = Math.min(80, Math.max(25, Math.floor((w * h) / 24000)));
        dots = [];
        for (var i = 0; i < count; i++) {
            dots.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                r: Math.random() * 1.6 + 0.8,
                a: Math.random() * 0.35 + 0.25,
                hue: Math.random() < 0.75 ? dotA : dotB
            });
        }
    }

    function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        seed();
        if (reduce) draw();
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);
        /* links between nearby dots */
        for (var i = 0; i < dots.length; i++) {
            for (var j = i + 1; j < dots.length; j++) {
                var dx = dots[i].x - dots[j].x;
                var dy = dots[i].y - dots[j].y;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < LINK_DIST) {
                    ctx.strokeStyle = 'rgba(' + linkRGB + ', ' + (linkA * (1 - d / LINK_DIST)).toFixed(3) + ')';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(dots[i].x, dots[i].y);
                    ctx.lineTo(dots[j].x, dots[j].y);
                    ctx.stroke();
                }
            }
        }
        /* dots */
        for (var k = 0; k < dots.length; k++) {
            var p = dots[k];
            ctx.fillStyle = 'rgba(' + p.hue + ', ' + p.a.toFixed(2) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function step() {
        for (var i = 0; i < dots.length; i++) {
            var p = dots[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -12) p.x = w + 12;
            if (p.x > w + 12) p.x = -12;
            if (p.y < -12) p.y = h + 12;
            if (p.y > h + 12) p.y = -12;
        }
        draw();
        window.requestAnimationFrame(step);
    }

    window.addEventListener('resize', resize);
    /* Recolor particles instantly when the theme changes */
    window.addEventListener('themechange', function () {
        readThemeColors();
        seed();
        if (reduce) draw();
    });

    readThemeColors();
    resize();
    if (!reduce) window.requestAnimationFrame(step);
})();

/* 3) Theme toggle (light <-> dark), persisted in localStorage */
(function () {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
        var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('va-theme', next); } catch (e) {}
        window.dispatchEvent(new Event('themechange'));
    });
})();

/* 4) Unified logic: lightbox + gallery modals */
(function () {
    var box = document.getElementById('lightbox');
    var boxImg = document.getElementById('lightbox-img');
    var boxCap = document.getElementById('lightbox-caption');
    var modals = [
        document.getElementById('dem-modal'),
        document.getElementById('basemap-modal'),
        document.getElementById('forest-modal')
    ].filter(Boolean);

    function anyModalOpen() {
        for (var i = 0; i < modals.length; i++) {
            if (!modals[i].classList.contains('hidden')) return true;
        }
        return false;
    }

    function syncScroll() {
        var anyOpen = (box && !box.classList.contains('hidden')) || anyModalOpen();
        document.body.style.overflow = anyOpen ? 'hidden' : '';
    }

    function closeModal(m) {
        m.classList.add('hidden');
        syncScroll();
    }

    /* Lightbox: opens on click of any [data-full] tile (including tiles inside modals) */
    if (box) {
        document.querySelectorAll('[data-full]').forEach(function (card) {
            card.addEventListener('click', function () {
                boxImg.src = card.getAttribute('data-full');
                var thumb = card.querySelector('img');
                boxImg.alt = thumb ? thumb.alt : '';
                boxCap.textContent = card.getAttribute('data-caption') || '';
                box.classList.remove('hidden');
                box.classList.add('flex');
                syncScroll();
            });
        });
        window.closeLightbox = function () {
            box.classList.add('hidden');
            box.classList.remove('flex');
            boxImg.src = '';
            syncScroll();
        };
        document.getElementById('lightbox-close').addEventListener('click', window.closeLightbox);
        box.addEventListener('click', function (e) { if (e.target === box) window.closeLightbox(); });
    }

    /* Modals: close on backdrop click or close button */
    modals.forEach(function (m) {
        m.addEventListener('click', function (e) { if (e.target === m) closeModal(m); });
    });
    var demClose = document.getElementById('dem-modal-close');
    if (demClose) demClose.addEventListener('click', function () { closeModal(document.getElementById('dem-modal')); });
    var bmClose = document.getElementById('basemap-modal-close');
    if (bmClose) bmClose.addEventListener('click', function () { closeModal(document.getElementById('basemap-modal')); });
    var fmClose = document.getElementById('forest-modal-close');
    if (fmClose) fmClose.addEventListener('click', function () { closeModal(document.getElementById('forest-modal')); });

    /* Gallery open buttons */
    document.querySelectorAll('[data-open-dem]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var m = document.getElementById('dem-modal');
            if (m) { m.classList.remove('hidden'); syncScroll(); }
        });
    });
    document.querySelectorAll('[data-open-basemap]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var m = document.getElementById('basemap-modal');
            if (m) { m.classList.remove('hidden'); syncScroll(); }
        });
    });
    document.querySelectorAll('[data-open-forest]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var m = document.getElementById('forest-modal');
            if (m) { m.classList.remove('hidden'); syncScroll(); }
        });
    });

    /* Esc closes the topmost layer first (lightbox, then the open modal) */
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (box && !box.classList.contains('hidden')) { window.closeLightbox(); return; }
        for (var i = 0; i < modals.length; i++) {
            if (!modals[i].classList.contains('hidden')) { closeModal(modals[i]); return; }
        }
    });
})();