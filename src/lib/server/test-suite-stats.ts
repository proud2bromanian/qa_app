import prisma from '$lib/server/prisma';

const backfilledProjects = new Set<string>();

export async function ensureSuiteLastExecutionDates(proiectId: string) {
  if (backfilledProjects.has(proiectId)) return;

  const executions = await prisma.execution.findMany({
    where: { proiectId, suiteId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { suiteId: true, createdAt: true }
  });

  const latestBySuite = new Map<string, Date>();
  for (const execution of executions) {
    if (execution.suiteId && !latestBySuite.has(execution.suiteId)) {
      latestBySuite.set(execution.suiteId, execution.createdAt);
    }
  }

  const updates = [...latestBySuite.entries()];
  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50);
    await prisma.$transaction(
      batch.map(([id, lastExecutionAt]) =>
        prisma.testSuite.update({
          where: { id },
          data: { lastExecutionAt }
        })
      )
    );
  }

  backfilledProjects.add(proiectId);
}

export async function refreshSuiteLastExecutionDate(suiteId: string | null | undefined, proiectId: string) {
  if (!suiteId) return;

  const latest = await prisma.execution.findFirst({
    where: { proiectId, suiteId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  });

  await prisma.testSuite.update({
    where: { id: suiteId },
    data: { lastExecutionAt: latest?.createdAt ?? null }
  });
}
