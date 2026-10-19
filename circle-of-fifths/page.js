(function () {
  "use strict";
  var K = window.KM;
  var NS = "http://www.w3.org/2000/svg";
  var CX = 200, CY = 200;
  var R_OUT = 190, R_MID = 122, R_IN = 68;

  var state = { sel: K.positionAt(0, "major"), anchor: null, anchorRing: null };
  var wheel = document.getElementById("wheel");
  var noteEl = document.getElementById("note");
  var prog = new K.Progression(document.getElementById("prog"), { onChange: onProgChange });
  var wedges = {};

  function pt(r, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  }

  function wedgePath(rOuter, rInner, centerDeg) {
    var a0 = centerDeg - 15, a1 = centerDeg + 15;
    var p1 = pt(rOuter, a0), p2 = pt(rOuter, a1), p3 = pt(rInner, a1), p4 = pt(rInner, a0);
    return "M" + p1 + " A" + rOuter + "," + rOuter + " 0 0 1 " + p2 +
           " L" + p3 + " A" + rInner + "," + rInner + " 0 0 0 " + p4 + " Z";
  }

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function buildWheel() {
    for (var i = 0; i < 12; i++) {
      ["major", "minor"].forEach(function (ring) {
        var pos = K.positionAt(i, ring);
        var deg = i * 30;
        var rO = ring === "major" ? R_OUT : R_MID, rI = ring === "major" ? R_MID : R_IN;
        var g = el("g", { "class": "cof-wedge " + ring, tabindex: 0, role: "button",
                          "aria-label": pos.name + (ring === "major" ? " major" : " minor") }, wheel);
        el("path", { d: wedgePath(rO, rI, deg) }, g);
        var mid = pt((rO + rI) / 2, deg);
        var t = el("text", { x: mid[0], y: mid[1] + (ring === "major" ? 1 : 1), "class": "nm",
                             "font-size": ring === "major" ? 21 : 16, "dominant-baseline": "middle" }, g);
        t.textContent = pos.name;
        var rn = el("text", { x: mid[0], y: mid[1] + (ring === "major" ? 16 : 13), "class": "rn" }, g);
        g.addEventListener("click", function () { tap(pos.index, ring); });
        g.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(pos.index, ring); }
        });
        wedges[ring + pos.index] = { g: g, rn: rn, nm: t };
      });
    }
    el("circle", { cx: CX, cy: CY, r: R_IN - 4, fill: "#fff", stroke: "#B8B8B8" }, wheel);
    wheel._name = el("text", { x: CX, y: CY + 2, "class": "cof-center-name" }, wheel);
    wheel._sub = el("text", { x: CX, y: CY + 22, "class": "cof-center-sub" }, wheel);
  }

  function tap(index, ring) {
    if (!K.isInCluster(index, state.anchor)) {
      noteEl.textContent = "Staying in " + homeName() + ". Clear to change key.";
      return;
    }
    noteEl.textContent = "";
    state.sel = K.positionAt(index, ring);
    K.playChord(state.sel.rootPc, state.sel.quality);
    render();
  }

  function homePos() { return K.home(state.anchor, state.anchorRing, state.sel); }

  function homeName() {
    var h = homePos();
    return h.base + (h.ring === "major" ? " major" : " minor");
  }

  function numeralFor(pos) {
    var n = K.circleNumeral(pos.index, pos.ring, homePos());
    return n;
  }

  function render() {
    var home = homePos();
    for (var i = 0; i < 12; i++) {
      ["major", "minor"].forEach(function (ring) {
        var w = wedges[ring + i];
        var inCluster = K.isInCluster(i, state.anchor);
        var isSel = state.sel.index === i && state.sel.ring === ring;
        var num = K.circleNumeral(i, ring, home);
        w.g.setAttribute("class", "cof-wedge " + ring + (isSel ? " sel" : "") +
          (num ? " in" : "") + (!inCluster ? " dim" : ""));
        w.g.setAttribute("aria-disabled", inCluster ? "false" : "true");
        w.rn.textContent = num || "";
      });
    }
    var s = state.sel;
    var spoke = K.SPOKES[s.index];
    wheel._name.textContent = s.name;
    wheel._sub.textContent = K.keySignature(spoke.sharps);

    document.getElementById("title").textContent = s.base + (s.ring === "major" ? " major" : " minor");
    var rel = s.ring === "major" ? "Relative minor: " + K.MINOR_NAMES[s.index] + "m"
                                 : "Relative major: " + spoke.name;
    document.getElementById("sig").textContent = "Key signature: " + K.keySignature(spoke.sharps) + " · " + rel;

    document.getElementById("sixLabel").textContent = "CHORDS IN " + home.base.toUpperCase() + (home.ring === "minor" ? " MINOR" : "");
    var six = document.getElementById("six");
    six.innerHTML = "";
    K.cluster(home.index).forEach(function (idx) {
      ["major", "minor"].forEach(function (ring) {
        var p = K.positionAt(idx, ring);
        var b = document.createElement("button");
        b.type = "button";
        b.innerHTML = '<span class="rn"></span><span class="cn"></span>';
        b.querySelector(".rn").textContent = K.circleNumeral(idx, ring, home) || "";
        b.querySelector(".cn").textContent = p.name;
        b.addEventListener("click", function () { tap(idx, ring); });
        six.appendChild(b);
      });
    });
    updateAdd();
  }

  function updateAdd() {
    var b = document.getElementById("addBtn");
    b.disabled = !prog.canAdd();
    b.textContent = prog.canAdd() ? "+ Add" : "Full";
  }

  function onProgChange(p) {
    if (!p.items.length) { state.anchor = null; state.anchorRing = null; noteEl.textContent = ""; }
    render();
  }

  document.getElementById("addBtn").addEventListener("click", function () {
    var s = state.sel;
    if (state.anchor === null) { state.anchor = s.index; state.anchorRing = s.ring; }
    var h = K.home(state.anchor, state.anchorRing, s);
    prog.add({
      name: s.name, rootPc: s.rootPc, quality: s.quality,
      numeral: K.circleNumeral(s.index, s.ring, h) || ""
    });
    render();
  });

  buildWheel();
  render();
})();
