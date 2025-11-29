// ---------------------------
// Mosaic Worker - Handles WASM Emoji Matching
// ---------------------------

// Import WASM glue code
importScripts('wasm_glue.js');

let wasmReady = false;
let emojiSrcs = []; // Store emoji sources in worker scope

// Listen for messages from main thread
self.onmessage = async function(e) {
  const { type, data } = e.data;
  
  // Initialize WASM module
  if (type === 'INIT_WASM') {
    try {
      console.log('🔧 Worker: Loading WASM module...');
      await loadWasmModule(data.wasmPath);
      
      console.log('🔧 Worker: Loading KD-tree...');
      const kdResult = await loadKDTreeIntoWasm(data.kdTreePath);
      
      // ✅ CRITICAL FIX: Store emojiSrcs in worker scope
      emojiSrcs = kdResult.emojiSrcs || self.emojiSrcs || [];
      
      wasmReady = true;
      console.log('✅ Worker: WASM and KD-tree ready with', emojiSrcs.length, 'emojis');
      
      self.postMessage({ type: 'WASM_READY' });
    } catch (err) {
      console.error('❌ Worker WASM init failed:', err);
      self.postMessage({ 
        type: 'ERROR', 
        error: err.message || 'WASM initialization failed' 
      });
    }
  }
  
  // Match emojis using KD-tree
  if (type === 'MATCH_EMOJIS') {
    if (!wasmReady) {
      self.postMessage({ 
        type: 'ERROR', 
        error: 'WASM not initialized yet' 
      });
      return;
    }
    
    try {
      console.log('🧩 Worker: Starting emoji matching for', data.colors.length, 'tiles...');
      
      // ✅ Run matching in worker
      const results = runMatchingAndGetResults(data.colors);
      
      console.log('✅ Worker: Matching complete, returning', results.length, 'results');
      
      // ✅ CRITICAL: Send back the actual emoji filenames, not just indices
      self.postMessage({ 
        type: 'MATCH_COMPLETE', 
        results: results // These are already emoji filenames from runMatchingAndGetResults
      });
    } catch (err) {
      console.error('❌ Worker matching failed:', err);
      self.postMessage({ 
        type: 'ERROR', 
        error: err.message || 'Emoji matching failed' 
      });
    }
  }
};

// Handle worker errors
self.onerror = function(err) {
  console.error('❌ Worker error:', err);
  self.postMessage({ 
    type: 'ERROR', 
    error: err.message || 'Unknown worker error' 
  });
};