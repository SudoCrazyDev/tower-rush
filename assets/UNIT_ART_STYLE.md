# Unit art style (board units)

Every new unit's board art (still, idle and attack clips, sprite sheets) must match the units
already in the game. Check a new unit against the references below before it is uploaded.
v2.8's Orcs broke these rules twice: first drawn full body (tiny on the board), then cut edge
to edge (Grunt looked like a square tile).

**References:** `assets/units/witch_doctor.png`, `ember_witch.png`, `frost_sorceress.png`,
`fox_samurai.png`, `moon_oracle.png`, `monkey_king.png`, `ogre_chef.png`, `hooded_archer.png`,
`bear_rider.png` (riders and mounts), and their idle sheets in `assets/sprites/units/`.

## Look

- **Chibi.** The head is big, about 40-50% of the character's height, with large expressive eyes.
- **Bust framing.** Show head to waist or hips. No legs and no feet. Mounts show the head and
  chest of the beast with the rider on top, like Bear Rider.
- **3/4 front view**, centred, facing the viewer.
- **Thick dark navy outlines** with flat cel shading and one highlight tone. Saturated colours
  that fit the unit's element.
- **One prop** (weapon, staff, lantern, instrument) held close to the body. It may poke a little
  past one side or the top, never more.

## Silhouette and fill (the part that went wrong)

Measured on the 256px frames of the reference units:

- **Egg- or badge-shaped silhouette.** The body tapers to a rounded bottom (robe, belly, fur,
  or a cloud). Shoulders and arms stay inside the frame; they are never cut flat by the edges.
- **Side margins:** the outer 12px on the left and right are empty (0-5% opaque). The only
  exception is a prop tip.
- **Bottom:** the character reaches the bottom edge only in a narrow rounded stretch (at most
  about 10-20% of the bottom 12px band is opaque), never across the whole width.
- **Height:** the bounding box runs from about 10-25px below the top to the bottom edge.
  Width is about 80-90% of the frame.
- If shoulders, arms or a belt reach both side edges, the unit reads as a square tile. Redo it.

## Animation (Seedance clips)

- **Locked camera.** The character never zooms, grows, shrinks or drifts in the frame. Say so
  in the prompt ("static camera, character stays the same size and position").
- **Idle:** small breathing or bobbing, and the prop sways.
- **Attack:** a short motion that stays inside the frame. The prop may leave the frame for a
  frame or two at most.
- **Background:** flat magenta `#FF00FF` for green-skinned or green-themed units, flat green
  otherwise, so the key colour never touches the character.

## Sheets

`tospritesheet.py` crops each clip to the union box of all frames and scales it to fill the frame,
so even a well-framed still ends up touching the edges. Cut unit sheets with margin:
`PAD=1.16 python tospritesheet.py animations/units/<id>_<clip>.mp4 sprites/units/<id>_<clip> 16 256 magenta`.

## Checks before upload

1. Make a comparison strip: the first idle frame of 3-4 reference units next to the new one,
   on green. Head size, fill and silhouette must match at a glance.
2. Measure the edge bands on every frame. In the left and right 12px bands, under 5% of pixels
   may have alpha above 40. In the bottom band, under about 20%.
3. Corner alpha of the keyed still and sheet frames is 0 (no leftover background square).
4. Card portraits are a separate, square, head-and-shoulders painting with a background; this
   guide is for the board art only.
