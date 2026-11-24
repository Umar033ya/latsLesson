import type { PrismaService } from '../common/prisma.service';

/**
 * Ends a running room once nobody in it is still playing. Call it after the transaction that
 * finished a player: the last of several simultaneous finishers then sees all the others.
 */
export async function closeLobbyWhenDone(prisma: PrismaService, lobbyId: string): Promise<void> {
  await prisma.lobby.updateMany({
    where: { id: lobbyId, status: 'RUNNING', players: { none: { kicked: false, finishedAt: null } } },
    data: { status: 'FINISHED', endedAt: new Date() },
  });
}
