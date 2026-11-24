import { PrismaClient, Difficulty, QuestionType } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

const SUBJECTS = [
  {
    slug: 'mathematics',
    name: 'Mathematics',
    description: 'Numbers, algebra, geometry and reasoning.',
    icon: 'Sigma',
    color: '#6366f1',
    topics: ['Algebra', 'Geometry', 'Arithmetic', 'Statistics'],
  },
  {
    slug: 'english',
    name: 'English',
    description: 'Grammar, vocabulary and reading comprehension.',
    icon: 'Languages',
    color: '#ec4899',
    topics: ['Grammar', 'Vocabulary', 'Reading', 'Writing'],
  },
  {
    slug: 'biology',
    name: 'Biology',
    description: 'Cells, genetics, ecosystems and the human body.',
    icon: 'Dna',
    color: '#22c55e',
    topics: ['Cells', 'Genetics', 'Ecology', 'Human Body'],
  },
  {
    slug: 'physics',
    name: 'Physics',
    description: 'Motion, forces, energy, electricity and waves.',
    icon: 'Atom',
    color: '#0ea5e9',
    topics: ['Motion', 'Forces', 'Energy', 'Electricity'],
  },
  {
    slug: 'history',
    name: 'History',
    description: 'World history, civilizations and historical reasoning.',
    icon: 'Landmark',
    color: '#f59e0b',
    topics: ['Ancient World', 'Modern Era', 'Wars', 'Civilizations'],
  },
] as const;

type RawQuestion = {
  subject: string;
  topic: string;
  difficulty: Difficulty;
  type: QuestionType;
  prompt: string;
  options: unknown;
  correct: unknown;
  explanation: string;
};

const mcq = (prompt: string, options: string[], correctIndex: number, explanation: string, topic: string, subject: string, difficulty: Difficulty): RawQuestion => ({
  subject,
  topic,
  difficulty,
  type: QuestionType.MULTIPLE_CHOICE,
  prompt,
  options: options.map((text, index) => ({ id: String.fromCharCode(97 + index), text })),
  correct: String.fromCharCode(97 + correctIndex),
  explanation,
});

const RAW_QUESTIONS: RawQuestion[] = [
  // Mathematics
  mcq('What is the value of 7 × 8?', ['54', '56', '63', '48'], 1, 'Seven groups of eight equal 56.', 'Arithmetic', 'mathematics', Difficulty.EASY),
  mcq('Solve for x: 3x + 6 = 21', ['3', '5', '7', '9'], 1, 'Subtract 6 from both sides: 3x = 15, so x = 5.', 'Algebra', 'mathematics', Difficulty.EASY),
  mcq('What is the area of a rectangle 9 cm by 4 cm?', ['26 cm²', '36 cm²', '40 cm²', '13 cm²'], 1, 'Area = length × width = 9 × 4 = 36 cm².', 'Geometry', 'mathematics', Difficulty.MEDIUM),
  mcq('If y = 2x² − 3, what is y when x = 4?', ['29', '32', '35', '13'], 0, '2 × 16 − 3 = 29.', 'Algebra', 'mathematics', Difficulty.MEDIUM),
  mcq('What is the mean of 4, 8, 11, 13?', ['8', '9', '10', '12'], 1, 'The sum is 36 and 36 ÷ 4 = 9.', 'Statistics', 'mathematics', Difficulty.MEDIUM),
  mcq('A triangle has angles 48° and 62°. What is the third angle?', ['60°', '70°', '80°', '50°'], 1, 'Angles in a triangle sum to 180°: 180 − 110 = 70°.', 'Geometry', 'mathematics', Difficulty.MEDIUM),
  mcq('What is 15% of 240?', ['24', '36', '40', '48'], 1, '0.15 × 240 = 36.', 'Arithmetic', 'mathematics', Difficulty.MEDIUM),
  {
    subject: 'mathematics', topic: 'Algebra', difficulty: Difficulty.MEDIUM, type: QuestionType.TEXT,
    prompt: 'Write the solution: 5x = 45. Type only the number.', options: {}, correct: ['9'], explanation: 'Divide both sides by 5 to get x = 9.',
  },
  {
    subject: 'mathematics', topic: 'Geometry', difficulty: Difficulty.MEDIUM, type: QuestionType.MATCHING,
    prompt: 'Match each shape with the number of its sides.', options: { left: [{ id: 'tri', text: 'Triangle' }, { id: 'quad', text: 'Quadrilateral' }], right: [{ id: 'three', text: '3' }, { id: 'four', text: '4' }] },
    correct: { tri: 'three', quad: 'four' }, explanation: 'A triangle has 3 sides and a quadrilateral has 4.',
  },
  {
    subject: 'mathematics', topic: 'Statistics', difficulty: Difficulty.HARD, type: QuestionType.ORDERING,
    prompt: 'Order these data sets from smallest to largest range.', options: { items: [{ id: 'a', text: '{5, 6, 7}' }, { id: 'b', text: '{1, 5, 9}' }, { id: 'c', text: '{0, 10, 30}' }] },
    correct: ['a', 'b', 'c'], explanation: 'The ranges are 2, 8 and 30 respectively.',
  },
  mcq('What is the derivative of x³?', ['3x²', 'x²', '3x', 'x⁴'], 0, 'By the power rule, d/dx x³ = 3x².', 'Algebra', 'mathematics', Difficulty.HARD),
  // English
  mcq('Choose the correct article: "She is ___ engineer."', ['a', 'an', 'the', 'no article'], 1, 'Use "an" before a vowel sound.', 'Grammar', 'english', Difficulty.EASY),
  mcq('What is the plural of "child"?', ['childs', 'children', 'childes', 'childrens'], 1, '"Children" is the irregular plural.', 'Vocabulary', 'english', Difficulty.EASY),
  mcq('Which word is a synonym of "brave"?', [' timid', 'courageous', 'dull', 'fragile'], 1, 'Courageous means brave.', 'Vocabulary', 'english', Difficulty.MEDIUM),
  mcq('Identify the verb: "The old dog slept quietly."', ['old', 'dog', 'slept', 'quietly'], 2, '"Slept" is the action word.', 'Grammar', 'english', Difficulty.MEDIUM),
  mcq('Which sentence is grammatically correct?', ['He don\'t like it.', 'He doesn\'t likes it.', 'He doesn\'t like it.', 'He not like it.'], 2, 'With he/she/it use "doesn\'t" followed by the base verb.', 'Writing', 'english', Difficulty.MEDIUM),
  mcq('What is the main idea of a passage?', ['The first sentence only', 'The central point the author makes', 'Every detail equally', 'The title'], 1, 'The main idea is the central message of the text.', 'Reading', 'english', Difficulty.MEDIUM),
  {
    subject: 'english', topic: 'Grammar', difficulty: Difficulty.MEDIUM, type: QuestionType.TEXT,
    prompt: 'Complete: "If I ___ more time, I would travel." Type one word.', options: {}, correct: ['had'], explanation: 'Second conditional uses "if + past simple".',
  },
  {
    subject: 'english', topic: 'Vocabulary', difficulty: Difficulty.MEDIUM, type: QuestionType.MATCHING,
    prompt: 'Match the word to its meaning.', options: { left: [{ id: 'obvious', text: 'Obvious' }, { id: 'scarce', text: 'Scarce' }], right: [{ id: 'clear', text: 'Easy to see' }, { id: 'rare', text: 'In short supply' }] },
    correct: { obvious: 'clear', scarce: 'rare' }, explanation: 'Obvious means clear; scarce means rare.',
  },
  mcq('Which is a metaphor?', ['The wind whispered.', 'Time is a thief.', 'The bird sang loudly.', 'It rained heavily.'], 1, '"Time is a thief" compares directly without like or as.', 'Writing', 'english', Difficulty.HARD),
  mcq('Choose the correct preposition: "She is good ___ maths."', ['in', 'at', 'on', 'for'], 1, 'We say "good at" a subject or skill.', 'Grammar', 'english', Difficulty.HARD),
  // Biology
  mcq('Which organelle produces most of a cell’s ATP?', ['Nucleus', 'Mitochondrion', 'Ribosome', 'Golgi body'], 1, 'Mitochondria are the powerhouses of the cell.', 'Cells', 'biology', Difficulty.EASY),
  mcq('What molecule carries genetic information?', ['RNA only', 'DNA', 'Protein', 'Glucose'], 1, 'DNA stores hereditary instructions.', 'Genetics', 'biology', Difficulty.EASY),
  mcq('What process converts light energy into chemical energy?', ['Respiration', 'Photosynthesis', 'Digestion', 'Fermentation'], 1, 'Photosynthesis converts light into glucose.', 'Ecology', 'biology', Difficulty.MEDIUM),
  mcq('Which blood cells fight infection?', ['Red blood cells', 'Platelets', 'White blood cells', 'Plasma cells'], 2, 'Leukocytes (white blood cells) defend the body.', 'Human Body', 'biology', Difficulty.MEDIUM),
  mcq('What is the function of ribosomes?', ['DNA storage', 'Protein synthesis', 'Energy production', 'Waste removal'], 1, 'Ribosomes translate mRNA into proteins.', 'Cells', 'biology', Difficulty.MEDIUM),
  mcq('In Mendelian genetics, a dominant allele is expressed when…', ['It is paired with a recessive allele', 'Two recessive alleles are present', 'It is on the Y chromosome only', 'The organism is female'], 0, 'One dominant allele is enough for the trait to appear.', 'Genetics', 'biology', Difficulty.MEDIUM),
  {
    subject: 'biology', topic: 'Ecology', difficulty: Difficulty.MEDIUM, type: QuestionType.TEXT,
    prompt: 'Name the gas plants absorb during photosynthesis. Type one word.', options: {}, correct: ['carbon dioxide', 'co2'], explanation: 'Plants absorb carbon dioxide and release oxygen.',
  },
  {
    subject: 'biology', topic: 'Human Body', difficulty: Difficulty.MEDIUM, type: QuestionType.MATCHING,
    prompt: 'Match the organ to its system.', options: { left: [{ id: 'heart', text: 'Heart' }, { id: 'lung', text: 'Lung' }], right: [{ id: 'circulatory', text: 'Circulatory' }, { id: 'respiratory', text: 'Respiratory' }] },
    correct: { heart: 'circulatory', lung: 'respiratory' }, explanation: 'The heart pumps blood; lungs exchange gases.',
  },
  mcq('Which process releases energy from glucose?', ['Photosynthesis', 'Cellular respiration', 'Transcription', 'Osmosis'], 1, 'Respiration releases ATP from glucose.', 'Cells', 'biology', Difficulty.HARD),
  mcq('What is a trophic level?', ['A type of cell', 'A position in a food chain', 'A species’ habitat', 'A stage of mitosis'], 1, 'Trophic levels describe feeding positions.', 'Ecology', 'biology', Difficulty.HARD),
  // Physics
  mcq('What is the SI unit of force?', ['Joule', 'Watt', 'Newton', 'Pascal'], 2, 'Force is measured in newtons (N).', 'Forces', 'physics', Difficulty.EASY),
  mcq('What is speed calculated as?', ['Distance ÷ time', 'Time ÷ distance', 'Mass × acceleration', 'Force × distance'], 0, 'Speed = distance / time.', 'Motion', 'physics', Difficulty.EASY),
  mcq('An object accelerates at 2 m/s² with mass 3 kg. What force acts on it?', ['1 N', '5 N', '6 N', '9 N'], 2, 'F = m × a = 3 × 2 = 6 N.', 'Forces', 'physics', Difficulty.MEDIUM),
  mcq('What form of energy does a moving car have?', ['Chemical', 'Kinetic', 'Potential', 'Nuclear'], 1, 'Moving objects possess kinetic energy.', 'Energy', 'physics', Difficulty.MEDIUM),
  mcq('What is the unit of electrical resistance?', ['Ampere', 'Volt', 'Ohm', 'Watt'], 2, 'Resistance is measured in ohms (Ω).', 'Electricity', 'physics', Difficulty.MEDIUM),
  mcq('If voltage is 12 V and resistance is 4 Ω, what is current?', ['2 A', '3 A', '48 A', '0.3 A'], 1, 'I = V / R = 12 / 4 = 3 A.', 'Electricity', 'physics', Difficulty.MEDIUM),
  {
    subject: 'physics', topic: 'Motion', difficulty: Difficulty.MEDIUM, type: QuestionType.TEXT,
    prompt: 'A car travels 120 km in 2 hours. What is its average speed in km/h? Type only the number.', options: {}, correct: ['60'], explanation: '120 ÷ 2 = 60 km/h.',
  },
  {
    subject: 'physics', topic: 'Energy', difficulty: Difficulty.MEDIUM, type: QuestionType.MATCHING,
    prompt: 'Match the energy type to the example.', options: { left: [{ id: 'battery', text: 'Battery' }, { id: 'falling', text: 'Falling apple' }], right: [{ id: 'chemical', text: 'Chemical energy' }, { id: 'kinetic', text: 'Kinetic energy' }] },
    correct: { battery: 'chemical', falling: 'kinetic' }, explanation: 'Batteries store chemical energy; falling objects have kinetic energy.',
  },
  mcq('What happens to the period of a pendulum if its length increases?', ['It increases', 'It decreases', 'It stays the same', 'It becomes zero'], 0, 'Longer pendulums have longer periods.', 'Energy', 'physics', Difficulty.HARD),
  {
    subject: 'physics', topic: 'Motion', difficulty: Difficulty.HARD, type: QuestionType.ORDERING,
    prompt: 'Order these steps of the scientific method.', options: { items: [{ id: 'observe', text: 'Observe' }, { id: 'hypothesis', text: 'Form hypothesis' }, { id: 'experiment', text: 'Experiment' }] },
    correct: ['observe', 'hypothesis', 'experiment'], explanation: 'Observation precedes hypothesis, which precedes experimentation.',
  },
  // History
  mcq('Which ancient civilization built the pyramids at Giza?', ['Romans', 'Egyptians', 'Greeks', 'Persians'], 1, 'The pyramids were built by ancient Egyptians.', 'Ancient World', 'history', Difficulty.EASY),
  mcq('In which year did World War II end?', ['1918', '1939', '1945', '1961'], 2, 'World War II ended in 1945.', 'Wars', 'history', Difficulty.EASY),
  mcq('Who was the first emperor of China?', ['Confucius', 'Qin Shi Huang', 'Sun Yat-sen', 'Han Wudi'], 1, 'Qin Shi Huang unified China in 221 BCE.', 'Civilizations', 'history', Difficulty.MEDIUM),
  mcq('The Renaissance began in which region?', ['Italy', 'Russia', 'Japan', 'Scandinavia'], 0, 'The Renaissance began in Italian city-states.', 'Modern Era', 'history', Difficulty.MEDIUM),
  mcq('What was the main cause of the French Revolution?', ['Social and economic inequality', 'A foreign invasion', 'A volcanic eruption', 'The discovery of America'], 0, 'Inequality and fiscal crisis drove the revolution.', 'Modern Era', 'history', Difficulty.MEDIUM),
  mcq('Which empire was ruled by Julius Caesar?', ['Roman', 'Ottoman', 'Mongol', 'British'], 0, 'Julius Caesar was a Roman general and dictator.', 'Ancient World', 'history', Difficulty.MEDIUM),
  {
    subject: 'history', topic: 'Civilizations', difficulty: Difficulty.MEDIUM, type: QuestionType.TEXT,
    prompt: 'Name the ancient city destroyed by Mount Vesuvius in 79 CE. Type one word.', options: {}, correct: ['pompeii'], explanation: 'Pompeii was buried by volcanic ash.',
  },
  {
    subject: 'history', topic: 'Ancient World', difficulty: Difficulty.MEDIUM, type: QuestionType.MATCHING,
    prompt: 'Match the civilization to its writing system.', options: { left: [{ id: 'egypt', text: 'Egypt' }, { id: 'mesopotamia', text: 'Mesopotamia' }], right: [{ id: 'hieroglyphs', text: 'Hieroglyphs' }, { id: 'cuneiform', text: 'Cuneiform' }] },
    correct: { egypt: 'hieroglyphs', mesopotamia: 'cuneiform' }, explanation: 'Egypt used hieroglyphs; Mesopotamia used cuneiform.',
  },
  mcq('Which treaty ended World War I?', ['Versailles', 'Paris', 'Berlin', 'Vienna'], 0, 'The Treaty of Versailles was signed in 1919.', 'Wars', 'history', Difficulty.HARD),
  {
    subject: 'history', topic: 'Modern Era', difficulty: Difficulty.HARD, type: QuestionType.ORDERING,
    prompt: 'Order these events chronologically.', options: { items: [{ id: 'ww1', text: 'World War I' }, { id: 'ww2', text: 'World War II' }, { id: 'cold', text: 'Cold War' }] },
    correct: ['ww1', 'ww2', 'cold'], explanation: 'WWI (1914–18), WWII (1939–45), then the Cold War.',
  },
];

async function main() {
  console.log('Seeding LAST LESSON database...');
  const passwordHash = await argon2.hash('Admin123!', { type: argon2.argon2id });

  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@lastlesson.dev' },
    create: { email: 'super@lastlesson.dev', passwordHash, firstName: 'System', lastName: 'Administrator', role: 'SUPER_ADMIN' },
    update: { role: 'SUPER_ADMIN' },
  });

  const centerAdmin = await prisma.user.upsert({
    where: { email: 'admin@lastlesson.dev' },
    create: { email: 'admin@lastlesson.dev', passwordHash, firstName: 'Ada', lastName: 'Center', role: 'CENTER_ADMIN' },
    update: { role: 'CENTER_ADMIN' },
  });

  const gamer = await prisma.user.upsert({
    where: { email: 'student@lastlesson.dev' },
    create: { email: 'student@lastlesson.dev', passwordHash, firstName: 'Sam', lastName: 'Student', role: 'GAMER' },
    update: { role: 'GAMER' },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-academy' },
    create: { name: 'Demo Academy', slug: 'demo-academy', logoUrl: null, status: 'ACTIVE' },
    update: { status: 'ACTIVE' },
  });

  await prisma.organizationAdmin.upsert({
    where: { userId_organizationId: { userId: centerAdmin.id, organizationId: org.id } },
    create: { userId: centerAdmin.id, organizationId: org.id },
    update: {},
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: gamer.id, organizationId: org.id } },
    create: { userId: gamer.id, organizationId: org.id },
    update: {},
  });

  const demoCode = 'LL-DEMO-2026';
  await prisma.invitationCode.upsert({
    where: { codeHash: hash(demoCode) },
    create: {
      codeHash: hash(demoCode),
      organizationId: org.id,
      createdById: superAdmin.id,
      expiresAt: new Date(Date.now() + 365 * 86400000),
      maxUses: 1000,
    },
    update: { isActive: true, revokedAt: null },
  });

  const subjectIds = new Map<string, string>();
  const topicIds = new Map<string, string>();
  for (const subject of SUBJECTS) {
    const record = await prisma.subject.upsert({
      where: { slug: subject.slug },
      create: { slug: subject.slug, name: subject.name, description: subject.description, icon: subject.icon, color: subject.color },
      update: { name: subject.name, isActive: true },
    });
    subjectIds.set(subject.slug, record.id);
    for (const topic of subject.topics) {
      const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const t = await prisma.topic.upsert({
        where: { subjectId_slug: { subjectId: record.id, slug } },
        create: { subjectId: record.id, name: topic, slug },
        update: {},
      });
      topicIds.set(`${subject.slug}:${topic}`, t.id);
    }
  }

  for (const q of RAW_QUESTIONS) {
    const subjectId = subjectIds.get(q.subject)!;
    const topicId = topicIds.get(`${q.subject}:${q.topic}`)!;
    const existing = await prisma.question.findFirst({
      where: { subjectId, prompt: q.prompt, organizationId: null },
    });
    const data = {
      subjectId,
      topicId,
      type: q.type,
      difficulty: q.difficulty,
      prompt: q.prompt,
      options: q.options as object,
      correctAnswer: q.correct as object,
      explanation: q.explanation,
      points: q.difficulty === 'HARD' ? 20 : q.difficulty === 'MEDIUM' ? 15 : 10,
      isActive: true,
    };
    if (existing) await prisma.question.update({ where: { id: existing.id }, data });
    else await prisma.question.create({ data });
  }

  console.log('Seed complete.');
  console.log('Accounts: super@lastlesson.dev / admin@lastlesson.dev / student@lastlesson.dev  (password: Admin123!)');
  console.log(`Demo invitation code: ${demoCode}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
