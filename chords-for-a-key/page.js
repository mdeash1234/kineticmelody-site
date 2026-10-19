(function () {
  "use strict";
  var K = window.KM;
  var PLAY = "https://play.google.com/store/apps/details?id=com.kineticmelody.chordseek";

  var state = { pc: 0, mode: K.MODES[0], sevenths: false, selected: null };
  var prog = new K.Progression(document.getElementById("prog"));

  var keysEl = document.getElementById("keys");
  var modesEl = document.getElementById("modes");
  var chordsEl = document.getElementById("chords");
  var noteEl = document.getElementById("note");

  function currentKey() { return K.keyForMode(state.pc, state.mode); }

  function renderKeys() {
    keysEl.innerHTML = "";
    for (var pc = 0; pc < 12; pc++) {
      (function (pc) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (pc === state.pc ? " on" : "");
        b.textContent = K.keyForMode(pc, state.mode).name;
        b.addEventListener("click", function () { state.pc = pc; state.selected = null; render(); });
        keysEl.appendChild(b);
      })(pc);
    }
  }

  function renderModes() {
    modesEl.innerHTML = "";
    K.MODES.forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (m === state.mode ? " on" : "") + (m.free ? "" : " locked");
      b.textContent = m.name;
      b.addEventListener("click", function () {
        if (!m.free) {
          noteEl.innerHTML = m.name + " is part of ChordSeek Pro. " +
            '<a href="' + PLAY + '" target="_blank" rel="noopener">Get ChordSeek on Google Play</a>';
          return;
        }
        noteEl.textContent = "";
        state.mode = m; state.selected = null; render();
      });
      modesEl.appendChild(b);
    });
    document.getElementById("modeDesc").textContent = state.mode.desc;
  }

  function isLocked(c) { return c.quality.premium; }

  function renderChords() {
    var k = currentKey();
    var chords = K.keyChords(k, state.mode, state.sevenths);
    document.getElementById("heading").textContent = ("CHORDS IN " + k.name + " " + state.mode.name).toUpperCase();
    chordsEl.innerHTML = "";
    chords.forEach(function (c, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "kc" + (i === 0 ? " tonic" : "") + (isLocked(c) ? " locked" : "") +
        (state.selected === i ? " sel" : "");
      b.innerHTML = '<span class="num"></span><span class="nm"></span>';
      b.querySelector(".num").textContent = c.numeral;
      b.querySelector(".nm").textContent = c.name;
      b.setAttribute("aria-label", c.numeral + " " + c.name + (isLocked(c) ? " (ChordSeek Pro)" : ""));
      b.addEventListener("click", function () { choose(i, chords); });
      chordsEl.appendChild(b);
    });
    state.chords = chords;
    updateActions();
  }

  function choose(i, chords) {
    var c = chords[i];
    if (isLocked(c)) {
      noteEl.innerHTML = c.name + " is a ChordSeek Pro chord. " +
        '<a href="' + PLAY + '" target="_blank" rel="noopener">Get ChordSeek on Google Play</a>';
      return;
    }
    noteEl.textContent = "";
    state.selected = i;
    K.playChord(c.rootPc, c.quality);
    renderChords();
  }

  function updateActions() {
    var c = state.selected === null ? null : state.chords[state.selected];
    document.getElementById("selected").textContent =
      c ? "Selected: " + c.numeral + " — " + c.name : "Tap a chord to hear it.";
    document.getElementById("replay").disabled = !c;
    document.getElementById("addBtn").disabled = !c || !prog.canAdd();
    document.getElementById("addBtn").textContent = prog.canAdd() ? "+ Add" : "Full";
  }

  function render() { renderKeys(); renderModes(); renderChords(); }

  document.getElementById("triads").addEventListener("click", function () {
    state.sevenths = false; this.classList.add("on"); document.getElementById("sevenths").classList.remove("on");
    state.selected = null; renderChords();
  });
  document.getElementById("sevenths").addEventListener("click", function () {
    state.sevenths = true; this.classList.add("on"); document.getElementById("triads").classList.remove("on");
    state.selected = null; renderChords();
  });
  document.getElementById("replay").addEventListener("click", function () {
    var c = state.chords[state.selected]; if (c) K.playChord(c.rootPc, c.quality);
  });
  document.getElementById("addBtn").addEventListener("click", function () {
    var c = state.chords[state.selected];
    if (c) { prog.add(c); updateActions(); }
  });
  prog.opts.onChange = updateActions;

  render();
})();
