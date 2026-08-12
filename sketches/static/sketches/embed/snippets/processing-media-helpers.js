/**
 * Processing.js has no Minim / loadSound. Expose loadAudio(path) on Processing
 * sketches (HTML5 Audio; relative paths resolve via <base href>).
 * Must load after processing.min.js and before the sketch bootstrap.
 */
(function () {
  function resolveUrl(path) {
    if (!path) return path;
    if (/^(https?:|data:|blob:|\/)/i.test(String(path))) return String(path);
    try {
      return new URL(String(path), document.baseURI).href;
    } catch (e) {
      return String(path);
    }
  }

  function loadAudio(path) {
    return new Audio(resolveUrl(path));
  }

  window.loadAudio = loadAudio;

  var P = window.Processing;
  if (!P) return;

  if (!P.__sketchMediaPatched) {
    P.__sketchMediaPatched = true;
    if (P.prototype && typeof P.prototype.loadAudio !== "function") {
      P.prototype.loadAudio = function (path) {
        return loadAudio(path);
      };
    }
  }
})();
