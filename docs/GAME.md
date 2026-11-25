# Game design

School No. 47. The player wakes in Room 9-B, where the last lesson never ended because the bell never rang. A voice on the intercom, Seven, helps. The Invigilator, a tall examiner with a blank exam paper for a face, walks the corridors.

**Tone.** Mystery and tension, suitable for schools: no blood, no jump scares, no death. Being caught means being sent back to your seat. Centers choose the intensity: Calm, Standard, Tense, or Study mode without the Invigilator.

**Loop.** Explore, find a device, answer, open the next part. One night takes about 8 to 10 minutes.

| Place | Device | Reward |
| --- | --- | --- |
| Room 9-B | Blackboard | Opens the classroom |
| Library | Card catalogue | Biology key (and a secret archive) |
| Biology lab | Specimen cabinet | Fuse |
| Boiler room | Breaker panel | Power, magnetic doors |
| Maths room | Safe | Staff room key |
| Staff room | Typewriter | Bell clapper, then a chase |
| Cloakroom, assembly hall | Locker, scoreboard | Optional: batteries, chalk |
| Lobby | Final paper, three questions | The front door |

Five register pages are hidden. With all five, the player can ring the bell and see the second ending.

**The Invigilator** (`world/ai.ts`): patrol, investigate, chase, search, return. He finds light and movement and hears noise: running, doors, wrong answers, thrown chalk. He cannot see someone standing still in the dark or inside a locker, and never outruns a running player. He needs a moment before he reacts.

**The assistants.** When the light returns, one more examiner comes out; after the typewriter the rest do. A calm night has one, a standard night two, a tense night three. Each waits behind an unlocked door of its own (canteen, cloakroom, music room) that stays open afterwards. They are slower and see less far than the Invigilator and follow the same rules. The study mode has none.

**Levels.** A campaign with a subject and a number is a level on the student's map. The next one opens after an escape with at least 60% right answers; a teacher can set a higher start. Topics of lower levels are mixed in.

**Fairness.** A question that runs out of tries opens anyway, loudly, so nobody gets stuck. Dialogues and notes stop the school. Center settings decide whether questions do.

**Learning.** A short lesson precedes the first question of each topic, the notebook (J) keeps what was learned, hiding asks a quick question that keeps the player quiet, and the report explains every mistake. An arrow points to the next task.

**Together.** In a room classmates see each other on the map with coloured scarves and names. V opens a wheel with eight ready phrases; each player reads them in their own language. A clock and the places are in the corner, and the final table shows who got out first and in how many minutes and seconds.

**Controls.** WASD or arrows, Shift to run, E to use, F torch, R battery, Q chalk, J notebook, V phrases, Esc break. On phones: a stick, a round action button, buttons for torch, battery, chalk, phrases, notebook, full screen and break; held upright, the phone asks to be turned. Settings: volume, text speed, brightness, no flashes, simple lighting.

**Styles.** Tailwind with one spacing unit per game pixel (`tailwind.config.js`), so the interface scales with the art.

**Code.** `world/` is pure logic with tests (map, paths, AI, state). `scenes/` is Phaser. `ui/` is DOM (dialogue, devices, menus), readable by keyboard and screen readers. `platform/` is the only code that talks to the network.
