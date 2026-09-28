// Smooth Scroll-Based Frame Sequence Animation
(function() {
  'use strict';

  const TOTAL_FRAMES = 240;
  const FRAME_PREFIX = 'frames/frame_';
  const FRAME_EXT = '.webp';

  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

  const fgCanvas = document.getElementById('fg-canvas');
  const fgCtx = fgCanvas ? fgCanvas.getContext('2d') : null;
  const fgCanvasViewport = document.querySelector('.canvas-fg-viewport');
  const titleWrap = document.querySelector('.hero-bg-title-wrap');

  const maskImg = new Image();
  maskImg.src = 'assets/mask_alpha.png';
  maskImg.onload = () => {
    if (lastRenderedFrame >= 0) {
      render(lastRenderedFrame);
    }
  };

  const loader = document.getElementById('loader');
  const loaderPercent = document.getElementById('loader-percent');
  const loaderBar = document.getElementById('loader-bar');
  const scrollPrompt = document.getElementById('scroll-prompt');
  const frameNumDisplay = document.getElementById('frame-num');
  const hudProgressFill = document.getElementById('hud-progress-fill');

  // Preloaded image storage
  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let isReady = false;

  // Animation & Interpolation State
  let currentFrame = 0;
  let targetFrame = 0;
  let lastRenderedFrame = -1;
  let scrollFraction = 0;

  // Helper to format frame file path (1-based index) mapped to the 5 existing frame folders
  function getFramePath(index) {
    const padded = String(index).padStart(6, '0');
    let folder = '';
    if (index >= 1 && index <= 50) {
      folder = 'zero-50 frames';
    } else if (index >= 51 && index <= 99) {
      folder = 'First-49 frames';
    } else if (index >= 100 && index <= 150) {
      folder = 'zero-second 50 frames';
    } else if (index >= 151 && index <= 198) {
      folder = 'second-49 Frames';
    } else if (index >= 199 && index <= 240) {
      folder = 'third-40 Frames';
    }
    return `frames/${encodeURI(folder)}/frame_${padded}${FRAME_EXT}`;
  }

  // Set canvas size matching window and DPR
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    const pw = Math.round(width * dpr);
    const ph = Math.round(height * dpr);

    canvas.width = pw;
    canvas.height = ph;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (fgCanvas && fgCtx) {
      fgCanvas.width = pw;
      fgCanvas.height = ph;
      fgCtx.imageSmoothingEnabled = true;
      fgCtx.imageSmoothingQuality = 'high';
    }

    // Force re-render of current frame
    if (lastRenderedFrame >= 0) {
      render(lastRenderedFrame);
    }
  }

  // Draw image scaled to cover canvas maintaining aspect ratio
  function drawCover(targetCtx, targetCanvas, img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = targetCanvas.width;
    const ch = targetCanvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.max(cw / iw, ch / ih);
    const nw = iw * scale;
    const nh = ih * scale;
    const cx = (cw - nw) * 0.5;
    const cy = (ch - nh) * 0.5;

    targetCtx.drawImage(img, 0, 0, iw, ih, cx, cy, nw, nh);
  }

  // Draw foreground person cutout onto fgCanvas
  function drawMaskedForeground(img) {
    if (!fgCanvas || !fgCtx || !img || !img.complete || img.naturalWidth === 0) return;
    if (!maskImg.complete || maskImg.naturalWidth === 0) return;

    const cw = fgCanvas.width;
    const ch = fgCanvas.height;
    fgCtx.clearRect(0, 0, cw, ch);

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const nw = iw * scale;
    const nh = ih * scale;
    const cx = (cw - nw) * 0.5;
    const cy = (ch - nh) * 0.5;

    fgCtx.save();
    // Step 1: Draw the alpha mask
    fgCtx.drawImage(maskImg, 0, 0, maskImg.naturalWidth, maskImg.naturalHeight, cx, cy, nw, nh);
    
    // Step 2: Keep only where the mask has alpha (the person)
    fgCtx.globalCompositeOperation = 'source-in';
    
    // Step 3: Draw the current video frame on top
    fgCtx.drawImage(img, 0, 0, iw, ih, cx, cy, nw, nh);
    fgCtx.restore();
  }

  // Render a specific frame index with fallback to closest loaded frame
  function render(index) {
    index = Math.max(0, Math.min(TOTAL_FRAMES - 1, index));
    let img = images[index];

    // Fallback if target frame isn't loaded yet
    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const prev = index - offset;
        if (prev >= 0 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
          img = images[prev];
          break;
        }
        const next = index + offset;
        if (next < TOTAL_FRAMES && images[next] && images[next].complete && images[next].naturalWidth > 0) {
          img = images[next];
          break;
        }
      }
    }

    if (img && img.complete && img.naturalWidth > 0) {
      // 1. Draw full video frame in background (Layer 1)
      drawCover(ctx, canvas, img);
      
      // 2. Draw masked person cutout on top of title (Layer 3)
      drawMaskedForeground(img);
    }
  }

  // Update HUD displays
  function updateHUD(frameIdx, fraction) {
    if (frameNumDisplay) {
      frameNumDisplay.textContent = String(frameIdx + 1).padStart(3, '0');
    }
    if (hudProgressFill) {
      hudProgressFill.style.width = `${(fraction * 100).toFixed(1)}%`;
    }
  }

  // Calculate target frame from scroll
  function updateScrollTarget() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    scrollFraction = maxScroll > 0 ? Math.max(0, Math.min(1, window.scrollY / maxScroll)) : 0;
    targetFrame = scrollFraction * (TOTAL_FRAMES - 1);

    if (scrollPrompt) {
      if (window.scrollY > 40) {
        scrollPrompt.classList.add('hidden');
      } else {
        scrollPrompt.classList.remove('hidden');
      }
    }

    // Parallax & smooth fade for the background title and foreground cutout
    if (fgCanvasViewport) {
      const heroFade = Math.max(0, Math.min(1, 1 - (window.scrollY / (window.innerHeight * 0.75))));
      fgCanvasViewport.style.opacity = heroFade;
    }

    if (titleWrap) {
      const titleOffset = -window.scrollY * 0.22;
      titleWrap.style.transform = `translate(-50%, ${titleOffset}px)`;
      titleWrap.style.opacity = Math.max(0, 1 - (window.scrollY / (window.innerHeight * 0.65)));
    }
  }

  // Render loop with smooth easing
  function tick() {
    // Smooth lerp damping
    const delta = targetFrame - currentFrame;
    if (Math.abs(delta) > 0.0005) {
      currentFrame += delta * 0.12; // Snappy & buttery smooth
    } else {
      currentFrame = targetFrame;
    }

    const roundedFrame = Math.round(currentFrame);
    if (roundedFrame !== lastRenderedFrame) {
      render(roundedFrame);
      lastRenderedFrame = roundedFrame;
      updateHUD(roundedFrame, currentFrame / (TOTAL_FRAMES - 1));
    }

    requestAnimationFrame(tick);
  }

  // Preload all frames
  function preloadFrames() {
    resizeCanvas();

    // Priority 1: Load the very first frame immediately
    const firstImg = new Image();
    firstImg.src = getFramePath(1);
    images[0] = firstImg;

    firstImg.onload = () => {
      loadedCount++;
      render(0);
      lastRenderedFrame = 0;
      updateProgress();

      // Priority 2: Load the remaining frames concurrently
      loadRemainingFrames();
    };

    firstImg.onerror = () => {
      console.warn('Failed to load first frame: ' + firstImg.src);
      loadRemainingFrames();
    };
  }

  function updateProgress() {
    const percent = Math.floor((loadedCount / TOTAL_FRAMES) * 100);
    if (loaderPercent) loaderPercent.textContent = `${percent}%`;
    if (loaderBar) loaderBar.style.width = `${percent}%`;

    // Once at least 25% is loaded, we can allow viewing if desired, or at 100%
    if (loadedCount >= TOTAL_FRAMES && !isReady) {
      onAllLoaded();
    }
  }

  function onAllLoaded() {
    isReady = true;
    updateScrollTarget();
    render(Math.round(currentFrame));

    setTimeout(() => {
      if (loader) {
        loader.classList.add('loaded');
      }
    }, 250);
  }

  function loadRemainingFrames() {
    for (let i = 2; i <= TOTAL_FRAMES; i++) {
      const idx = i - 1;
      const img = new Image();
      img.src = getFramePath(i);

      img.onload = () => {
        images[idx] = img;
        loadedCount++;
        updateProgress();
      };

      img.onerror = () => {
        console.warn(`Failed to load frame ${i}`);
        loadedCount++;
        updateProgress();
      };
    }
  }

  // Event Listeners
  window.addEventListener('scroll', updateScrollTarget, { passive: true });
  window.addEventListener('resize', () => {
    resizeCanvas();
    updateScrollTarget();
  });

  // Start initialization
  preloadFrames();
  requestAnimationFrame(tick);
})();
