---
title: Weight rack
headline: Designing and manufacturing a steel weight rack
categories: [Physical]
skills: [CAD, Fabrication]
showSkills: true
context: Personal build
year: 2021
# The CAD render on the tile, the finished object inside. The grid then shows the
# drawing and the panel pays it off with the real thing, rather than showing the
# same photo twice.
cover: /archive/weight-rack-cad-cropped.png
poster: /archive/weight-rack.jpg
images: []
order: 7
link:

# Panel sections. Fill in both on every project: they are the panel's writing,
# and it reads best when every project carries the same two. Set showOverview /
# showApproach to false to hide text you want to keep. See _template.md.
overview: |
  I designed and made a rack for the set of dumbbells I already owned, taking it
  from a sketch through to a finished, powder-coated object.

showOverview: true

approach: |
  My design focused on simplicity and utility. I believe designing with these
  values creates the most timeless products.

showApproach: true

# Four strands of the work. Sizing and CAD sit side by side; Manufacture carries a
# carousel so it takes the full row on its own, and Scale asks for the same
# treatment with `wide` because the nesting graphic is a wide one. See
# _template.md.
blocks:
  - title: Sizing
    text: |
      I measured the dumbbells and built the geometry around them, so each pair
      sits in a cradle cut to its own diameter. A slope of 5° holds the weights
      back against the rack rather than letting them roll forward.
    image: /archive/weight-rack-sizing.jpeg

  - title: CAD
    text: |
      Modelled in Fusion 360 as a flat profile, with the dumbbells brought in to
      check clearances and the stack height before anything was cut.
    image: /archive/weight-rack-cad-2.png

  # The carousel runs in build order: cut, fit up, tack, weld, grind, assemble,
  # coat. Every frame here is portrait (768x1024) on purpose — the carousel takes
  # each file at its own shape, so a landscape one mixed in makes the card jump
  # height as you page. That's why make-6 is sitting this one out.
  - title: Manufacture
    text: |
      The pattern was laser cut from 2mm steel sheet. The pipe connectors were tack
      welded first, so I could set the angle and check it against the weights
      before committing to a full weld.

      After grinding the welds back, deburring the edges and polishing the faces,
      the rack was powder coated black.
    images:
      [
        /archive/weight-rack-make-1.jpeg,
        /archive/weight-rack-make-2.jpeg,
        /archive/weight-rack-make-3a.jpeg,
        /archive/weight-rack-make-3.jpeg,
        /archive/weight-rack-make-4.jpeg,
        /archive/weight-rack-make-5.jpeg,
        /archive/weight-rack-make-7.jpeg,
        /archive/weight-rack-make-8.jpeg,
        /archive/weight-rack-make-9.jpeg,
        /archive/weight-rack-make-10.jpeg,
      ]

  - title: Scale
    wide: true
    text: |
      To understand what the rack would cost to make properly, I nested the parts
      onto a single sheet and costed every process against it, from cutting time
      through to the powder coat.

      At a material cost of £6.52 and a labour cost of £10.13, an RRP of £23.32
      leaves a 40% margin to cover overheads and profit.
    image: /archive/weight-rack-nesting.png
---
