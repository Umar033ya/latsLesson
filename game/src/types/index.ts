export type Subject = 'mathematics' | 'english'; export type Difficulty = 'intro' | 'standard' | 'nightmare';
export interface Question { id: string; subject: Subject; difficulty: Difficulty; prompt: string; choices: string[]; answer: number; hint: string }
export interface SessionResult { sessionId: string; score: number; correct: boolean; elapsedSeconds: number }
export interface ApiProvider { getQuestion(subject: Subject, difficulty: Difficulty): Promise<Question>; submitResult(result: SessionResult): Promise<void> }
