import { tr } from './i18n';

/** All fixed text. Kept apart from code so it can be edited and, later, translated. */
export type Speaker = 'me' | 'voice' | 'invigilator' | 'narration';
export interface Line {
  who: Speaker;
  text: string;
  face?: 'calm' | 'scared' | 'glad';
}
const me = (text: string, face: Line['face'] = 'calm'): Line => ({ who: 'me', text, face });
const voice = (text: string): Line => ({ who: 'voice', text });
const say = (text: string): Line => ({ who: 'narration', text });
const inv = (text: string): Line => ({ who: 'invigilator', text });

export const story = {
  wake: (name: string): Line[] => [
    say(tr('Rain. A desk that is too small for you.')),
    say(tr('A school you have never attended.')),
    me(tr('...I fell asleep over my homework. At home. In my own room.'), 'scared'),
    voice(tr('Testing. Testing. Is the intercom in 9-B still breathing?')),
    voice(tr('Oh, good, somebody is in your seat. Hello, {0}.', { 0: name })),
    me(tr('How do you know my name?'), 'scared'),
    voice(tr('It is in the register. Line twenty-four. It has been there for a very long time.')),
    voice(tr('First things first. There is a torch on the teacher’s desk. Take it. We can talk in the light.')),
  ],
  torch: (opening: string): Line[] => [
    say(tr('You take the torch. It is warm, as if somebody just put it down.')),
    ...(opening ? [voice(tr('There is a message for you. It says: "{0}"', { 0: opening }))] : []),
    voice(tr('F turns it on and off. Batteries do not last in this building, so be careful with it.')),
    voice(tr('Now the door. It is stubborn. It opens for people who answer the board.')),
    me(tr('It opens for what?')),
    voice(tr('Knowledge, silly. In here it is the only thing that does.')),
  ],
  boardDone: (): Line[] => [
    say(tr('The chalk writes a small tick by itself. In the door, something lets go.')),
    voice(tr('See? Not so bad.')),
    voice(tr('You can call me Seven. It is my number in the register.')),
  ],
  firstSight: (): Line[] => [
    say(tr('At the far end of the corridor somebody is standing very straight.')),
    me(tr('Is that a teacher?'), 'scared'),
    voice(tr('Torch off. Now. And stand still.')),
    say(tr('It turns. Where a face should be there is a sheet of paper, pinned at the top.')),
    voice(tr('That is the Invigilator. He cannot see you, not really. He sees light. He hears feet, and wrong answers.')),
    voice(tr('If he comes, get into a locker, or stand in the dark and do not move. He will not hurt you. He only sends you back to your seat.')),
    me(tr('And then?')),
    voice(tr('Then you start counting how many times he has. After enough of them, you stop asking to leave.')),
  ],
  study: (): Line[] => [voice(tr('He is not here tonight. Study night. Take all the time you like.'))],
  library: (): Line[] => [voice(tr('The library. I used to hide in here during gymnastics.')), voice(tr('The key to the biology lab is in the card catalogue. He filed it under K. He files everything.'))],
  key: (): Line[] => [say(tr('A drawer slides out on its own. Inside: a brass key with a paper label, BIOLOGY.'))],
  secret: (): Line[] => [say(tr('The shelf swings inwards. Behind it, a room that is not on the evacuation plan.'))],
  archive: (): Line[] => [voice(tr('I have never heard your voice from in there before. What is it?')), me(tr('Registers. Years of them. And they all stop on the same day.'))],
  biology: (): Line[] => [voice(tr('The fuse is behind the specimen cabinet. Match the labels, the latch will open. And do not talk to the skeleton. He is shy.'))],
  fuse: (): Line[] => [say(tr('The cabinet clicks. A fuse, wrapped in a page from an exercise book: FOR THE BOILER ROOM. SORRY. A.G.'))],
  boilerNoFuse: (): Line[] => [say(tr('A breaker panel with one empty slot. It needs a fuse.'))],
  power: (): Line[] => [
    say(tr('The panel hums. One after another, lamps remember how to burn.')),
    voice(tr('Oh. Oh, I had forgotten the colour of the walls.')),
    voice(tr('He will have heard that. But now the magnetic doors work: the maths room, the assembly hall, the service corridor.')),
  ],
  maths: (): Line[] => [voice(tr('Maths. He taught here. Anton Grebner. The best teacher we had, honestly.')), me(tr('He? You mean the Invigilator?'), 'scared'), voice(tr('...The safe is on the wall. The staff room key is inside.'))],
  staffKey: (): Line[] => [say(tr('The safe opens. A key, and a photograph: twenty-three pupils and one teacher, squinting in the sun.'))],
  staff: (): Line[] => [voice(tr('The typewriter. Every evening he wrote the same letter on it. Finish it for him.'))],
  clapper: (): Line[] => [
    say(tr('The carriage slides, the bell of the typewriter rings, and a drawer opens below it.')),
    say(tr('Inside lies the clapper of the school bell. Somebody took it out, so that it could never ring.')),
    voice(tr('That is it. That is why the lesson never ended.')),
    voice(tr('Take it to the lobby. And run. He counts his things.')),
  ],
  lobby: (): Line[] => [
    voice(tr('The lobby. The front door is right there. I can almost hear the street.')),
    voice(tr('One last paper lies on the desk. Three questions. Then the door is yours.')),
  ],
  examDone: (pages: number): Line[] => [
    say(tr('The last answer dries. The front door unlocks with a sound like a sigh.')),
    ...(pages >= 5
      ? [voice(tr('You have all the register pages. Nobody ever had all of them.')), voice(tr('Then you could do it properly. Hang the clapper. Ring the bell. End the lesson, for everyone.')), voice(tr('Or just go home. I would not be angry. Really.'))]
      : [voice(tr('Go on. You have earned it.')), me(tr('And you?')), voice(tr('There are still pages missing from the register. {0} of them. Without them the bell would not know who to call. Maybe the next one will find them.', { 0: 5 - pages }))]),
  ],
  caught: (name: string): Line[] => [inv(tr('{0}. You are out of your seat.', { 0: name })), say(tr('A red mark appears on the back of your hand.'))],
  caughtAgain: (lives: number): Line[] => [say(tr('Room 9-B. The same desk.')), say(lives === 1 ? tr('One more mark and you will stop asking to leave.') : tr('Chances left: {0}.', { 0: lives })), voice(tr('Breathe. Everything you unlocked is still open.'))],
  detained: (): Line[] => [say(tr('You sit down. The desk fits now.')), voice(tr('It is all right. Tomorrow there will be another evening. Come back for me, will you?'))],
  escaped: (name: string): Line[] => [
    say(tr('Cold air. A wet street. Behind you, one window in the dark building is lit.')),
    say(tr('In your pocket there is a strip of paper, torn from a register.')),
    say(tr('24. {0}. PRESENT.', { 0: name })),
  ],
  dismissed: (name: string): Line[] => [
    say(tr('You hang the clapper where it belongs, and pull the rope.')),
    say(tr('The bell rings. Once, and the corridor lamps burn steady. Twice, and every door in the school is open.')),
    inv(tr('...That is the bell.')),
    inv(tr('We were told to wait in the classroom until it rang. The water never reached us. But I had promised: nobody leaves before the bell. So they stayed, and they were brave, and the whole evening waited with them. And it never rang.')),
    say(tr('He lifts the sheet of paper from his face and folds it carefully, like a letter.')),
    inv(tr('Class 9-B. You are dismissed.')),
    say(tr('Footsteps. Twenty-three pairs of them, running, the way children run on the last day of school.')),
    voice(tr('My name is Lera. Lera Grebneva, number seven. He was my father. Thank you, {0}.', { 0: name })),
    say(tr('When the sun comes up, the building is only a building. The register lies open on the front step.')),
    say(tr('24. {0}. PRESENT. And below, in red ink: EXCELLENT.', { 0: name })),
  ],
  timeout: (): Line[] => [say(tr('Somewhere a clock strikes, and the corridor folds itself up like a timetable.')), voice(tr('Time is up for tonight. Same time tomorrow?'))],
};

export interface PageDef {
  id: string;
  x: number;
  y: number;
  title: string;
  body: string;
}
const T = 16;
/** Five torn register pages. Optional; together they change the ending. */
export const PAGES: PageDef[] = [
  { id: 'page1', x: 20.6 * T, y: 20.4 * T, title: tr('Register, page 1'), body: tr('14 November. Present: 23. Absent: 1 (No. 24, reason not given).\n\nRain since Tuesday. The river is at the second step. The director says the dam is perfectly safe.\n\nA. Grebner, class teacher') },
  { id: 'page2', x: 52 * T, y: 18 * T, title: tr('Register, page 2'), body: tr('11:20. Alarm. We were told it is a drill, and that classes must stay in their rooms until the bell.\n\nI locked 9-B myself, so that nobody would be trampled on the stairs. They are singing to keep the little ones next door calm.') },
  { id: 'page3', x: 71.5 * T, y: 17 * T, title: tr('Register, page 3'), body: tr('12:05. Water in the corridor. No. 7 asks me very quietly if I am afraid.\n\nI tell her a teacher is never afraid during a lesson. She says: then please do not let the lesson end.') },
  { id: 'page4', x: 57 * T, y: 35 * T, title: tr('Register, page 4'), body: tr('12:40. I set them an exam, so that they would have something to think about. They are all writing. It is so quiet.\n\nI went to ring the bell myself. The clapper is gone. Somebody took it out so the drill could not be interrupted.') },
  { id: 'page5', x: 68.5 * T, y: 50.2 * T, title: tr('Register, page 5'), body: tr('Nobody leaves before the bell.\nNobody leaves before the bell.\nNobody leaves before the bell.\n\nLera, if someone ever comes who was absent that day, let them ask the questions. Let them ring it.') },
];

export const NOTES: Array<{ id: string; x: number; y: number; title: string; body: string }> = [
  { id: 'note_rules', x: 31.2 * T, y: 25.4 * T, title: tr('Rules for the examination'), body: tr('1. No lights.\n2. No running.\n3. No talking.\n4. A pupil who answers wrongly will be noticed.\n5. A pupil who stands perfectly still in the dark is considered to be thinking, and will not be disturbed.') },
  { id: 'note_chalk', x: 24.4 * T, y: 26.2 * T, title: tr('Torn exercise book'), body: tr('You can throw chalk (Q). He always goes to see who threw it. We did this for a whole term.\n\nNo. 11') },
  { id: 'note_lockers', x: 42.6 * T, y: 38.6 * T, title: tr('Scratched into the bench'), body: tr('He never opens lockers. He used to say that what is in a pupil’s locker is a pupil’s business.') },
  { id: 'note_staff', x: 87.6 * T, y: 19.4 * T, title: tr('Unfinished letter'), body: tr('To the district office.\n\nI again request permission to dismiss my class. The lesson has lasted for thirty-eight years. The children are tired and they have learned everything I know.') },
];

export const INSPECT: Record<string, Line[]> = {
  portrait1: [say(tr('A row of teachers. The paint of one face has been scraped off, down to clean white canvas.'))],
  portrait2: [say(tr('"A. GREBNER, TEACHER OF THE YEAR". Somebody has pinned a sheet of paper over the face.'))],
  portrait3: [say(tr('Class 9-B. Twenty-three children. The space for the twenty-fourth was left in the second row.'))],
  piano: [say(tr('You press one key. Far away, somebody hums the next note.'))],
  clock: [say(tr('Both hands have stopped at a quarter to three, the end of the last lesson.'))],
};

export const OBJECTIVES: Array<{ until: string; text: string }> = [
  { until: 'torch', text: tr('Find the torch') },
  { until: 'blackboard', text: tr('Answer the blackboard') },
  { until: 'catalogue', text: tr('Search the library') },
  { until: 'specimens', text: tr('Find the fuse in the biology lab') },
  { until: 'breakers', text: tr('Restore power in the boiler room') },
  { until: 'safe', text: tr('Open the safe in the maths room') },
  { until: 'typewriter', text: tr('Go to the staff room') },
  { until: 'exam3', text: tr('Reach the main lobby') },
  { until: 'end', text: tr('Leave the school') },
];
