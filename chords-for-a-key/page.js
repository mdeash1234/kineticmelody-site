(function () {
  "use strict";
  var K = window.KM;
  var state = { pc: 0, mode: K.MODES[0], sevenths: false };

  var keysEl = document.getElementById("keys");
  var modesEl = document.getElementById("modes");
  var chordsEl = document.getElementById("chords");

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
    document.getElementById("modeDesc").textContent = state.mode.desc;
  }

  function renderChords() {
    var k = K.keyForMode(state.pc, state.mode);
    document.getElementById("heading").textContent = ("CHORDS IN " + k.name + " " + state.mode.name).toUpperCase();
    chordsEl.innerHTML = "";
    K.keyChords(k, state.mode, state.sevenths).forEach(function (c, i) {
      var d = document.createElement("div");
      d.className = "kc" + (i === 0 ? " tonic" : "");
      d.innerHTML = '<span class="num"></span><span class="nm"></span>';
      d.querySelector(".num").textContent = c.numeral;
      d.querySelector(".nm").textContent = c.name;
      chordsEl.appendChild(d);
    });
  }

  function render() { renderKeys(); renderModes(); renderChords(); }

  function setSevenths(on) {
    state.sevenths = on;
    document.getElementById("triads").classList.toggle("on", !on);
    document.getElementById("sevenths").classList.toggle("on", on);
    renderChords();
  }
  document.getElementById("triads").addEventListener("click", function () { setSevenths(false); });
  document.getElementById("sevenths").addEventListener("click", function () { setSevenths(true); });

  render();
})();
