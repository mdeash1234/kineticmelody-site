(function () {
  "use strict";
  var K = window.KM;
  var TUNING = K.neck.TUNING;

  /* The five shapes, ported from ChordSeek's Caged.kt. frets are relative to the shape's own
     base fret (-1 = muted string); rootString 0 is the low E. */
  var SHAPES = {
    maj: [
      { letter: "C", frets: [-1, 3, 2, 0, 1, 0], rootString: 1 },
      { letter: "A", frets: [-1, 0, 2, 2, 2, 0], rootString: 1 },
      { letter: "G", frets: [3, 2, 0, 0, 0, 3], rootString: 0 },
      { letter: "E", frets: [0, 2, 2, 1, 0, 0], rootString: 0 },
      { letter: "D", frets: [-1, -1, 0, 2, 3, 2], rootString: 2 }
    ],
    min: [
      { letter: "C", frets: [-1, 3, 1, 0, 1, -1], rootString: 1 },
      { letter: "A", frets: [-1, 0, 2, 2, 1, 0], rootString: 1 },
      { letter: "G", frets: [3, 1, 0, 0, -1, 3], rootString: 0 },
      { letter: "E", frets: [0, 2, 2, 0, 0, 0], rootString: 0 },
      { letter: "D", frets: [-1, -1, 0, 2, 3, 1], rootString: 2 }
    ],
    "7": [
      { letter: "C", frets: [-1, 3, 2, 3, 1, -1], rootString: 1 },
      { letter: "A", frets: [-1, 0, 2, 0, 2, 0], rootString: 1 },
      { letter: "G", frets: [3, 2, 0, 0, 0, 1], rootString: 0 },
      { letter: "E", frets: [0, 2, 0, 1, 0, 0], rootString: 0 },
      { letter: "D", frets: [-1, -1, 0, 2, 1, 2], rootString: 2 }
    ]
  };
  var QUALITY = {
    maj: { chip: "Major", word: "major", suffix: "", third: 4, seventh: null },
    min: { chip: "Minor", word: "minor", suffix: "m", third: 3, seventh: null },
    "7": { chip: "Dominant 7", word: "dominant 7", suffix: "7", third: 4, seventh: 10 }
  };
  var ORDER = ["maj", "min", "7"];

  var ABOUT = {
    C: "The C shape comes from the open C chord. Its root, the note the chord is named after, is on the A string.",
    A: "The A shape comes from the open A chord. Its root is on the A string, and the barre lets the shape slide anywhere.",
    G: "The G shape comes from the open G chord. Its root is on the low E string. It is the biggest stretch of the five.",
    E: "The E shape comes from the open E chord. Its root is on the low E string. This is the barre chord most guitarists learn first.",
    D: "The D shape comes from the open D chord. Its root is on the D string, and it uses only the top four strings."
  };

  var state = { pc: 0, quality: "maj", selected: null };

  var rootsEl = document.getElementById("roots");
  var qualsEl = document.getElementById("quals");
  var neckEl = document.getElementById("neck");
  var rowEl = document.getElementById("shapes");

  function rootEntry() {
    return (state.quality === "min" ? K.KEYS_MINOR : K.KEYS_ALL)[state.pc];
  }

  function baseFret(shape) {
    return K.mod(state.pc - TUNING[shape.rootString] - shape.frets[shape.rootString], 12);
  }

  function placed() {
    return SHAPES[state.quality].map(function (shape) {
      var base = baseFret(shape);
      return {
        letter: shape.letter,
        base: base,
        frets: shape.frets.map(function (f) { return f < 0 ? -1 : f + base; })
      };
    });
  }

  function renderChips() {
    rootsEl.innerHTML = "";
    for (var pc = 0; pc < 12; pc++) {
      (function (pc) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (pc === state.pc ? " on" : "");
        b.textContent = (state.quality === "min" ? K.KEYS_MINOR : K.KEYS_ALL)[pc].name;
        b.addEventListener("click", function () { state.pc = pc; render(); });
        rootsEl.appendChild(b);
      })(pc);
    }
    qualsEl.innerHTML = "";
    ORDER.forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (q === state.quality ? " on" : "");
      b.textContent = QUALITY[q].chip;
      b.addEventListener("click", function () { state.quality = q; render(); });
      qualsEl.appendChild(b);
    });
  }

  /* Spell the chord's notes from the root's own letter, so a flat key reads E♭ and not D♯. */
  function toneNames() {
    var root = rootEntry(), q = QUALITY[state.quality], out = {};
    var add = function (letterStep, interval) {
      var pc = K.mod(state.pc + interval, 12);
      out[pc] = K.keyToneName(K.mod(root.letterIndex + letterStep, 7), pc);
    };
    add(0, 0); add(2, q.third); add(4, 7);
    if (q.seventh !== null) add(6, q.seventh);
    return out;
  }

  function render() {
    renderChips();
    var q = QUALITY[state.quality];
    var chord = rootEntry().name + q.suffix;
    var shapes = placed();
    var names = toneNames();

    document.getElementById("title").textContent = chord + " (" + rootEntry().name + " " + q.word + ")";

    /* Draw the selected shape first so a note two shapes share takes its colour. */
    var order = shapes.slice();
    if (state.selected !== null) {
      order.sort(function (a, b) { return (a.letter === state.selected ? 0 : 1) - (b.letter === state.selected ? 0 : 1); });
    }
    var seen = {}, dots = [];
    order.forEach(function (sh) {
      sh.frets.forEach(function (f, s) {
        if (f < 0) return;
        var pc = K.mod(TUNING[s] + f, 12);
        var key = s + ":" + f;
        var lit = state.selected === null || state.selected === sh.letter;
        if (seen[key]) {
          if (lit && !seen[key].lit) { seen[key].dim = false; }
          if (!seen[key].ring) seen[key].ring = "s-" + sh.letter;
          return;
        }
        var dot = { s: s, f: f, label: names[pc], dim: !lit, lit: lit,
                    cls: "s-" + sh.letter + (pc === state.pc ? " is-root" : "") };
        seen[key] = dot;
        dots.push(dot);
      });
    });
    K.neck.drawNeck(neckEl, 14, dots);

    rowEl.innerHTML = "";
    shapes.forEach(function (sh) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "shape-card" + (state.selected === sh.letter ? " on" : "");
      var lo = Math.min.apply(null, sh.frets.filter(function (f) { return f >= 0; }));
      var hi = Math.max.apply(null, sh.frets);
      card.innerHTML = '<span class="sh"><b class="s-' + sh.letter + '">' + sh.letter + '</b> shape</span>' +
        '<span class="at"></span><svg role="img"></svg>';
      card.querySelector(".at").textContent = sh.base === 0 ? "Open position" : "Frets " + lo + "–" + hi;
      card.querySelector("svg").setAttribute("aria-label", sh.letter + " shape of " + chord + " at " + (sh.base === 0 ? "the nut" : "fret " + lo));
      K.neck.drawBox(card.querySelector("svg"), sh.frets, "s-" + sh.letter);
      card.addEventListener("click", function () {
        state.selected = state.selected === sh.letter ? null : sh.letter;
        render();
      });
      rowEl.appendChild(card);
    });

    var up = shapes.slice().sort(function (a, b) { return a.base - b.base; })
      .map(function (s) { return s.letter; }).join(", ");
    document.getElementById("order").textContent =
      "Going up the neck from the nut, the shapes for " + chord + " come in this order: " + up +
      ". Past the last one the pattern starts again from the first, an octave higher.";

    var about = document.getElementById("about");
    if (state.selected === null) {
      about.textContent = "Tap a shape to light it up on the neck. Tap it again to show all five.";
    } else {
      var note = "";
      if (state.quality === "min" && (state.selected === "C" || state.selected === "G")) {
        note = " In minor this shape is played as a partial grip, with one string left out.";
      } else if (state.quality === "7" && state.selected === "C") {
        note = " The 7th version leaves out the top string.";
      }
      about.textContent = ABOUT[state.selected] + note;
    }
  }

  render();
})();
