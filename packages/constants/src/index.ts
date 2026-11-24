export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CENTER_ADMIN: 'CENTER_ADMIN',
  GAMER: 'GAMER',
} as const;

export const ROLE_VALUES = Object.values(ROLES);

export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TEXT: 'TEXT',
  MATCHING: 'MATCHING',
  ORDERING: 'ORDERING',
} as const;

export const DIFFICULTIES = { EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD' } as const;
export const DIFFICULTY_VALUES = Object.values(DIFFICULTIES);

export const MONSTER_STATES = {
  PATROL: 'patrol',
  INVESTIGATE: 'investigate',
  CHASE: 'chase',
  SEARCH: 'search',
} as const;

export const SUBJECT_SLUGS = ['mathematics', 'english', 'biology', 'physics', 'history'] as const;

export const GAME = {
  WORLD_WIDTH: 1280,
  WORLD_HEIGHT: 800,
  TILE_SIZE: 40,
  PLAYER_SPEED: 190,
  BATTERY_DRAIN_PER_SECOND: 0.55,
  BATTERY_PICKUP: 28,
  QUESTION_COUNT: 5,
  MAX_DETECTION: 100,
} as const;

export const CACHE = {
  STATIC: 'last-lesson-static',
  GAME_ASSETS: 'last-lesson-game-assets',
  API: 'last-lesson-api-runtime',
} as const;
