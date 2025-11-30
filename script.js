// ---------------------------
// Emoji Mosaic Generator (WASM powered)
// ---------------------------

// === DOM elements ===
const fileInput = document.getElementById("imageUpload");
const inputCanvas = document.getElementById("inputCanvas");
const inputCtx = inputCanvas.getContext("2d");
const outputContainer = document.getElementById("mosaicContainer");

// === Settings ===
const tileSize = 8;
let imageLoaded = false;

// STEP 2 — Convert emoji file names → actual emoji characters
function filenameToEmoji(name) {
  const hexes = name
    .toLowerCase()
    .split('/').pop()
    .replace(/^emoji_u/, '')
    .replace(/\.svg$/, '')
    .split('_');

  return String.fromCodePoint(...hexes.map(h => parseInt(h, 16)));
}

// === Step 1: initialize WASM and KD-tree ===
(async function initWasmAndTree() {
  try {
    console.log("⏳ Initializing WebAssembly + KD-tree...");
    await loadWasmModule("build/full_mosaic.wasm");
    await loadKDTreeIntoWasm("kd_tree.json");
    console.log("✅ WASM and KD-tree ready.");
  } catch (e) {
    console.error("❌ WASM init failed:", e);
  }
})();

// === Step 2: image upload handler ===
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    // 1) Run preprocessor
    const processedCanvas = await window.preprocessEmojiEnhance(file, {
      portraitWidth: 1080,
      portraitHeight: 1354,
      toneBrightness: 0.8,
      toneRGBA: 'rgba(244,233,50,0.26)',
      unsharpRadius: 53,
      unsharpStrength: 2.9,
      finalFilter: 'brightness(1.18) contrast(1.05)',
      overlaySrc: true
    });

    // 2) Draw processed image
    inputCanvas.width = processedCanvas.width;
    inputCanvas.height = processedCanvas.height;
    inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
    inputCtx.drawImage(processedCanvas, 0, 0);
    imageLoaded = true;

    // 3) Ensure WASM ready
    if (!window.wasmReady) {
      console.log("WASM not ready yet, reloading...");
      await loadWasmModule("build/full_mosaic.wasm");
      await loadKDTreeIntoWasm("kd_tree.json");
    }

    console.log("🖼️ Preprocessed image ready, generating mosaic...");

    // 4) Compute tile colors
    const { colors, cols, rows } = calculateTileColorsFromCanvas(inputCanvas, tileSize);

    // 5) Use Worker for matching
    console.time("🧩 Mosaic matching time");
    let results = await matchEmojisInWorker(colors);
    console.timeEnd("🧩 Mosaic matching time");

    // 6) Convert filenames → emoji characters
    results = results.map(filenameToEmoji);

    // 7) Render mosaic
    await renderFromResults(results, cols, rows, tileSize, 0.83);

    console.log("✅ Mosaic generated successfully!");
  } catch (err) {
    console.error("Preprocess/mosaic failed:", err);
    alert("Could not process image. Please try again.");
  }
});

async function renderFromResults(results, cols, rows, tileSize, scale = 1.00) {
  outputContainer.innerHTML = "";

  let canvas = document.getElementById("mosaicCanvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "mosaicCanvas";
    outputContainer.appendChild(canvas);
  }

  const scaleOutput = 4;
  
  canvas.width = cols * tileSize * scaleOutput;
  canvas.height = rows * tileSize * scaleOutput;
  
  console.log(`Canvas: ${canvas.width}x${canvas.height}px`);
  console.log(`Megapixels: ${(canvas.width * canvas.height / 1000000).toFixed(1)}MP`);
  
  canvas.style.width = (cols * tileSize) + "px";
  canvas.style.height = (rows * tileSize) + "px";

  const ctx = canvas.getContext("2d");
  ctx.scale(scaleOutput, scaleOutput);

  await document.fonts.load(`${tileSize * scale}px NotoEmoji`);

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = `${tileSize * scale}px NotoEmoji`;
  ctx.textBaseline = "top";

  const offset = (tileSize - (tileSize * scale)) / 2;

  let index = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++, index++) {
      const emoji = results[index] || "⬜";
      ctx.fillText(emoji, x * tileSize + offset, y * tileSize + offset);
    }
  }

  console.log("✅ Mosaic rendered at 4K resolution");
  
  const mosaicModal = document.getElementById('mosaicModal');
  const mosaicLoader = document.getElementById('mosaicLoader');

  if (mosaicModal) {
    mosaicModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  if (mosaicLoader) {
    mosaicLoader.classList.remove('active');
  }

  console.log("✅ Modal visible!");
// Make canvas clickable
canvas.style.cursor = 'pointer';
canvas.addEventListener('click', function() {
    window.openCanvasLightbox();
});
}

function resetMosaic() {
  outputContainer.innerHTML = "";
  inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
  fileInput.value = "";
  imageLoaded = false;
  console.log("🔁 Mosaic reset.");
}

function downloadUltraHD() {
  const canvas = document.getElementById("mosaicCanvas");
  if (!canvas) return alert("Please generate the mosaic first!");
  
const btn = document.getElementById('downloadUltraHD');  // ← ADD THIS
  const originalText = btn.innerHTML;  // ← ADD THIS
  
  // ← ADD COUNTDOWN START
  let countdown = 5;
  btn.disabled = true;
  btn.style.opacity = '0.7';
  btn.style.cursor = 'not-allowed';
  
  const countdownInterval = setInterval(() => {
    btn.innerHTML = `⏳ ${countdown}s...`;
    countdown--;
    
    if (countdown < 0) {
      clearInterval(countdownInterval);
      // ← COUNTDOWN END, NOW DO DOWNLOAD
  
  console.log(`Ultra HD: ${canvas.width}x${canvas.height}px`);

  const link = document.createElement("a");
  link.download = "mosaic-ultra-hd.png";
  link.href = canvas.toDataURL("image/png");
  link.click();

  console.log("✅ Ultra HD PNG Downloaded");
  
// ← ADD RESTORE BUTTON
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  }, 1000);  // ← ADD THIS CLOSING
  
}

function downloadStandard() {
  const canvas = document.getElementById("mosaicCanvas");
  if (!canvas) return alert("Please generate the mosaic first!");
  
  const btn = document.getElementById('downloadStandard');  // ← ADD THIS
  const originalText = btn.innerHTML;  // ← ADD THIS
  
// ← ADD COUNTDOWN START
  let countdown = 5;
  btn.disabled = true;
  btn.style.opacity = '0.7';
  btn.style.cursor = 'not-allowed';
  
  const countdownInterval = setInterval(() => {
    btn.innerHTML = `⏳ ${countdown}s...`;
    countdown--;
    
    if (countdown < 0) {
      clearInterval(countdownInterval);
      // ← COUNTDOWN END, NOW DO DOWNLOAD
  
  const smallCanvas = document.createElement("canvas");
  smallCanvas.width = canvas.width * 0.62;
  smallCanvas.height = canvas.height * 0.62;
  
  const ctx = smallCanvas.getContext("2d");
  ctx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
  
  console.log(`Standard: ${smallCanvas.width}x${smallCanvas.height}px`);

  const link = document.createElement("a");
  link.download = "mosaic-standard.jpg";
  link.href = smallCanvas.toDataURL("image/jpeg", 0.85);
  link.click();

  console.log("✅ Standard JPEG Downloaded");
  // ← ADD RESTORE BUTTON
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  }, 1000);  // ← ADD THIS CLOSING
}

document.getElementById("downloadUltraHD").addEventListener("click", downloadUltraHD);
document.getElementById("downloadStandard").addEventListener("click", downloadStandard);

// ============================================
// Web Worker Setup
// ============================================
let mosaicWorker = null;
let workerReady = false;

function initWorker() {
  if (mosaicWorker) return;
  
  mosaicWorker = new Worker('mosaic-worker.js');
  
  mosaicWorker.onmessage = function(e) {
    const { type } = e.data;
    if (type === 'WASM_READY') {
      workerReady = true;
      console.log('✅ Worker WASM ready');
    }
  };
  
  mosaicWorker.onerror = function(err) {
    console.error('❌ Worker initialization error:', err);
    workerReady = false;
  };
  
  // Initialize WASM in worker
  mosaicWorker.postMessage({
    type: 'INIT_WASM',
    data: {
      wasmPath: 'build/full_mosaic.wasm',
      kdTreePath: 'kd_tree.json'
    }
  });
}

function matchEmojisInWorker(colors) {
  return new Promise((resolve, reject) => {
    // ✅ IMPROVED: Better fallback logic
    if (!workerReady || !mosaicWorker) {
      console.warn('⚠️ Worker not ready, using main thread (slower but works)');
      try {
        const results = runMatchingAndGetResults(colors);
        resolve(results);
      } catch (err) {
        reject(err);
      }
      return;
    }
    
    // Set up one-time listener for this specific request
    const handleMessage = function(e) {
      const { type, results, error } = e.data;
      if (type === 'MATCH_COMPLETE') {
        mosaicWorker.removeEventListener('message', handleMessage);
        resolve(results);
      }
      if (type === 'ERROR') {
        mosaicWorker.removeEventListener('message', handleMessage);
        console.error('Worker error, falling back to main thread:', error);
        // Fallback to main thread
        try {
          const results = runMatchingAndGetResults(colors);
          resolve(results);
        } catch (err) {
          reject(err);
        }
      }
    };
    
    mosaicWorker.addEventListener('message', handleMessage);
    
    // Send matching request
    mosaicWorker.postMessage({
      type: 'MATCH_EMOJIS',
      data: { colors }
    });
  });
}

// Initialize worker on page load
initWorker();