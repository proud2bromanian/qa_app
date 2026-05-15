export interface User {
  id: string;
  email: string;
  nume: string;
}

export interface Project {
  id: string;
  nume: string;
  descriere: string;
  createdAt: string;
  updatedAt: string;
  membri?: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  userId: string;
  proiectId: string;
  rol: string;
  user: User;
}

export interface TestCaseAttachment {
  id: string;
  testCaseId: string;
  cale: string;
}

export interface TestCase {
  id: string;
  cod: string;
  codNumar: number;
  titlu: string;
  mediu: string;
  pasi: string;
  rezultatAsteptat: string;
  rezultatObtinut: string;
  tipTestare: string;
  prioritate: string;
  proiectId: string;
  atasamente: TestCaseAttachment[];
}

export interface TestSuiteToTestCase {
  id: string;
  suiteId: string;
  testId: string;
  ordine: number;
  test: TestCase;
}

export interface TestSuite {
  id: string;
  nume: string;
  descriere: string;
  proiectId: string;
  teste: TestSuiteToTestCase[];
  executii?: Execution[];
}

export interface ExecutionResult {
  id: string;
  executieId: string;
  testId: string;
  status: 'netestat' | 'trecut' | 'esuat' | 'blocat';
  cod: string;
  titlu: string;
  mediu: string;
  pasi: string;
  rezultatAsteptat: string;
  rezultatObtinut: string;
  prioritate: string;
  dovezi: string;
}

export interface Execution {
  id: string;
  nume: string;
  proiectId: string;
  suiteId: string | null;
  status: string;
  createdAt: string;
  suite?: TestSuite;
  rezultate: ExecutionResult[];
}

export interface BugReport {
  id: string;
  titlu: string;
  descriere: string;
  status: 'deschis' | 'in_lucru' | 'rezolvat' | 'inchis';
  severitate: string;
  testId: string | null;
  executionResultId: string | null;
  proiectId: string;
  createdAt: string;
  test?: TestCase;
  executionResult?: ExecutionResult;
}

export interface Invitation {
  id: string;
  cod: string;
  proiectId: string;
  expiraLa: string;
  activa: boolean;
}

export interface ApiError {
  error: string;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  total: number;
}

export interface DashboardStats {
  testeTotal: number;
  suiteTotal: number;
  executiiTotal: number;
  buguriTotal: number;
  buguriDeschise: number;
  rataTrecere: number;
  executiiRecente: Execution[];
}
