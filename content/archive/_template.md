---
title: Project name
headline: A short descriptive line
categories: [Design Research]   # any of: UX, Design Research, Service, Physical, Video — leave [] to show only under "All"
skills: [User Research, Prototyping]   # colour-coded automatically by area (see lib/archive.ts)
showSkills: true                # set false to hide the skill pills on lighter projects
context: Personal project       # one short credibility line
year: 2023
cover: /archive/your-image.jpg  # drop the file in /public/archive/ (blank = placeholder tile)
poster:                         # optional tall hero image; on a big screen it sits BESIDE the copy
                                # (and widens the panel to make room). Leave blank for a normal panel.

# Optional clip below the copy (blank = no video). Either a file you host
# yourself, /archive/your-clip.mp4 (H.264 mp4, keep it under ~10MB, poster comes
# from the cover), or a YouTube link/id, https://youtu.be/dQw4w9WgXcQ. Anything
# long or heavy should be YouTube: GitHub Pages refuses files over 100MB and
# serves what you commit at one fixed quality.
video: /archive/your-clip.mp4
images: []                      # optional gallery you page through, e.g. [/archive/x-1.jpg, /archive/x-2.jpg]
                                # keep every frame the same shape or the carousel jumps height as you page
illustrations: []               # optional row of artwork above the copy; hovering one frame expands it
order: 99                       # lower shows first
link:                           # optional external URL

# Labelled sections in the panel. Leave a field out (or blank) and it doesn't
# show at all; keep the text but set its show flag to false to hide it without
# deleting it. The `|` lets you write across several lines; a blank line inside
# starts a new paragraph.
overview: |
  What the project was and why it mattered.
showOverview: true

approach: |
  How you went about it.
showApproach: true

# Two optional static blocks, shown under the copy. Both need a heading AND at
# least one entry, so leaving them out (or deleting the entries) removes the
# block entirely. `process` is a numbered row of steps across a ruled line, for
# describing a sequence; `methods` is a grid of small cards, for a list of
# things. Keep each `text` to a sentence or two.
processHeading: From question to handover
process:
  - title: Framing
    text: One sentence on what this step involves.
  - title: Handover
    text: Another sentence.

methodsHeading: Methods I use
methods:
  - title: 1:1 interviews
    text: One or two sentences on how you use it.
---

Narrative, one or two tight paragraphs. Keep it human and short. This sits
above the sections above, unlabelled. Leave it blank if the sections say it all.
