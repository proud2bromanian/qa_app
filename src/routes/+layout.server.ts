import prisma from '$lib/server/prisma';

export async function load({ locals, url }) {
  const user = locals.user || null;
  let proiecte: { id: string; nume: string }[] = [];
  let rolCurent: string | null = null;
  let proiectCurent: { id: string; nume: string } | null = null;

  if (user) {
    proiecte = await prisma.project.findMany({
      where: { membri: { some: { userId: user.id } } },
      select: { id: true, nume: true },
      orderBy: { updatedAt: 'desc' }
    });

    const match = url.pathname.match(/\/projects\/([^/]+)/);
    const projectId = match?.[1];

    if (projectId) {
      const member = await prisma.projectMember.findUnique({
        where: { userId_proiectId: { userId: user.id, proiectId: projectId } },
        select: { rol: true, proiect: { select: { id: true, nume: true } } }
      });
      if (member) {
        rolCurent = member.rol;
        proiectCurent = member.proiect;
      }
    }
  }

  return { user, proiecte, rolCurent, proiectCurent };
}
