(function () {
  "use strict";
  var K = window.KM;
  var NATURAL = K.MODES[0].intervals;
  var state = { pc: 0, mode: K.MODES[0], labels: "notes" };

  /* The note that gives each mode its sound, as a scale degree (0-based) and a plain name. */
  var COLOR = {
    Ionian: null,
    Dorian: { degree: 5, name: "the raised 6th" },
    Phrygian: { degree: 1, name: "the lowered 2nd" },
    Lydian: { degree: 3, name: "the raised 4th" },
    Mixolydian: { degree: 6, name: "the lowered 7th" },
    Aeolian: { degree: 5, name: "the lowered 6th" },
    Locrian: { degree: 4, name: "the lowered 5th" }
  };

  /* Plain-English notes for each mode. tryChords are scale degrees (0-based) of the triads to
     vamp between, so the example chords always match the key on screen. */
  var TEXT = {
    Ionian: {
      plain: "This is the ordinary major scale, the “do re mi” scale. It sounds bright, happy and settled, and most pop and folk melodies live here. Every other mode is compared with it.",
      tryText: "Try it over the three main chords of the key: ", tryChords: [0, 3, 4]
    },
    Dorian: {
      plain: "A minor scale with one brighter note, the 6th. That one note stops it sounding sad and gives it a cool, soulful, slightly jazzy feel. Think of it as natural minor with a lift.",
      tryText: "Try it over a back-and-forth between ", tryChords: [0, 3]
    },
    Phrygian: {
      plain: "A minor scale with the 2nd note pushed down a half step, right next to the root. That tight first step gives it a dark, tense, Spanish or flamenco sound.",
      tryText: "Try it over a back-and-forth between ", tryChords: [0, 1]
    },
    Lydian: {
      plain: "A major scale with a raised 4th. That one note makes it float: dreamy, open and wondering. Film music uses it a lot.",
      tryText: "Try it over a back-and-forth between ", tryChords: [0, 1]
    },
    Mixolydian: {
      plain: "A major scale with a lowered 7th. It is still bright, but with a relaxed, bluesy edge. It is the sound of a lot of classic rock, folk and blues.",
      tryText: "Try it over a back-and-forth between ", tryChords: [0, 6]
    },
    Aeolian: {
      plain: "The natural minor scale, the plain sad, serious minor sound. It is the same seven notes as a major scale, just starting from the 6th note instead of the 1st.",
      tryText: "Try it over a loop of ", tryChords: [0, 5, 6]
    },
    Locrian: {
      plain: "A minor-sounding scale with both the 2nd and the 5th lowered. The lowered 5th makes the home chord feel unstable, so this mode never quite rests. It is rarely used as a home key and is mostly borrowed for a moment over one chord.",
      tryText: "Try it over just one chord: ", tryChords: [0], sevenths: true
    }
  };

  var keysEl = document.getElementById("keys");
  var modesEl = document.getElementById("modes");
  var neckEl = document.getElementById("neck");

  function renderKeys() {
    keysEl.innerHTML = "";
    for (var pc = 0; pc < 12; pc++) {
      (function (pc) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (pc === state.pc ? " on" : "");
        b.textContent = K.keyForMode(pc, state.mode).name;
        b.addEventListener("click", function () { state.pc = pc; render(); });
        keysEl.appendChild(b);
      })(pc);
    }
  }

  function renderModes() {
    modesEl.innerHTML = "";
    K.MODES.forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (m === state.mode ? " on" : "");
      b.textContent = m.name;
      b.addEventListener("click", function () { state.mode = m; render(); });
      modesEl.appendChild(b);
    });
  }

  function degreeLabel(d, interval) {
    var shift = interval - NATURAL[d];
    return (shift < 0 ? "♭" : shift > 0 ? "♯" : "") + (d + 1);
  }

  function render() {
    renderKeys();
    renderModes();

    var mode = state.mode, k = K.keyForMode(state.pc, mode);
    var notes = [], degrees = [], byPc = {};
    mode.intervals.forEach(function (iv, d) {
      var pc = K.mod(state.pc + iv, 12);
      var name = K.keyToneName(K.mod(k.letterIndex + d, 7), pc);
      notes.push(name);
      degrees.push(degreeLabel(d, iv));
      byPc[pc] = { name: name, degree: d, label: degreeLabel(d, iv) };
    });

    var title = k.name + " " + mode.name;
    document.getElementById("title").textContent = title;
    document.getElementById("plain").textContent = TEXT[mode.name].plain;
    document.getElementById("notes").textContent = notes.join("  ");
    document.getElementById("formula").textContent = degrees.join("  ");

    /* The same seven notes as which major scale? */
    var parent = K.keyForMode(K.mod(state.pc - NATURAL[K.MODES.indexOf(mode)], 12), K.MODES[0]);
    document.getElementById("parent").textContent = mode === K.MODES[0]
      ? "This is the major scale itself"
      : "Same notes as " + parent.name + " major";

    var color = COLOR[mode.name];
    var colorEl = document.getElementById("colorFact");
    colorEl.style.display = color ? "" : "none";
    if (color) {
      document.getElementById("colorNote").textContent =
        notes[color.degree] + " (" + degrees[color.degree] + "), " + color.name;
    }

    var t = TEXT[mode.name];
    var chords = K.keyChords(k, mode, !!t.sevenths);
    var names = t.tryChords.map(function (i) { return chords[i].name; });
    var list = names.length === 1 ? names[0]
      : names.length === 2 ? names[0] + " and " + names[1]
      : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
    document.getElementById("tryit").textContent = t.tryText + list + ".";

    var dots = [];
    for (var s = 0; s < 6; s++) {
      for (var f = 0; f <= 12; f++) {
        var info = byPc[K.mod(K.neck.TUNING[s] + f, 12)];
        if (!info) continue;
        var cls = info.degree === 0 ? "root" : (color && info.degree === color.degree ? "color" : "note");
        dots.push({ s: s, f: f, cls: cls, label: state.labels === "notes" ? info.name : info.label });
      }
    }
    K.neck.drawNeck(neckEl, 12, dots);
    document.getElementById("lgColor").style.display = color ? "" : "none";
  }

  function setLabels(v) {
    state.labels = v;
    document.getElementById("showNotes").classList.toggle("on", v === "notes");
    document.getElementById("showDegrees").classList.toggle("on", v === "degrees");
    render();
  }
  document.getElementById("showNotes").addEventListener("click", function () { setLabels("notes"); });
  document.getElementById("showDegrees").addEventListener("click", function () { setLabels("degrees"); });

  render();
})();
