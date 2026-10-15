/* Mandolin chord finder: filtering, and the alternative voicings.
 *
 * The primary shape of every chord is already in the HTML (see
 * tools/build_mandolin_page.py -- it is pre-rendered so crawlers index it).
 * This file only handles interaction, and draws the 2nd-4th shapes on demand
 * from the JSON blob at the bottom of the page.
 *
 * The SVG geometry below mirrors diagram_svg() in that script. Two
 * implementations of one drawing is a real duplication, but the alternative is
 * shipping 240 inline diagrams up front -- about four times the page weight for
 * shapes most visitors never open.
 */
(function () {
    'use strict';

    var dataEl = document.getElementById('chord-data');
    if (!dataEl) return;

    var DATA = JSON.parse(dataEl.textContent);
    var BY_SYMBOL = {};
    DATA.chords.forEach(function (c) { BY_SYMBOL[c.symbol] = c; });

    var STRINGS = ['G', 'D', 'A', 'E'];
    var VISIBLE = 5;
    var NS = 'http://www.w3.org/2000/svg';

    function el(name, attrs, text) {
        var n = document.createElementNS(NS, name);
        for (var k in attrs) n.setAttribute(k, attrs[k]);
        if (text != null) n.textContent = text;
        return n;
    }

    function diagram(v) {
        var w = 108, h = 136, left = 18, top = 26, spanW = 72, spanH = 86;
        var dx = spanW / 3, dy = spanH / VISIBLE, start = v.startFret;

        var svg = el('svg', {
            'class': 'dia', viewBox: '0 0 ' + w + ' ' + h,
            role: 'img', 'aria-hidden': 'true'
        });

        if (start === 1) {
            svg.appendChild(el('rect', {
                'class': 'nut', x: left, y: top - 3.4, width: spanW, height: 3.4
            }));
        } else {
            svg.appendChild(el('text', {
                'class': 'pos', x: left - 6, y: (top + dy * 0.72).toFixed(1)
            }, start + 'fr'));
        }

        for (var i = 0; i <= VISIBLE; i++) {
            var y = top + dy * i;
            svg.appendChild(el('line', {
                'class': 'fret', x1: left, y1: y.toFixed(1),
                x2: left + spanW, y2: y.toFixed(1)
            }));
        }
        for (var s = 0; s < 4; s++) {
            var x = left + dx * s;
            svg.appendChild(el('line', {
                'class': 'str', x1: x.toFixed(1), y1: top,
                x2: x.toFixed(1), y2: top + spanH
            }));
        }

        (v.barres || []).forEach(function (b) {
            var row = b.fret - start;
            if (row < 0 || row >= VISIBLE) return;
            var by = top + dy * (row + 0.5);
            var x1 = left + dx * b.from, x2 = left + dx * b.to;
            svg.appendChild(el('rect', {
                'class': 'barre', x: (x1 - 5.5).toFixed(1), y: (by - 5.5).toFixed(1),
                width: ((x2 - x1) + 11).toFixed(1), height: 11, rx: 5.5
            }));
        });

        v.frets.forEach(function (fret, idx) {
            var cx = left + dx * idx;
            if (fret < 0) {
                svg.appendChild(el('text', {
                    'class': 'mark', x: cx.toFixed(1), y: top - 8
                }, '×'));
            } else if (fret === 0) {
                svg.appendChild(el('circle', {
                    'class': 'open', cx: cx.toFixed(1), cy: top - 11, r: 4.1
                }));
            } else {
                var row = fret - start;
                if (row < 0 || row >= VISIBLE) return;
                var cy = top + dy * (row + 0.5);
                svg.appendChild(el('circle', {
                    'class': v.isRoot[idx] ? 'dot root' : 'dot',
                    cx: cx.toFixed(1), cy: cy.toFixed(1), r: 7.4
                }));
                if (v.fingers[idx] > 0) {
                    svg.appendChild(el('text', {
                        'class': v.isRoot[idx] ? 'fing on-root' : 'fing',
                        x: cx.toFixed(1), y: (cy + 3.6).toFixed(1)
                    }, v.fingers[idx]));
                }
            }
        });

        STRINGS.forEach(function (n, idx) {
            svg.appendChild(el('text', {
                'class': 'snam', x: (left + dx * idx).toFixed(1), y: h - 6
            }, n));
        });

        return svg;
    }

    function positionLabel(v) {
        return v.positionFret === 0 ? 'Open position' : 'Position ' + v.positionFret;
    }

    /* ---------- alternative voicings ---------- */

    document.getElementById('grid').addEventListener('click', function (ev) {
        var btn = ev.target.closest('.more');
        if (!btn) return;
        var card = btn.closest('.card');
        var box = card.querySelector('.alts');
        var open = btn.getAttribute('aria-expanded') === 'true';

        if (open) {
            box.hidden = true;
            card.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
            btn.textContent = 'More shapes (' + box.childElementCount + ')';
            return;
        }

        if (!box.childElementCount) {
            var chord = BY_SYMBOL[btn.dataset.sym];
            if (!chord) return;
            chord.voicings.slice(1).forEach(function (v) {
                var fig = document.createElement('figure');
                fig.appendChild(diagram(v));
                var cap = document.createElement('figcaption');
                cap.textContent = positionLabel(v);
                fig.appendChild(cap);
                box.appendChild(fig);
            });
        }
        box.hidden = false;
        card.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        btn.textContent = 'Hide shapes';
    });

    /* ---------- filtering ---------- */

    var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
    var search = document.getElementById('q');
    var countEl = document.getElementById('count');
    var noResult = document.getElementById('noresult');
    var filters = { root: '', quality: '' };

    function normalise(s) {
        // So "F#m7", "f♯m7" and "F sharp m7" all land on the same card.
        return s.toLowerCase()
            .replace(/♯/g, '#').replace(/♭/g, 'b')
            .replace(/\s*sharp/g, '#').replace(/\s*flat/g, 'b')
            .replace(/\s+/g, '');
    }

    /* Tokens are pipe-delimited and tested whole. Concatenating them first
       made "Bb" match the B card, because "b|b|major|b" collapses to
       "bbmajorb". */
    function matches(haystack, q) {
        var tokens = haystack.split('|');
        // A single letter anchors to the START of a token. Substring-matching
        // one character is useless noise: "B" hit C# (through its D-flat
        // alias) and "A" hit everything (through the word "major"). From two
        // characters up, substring is what people expect -- "m7" has to find
        // Am7, and "bb" has to find B-flat.
        var anchored = q.length === 1;
        for (var i = 0; i < tokens.length; i++) {
            var t = normalise(tokens[i]);
            if (anchored ? t.indexOf(q) === 0 : t.indexOf(q) !== -1) return true;
        }
        return false;
    }

    function apply() {
        var q = normalise(search.value);
        var shown = 0;
        cards.forEach(function (card) {
            var ok =
                (!filters.root || card.dataset.root === filters.root) &&
                (!filters.quality || card.dataset.quality === filters.quality) &&
                (!q || matches(card.dataset.search, q));
            card.hidden = !ok;
            if (ok) shown++;
        });
        countEl.textContent = shown === cards.length
            ? cards.length + ' chords'
            : shown + ' of ' + cards.length + ' chords';
        noResult.hidden = shown !== 0;
    }

    document.querySelectorAll('.chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
            var kind = chip.dataset.filter;
            filters[kind] = chip.dataset.value;
            document.querySelectorAll('.chip[data-filter="' + kind + '"]')
                .forEach(function (c) { c.classList.toggle('on', c === chip); });
            apply();
        });
    });

    search.addEventListener('input', apply);
    apply();
}());
