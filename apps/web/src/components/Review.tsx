import { QUESTION_TYPE_LABELS, type QuestionKind } from '@last-lesson/scenario';
import { describeAnswer } from '../lib/format';
import { plural, tr } from '../lib/i18n';

/** Question-by-question review, shared by students and teachers. */
export function Review({ answers, dark }: { answers: any[]; dark?: boolean }) {
  if (!answers.length) return <p className={dark ? 'text-fog' : 'text-soft'}>{tr('No questions were answered in this session.')}</p>;
  return (
    <ol className="space-y-3">
      {answers.map((a, i) => (
        <li key={i} className={dark ? `rounded-xl border-l-4 bg-night-2 p-5 ${a.isCorrect ? 'border-[#5a86f0]' : 'border-[#b23a3f]'}` : `rounded-xl border-l-4 bg-sheet p-5 ${a.isCorrect ? 'border-moss' : 'border-pencil'}`}>
          <p className={dark ? 'text-sm text-fog' : 'text-sm text-soft'}>{tr(a.gate)}. {[tr(a.subject), a.topic && tr(a.topic)].filter(Boolean).join(', ')}. {tr(QUESTION_TYPE_LABELS[a.type as QuestionKind])}</p>
          <p className="my-1 font-semibold">{a.prompt}</p>
          <p><span>{a.isCorrect ? tr('Correct') : tr('Answer given')}</span>: {describeAnswer(a.type, a.options, a.answer)}</p>
          {!a.isCorrect && <p><span>{tr('Right answer')}</span>: <b>{describeAnswer(a.type, a.options, a.correctAnswer)}</b></p>}
          {a.explanation && <p className={dark ? 'mt-1 text-fog' : 'mt-1 text-soft'}>{a.explanation}</p>}
          <p className={dark ? 'mt-1 text-sm text-fog' : 'mt-1 text-sm text-soft'}>{tr('{0} of {1} points', { 0: a.points, 1: a.maxPoints })}, {plural(a.attempts, 'try|tries')}{a.hintUsed && <span>, <span>{tr('hint used')}</span></span>}</p>
        </li>
      ))}
    </ol>
  );
}
