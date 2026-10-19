/* Music theory shared by the Online Tools pages.
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

  var MODES = [
    { name: "Ionian",     intervals: [0, 2, 4, 5, 7, 9, 11], desc: "The major scale. Bright and resolved." },
    { name: "Dorian",     intervals: [0, 2, 3, 5, 7, 9, 10], desc: "Minor with a raised 6th. Soulful, a little jazzy." },
    { name: "Phrygian",   intervals: [0, 1, 3, 5, 7, 8, 10], desc: "Minor with a ♭2. Dark, with a Spanish edge." },
    { name: "Lydian",     intervals: [0, 2, 4, 6, 7, 9, 11], desc: "Major with a ♯4. Dreamy and floating." },
    { name: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10], desc: "Major with a ♭7. Bluesy, classic rock." },
    { name: "Aeolian",    intervals: [0, 2, 3, 5, 7, 8, 10], desc: "The natural minor. Melancholy and open." },
    { name: "Locrian",    intervals: [0, 1, 3, 5, 6, 8, 10], desc: "Diminished tonic. Tense and unstable." }
  ];
  MODES.forEach(function (m) { m.isMinor = m.intervals[2] === 3; });
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

  window.KM = {
    mod: mod, QUALITIES: QUALITIES, MODES: MODES,
    KEYS_ALL: KEYS_ALL, KEYS_MINOR: KEYS_MINOR, keyForMode: keyForMode, keyChords: keyChords,
    keyToneName: keyToneName, SPOKES: SPOKES, MINOR_NAMES: MINOR_NAMES, positionAt: positionAt,
    cluster: cluster, circleNumeral: circleNumeral, keySignature: keySignature
  };
})();
