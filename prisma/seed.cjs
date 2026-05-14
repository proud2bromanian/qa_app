const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const parola = await bcrypt.hash('parola123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@qaapp.ro' },
    update: {},
    create: { email: 'admin@qaapp.ro', nume: 'Administrator QA', parola }
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@qaapp.ro' },
    update: {},
    create: { email: 'user@qaapp.ro', nume: 'Tester QA', parola }
  });

  const proiect = await prisma.project.upsert({
    where: { id: 'proiect-demo' },
    update: {},
    create: { id: 'proiect-demo', nume: 'Aplicație Demo', descriere: 'Proiect demonstrativ pentru managementul testării QA' }
  });

  await prisma.projectMember.upsert({
    where: { userId_proiectId: { userId: admin.id, proiectId: proiect.id } },
    update: {},
    create: { userId: admin.id, proiectId: proiect.id, rol: 'administrator' }
  });
  await prisma.projectMember.upsert({
    where: { userId_proiectId: { userId: user.id, proiectId: proiect.id } },
    update: {},
    create: { userId: user.id, proiectId: proiect.id, rol: 'membru' }
  });

  const test1 = await prisma.testCase.upsert({
    where: { id: 'test-1' },
    update: {},
    create: {
      id: 'test-1',
      cod: 'TC-1',
      titlu: 'Autentificare cu credențiale valide',
      mediu: 'Chrome 120, Windows 11, Aplicație v2.1.0',
      pasi: '1. Deschide pagina de autentificare\n2. Introdu email: admin@qaapp.ro\n3. Introdu parolă: parola123\n4. Apasă butonul "Autentificare"',
      rezultatAsteptat: 'Utilizatorul este redirecționat către dashboard',
      rezultatObtinut: 'Dashboard afișat cu succes',
      tipTestare: 'manuala',
      proiectId: proiect.id
    }
  });

  const test2 = await prisma.testCase.upsert({
    where: { id: 'test-2' },
    update: {},
    create: {
      id: 'test-2',
      cod: 'TC-2',
      titlu: 'Autentificare cu parolă greșită',
      mediu: 'Firefox 121, macOS 14, Aplicație v2.1.0',
      pasi: '1. Deschide pagina de autentificare\n2. Introdu email: admin@qaapp.ro\n3. Introdu parolă: parola_gresita\n4. Apasă butonul "Autentificare"',
      rezultatAsteptat: 'Se afișează mesaj de eroare: "Email sau parolă incorectă"',
      rezultatObtinut: '',
      tipTestare: 'automata',
      proiectId: proiect.id
    }
  });

  const suita = await prisma.testSuite.upsert({
    where: { id: 'suita-1' },
    update: {},
    create: { id: 'suita-1', nume: 'Testare Autentificare', descriere: 'Teste pentru modulul de autentificare', proiectId: proiect.id }
  });

  await prisma.testSuiteToTestCase.upsert({
    where: { suiteId_testId: { suiteId: suita.id, testId: test1.id } },
    update: {},
    create: { suiteId: suita.id, testId: test1.id, ordine: 1 }
  });
  await prisma.testSuiteToTestCase.upsert({
    where: { suiteId_testId: { suiteId: suita.id, testId: test2.id } },
    update: {},
    create: { suiteId: suita.id, testId: test2.id, ordine: 2 }
  });

  console.log('Seed completat cu succes!');
  console.log('Utilizatori: admin@qaapp.ro / parola123, user@qaapp.ro / parola123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
