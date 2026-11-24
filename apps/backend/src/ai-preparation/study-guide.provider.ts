import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import type { QuestionKind } from '@last-lesson/scenario';
import { validateQuestionContent } from '@last-lesson/validation';

const block = z.object({ topic: z.string().trim().min(1).max(80), text: z.string().trim().min(1).max(1200) });
const guideSchema = z.object({
  summary: z.string().trim().min(1).max(600),
  explanations: z.array(block).min(1).max(8),
  examples: z.array(block).max(8).default([]),
  practice: z
    .array(z.object({ prompt: z.string().trim().min(3).max(400), options: z.array(z.string().trim().min(1).max(160)).min(2).max(5), correctIndex: z.number().int().min(0).max(4), explanation: z.string().trim().max(500).default('') }))
    .max(5)
    .default([]),
});
export type RemoteGuide = z.infer<typeof guideSchema>;

/** Optional AI provider. The key stays on the server and the reply is validated before anyone sees it. */
@Injectable()
export class StudyGuideProvider {
  private readonly logger = new Logger('StudyGuide');

  enabled() {
    return (process.env.AI_PROVIDER ?? 'local').toLowerCase() === 'openai' && Boolean(process.env.AI_API_KEY);
  }

  /** Returns null on any failure: the caller falls back to prepared materials. */
  async generate(subject: string, topics: string[], difficulty: string, locale: string): Promise<RemoteGuide | null> {
    if (!this.enabled()) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`${process.env.AI_BASE_URL ?? 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AI_API_KEY}` },
        body: JSON.stringify({
          model: process.env.AI_MODEL ?? 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a school tutor. Reply with strict JSON: {"summary": string, "explanations": [{"topic","text"}], "examples": [{"topic","text"}], "practice": [{"prompt","options":[string],"correctIndex":number,"explanation"}]}. Plain text only, age-appropriate, factually careful.' },
            { role: 'user', content: JSON.stringify({ subject, topics, difficulty, language: { en: 'English', ru: 'Russian', uz: 'Uzbek (Latin script)' }[locale] ?? 'English' }) },
          ],
        }),
      });
      if (!response.ok) throw new Error(`provider answered ${response.status}`);
      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const guide = guideSchema.parse(JSON.parse(payload.choices?.[0]?.message?.content ?? '{}'));
      // Generated questions go through the same check as hand-written ones.
      const playable = (p: RemoteGuide['practice'][number]) => validateQuestionContent('MULTIPLE_CHOICE' as QuestionKind, p.options.map((text, i) => ({ id: String(i), text })), String(p.correctIndex)).length === 0;
      return { ...guide, practice: guide.practice.filter(playable) };
    } catch (error) {
      this.logger.warn(`Falling back to prepared materials: ${(error as Error).message}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
