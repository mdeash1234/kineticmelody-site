"""Generate mandolin-chords/index.html from the chord data exported by the app.

Why pre-render instead of fetching the JSON in the browser: the entire point of
this page is organic search. A JS-only tool gives a crawler an empty shell, and
while Google does execute JS it indexes static markup faster and more reliably.
So every chord name and its primary shape ships as HTML, and JavaScript only
adds filtering and the alternative voicings.

Source of truth is data/mando-chords.json, written by WebChordExportTest in the
MandoChords repo using the app's own VoicingEngine. Never hand-edit either file.

Run: python tools/build_mandolin_page.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "mando-chords.json"
OUT = ROOT / "mandolin-chords" / "index.html"

SITE = "https://kineticmelody.org"
PAGE_URL = SITE + "/mandolin-chords/"
PLAY_URL = ("https://play.google.com/store/apps/details"
            "?id=com.kineticmelody.mandochords&utm_source=kineticmelody.org"
            "&utm_medium=web&utm_campaign=mandolin_chord_finder")

STRING_NAMES = ["G", "D", "A", "E"]
VISIBLE_FRETS = 5

# Searchers type "F#", the app renders "F♯". Keep both in the markup so the
# page matches either query without showing the ugly one.
ASCII = {"♯": "#", "♭": "b"}

# The app spells every black key as a sharp, but players say and search the
# flat at least as often -- "Bb" and "Eb" are the normal names in bluegrass
# keys. Each sharp root therefore carries its enharmonic twin as an alias, both
# for in-page search and for anyone arriving from a search engine.
FLAT_OF = {"C♯": "D♭", "D♯": "E♭", "F♯": "G♭", "G♯": "A♭", "A♯": "B♭"}


def ascii_name(s):
    for k, v in ASCII.items():
        s = s.replace(k, v)
    return s


def flat_symbol(root_name, suffix):
    """'A♯m7' -> 'B♭m7', or None for a natural root."""
    flat = FLAT_OF.get(root_name)
    return None if flat is None else flat + suffix


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def diagram_svg(v, idx_class=""):
    """One chord grid as inline SVG. Courses low-to-high, left to right."""
    w, h = 108, 136
    left, top = 18, 26
    span_w, span_h = 72, 86
    dx = span_w / 3.0
    dy = span_h / float(VISIBLE_FRETS)
    start = v["startFret"]
    parts = [
        '<svg class="dia %s" viewBox="0 0 %d %d" role="img" aria-hidden="true" '
        'xmlns="http://www.w3.org/2000/svg">' % (idx_class, w, h)
    ]

    # nut or position marker
    if start == 1:
        parts.append('<rect class="nut" x="%.1f" y="%.1f" width="%.1f" height="3.4"/>'
                     % (left, top - 3.4, span_w))
    else:
        parts.append('<text class="pos" x="%.1f" y="%.1f">%dfr</text>'
                     % (left - 6, top + dy * 0.72, start))

    for i in range(VISIBLE_FRETS + 1):
        y = top + dy * i
        parts.append('<line class="fret" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>'
                     % (left, y, left + span_w, y))
    for s in range(4):
        x = left + dx * s
        parts.append('<line class="str" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>'
                     % (x, top, x, top + span_h))

    for b in v.get("barres", []):
        row = b["fret"] - start
        if not (0 <= row < VISIBLE_FRETS):
            continue
        y = top + dy * (row + 0.5)
        x1 = left + dx * b["from"]
        x2 = left + dx * b["to"]
        parts.append('<rect class="barre" x="%.1f" y="%.1f" width="%.1f" height="11" rx="5.5"/>'
                     % (x1 - 5.5, y - 5.5, (x2 - x1) + 11))

    for s, fret in enumerate(v["frets"]):
        x = left + dx * s
        if fret < 0:
            parts.append('<text class="mark" x="%.1f" y="%.1f">×</text>' % (x, top - 8))
        elif fret == 0:
            parts.append('<circle class="open" cx="%.1f" cy="%.1f" r="4.1"/>' % (x, top - 11))
        else:
            row = fret - start
            if not (0 <= row < VISIBLE_FRETS):
                continue
            y = top + dy * (row + 0.5)
            cls = "dot root" if v["isRoot"][s] else "dot"
            parts.append('<circle class="%s" cx="%.1f" cy="%.1f" r="7.4"/>' % (cls, x, y))
            f = v["fingers"][s]
            if f > 0:
                parts.append('<text class="fing" x="%.1f" y="%.1f">%d</text>' % (x, y + 3.6, f))

    for s, n in enumerate(STRING_NAMES):
        parts.append('<text class="snam" x="%.1f" y="%d">%s</text>'
                     % (left + dx * s, h - 6, n))

    parts.append("</svg>")
    return "".join(parts)


def position_label(v):
    p = v["positionFret"]
    return "Open position" if p == 0 else "Position %d" % p


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    chords = data["chords"]
    locked = data["lockedQualities"]

    qualities = []
    for c in chords:
        if c["quality"] not in [q[0] for q in qualities]:
            qualities.append((c["quality"], c["qualityName"], c["suffix"]))
    roots = []
    for c in chords:
        if c["rootName"] not in roots:
            roots.append(c["rootName"])

    cards = []
    for c in chords:
        sym = c["symbol"]
        flat = flat_symbol(c["rootName"], c["suffix"])
        v0 = c["voicings"][0]
        notes = " · ".join(n for n in v0["notes"] if n)

        # Pipe-delimited so the matcher can test whole tokens. Joining with
        # spaces and then stripping them (an earlier version) glued tokens
        # together: B's "b b major b" became "bbmajorb", so searching "Bb"
        # matched B instead of B-flat.
        tokens = [sym, ascii_name(sym), c["qualityName"], c["rootName"]]
        if flat:
            tokens += [flat, ascii_name(flat)]
        subtitle = (esc(c["qualityName"]) if not flat
                    else "%s &middot; %s" % (esc(c["qualityName"]), esc(flat)))

        cards.append(
            '<article class="card" id="%s" data-root="%s" data-quality="%s" '
            'data-search="%s">'
            '<h3>%s<small>%s</small></h3>'
            '%s'
            '<p class="meta">%s</p>'
            '<p class="notes">%s</p>'
            '<button class="more" type="button" data-sym="%s" aria-expanded="false">'
            'More shapes (%d)</button>'
            '<div class="alts" hidden></div>'
            '</article>'
            % (esc(ascii_name(sym).replace("#", "sharp")),
               esc(c["rootName"]), esc(c["quality"]),
               esc("|".join(t.lower() for t in tokens)),
               esc(sym), subtitle,
               diagram_svg(v0),
               esc(position_label(v0)),
               esc(notes),
               esc(sym), len(c["voicings"]) - 1)
        )

    root_btns = "".join(
        '<button type="button" class="chip" data-filter="root" data-value="%s">%s</button>'
        % (esc(r), esc(r)) for r in roots)
    qual_btns = "".join(
        '<button type="button" class="chip" data-filter="quality" data-value="%s">%s</button>'
        % (esc(q), esc(name)) for q, name, _ in qualities)
    locked_list = ", ".join(esc(q["qualityName"]) for q in locked)

    faq = [
        ("How is a mandolin tuned?",
         "Standard mandolin tuning is G&ndash;D&ndash;A&ndash;E, low to high, in fifths. "
         "Each of the four courses is a pair of strings tuned in unison, which is why a "
         "mandolin has eight strings but only four notes to fret."),
        ("How do I read these chord diagrams?",
         "Vertical lines are the four courses, G on the left and E on the right. Horizontal "
         "lines are frets. A numbered dot is a finger (1 is the index finger), a circle above "
         "the grid is an open course, and &times; means that course is not played. A number "
         "like &ldquo;5fr&rdquo; on the left tells you the grid starts at the fifth fret "
         "instead of the nut."),
        ("What is a chop chord?",
         "A chop chord is a closed, four&ndash;finger shape with no open courses, so it can "
         "slide up the neck to any root and it stops ringing the moment you release it. It is "
         "the percussive backbeat sound of bluegrass rhythm mandolin."),
        ("Are these the same shapes as the app?",
         "Yes. The diagrams on this page are generated directly from ChordSeek: Mandolin "
         "Chords, using the same voicing engine, so what you see here is exactly what the app "
         "shows."),
    ]
    faq_html = "".join(
        '<details class="faq"><summary>%s</summary><p>%s</p></details>' % (q, a)
        for q, a in faq)

    faq_ld = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer",
                                "text": a.replace("&ndash;", "-").replace("&times;", "x")
                                .replace("&ldquo;", '"').replace("&rdquo;", '"')}}
            for q, a in faq],
    }
    app_ld = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Mandolin Chord Finder",
        "url": PAGE_URL,
        "applicationCategory": "MusicApplication",
        "operatingSystem": "Any",
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        "publisher": {"@type": "Organization", "name": "Kinetic Melody", "url": SITE},
    }

    n_chords = len(chords)
    n_voicings = sum(len(c["voicings"]) for c in chords)

    html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mandolin Chord Finder &mdash; %(n)d Free Chord Charts (GDAE) | Kinetic Melody</title>
<meta name="description" content="Free interactive mandolin chord finder. %(n)d chords and %(v)d fingerings in standard GDAE tuning, with finger numbers, note names and chop shapes. No sign-up.">
<link rel="canonical" href="%(page)s">
<meta property="og:type" content="website">
<meta property="og:title" content="Mandolin Chord Finder &mdash; %(n)d Free Chord Charts">
<meta property="og:description" content="%(n)d mandolin chords, %(v)d fingerings, standard GDAE tuning. Free and interactive.">
<meta property="og:url" content="%(page)s">
<meta property="og:image" content="%(site)s/resources/chordseek_mandolin_banner.jpg">
<meta name="twitter:card" content="summary_large_image">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet">
<link rel="icon" type="image/png" href="../resources/favicon.png">
<link rel="stylesheet" href="../styles.css?v=5">
<link rel="stylesheet" href="chords.css?v=1">
<script type="application/ld+json">%(appld)s</script>
<script type="application/ld+json">%(faqld)s</script>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
  <div class="container">
    <a class="navbar-brand fw-bold" href="/">
      <img src="../resources/logo_mark.png" alt="Kinetic Melody"> Kinetic Melody
    </a>
    <div class="navbar-nav ms-auto">
      <a class="nav-link" href="/#apps">Apps</a>
      <a class="nav-link active" href="/mandolin-chords/">Mandolin Chords</a>
      <a class="nav-link" href="/privacy.html">Privacy</a>
    </div>
  </div>
</nav>

<main class="container cf-wrap">

  <header class="cf-head">
    <h1>Mandolin Chord Finder</h1>
    <p class="lead">
      %(n)d chords and %(v)d fingerings for the mandolin in standard
      <strong>G&ndash;D&ndash;A&ndash;E</strong> tuning &mdash; with finger numbers, note names,
      and the closed chop shapes bluegrass players use. Free, no sign-up.
    </p>
  </header>

  <section class="cf-controls" aria-label="Filter chords">
    <label class="cf-search">
      <span class="visually-hidden">Search chords</span>
      <input type="search" id="q" placeholder="Search a chord, e.g. Am, F#m7, Bb" autocomplete="off">
    </label>
    <div class="chips" role="group" aria-label="Filter by root">
      <button type="button" class="chip on" data-filter="root" data-value="">All roots</button>
      %(roots)s
    </div>
    <div class="chips" role="group" aria-label="Filter by chord type">
      <button type="button" class="chip on" data-filter="quality" data-value="">All types</button>
      %(quals)s
    </div>
    <p class="count" id="count" aria-live="polite"></p>
  </section>

  <section class="grid" id="grid">
    %(cards)s
  </section>

  <p class="noresult" id="noresult" hidden>No chord matches that. Try &ldquo;Am&rdquo; or &ldquo;G7&rdquo;.</p>

  <section class="cta">
    <img src="../resources/chordseek_mandolin_icon.png" alt="" width="72" height="72">
    <div>
      <h2>Want the rest of the chord book?</h2>
      <p>
        This page covers the five everyday chord types. The app adds
        %(nlocked)d more &mdash; %(locked)s &mdash; plus inversions up the neck, audio playback
        of every shape, chords by key, and jam tracks to play along with.
      </p>
      <a class="btn btn-primary btn-lg" href="%(play)s" rel="noopener">Get ChordSeek: Mandolin Chords</a>
      <p class="small">Android. Free to install.</p>
    </div>
  </section>

  <section class="faqs">
    <h2>Mandolin chord questions</h2>
    %(faq)s
  </section>

  <section class="also">
    <h2>More for mandolin players</h2>
    <ul>
      <li><a href="https://play.google.com/store/apps/details?id=com.kineticmelody.mandoseek&amp;utm_source=kineticmelody.org&amp;utm_medium=web&amp;utm_campaign=mandolin_chord_finder" rel="noopener">ScaleSeek: Mandolin Scales</a> &mdash; scale positions and FFcP exercises for the same GDAE tuning.</li>
      <li><a href="https://play.google.com/store/apps/details?id=com.kineticmelody.gtuner&amp;utm_source=kineticmelody.org&amp;utm_medium=web&amp;utm_campaign=mandolin_chord_finder" rel="noopener">Target Tuner</a> &mdash; tune a mandolin, or anything else, by ear or by meter.</li>
    </ul>
  </section>

</main>

<footer class="text-center py-4">
  <p class="small">&copy; Kinetic Melody &middot; <a href="/privacy.html">Privacy</a></p>
</footer>

<script id="chord-data" type="application/json">%(json)s</script>
<script src="chords.js?v=1"></script>
</body>
</html>
""" % {
        "n": n_chords,
        "v": n_voicings,
        "page": PAGE_URL,
        "site": SITE,
        "play": PLAY_URL,
        "roots": root_btns,
        "quals": qual_btns,
        "cards": "\n    ".join(cards),
        "faq": faq_html,
        "locked": locked_list,
        "nlocked": len(locked),
        "appld": json.dumps(app_ld),
        "faqld": json.dumps(faq_ld),
        "json": json.dumps(data, separators=(",", ":"), ensure_ascii=False),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print("wrote %s (%.0f KB, %d chords, %d voicings)"
          % (OUT, len(html.encode("utf-8")) / 1024, n_chords, n_voicings))


if __name__ == "__main__":
    main()
