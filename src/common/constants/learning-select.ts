import { Prisma } from '@prisma/client';

export const CONCEPT_NODE_SELECT = {
  id: true,
  name: true,
  grade: true,
  semester: true,
  order: true,
  knowledgeTag: true,
} as const satisfies Prisma.ConceptSelect;

export const PROBLEM_PUBLIC_SELECT = {
  id: true,
  conceptId: true,
  problemType: true,
  difficulty: true,
  content: true,
  imageUrl: true,
  choice1: true,
  choice2: true,
  choice3: true,
  choice4: true,
} as const satisfies Prisma.ProblemSelect;
