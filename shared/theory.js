/* Music theory and playback shared by the Online Tools pages.
   A direct port of ChordSeek's music/ package (Theory, Modes, KeyChords, CircleOfFifths),
   so the pages and the app agree on every spelling and numeral. */
(function () {
  "use strict";

  var mod = function (n, m) { return ((n % m) + m) % m; };

  /* ---------- Spelling (Theory.kt) ---------- */

  var LETTERS = "CDEFGAB";
  var LETTER_PCS = [0, 2, 4, 5, 7, 9, 11];
  var FLAT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];

  function keyToneAccidental(letter, pc) {
    return mod(pc - LETTER_PCS[mod(letter, 7)] + 6, 12) - 6;
  }

  function keyToneName(letter, pc) {
    var l = mod(letter, 7);
    switch (keyToneAccidental(l, pc)) {
      case 0: return LETTERS[l];
      case -1: return LETTERS[l] + "♭";
      case 1: return LETTERS[l] + "♯";
      default: return FLAT_NAMES[mod(pc, 12)];
    }
  }

  /* ---------- Qualities ---------- */

  var QUALITIES = {
    "maj":   { label: "maj",   suffix: "",      pcs: [0, 4, 7],      premium: false },
    "min":   { label: "min",   suffix: "m",     pcs: [0, 3, 7],      premium: false },
    "7":     { label: "7",     suffix: "7",     pcs: [0, 4, 7, 10],  premium: false },
    "maj7":  { label: "maj7",  suffix: "maj7",  pcs: [0, 4, 7, 11],  premium: false },
    "min7":  { label: "min7",  suffix: "m7",    pcs: [0, 3, 7, 10],  premium: false },
    "dim":   { label: "dim",   suffix: "dim",   pcs: [0, 3, 6],      premium: true },
    "aug":   { label: "aug",   suffix: "aug",   pcs: [0, 4, 8],      premium: true },
    "m7♭5":  { label: "m7♭5",  suffix: "m7♭5",  pcs: [0, 3, 6, 10],  premium: true }
  };

  /* ---------- Modes and keys (Modes.kt) ---------- */

  /* Free on the web: the same two the app gives away. Add names here to unlock more. */
  var FREE_MODES = ["Ionian", "Dorian"];

  var MODES = [
    { name: "Ionian",     intervals: [0, 2, 4, 5, 7, 9, 11], desc: "The major scale. Bright and resolved." },
    { name: "Dorian",     intervals: [0, 2, 3, 5, 7, 9, 10], desc: "Minor with a raised 6th. Soulful, a little jazzy." },
    { name: "Phrygian",   intervals: [0, 1, 3, 5, 7, 8, 10], desc: "Minor with a ♭2. Dark, with a Spanish edge." },
    { name: "Lydian",     intervals: [0, 2, 4, 6, 7, 9, 11], desc: "Major with a ♯4. Dreamy and floating." },
    { name: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10], desc: "Major with a ♭7. Bluesy, classic rock." },
    { name: "Aeolian",    intervals: [0, 2, 3, 5, 7, 8, 10], desc: "The natural minor. Melancholy and open." },
    { name: "Locrian",    intervals: [0, 1, 3, 5, 6, 8, 10], desc: "Diminished tonic. Tense and unstable." }
  ];
  MODES.forEach(function (m) { m.isMinor = m.intervals[2] === 3; m.free = FREE_MODES.indexOf(m.name) >= 0; });
  var NATURAL = MODES[0].intervals;

  function key(name, letterIndex, pitchClass) { return { name: name, letterIndex: letterIndex, pitchClass: pitchClass }; }

  var KEYS_ALL = [
    key("C", 0, 0), key("D♭", 1, 1), key("D", 1, 2), key("E♭", 2, 3), key("E", 2, 4), key("F", 3, 5),
    key("F♯", 3, 6), key("G", 4, 7), key("A♭", 5, 8), key("A", 5, 9), key("B♭", 6, 10), key("B", 6, 11)
  ];
  var KEYS_MINOR = [
    key("C", 0, 0), key("C♯", 0, 1), key("D", 1, 2), key("E♭", 2, 3), key("E", 2, 4), key("F", 3, 5),
    key("F♯", 3, 6), key("G", 4, 7), key("G♯", 4, 8), key("A", 5, 9), key("B♭", 6, 10), key("B", 6, 11)
  ];

  function accidentalsIn(letter, pc, mode) {
    var total = 0;
    for (var d = 0; d < 7; d++) {
      var a = keyToneAccidental(letter + d, pc + mode.intervals[d]);
      if (a < -1 || a > 1) return null;
      total += Math.abs(a);
    }
    return total;
  }

  /* The key on pc as this mode is written on a chart: fewest accidentals, never a double one. */
  function keyForMode(pc, mode) {
    pc = mod(pc, 12);
    var usual = (mode.isMinor ? KEYS_MINOR : KEYS_ALL)[pc];
    var best = null;
    for (var letter = 0; letter < 7; letter++) {
      if (Math.abs(keyToneAccidental(letter, pc)) > 1) continue;
      var n = accidentalsIn(letter, pc, mode);
      if (n === null) continue;
      var tie = letter !== usual.letterIndex ? 1 : 0;
      if (!best || n < best.n || (n === best.n && tie < best.tie)) best = { letter: letter, n: n, tie: tie };
    }
    if (!best) return usual;
    return best.letter === usual.letterIndex ? usual : key(keyToneName(best.letter, pc), best.letter, pc);
  }

  /* ---------- Chords of a key (KeyChords.kt) ---------- */

  var ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

  function numeralFor(degree, interval, triad, sevenths, label) {
    var shift = interval - NATURAL[degree];
    var accidental = shift === -1 ? "♭" : shift === 1 ? "♯" : "";
    var base = (triad === "min" || triad === "dim") ? ROMAN[degree].toLowerCase() : ROMAN[degree];
    var suffix;
    if (triad === "dim") suffix = sevenths ? "ø7" : "°";
    else if (triad === "aug") suffix = "+";
    else if (!sevenths) suffix = "";
    else if (label === "maj7") suffix = "maj7";
    else suffix = "7";
    return accidental + base + suffix;
  }

  function keyChords(k, mode, sevenths) {
    var scale = mode.intervals;
    return scale.map(function (interval, degree) {
      var rootPc = mod(k.pitchClass + interval, 12);
      var step = function (n) { return mod(scale[(degree + n) % 7] - interval, 12); };
      var third = step(2), fifth = step(4), seventh = step(6);
      var triad = third === 4 && fifth === 8 ? "aug" : third === 4 ? "maj" : fifth === 6 ? "dim" : "min";
      var label;
      if (!sevenths) label = triad;
      else if (triad === "maj") label = seventh === 11 ? "maj7" : "7";
      else if (triad === "min") label = "min7";
      else if (triad === "dim") label = "m7♭5";
      else label = triad;
      var q = QUALITIES[label];
      return {
        numeral: numeralFor(degree, interval, triad, sevenths, label),
        name: keyToneName(mod(k.letterIndex + degree, 7), rootPc) + q.suffix,
        rootPc: rootPc,
        quality: q,
        degree: degree
      };
    });
  }

  /* ---------- Circle of fifths (CircleOfFifths.kt) ---------- */

  var SPOKES = [
    { name: "C", pc: 0, sharps: 0 }, { name: "G", pc: 7, sharps: 1 }, { name: "D", pc: 2, sharps: 2 },
    { name: "A", pc: 9, sharps: 3 }, { name: "E", pc: 4, sharps: 4 }, { name: "B", pc: 11, sharps: 5 },
    { name: "F♯", pc: 6, sharps: 6 }, { name: "D♭", pc: 1, sharps: -5 }, { name: "A♭", pc: 8, sharps: -4 },
    { name: "E♭", pc: 3, sharps: -3 }, { name: "B♭", pc: 10, sharps: -2 }, { name: "F", pc: 5, sharps: -1 }
  ];
  var MINOR_NAMES = ["A", "E", "B", "F♯", "C♯", "G♯", "E♭", "B♭", "F", "C", "G", "D"];

  function positionAt(index, ring) {
    var i = mod(index, 12);
    if (ring === "major") {
      return { index: i, ring: ring, base: SPOKES[i].name, name: SPOKES[i].name, rootPc: SPOKES[i].pc, quality: QUALITIES.maj };
    }
    return { index: i, ring: ring, base: MINOR_NAMES[i], name: MINOR_NAMES[i] + "m", rootPc: mod(SPOKES[i].pc - 3, 12), quality: QUALITIES.min };
  }

  function cluster(index) { return [mod(index - 1, 12), mod(index, 12), mod(index + 1, 12)]; }
  function isInCluster(index, anchor) { return anchor === null || cluster(anchor).indexOf(mod(index, 12)) >= 0; }

  function home(anchor, anchorRing, selected) {
    return anchor === null ? selected : positionAt(anchor, anchorRing || "major");
  }

  function circleNumeral(index, ring, tonic) {
    var offset = cluster(tonic.index).indexOf(mod(index, 12));
    if (offset < 0) return null;
    if (tonic.ring === "major") {
      return ring === "major" ? ["IV", "I", "V"][offset] : ["ii", "vi", "iii"][offset];
    }
    return ring === "major" ? ["♭VI", "♭III", "♭VII"][offset] : ["iv", "i", "v"][offset];
  }

  function keySignature(sharps) {
    if (sharps === 0) return "no sharps or flats";
    return Math.abs(sharps) + (sharps > 0 ? "♯" : "♭");
  }

  /* ---------- Playback (Web Audio, a plucked-string-ish tone) ---------- */

  var ctx = null, master = null, timers = [];

  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function pluck(freq, when, dur) {
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    var g = ctx.createGain(), f = ctx.createBiquadFilter(), g2 = ctx.createGain();
    o1.type = "triangle"; o2.type = "sawtooth";
    o1.frequency.value = freq; o2.frequency.value = freq;
    g2.gain.value = 0.18;
    f.type = "lowpass";
    f.frequency.setValueAtTime(3200, when);
    f.frequency.exponentialRampToValueAtTime(700, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.5, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o1.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(f); f.connect(master);
    o1.start(when); o2.start(when);
    o1.stop(when + dur + 0.05); o2.stop(when + dur + 0.05);
  }

  /* Sound a chord: root in the C3-B3 octave, the rest stacked above it, lightly strummed. */
  function playChord(rootPc, quality) {
    var c = audio();
    if (!c) return;
    var t = c.currentTime + 0.02;
    quality.pcs.forEach(function (iv, i) {
      var midi = 48 + mod(rootPc, 12) + iv + (i === 0 ? 0 : 0);
      pluck(440 * Math.pow(2, (midi - 69) / 12), t + i * 0.028, 1.9);
    });
  }

  function stopAll() {
    timers.forEach(clearTimeout);
    timers = [];
    if (ctx) {
      try { master.disconnect(); } catch (e) { /* already disconnected */ }
      master = ctx.createGain();
      master.gain.value = 0.32;
      var comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
    }
  }

  function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }

  /* ---------- Progression strip (shared by both pages) ---------- */

  var STEP_MS = 1500, MAX_CHORDS = 8;

  function Progression(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.items = [];
    this.playing = false;
    this.render();
  }

  Progression.prototype.canAdd = function () { return this.items.length < MAX_CHORDS; };

  Progression.prototype.add = function (chord) {
    if (!this.canAdd()) return false;
    this.items.push(chord);
    this.render();
    if (this.opts.onChange) this.opts.onChange(this);
    return true;
  };

  Progression.prototype.clear = function () {
    this.stop();
    this.items = [];
    this.render();
    if (this.opts.onChange) this.opts.onChange(this);
  };

  Progression.prototype.stop = function (soft) {
    this.playing = false;
    if (!soft) stopAll();
    this.root.querySelectorAll(".prog-chip.now").forEach(function (n) { n.classList.remove("now"); });
    var b = this.root.querySelector(".prog-play");
    if (b) b.textContent = "Play";
  };

  Progression.prototype.play = function () {
    var self = this;
    if (!this.items.length) return;
    this.playing = true;
    var chips = this.root.querySelectorAll(".prog-chip");
    this.root.querySelector(".prog-play").textContent = "Stop";
    this.items.forEach(function (c, i) {
      later(function () {
        chips.forEach(function (n) { n.classList.remove("now"); });
        if (chips[i]) chips[i].classList.add("now");
        playChord(c.rootPc, c.quality);
      }, i * STEP_MS);
    });
    later(function () { self.stop(true); }, this.items.length * STEP_MS);
  };

  Progression.prototype.render = function () {
    var self = this, r = this.root;
    r.innerHTML = "";
    var head = document.createElement("div");
    head.className = "prog-head";
    head.innerHTML = '<span class="prog-label">PROGRESSION</span>';
    var btns = document.createElement("span");
    btns.className = "prog-btns";
    var play = document.createElement("button");
    play.type = "button"; play.className = "tool-btn prog-play"; play.textContent = "Play";
    play.disabled = !this.items.length;
    play.addEventListener("click", function () { if (self.playing) self.stop(); else self.play(); });
    var clear = document.createElement("button");
    clear.type = "button"; clear.className = "tool-btn ghost"; clear.textContent = "Clear";
    clear.disabled = !this.items.length;
    clear.addEventListener("click", function () { self.clear(); });
    btns.appendChild(play); btns.appendChild(clear);
    head.appendChild(btns);
    r.appendChild(head);

    var strip = document.createElement("div");
    strip.className = "prog-strip";
    if (!this.items.length) {
      var empty = document.createElement("p");
      empty.className = "prog-empty";
      empty.textContent = "Add chords with “+ Add” to build a progression, then press Play.";
      strip.appendChild(empty);
    }
    this.items.forEach(function (c, i) {
      var chip = document.createElement("span");
      chip.className = "prog-chip";
      chip.innerHTML = '<span class="prog-num"></span><span class="prog-name"></span>';
      chip.querySelector(".prog-num").textContent = c.numeral || "";
      chip.querySelector(".prog-name").textContent = c.name;
      var x = document.createElement("button");
      x.type = "button"; x.className = "prog-x"; x.setAttribute("aria-label", "Remove chord"); x.textContent = "×";
      x.addEventListener("click", function () {
        self.stop();
        self.items.splice(i, 1);
        self.render();
        if (self.opts.onChange) self.opts.onChange(self);
      });
      chip.appendChild(x);
      strip.appendChild(chip);
    });
    r.appendChild(strip);
  };

  window.KM = {
    mod: mod, QUALITIES: QUALITIES, MODES: MODES, FREE_MODES: FREE_MODES,
    KEYS_ALL: KEYS_ALL, KEYS_MINOR: KEYS_MINOR, keyForMode: keyForMode, keyChords: keyChords,
    keyToneName: keyToneName, SPOKES: SPOKES, MINOR_NAMES: MINOR_NAMES, positionAt: positionAt,
    cluster: cluster, isInCluster: isInCluster, home: home, circleNumeral: circleNumeral,
    keySignature: keySignature, playChord: playChord, stopAll: stopAll, Progression: Progression,
    MAX_CHORDS: MAX_CHORDS
  };
})();
