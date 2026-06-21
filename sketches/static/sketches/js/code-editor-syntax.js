window.CodeEditorSyntax = (function () {
  const JS_KEYWORDS = new Set([
    "break", "case", "catch", "class", "const", "continue", "debugger", "default",
    "delete", "do", "else", "export", "extends", "finally", "for",
    "function", "if", "import", "in", "instanceof", "let", "new", "return",
    "super", "switch", "this", "throw", "try", "typeof",
    "var", "void", "while", "yield", "async", "await", "of",
  ]);

  const JAVA_KEYWORDS = new Set([
    "abstract", "boolean", "break", "byte", "case", "catch", "char", "class",
    "continue", "default", "do", "double", "else", "extends", "final",
    "finally", "float", "for", "if", "implements", "import", "int", "interface",
    "long", "native", "new", "private", "protected", "public", "return",
    "short", "static", "strictfp", "super", "switch", "synchronized", "this",
    "throw", "throws", "transient", "try", "void", "volatile", "while",
  ]);

  const JS_BUILTINS = new Set([
    "setup", "draw", "createCanvas", "background", "fill", "stroke", "noFill",
    "noStroke", "ellipse", "circle", "rect", "line", "point", "translate",
    "rotate", "scale", "push", "pop", "colorMode", "map", "noise", "random",
    "width", "height", "mouseX", "mouseY", "frameCount", "key", "keyCode",
  ]);

  const JAVA_BUILTINS = new Set([
    "setup", "draw", "size", "background", "fill", "stroke", "noFill", "noStroke",
    "ellipse", "rect", "line", "point", "translate", "rotate", "scale", "push",
    "pop", "colorMode", "map", "noise", "random", "width", "height", "mouseX",
    "mouseY", "frameCount", "println", "print",
  ]);

  const JS_CONSTANTS = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);
  const JAVA_CONSTANTS = new Set(["true", "false", "null"]);

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function span(type, text) {
    return `<span class="tok-${type}">${escapeHtml(text)}</span>`;
  }

  function isIdentStart(char) {
    return /[A-Za-z_$]/.test(char);
  }

  function isIdentPart(char) {
    return /[A-Za-z0-9_$]/.test(char);
  }

  function highlight(code, language) {
    const isJava = language === "java";
    const keywords = isJava ? JAVA_KEYWORDS : JS_KEYWORDS;
    const builtins = isJava ? JAVA_BUILTINS : JS_BUILTINS;
    let html = "";
    let index = 0;

    while (index < code.length) {
      const rest = code.slice(index);

      if (rest.startsWith("//")) {
        const end = code.indexOf("\n", index);
        const stop = end === -1 ? code.length : end;
        html += span("comment", code.slice(index, stop));
        index = stop;
        continue;
      }

      if (rest.startsWith("/*")) {
        const end = code.indexOf("*/", index + 2);
        const stop = end === -1 ? code.length : end + 2;
        html += span("comment", code.slice(index, stop));
        index = stop;
        continue;
      }

      const char = code[index];
      if (char === '"' || char === "'") {
        const quote = char;
        let cursor = index + 1;
        while (cursor < code.length) {
          if (code[cursor] === "\\") {
            cursor += 2;
            continue;
          }
          if (code[cursor] === quote) {
            cursor += 1;
            break;
          }
          cursor += 1;
        }
        html += span("string", code.slice(index, cursor));
        index = cursor;
        continue;
      }

      if (/[0-9]/.test(char)) {
        let cursor = index + 1;
        while (cursor < code.length && /[0-9.xXa-fA-F]/.test(code[cursor])) {
          cursor += 1;
        }
        html += span("number", code.slice(index, cursor));
        index = cursor;
        continue;
      }

      if (isIdentStart(char)) {
        let cursor = index + 1;
        while (cursor < code.length && isIdentPart(code[cursor])) {
          cursor += 1;
        }
        const word = code.slice(index, cursor);
        if (keywords.has(word)) {
          html += span("keyword", word);
        } else if (builtins.has(word)) {
          html += span("builtin", word);
        } else if ((isJava ? JAVA_CONSTANTS : JS_CONSTANTS).has(word)) {
          html += span("constant", word);
        } else if (code[cursor] === "(") {
          html += span("function", word);
        } else {
          html += span("plain", word);
        }
        index = cursor;
        continue;
      }

      if (/[{}()[\];,.]/.test(char)) {
        html += span("punctuation", char);
        index += 1;
        continue;
      }

      if (/[<>:=+\-*/%&|!^~?]/.test(char)) {
        html += span("operator", char);
        index += 1;
        continue;
      }

      html += span("plain", char);
      index += 1;
    }

    return html;
  }

  function validateBrackets(code) {
    const pairs = { "(": ")", "[": "]", "{": "}" };
    const closers = new Set(Object.values(pairs));
    const stack = [];
    let line = 1;
    let inString = null;

    for (let index = 0; index < code.length; index += 1) {
      const char = code[index];
      const next = code[index + 1];

      if (char === "\n") {
        line += 1;
        continue;
      }

      if (inString) {
        if (char === "\\") {
          index += 1;
          continue;
        }
        if (char === inString) {
          inString = null;
        }
        continue;
      }

      if (char === "/" && next === "/") {
        const end = code.indexOf("\n", index);
        index = end === -1 ? code.length : end;
        continue;
      }

      if (char === "/" && next === "*") {
        const end = code.indexOf("*/", index + 2);
        index = end === -1 ? code.length - 1 : end + 1;
        continue;
      }

      if (char === '"' || char === "'") {
        inString = char;
        continue;
      }

      if (pairs[char]) {
        stack.push({ char, line });
        continue;
      }

      if (closers.has(char)) {
        const last = stack.pop();
        if (!last || pairs[last.char] !== char) {
          return [{ line, column: null, message: `Unexpected '${char}'` }];
        }
      }
    }

    if (inString) {
      return [{ line, column: null, message: "Unclosed string literal" }];
    }

    if (stack.length) {
      const last = stack[stack.length - 1];
      return [{ line: last.line, column: null, message: `Unclosed '${last.char}'` }];
    }

    return [];
  }

  function validateJavaScript(code) {
    if (typeof acorn !== "undefined") {
      try {
        acorn.parse(code, { ecmaVersion: "latest", sourceType: "script" });
        return [];
      } catch (error) {
        return [{
          line: error.loc?.line || 1,
          column: error.loc?.column != null ? error.loc.column + 1 : null,
          message: error.message,
        }];
      }
    }
    return validateBrackets(code);
  }

  function validate(code, language) {
    if (!code.trim()) {
      return [];
    }
    // Processing (.pde) is not JavaScript — only check obvious bracket/string issues.
    if (language === "java") {
      return validateBrackets(code);
    }
    return validateJavaScript(code);
  }

  return {
    highlight,
    validate,
    validateBrackets,
  };
})();
