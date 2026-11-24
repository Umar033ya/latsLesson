/** Official question bank extension and prepared learning materials (original content). */
import type { Difficulty, QuestionType } from '@prisma/client';

export interface SeedQuestion {
  subject: string;
  topic: string;
  difficulty: Difficulty;
  type: QuestionType;
  prompt: string;
  options: unknown;
  correct: unknown;
  explanation: string;
  hint?: string;
}

const letters = 'abcdef';
const choices = (list: string[]) => list.map((text, i) => ({ id: letters[i], text }));
type Meta = [subject: string, topic: string, difficulty: Difficulty];

const single = ([subject, topic, difficulty]: Meta, prompt: string, list: string[], correct: number, explanation: string, hint?: string): SeedQuestion => ({ subject, topic, difficulty, type: 'MULTIPLE_CHOICE', prompt, options: choices(list), correct: letters[correct], explanation, hint });
const multi = ([subject, topic, difficulty]: Meta, prompt: string, list: string[], correct: number[], explanation: string, hint?: string): SeedQuestion => ({ subject, topic, difficulty, type: 'MULTI_SELECT', prompt, options: choices(list), correct: correct.map((i) => letters[i]), explanation, hint });
const bool = ([subject, topic, difficulty]: Meta, prompt: string, correct: boolean, explanation: string, hint?: string): SeedQuestion => ({ subject, topic, difficulty, type: 'TRUE_FALSE', prompt, options: {}, correct, explanation, hint });
const text = ([subject, topic, difficulty]: Meta, prompt: string, correct: string[], explanation: string, hint?: string): SeedQuestion => ({ subject, topic, difficulty, type: 'TEXT', prompt, options: {}, correct, explanation, hint });
const dials = ([subject, topic, difficulty]: Meta, prompt: string, list: string[][], correct: string[], explanation: string, hint?: string): SeedQuestion => ({ subject, topic, difficulty, type: 'PUZZLE', prompt, options: { dials: list }, correct, explanation, hint });
const order = ([subject, topic, difficulty]: Meta, prompt: string, list: string[], explanation: string, hint?: string): SeedQuestion => ({ subject, topic, difficulty, type: 'ORDERING', prompt, options: { items: choices(list) }, correct: list.map((_, i) => letters[i]), explanation, hint });
const match = ([subject, topic, difficulty]: Meta, prompt: string, pairs: Array<[string, string]>, explanation: string, hint?: string): SeedQuestion => ({
  subject,
  topic,
  difficulty,
  type: 'MATCHING',
  prompt,
  options: { left: pairs.map(([l], i) => ({ id: `l${i}`, text: l })), right: pairs.map(([, r], i) => ({ id: `r${i}`, text: r })) },
  correct: Object.fromEntries(pairs.map((_, i) => [`l${i}`, `r${i}`])),
  explanation,
  hint,
});

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const BASES = ['A', 'T', 'G', 'C'];
const d = (n: number) => Array.from({ length: n }, () => DIGITS);
const b = (n: number) => Array.from({ length: n }, () => BASES);

export const EXTRA_QUESTIONS: SeedQuestion[] = [
  // Mathematics
  dials(['mathematics', 'Arithmetic', 'EASY'], 'Set the dials to 12 × 12.', d(3), ['1', '4', '4'], '12 × 12 = 144.', 'Ten twelves, then two more twelves.'),
  dials(['mathematics', 'Algebra', 'MEDIUM'], 'x + y = 10 and x − y = 4. Set the dials to x, then y.', d(2), ['7', '3'], 'Adding the equations gives 2x = 14, so x = 7 and y = 3.', 'Add the two equations together.'),
  dials(['mathematics', 'Arithmetic', 'HARD'], 'Set the dials to the smallest three-digit prime number.', d(3), ['1', '0', '1'], '100 is even; 101 has no divisors other than 1 and itself.', 'Start at 100 and test each number.'),
  dials(['mathematics', 'Geometry', 'MEDIUM'], 'Set the dials to the number of degrees in the angles of a quadrilateral, added together.', d(3), ['3', '6', '0'], 'A quadrilateral splits into two triangles: 2 × 180° = 360°.', 'Split it into triangles.'),
  multi(['mathematics', 'Arithmetic', 'EASY'], 'Switch on every prime number.', ['2', '9', '11', '15', '17'], [0, 2, 4], '9 = 3 × 3 and 15 = 3 × 5. The rest have no smaller factors.', 'A prime has exactly two divisors.'),
  multi(['mathematics', 'Arithmetic', 'MEDIUM'], 'Switch on every fraction equal to one half.', ['3/6', '4/10', '7/14', '5/9', '8/16'], [0, 2, 4], 'A fraction equals one half when the bottom is twice the top.', 'Double the top number.'),
  multi(['mathematics', 'Geometry', 'HARD'], 'Switch on every set of sides that makes a right-angled triangle.', ['3, 4, 5', '4, 5, 6', '5, 12, 13', '7, 8, 9', '8, 15, 17'], [0, 2, 4], 'Only these satisfy a² + b² = c².', 'Check a² + b² = c².'),
  bool(['mathematics', 'Algebra', 'EASY'], 'A negative number multiplied by a negative number is positive.', true, 'The two signs cancel: (−2) × (−3) = 6.', 'Try it with −2 and −3.'),
  bool(['mathematics', 'Statistics', 'EASY'], 'The median is always one of the numbers in the data set.', false, 'With an even count the median is the mean of the middle two: the median of 2 and 4 is 3.', 'Think of a set with two numbers.'),
  bool(['mathematics', 'Geometry', 'MEDIUM'], 'Every square is also a rectangle.', true, 'A rectangle needs four right angles, and a square has them.'),
  order(['mathematics', 'Arithmetic', 'EASY'], 'Put the numbers in order, smallest first.', ['−7', '−2', '0.5', '3/4', '1.2'], 'Negatives first, then 0.5 < 0.75 < 1.2.', 'Write the fraction as a decimal.'),
  order(['mathematics', 'Algebra', 'MEDIUM'], 'Put the steps for solving 2(x + 3) = 16 in order.', ['2x + 6 = 16', '2x = 10', 'x = 5', 'Check: 2 × 8 = 16'], 'Expand, subtract 6, divide by 2, then check.', 'Open the brackets first.'),
  match(['mathematics', 'Geometry', 'EASY'], 'Pair each shape with its number of sides.', [['Pentagon', '5'], ['Hexagon', '6'], ['Octagon', '8']], 'Penta, hexa and octa mean five, six and eight.', 'An octopus has eight arms.'),
  match(['mathematics', 'Algebra', 'MEDIUM'], 'Pair each expression with its value when x = 3.', [['x²', '9'], ['2x + 1', '7'], ['12 ÷ x', '4']], '3² = 9, 2 × 3 + 1 = 7 and 12 ÷ 3 = 4.'),
  text(['mathematics', 'Arithmetic', 'EASY'], 'How many minutes are in two and a half hours? Type a number.', ['150'], '2.5 × 60 = 150.', 'One hour is 60 minutes.'),
  text(['mathematics', 'Statistics', 'HARD'], 'Two coins are tossed. What is the probability of two heads, as a fraction?', ['1/4', '0.25', 'one quarter'], 'There are four equally likely outcomes and one is two heads.', 'List every outcome.'),
  single(['mathematics', 'Algebra', 'HARD'], 'Which value of x makes x² − 5x + 6 equal to zero?', ['1', '2', '4', '6'], 1, 'x² − 5x + 6 = (x − 2)(x − 3).', 'Factorise it.'),

  // English
  dials(['english', 'Vocabulary', 'EASY'], 'Spell the opposite of "left".', [['R', 'L', 'S'], ['A', 'I', 'O'], ['G', 'D', 'T'], ['H', 'K', 'E'], ['S', 'T', 'R']], ['R', 'I', 'G', 'H', 'T'], 'Right is the opposite of left. The letters G and H are silent.', 'Two of the letters are silent.'),
  dials(['english', 'Grammar', 'MEDIUM'], 'Spell the past tense of "bring": it starts with BR.', [['O', 'A', 'I'], ['U', 'W', 'N'], ['G', 'K', 'D'], ['H', 'E', 'S'], ['T', 'D', 'S']], ['O', 'U', 'G', 'H', 'T'], 'Bring, brought, brought.', 'It rhymes with "thought".'),
  multi(['english', 'Grammar', 'EASY'], 'Switch on every noun.', ['table', 'quickly', 'teacher', 'happy', 'window'], [0, 2, 4], 'Nouns name people, places and things.', 'Can you put "the" in front of it?'),
  multi(['english', 'Grammar', 'MEDIUM'], 'Switch on every irregular verb.', ['go', 'walk', 'write', 'play', 'think'], [0, 2, 4], 'Went, wrote and thought do not end in -ed.', 'Say the past tense aloud.'),
  multi(['english', 'Vocabulary', 'HARD'], 'Switch on every word close in meaning to "silent".', ['hushed', 'mute', 'restless', 'soundless', 'vivid'], [0, 1, 3], 'Hushed, mute and soundless all describe a lack of sound.'),
  bool(['english', 'Grammar', 'EASY'], '"She have finished her homework." This sentence is correct.', false, 'With she, he and it we use "has".', 'Look at the verb after "She".'),
  bool(['english', 'Writing', 'EASY'], 'A question ends with a question mark.', true, 'The question mark shows the reader that an answer is expected.'),
  bool(['english', 'Reading', 'MEDIUM'], 'To infer means to find a sentence that states the answer directly.', false, 'To infer is to work out something that is suggested but not stated.', 'Think of reading between the lines.'),
  order(['english', 'Writing', 'EASY'], 'Put the parts of a letter in order.', ['Greeting', 'Opening line', 'Main message', 'Closing', 'Signature'], 'Letters move from greeting to signature.'),
  order(['english', 'Grammar', 'MEDIUM'], 'Put the words in order to make a question.', ['Where', 'did', 'you', 'leave', 'the key?'], 'Question word, auxiliary, subject, verb, object.', 'Start with the question word.'),
  order(['english', 'Vocabulary', 'HARD'], 'Order the words from weakest to strongest.', ['warm', 'hot', 'boiling', 'scorching'], 'Each word is hotter than the one before it.'),
  match(['english', 'Grammar', 'EASY'], 'Pair each verb with its past tense.', [['see', 'saw'], ['take', 'took'], ['find', 'found']], 'All three are irregular.'),
  match(['english', 'Vocabulary', 'MEDIUM'], 'Pair each idiom with its meaning.', [['Break the ice', 'Start a conversation'], ['Piece of cake', 'Very easy'], ['Under the weather', 'Feeling ill']], 'Idioms rarely mean what the single words say.'),
  text(['english', 'Vocabulary', 'EASY'], 'Type the plural of "mouse".', ['mice'], 'Mouse becomes mice.', 'It does not end in -s.'),
  text(['english', 'Grammar', 'HARD'], 'Complete: "By the time we arrived, the bell ___ already rung." Type one word.', ['had'], 'The past perfect (had + participle) shows the earlier of two past actions.', 'It happened before another past action.'),
  single(['english', 'Reading', 'HARD'], '"The corridor held its breath." Which device is this?', ['Simile', 'Personification', 'Alliteration', 'Hyperbole'], 1, 'A corridor is given a human action.', 'Can a corridor breathe?'),

  // Biology
  dials(['biology', 'Genetics', 'EASY'], 'One DNA strand reads A T G C. Set the matching strand.', b(4), ['T', 'A', 'C', 'G'], 'A pairs with T, and G pairs with C.', 'A with T. G with C.'),
  dials(['biology', 'Genetics', 'MEDIUM'], 'One DNA strand reads G G A T C. Set the matching strand.', b(5), ['C', 'C', 'T', 'A', 'G'], 'Each base has one partner: G–C and A–T.', 'Work one base at a time.'),
  dials(['biology', 'Human Body', 'HARD'], 'Set the number of chromosomes in a human body cell.', d(2), ['4', '6'], 'Human body cells have 23 pairs: 46 chromosomes.', 'There are 23 pairs.'),
  multi(['biology', 'Cells', 'EASY'], 'Switch on everything found in a plant cell but not in an animal cell.', ['Cell wall', 'Nucleus', 'Chloroplast', 'Mitochondrion', 'Large vacuole'], [0, 2, 4], 'Both cells have a nucleus and mitochondria.', 'What does a plant need to stand up and make food?'),
  multi(['biology', 'Human Body', 'MEDIUM'], 'Switch on every organ of the digestive system.', ['Stomach', 'Lungs', 'Liver', 'Heart', 'Small intestine'], [0, 2, 4], 'Lungs belong to breathing and the heart to circulation.'),
  multi(['biology', 'Ecology', 'HARD'], 'Switch on every abiotic factor.', ['Temperature', 'Fungi', 'Light', 'Predators', 'Soil pH'], [0, 2, 4], 'Abiotic factors are the non-living parts of an ecosystem.', 'Abiotic means not living.'),
  bool(['biology', 'Human Body', 'EASY'], 'Arteries carry blood away from the heart.', true, 'Arteries: away. Veins bring blood back.', 'A for artery, A for...'),
  bool(['biology', 'Cells', 'EASY'], 'Bacteria have a nucleus.', false, 'Bacteria are prokaryotes: their DNA lies free in the cell.'),
  bool(['biology', 'Ecology', 'MEDIUM'], 'Energy increases at each step of a food chain.', false, 'Most energy is lost as heat at each step.', 'What happens to the energy an animal uses to move?'),
  order(['biology', 'Cells', 'EASY'], 'Order the levels of organisation, smallest first.', ['Cell', 'Tissue', 'Organ', 'Organ system', 'Organism'], 'Cells form tissues, tissues form organs.', 'Start with the smallest living unit.'),
  order(['biology', 'Human Body', 'MEDIUM'], 'Order the path of food through the body.', ['Mouth', 'Oesophagus', 'Stomach', 'Small intestine', 'Large intestine'], 'Food moves from mouth to large intestine.'),
  order(['biology', 'Cells', 'HARD'], 'Order the stages of mitosis.', ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'], 'PMAT: prophase, metaphase, anaphase, telophase.', 'P-M-A-T.'),
  order(['biology', 'Ecology', 'EASY'], 'Put the food chain in order, starting with the producer.', ['Grass', 'Grasshopper', 'Frog', 'Snake', 'Hawk'], 'Producers come first, top predators last.'),
  match(['biology', 'Cells', 'EASY'], 'Pair each part of the cell with its job.', [['Nucleus', 'Holds the DNA'], ['Mitochondrion', 'Releases energy'], ['Membrane', 'Controls what enters']], 'Each organelle has its own role.'),
  match(['biology', 'Human Body', 'EASY'], 'Pair each sense with its organ.', [['Sight', 'Eye'], ['Hearing', 'Ear'], ['Smell', 'Nose'], ['Touch', 'Skin']], 'Each sense has its own receptor organ.'),
  match(['biology', 'Genetics', 'HARD'], 'Pair each term with its meaning.', [['Allele', 'A version of a gene'], ['Phenotype', 'A visible trait'], ['Genotype', 'The gene combination']], 'Genotype is what you carry; phenotype is what shows.', 'Pheno- means "showing".'),
  text(['biology', 'Cells', 'EASY'], 'Type the name of the green pigment in plants.', ['chlorophyll'], 'Chlorophyll absorbs light for photosynthesis.', 'It starts with "chloro".'),
  text(['biology', 'Human Body', 'MEDIUM'], 'How many chambers does the human heart have? Type a number.', ['4', 'four'], 'Two atria and two ventricles.'),
  single(['biology', 'Genetics', 'HARD'], 'Two parents are both Bb. What fraction of their children are expected to be bb?', ['None', 'One quarter', 'One half', 'Three quarters'], 1, 'Bb × Bb gives BB, Bb, Bb and bb.', 'Draw a Punnett square.'),

  // Physics
  dials(['physics', 'Motion', 'MEDIUM'], 'A train covers 240 km in 3 hours. Set its average speed in km/h.', d(2), ['8', '0'], '240 ÷ 3 = 80 km/h.', 'Speed = distance ÷ time.'),
  multi(['physics', 'Energy', 'EASY'], 'Switch on every renewable energy source.', ['Wind', 'Coal', 'Solar', 'Natural gas', 'Tidal'], [0, 2, 4], 'Coal and gas cannot be replaced on a human time scale.'),
  multi(['physics', 'Electricity', 'MEDIUM'], 'Switch on every good electrical conductor.', ['Copper', 'Rubber', 'Aluminium', 'Glass', 'Salt water'], [0, 2, 4], 'Metals and salt water let charge move.'),
  bool(['physics', 'Forces', 'EASY'], 'An object moving at constant velocity has zero resultant force.', true, 'Newton’s first law: no change in motion needs no resultant force.'),
  bool(['physics', 'Energy', 'EASY'], 'Energy can be created but not destroyed.', false, 'Energy is only transferred or transformed.'),
  order(['physics', 'Energy', 'MEDIUM'], 'Order the energy changes when a torch is switched on.', ['Chemical (battery)', 'Electrical (wire)', 'Light and heat (bulb)'], 'The battery drives current, and the bulb turns it into light and heat.'),
  match(['physics', 'Forces', 'EASY'], 'Pair each quantity with its unit.', [['Force', 'Newton'], ['Energy', 'Joule'], ['Power', 'Watt']], 'The units are named after Newton, Joule and Watt.'),

  // History
  dials(['history', 'Wars', 'EASY'], 'Set the year World War I began.', d(4), ['1', '9', '1', '4'], 'World War I began in 1914.', 'It ended in 1918.'),
  multi(['history', 'Ancient World', 'MEDIUM'], 'Switch on every civilisation that grew along a river.', ['Egypt', 'Mesopotamia', 'Indus Valley', 'Minoan Crete', 'Easter Island'], [0, 1, 2], 'The Nile, Tigris–Euphrates and Indus; the other two were island cultures.'),
  bool(['history', 'Civilizations', 'EASY'], 'The Silk Road was a single paved road.', false, 'It was a network of trade routes across Asia.'),
  order(['history', 'Ancient World', 'MEDIUM'], 'Order the inventions, earliest first.', ['The wheel', 'Paper', 'Printing press', 'Steam engine', 'Telephone'], 'From prehistory to the nineteenth century.'),
  match(['history', 'Civilizations', 'EASY'], 'Pair each structure with its country.', [['Colosseum', 'Italy'], ['Great Wall', 'China'], ['Registan', 'Uzbekistan']], 'Rome, northern China and Samarkand.'),
];

export interface SeedMaterial {
  subject: string;
  topic: string;
  title: string;
  body: string;
  examples: string[];
}

export const MATERIALS: SeedMaterial[] = [
  { subject: 'mathematics', topic: 'Algebra', title: 'Keeping an equation balanced', body: 'An equation is a balance. Whatever you do to one side, do to the other. To solve for x, undo the operations in reverse order: first remove what is added or subtracted, then what multiplies or divides. Always put your answer back into the original equation to check it.', examples: ['4x − 5 = 19 → add 5 → 4x = 24 → divide by 4 → x = 6.', 'Two equations, x + y = 12 and x − y = 2: add them to get 2x = 14, so x = 7 and y = 5.'] },
  { subject: 'mathematics', topic: 'Geometry', title: 'Angles and right triangles', body: 'The angles of a triangle add up to 180°. Any polygon can be cut into triangles, so a shape with n sides has (n − 2) × 180° in total. In a right-angled triangle the square of the longest side equals the sum of the squares of the other two: a² + b² = c².', examples: ['A pentagon: (5 − 2) × 180° = 540°.', 'Sides 6 and 8: 36 + 64 = 100, so the longest side is 10.'] },
  { subject: 'mathematics', topic: 'Arithmetic', title: 'Primes, fractions and percentages', body: 'A prime number has exactly two divisors: 1 and itself. Two fractions are equal if you can multiply the top and bottom of one by the same number to get the other. To find a percentage, divide by 100 and multiply: 15% of a number is 0.15 times it.', examples: ['13 is prime; 21 = 3 × 7 is not.', '20% of 350 = 0.20 × 350 = 70.'] },
  { subject: 'mathematics', topic: 'Statistics', title: 'Mean, median, range', body: 'The mean is the total divided by how many numbers there are. The median is the middle number once they are in order; with two middle numbers, take their mean. The range is the largest minus the smallest. Probability is favourable outcomes divided by all equally likely outcomes.', examples: ['2, 5, 11: mean 6, median 5, range 9.', 'Rolling an even number on a die: 3 out of 6, or 1/2.'] },
  { subject: 'english', topic: 'Grammar', title: 'Tenses that tell the order of events', body: 'Use the past simple for finished actions (she opened the door). Use the past perfect, had + participle, for something that happened before another past event (the bell had rung before we came). With he, she and it, the present simple takes -s and questions use does.', examples: ['When I arrived, the lesson had started.', 'Does he know the answer? No, he doesn’t.'] },
  { subject: 'english', topic: 'Vocabulary', title: 'Synonyms, antonyms and idioms', body: 'Synonyms are close in meaning but not always equal in strength: warm, hot, boiling. Antonyms are opposites. Idioms are fixed phrases whose meaning is not the sum of their words, so learn them whole.', examples: ['"Hit the books" means to study hard.', 'scarce = in short supply; abundant is its opposite.'] },
  { subject: 'english', topic: 'Reading', title: 'Finding what the text does not say', body: 'The main idea is the point the writer makes about the topic. Details support it. An inference is a conclusion you draw from clues. Figurative language compares: a simile uses like or as, a metaphor says one thing is another, and personification gives human actions to things.', examples: ['"The wind whispered" is personification.', '"He grabbed his umbrella" lets you infer that it may rain.'] },
  { subject: 'english', topic: 'Writing', title: 'Building a clear paragraph', body: 'Start with a topic sentence, support it with two or three details, and close with a sentence that returns to the idea. Vary sentence length. Read it aloud: if you run out of breath, the sentence is too long.', examples: ['Topic: Libraries still matter. Support: quiet, free, guided. Close: That is why ours should stay open.'] },
  { subject: 'biology', topic: 'Cells', title: 'What every cell needs', body: 'Cells are surrounded by a membrane that controls what enters. The nucleus holds DNA. Mitochondria release energy and ribosomes build proteins. Plant cells also have a wall, chloroplasts and a large vacuole. Bacteria have no nucleus. Cells divide by mitosis: prophase, metaphase, anaphase, telophase.', examples: ['A muscle cell has many mitochondria because it needs a lot of energy.', 'Remember the stages of mitosis with PMAT.'] },
  { subject: 'biology', topic: 'Genetics', title: 'Reading the code', body: 'DNA is a double strand. A always pairs with T, and G with C. A gene can have different versions called alleles. A dominant allele shows even if only one copy is present; a recessive one shows only with two copies. Genotype is the combination, phenotype is what you can see.', examples: ['Strand T A C G pairs with A T G C.', 'Bb × Bb gives 1 BB : 2 Bb : 1 bb.'] },
  { subject: 'biology', topic: 'Ecology', title: 'Energy through an ecosystem', body: 'Producers capture light energy. Consumers eat producers or other consumers. Only about a tenth of the energy passes to the next level; the rest is lost, mostly as heat. Biotic factors are living, abiotic factors are not.', examples: ['Grass → rabbit → fox.', 'Light, temperature and soil pH are abiotic.'] },
  { subject: 'biology', topic: 'Human Body', title: 'Systems working together', body: 'The heart has four chambers and pumps blood through arteries (away) and veins (back). Lungs exchange gases. Food travels from the mouth through the oesophagus and stomach to the small intestine, where most nutrients are absorbed. White blood cells fight infection.', examples: ['Oxygen enters the blood in the lungs and leaves it in the muscles.'] },
  { subject: 'physics', topic: 'Forces', title: 'Forces and Newton’s laws', body: 'A resultant force changes motion: F = m × a. With no resultant force an object stays still or keeps a constant velocity. Every action has an equal and opposite reaction.', examples: ['A 2 kg trolley accelerating at 3 m/s² needs 6 N.'] },
  { subject: 'physics', topic: 'Electricity', title: 'Current, voltage, resistance', body: 'Voltage pushes charge, resistance opposes it, and current is the flow: I = V ÷ R. Conductors let charge move easily; insulators do not.', examples: ['9 V across 3 Ω gives 3 A.'] },
  { subject: 'history', topic: 'Ancient World', title: 'Rivers and first cities', body: 'The first cities grew where rivers made farming reliable: the Nile, the Tigris and Euphrates, the Indus and the Yellow River. Surplus food allowed craftspeople, writing and laws.', examples: ['Cuneiform was pressed into clay in Mesopotamia.'] },
];
