import { prisma } from '@/lib/prisma';

export type TeamAccessRole = 'OWNER' | 'MEMBER';

export async function getTeamAccess(teamId: string, userId: string): Promise<{ role: TeamAccessRole } | null> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { ownerId: true },
  });

  if (!team) return null;
  if (team.ownerId === userId) return { role: 'OWNER' };

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { role: true },
  });

  if (!membership) return null;

  return { role: membership.role === 'OWNER' ? 'OWNER' : 'MEMBER' };
}

export function canViewCredential(role: TeamAccessRole): boolean {
  return role === 'OWNER' || role === 'MEMBER';
}

export function canManageCredential(role: TeamAccessRole): boolean {
  return role === 'OWNER';
}
