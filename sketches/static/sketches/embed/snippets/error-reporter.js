(function () {
  var runId = __RUN_ID__;
  function report(payload) {
    parent.postMessage(Object.assign({ type: "sketch-preview-error", runId: runId }, payload), "*");
  }
  window.addEventListener("error", function (event) {
    report({
      message: event.message || "Script error",
      source: event.filename || "sketch",
      line: event.lineno || null,
      col: event.colno || null,
      stack: event.error && event.error.stack ? event.error.stack : null
    });
  });
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    report({
      message: reason && reason.message ? reason.message : String(reason),
      stack: reason && reason.stack ? reason.stack : null
    });
  });
})();
