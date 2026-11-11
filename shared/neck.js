/* Guitar drawings for the Online Tools pages: a horizontal neck (modes, CAGED) and a
   vertical chord box (CAGED). Standard tuning only. String 0 is the low E, string 5 the high e. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var TUNING = [4, 9, 2, 7, 11, 4];
  var LABELS = ["E", "A", "D", "G", "B", "e"];

  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  /* One neck, frets 0..frets. dots: [{ s, f, label, cls, ring, dim }].
     cls is a space-separated class list; ring is an optional second class for a dot that two
     shapes share, drawn as an outline around the first. */
  function drawNeck(svg, frets, dots) {
    var W = 860, left = 58, right = 12, top = 16, dy = 26;
    var cw = (W - left - right) / frets;
    var H = top + dy * 5 + 38;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = "";

    var yOf = function (s) { return top + (5 - s) * dy; };
    var xOf = function (f) { return f === 0 ? left - 22 : left + (f - 0.5) * cw; };

    [3, 5, 7, 9, 12].forEach(function (f) {
      if (f > frets) return;
      var x = left + (f - 0.5) * cw;
      if (f === 12) {
        svg.appendChild(el("circle", { "class": "nk-inlay", cx: x, cy: top + 1.5 * dy, r: 5 }));
        svg.appendChild(el("circle", { "class": "nk-inlay", cx: x, cy: top + 3.5 * dy, r: 5 }));
      } else {
        svg.appendChild(el("circle", { "class": "nk-inlay", cx: x, cy: top + 2.5 * dy, r: 5 }));
      }
    });

    svg.appendChild(el("rect", { "class": "nk-nut", x: left - 3, y: top - 3, width: 4, height: dy * 5 + 6 }));
    for (var f = 1; f <= frets; f++) {
      var x = left + f * cw;
      svg.appendChild(el("line", { "class": "nk-fret", x1: x, y1: top, x2: x, y2: top + dy * 5 }));
      svg.appendChild(el("text", { "class": "nk-num", x: left + (f - 0.5) * cw, y: top + dy * 5 + 22 }, f));
    }
    for (var s = 0; s < 6; s++) {
      svg.appendChild(el("line", { "class": "nk-string", x1: left, y1: yOf(s), x2: W - right, y2: yOf(s),
                                   "stroke-width": (1.9 - s * 0.24).toFixed(2) }));
      svg.appendChild(el("text", { "class": "nk-name", x: 6, y: yOf(s) + 4 }, LABELS[s]));
    }

    dots.forEach(function (d) {
      var g = el("g", { "class": "nk-dot " + d.cls + (d.dim ? " dim" : "") });
      if (d.ring) g.appendChild(el("circle", { "class": "nk-ring " + d.ring, cx: xOf(d.f), cy: yOf(d.s), r: 13.5 }));
      g.appendChild(el("circle", { cx: xOf(d.f), cy: yOf(d.s), r: 10 }));
      g.appendChild(el("text", { x: xOf(d.f), y: yOf(d.s) + 3.6 }, d.label));
      svg.appendChild(g);
    });
  }

  /* One chord box. frets: six absolute fret numbers, -1 for a muted string. */
  function drawBox(svg, frets, cls) {
    var left = 32, top = 30, dx = 17, dy = 20, rows = 4;
    var base = Math.min.apply(null, frets.filter(function (f) { return f > 0; }));
    var hasOpen = frets.some(function (f) { return f === 0; });
    var start = hasOpen || !isFinite(base) ? 1 : base;
    var w = left + dx * 5 + 18, h = top + dy * rows + 14;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.innerHTML = "";

    if (start === 1) svg.appendChild(el("rect", { "class": "nk-nut", x: left - 1, y: top - 3, width: dx * 5 + 2, height: 3.5 }));
    else svg.appendChild(el("text", { "class": "nk-pos", x: 1, y: top + dy * 0.62 }, start + "fr"));

    for (var r = 0; r <= rows; r++) {
      svg.appendChild(el("line", { "class": "nk-fret", x1: left, y1: top + dy * r, x2: left + dx * 5, y2: top + dy * r }));
    }
    for (var s = 0; s < 6; s++) {
      svg.appendChild(el("line", { "class": "nk-string", x1: left + dx * s, y1: top, x2: left + dx * s, y2: top + dy * rows }));
      var f = frets[s], x = left + dx * s;
      if (f < 0) svg.appendChild(el("text", { "class": "nk-mute", x: x, y: top - 9 }, "×"));
      else if (f === 0) svg.appendChild(el("circle", { "class": "nk-open", cx: x, cy: top - 11, r: 4 }));
      else {
        svg.appendChild(el("circle", { "class": "nk-pip " + cls, cx: x, cy: top + dy * (f - start + 0.5), r: 6.6 }));
      }
    }
  }

  window.KM = window.KM || {};
  window.KM.neck = { TUNING: TUNING, drawNeck: drawNeck, drawBox: drawBox };
})();
