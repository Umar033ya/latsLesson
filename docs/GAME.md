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

**Fairness.** A question that runs out of tries opens anyway, loudly, so nobody gets stuck. Dialogues and notes stop the school. Center settings decide whether questions do.

**Controls.** WASD or arrows, Shift to run, E to use, F torch, R battery, Q chalk, Esc break. Touch controls appear on phones. Settings: volume, text speed, brightness, no flashes, simple lighting.

**Code.** `world/` is pure logic with tests (map, paths, AI, state). `scenes/` is Phaser. `ui/` is DOM (dialogue, devices, menus), readable by keyboard and screen readers. `platform/` is the only code that talks to the network.
