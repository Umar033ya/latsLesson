import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { Avatar, confirmed, copy, Dialog, Empty, fieldError, Load, Page, Status, Text, useAction } from '../../components/ui';
import { get, patch, post } from '../../lib/api';
import { day } from '../../lib/format';
import { tr } from '../../lib/i18n';

interface Teacher {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  rooms: number;
}

export function Teachers() {
  const [making, setMaking] = useState(false);
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const q = useQuery({ queryKey: ['teachers'], queryFn: () => get<Teacher[]>('/center/teachers') });
  const status = useAction((t: Teacher) => patch(`/center/teachers/${t.id}`, { status: t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }), { ok: 'Status changed', keys: ['teachers'] });
  const reset = useAction((t: Teacher) => post<{ temporaryPassword: string }>(`/center/teachers/${t.id}/password`), { then: (r, t) => setSecret({ email: t.email, password: r.temporaryPassword }) });
  return (
    <Page title={tr('Teachers')} note={tr('A teacher opens rooms and sees the results of their own rooms. Students, codes and content stay with the administrator.')} action={<button className="btn-main" onClick={() => setMaking(true)}><UserPlus size={16} />{tr('New teacher')}</button>}>
      <Load q={q}>
        {(list) =>
          list.length ? (
            <div className="sheet overflow-x-auto">
              <table className="reg min-w-[640px]">
                <thead><tr><th>{tr('Name')}</th><th>{tr('Rooms')}</th><th>{tr('Since')}</th><th>{tr('Status')}</th><th /></tr></thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id}>
                      <td><span className="flex items-center gap-3"><Avatar name={`${t.firstName} ${t.lastName}`} /><span><b className="font-semibold">{t.firstName} {t.lastName}</b><span className="block text-[13px] text-soft">{t.email}</span></span></span></td>
                      <td>{t.rooms}</td>
                      <td className="text-soft">{day(t.createdAt)}</td>
                      <td><Status value={t.status} /></td>
                      <td className="whitespace-nowrap text-right">
                        <button className="btn-quiet" onClick={() => confirmed(tr('Issue a new password for {0}? Open sessions are closed.', { 0: t.email })) && reset.mutate(t)}>{tr('Reset password')}</button>
                        <button className="btn-quiet" onClick={() => status.mutate(t)}>{t.status === 'ACTIVE' ? tr('Suspend') : tr('Activate')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title={tr('No teachers yet')}>{tr('Add a teacher, hand over the password once, and they can open rooms for a class.')}</Empty>
          )
        }
      </Load>
      {making && <NewTeacher onClose={() => setMaking(false)} onDone={(s) => { setMaking(false); setSecret(s); }} />}
      <Dialog title={tr('Password')} open={Boolean(secret)} onClose={() => setSecret(null)}>
        {secret && (
          <>
            <p className="text-soft">{tr('It is shown once. Hand it over to the teacher, who can change it in the settings.')}</p>
            <p className="mt-3 font-semibold">{secret.email}</p>
            <p className="mb-4 mt-1 select-all rounded-lg bg-well p-3 font-dot text-2xl">{secret.password}</p>
            <button className="btn-main" onClick={() => copy(`${secret.email}\n${secret.password}`)}>{tr('Copy')}</button>
          </>
        )}
      </Dialog>
    </Page>
  );
}

function NewTeacher({ onClose, onDone }: { onClose: () => void; onDone: (s: { email: string; password: string }) => void }) {
  const [f, setF] = useState({ firstName: '', lastName: '', email: '' });
  const save = useAction(() => post<{ teacher: { email: string }; initialPassword: string }>('/center/teachers', f), { keys: ['teachers'], then: (r) => onDone({ email: r.teacher.email, password: r.initialPassword }) });
  return (
    <Dialog title={tr('New teacher')} open onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(undefined as never); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label={tr('First name')} required maxLength={80} value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
          <Text label={tr('Last name')} maxLength={80} value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
        </div>
        <Text label={tr('E-mail')} type="email" required value={f.email} error={fieldError(save.error, 'email')} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <button className="btn-main" disabled={save.isPending}>{tr('Add the teacher')}</button>
      </form>
    </Dialog>
  );
}
