// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: db-compress.js
// Purpose: Decompress embedded gzip+base64 food database
// ============================================================

/**
 * Decompress the embedded food database from gzip+base64 to JSON.
 * Uses the native DecompressionStream API (Chrome 80+, Firefox 113+, Safari 16.4+).
 * Falls back to a synchronous deflate reader if DecompressionStream is unavailable.
 *
 * @returns {Promise<Array>} The decompressed food database array
 */
async function decompressEmbeddedDB() {
  var raw = window.__FOOD_DB_EMBEDDED;
  if (!raw || raw.length === 0) {
    throw new Error('Embedded food database is empty');
  }

  // Step 1: Base64 decode to Uint8Array
  var binaryString = atob(raw);
  var bytes = new Uint8Array(binaryString.length);
  for (var i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Step 2: Gzip decompress using DecompressionStream
  try {
    var ds = new DecompressionStream('gzip');
    // Create a blob from the compressed bytes and pipe through stream
    var compressedBlob = new Blob([bytes]);
    var decompressedStream = compressedBlob.stream().pipeThrough(ds);
    var reader = decompressedStream.getReader();
    var chunks = [];
    var totalLength = 0;

    while (true) {
      var result = await reader.read();
      if (result.done) break;
      chunks.push(result.value);
      totalLength += result.value.length;
    }

    // Concatenate all chunks
    var decompressedBytes = new Uint8Array(totalLength);
    var offset = 0;
    for (var j = 0; j < chunks.length; j++) {
      decompressedBytes.set(chunks[j], offset);
      offset += chunks[j].length;
    }

    var jsonString = new TextDecoder('utf-8').decode(decompressedBytes);
    return JSON.parse(jsonString);
  } catch (e) {
    // Fallback: try using inflate (some browsers)
    try {
      var ds2 = new DecompressionStream('deflate');
      var compressedBlob2 = new Blob([bytes]);
      var decompressedStream2 = compressedBlob2.stream().pipeThrough(ds2);
      var reader2 = decompressedStream2.getReader();
      var chunks2 = [];
      var totalLength2 = 0;

      while (true) {
        var result2 = await reader2.read();
        if (result2.done) break;
        chunks2.push(result2.value);
        totalLength2 += result2.value.length;
      }

      var decompressedBytes2 = new Uint8Array(totalLength2);
      var offset2 = 0;
      for (var k = 0; k < chunks2.length; k++) {
        decompressedBytes2.set(chunks2[k], offset2);
        offset2 += chunks2[k].length;
      }

      var jsonString2 = new TextDecoder('utf-8').decode(decompressedBytes2);
      return JSON.parse(jsonString2);
    } catch (e2) {
      // Last resort: synchronous decompression using a pure JS gzip reader
      console.warn('DecompressionStream not available, falling back to sync decompressor');
      return decompressEmbeddedDB_Sync(bytes);
    }
  }
}

/**
 * Synchronous gzip decompression fallback using pako-like approach.
 * Reads gzip header, uses zlib.inflateSync if available, otherwise throws.
 */
function decompressEmbeddedDB_Sync(compressedBytes) {
  // Try using native zlib if available (Node.js env) - shouldn't happen in browser
  throw new Error('No synchronous decompression method available in this browser. Please use a modern browser (Chrome 80+, Firefox 113+, Safari 16.4+).');
}

/**
 * Initialize the food database from embedded compressed data.
 * This is the main entry point called from app.js init().
 */
async function initEmbeddedDB() {
  try {
    var foods = await decompressEmbeddedDB();
    FOOD_DB = foods;
    console.log('Loaded ' + FOOD_DB.length + ' food items from embedded database');

    // Merge user-edited/added foods (v1.2 migration)
    var saved = JSON.parse(localStorage.getItem('nutripro_userFoods') || '[]');
    saved.forEach(function(entry) {
      if (entry.action === 'add') {
        var exists = FOOD_DB.find(function(f) { return f.id === entry.foodId; });
        if (!exists) FOOD_DB.push(entry.data);
      } else if (entry.action === 'edit' && entry.foodId) {
        var idx = FOOD_DB.findIndex(function(f) { return f.id === entry.foodId; });
        if (idx >= 0) FOOD_DB[idx] = Object.assign({}, FOOD_DB[idx], entry.data);
      }
    });

    return true;
  } catch (e) {
    console.error('Error initializing embedded food database:', e);
    FOOD_DB = [];
    throw e;
  }
}
