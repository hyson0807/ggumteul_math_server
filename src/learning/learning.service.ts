import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { USER_PUBLIC_SELECT } from '../common/constants/user-select';
import {
  CONCEPT_NODE_SELECT,
  PROBLEM_PUBLIC_SELECT,
} from '../common/constants/learning-select';
import {
  MAX_WORM_STAGE,
  WORM_STAGES,
  stageToSemester,
  semesterToStage,
} from '../common/constants/worm';

function calcCoinReward(difficulty: number, timeSpent: number) {
  const base = 10;
  const diffBonus = Math.max(0, Math.min(25, difficulty * 5));
  const speedBonus = timeSpent <= 30 ? 5 : 0;
  return base + diffBonus + speedBonus;
}

/**
 * MCQ의 `problem.answer`는 선택지 번호(1~4)로 저장되어 있으므로
 * 해당 choice 텍스트로 정규화한다. 프론트는 선택한 choice 텍스트를 그대로 전송.
 * 인덱스 형태가 아닌 MCQ 또는 주관식은 원본 answer 텍스트를 그대로 사용.
 */
function resolveCorrectAnswer(problem: {
  problemType: 'SUBJ' | 'MCQ';
  answer: string;
  choice1: string | null;
  choice2: string | null;
  choice3: string | null;
  choice4: string | null;
}): string {
  const raw = problem.answer.trim();
  if (problem.problemType !== 'MCQ') return raw;
  const idx = Number.parseInt(raw, 10);
  if (!Number.isFinite(idx) || idx < 1 || idx > 4) return raw;
  const choices = [
    problem.choice1,
    problem.choice2,
    problem.choice3,
    problem.choice4,
  ];
  return choices[idx - 1]?.trim() ?? raw;
}

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  async getStages(userId: string) {
    const [user, playableConcepts, clearedCounts] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { wormStage: true, wormProgress: true },
      }),
      this.prisma.concept.findMany({
        where: { problems: { some: {} } },
        select: {
          id: true,
          grade: true,
          semester: true,
          _count: { select: { problems: true } },
        },
      }),
      this.countClearedByConcept(userId),
    ]);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const totalByStage = new Map<number, number>();
    const clearedByStage = new Map<number, number>();
    for (const c of playableConcepts) {
      const stage = semesterToStage(c.grade, c.semester);
      totalByStage.set(stage, (totalByStage.get(stage) ?? 0) + 1);
      const solvedCount = clearedCounts.get(c.id) ?? 0;
      if (c._count.problems > 0 && solvedCount >= c._count.problems) {
        clearedByStage.set(stage, (clearedByStage.get(stage) ?? 0) + 1);
      }
    }

    const stages = Array.from({ length: MAX_WORM_STAGE }, (_, i) => {
      const stage = i + 1;
      const { grade, semester } = stageToSemester(stage);
      const totalNodes = totalByStage.get(stage) ?? 0;
      const clearedNodes = clearedByStage.get(stage) ?? 0;
      return {
        stage,
        slug: WORM_STAGES[i],
        grade,
        semester,
        totalNodes,
        clearedNodes,
        locked: stage > user.wormStage,
        current: stage === user.wormStage,
        cleared: totalNodes > 0 && clearedNodes >= totalNodes,
      };
    });

    return {
      currentStage: user.wormStage,
      currentProgress: user.wormProgress,
      maxStage: MAX_WORM_STAGE,
      stages,
    };
  }

  async getStageNodes(userId: string, stage: number) {
    if (stage < 1 || stage > MAX_WORM_STAGE) {
      throw new BadRequestException('유효하지 않은 스테이지입니다.');
    }

    const { grade, semester } = stageToSemester(stage);

    const [user, concepts] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { wormStage: true },
      }),
      this.prisma.concept.findMany({
        where: { grade, semester },
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        select: {
          ...CONCEPT_NODE_SELECT,
          _count: { select: { problems: true } },
        },
      }),
    ]);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const stageLocked = stage > user.wormStage;
    const playableTotals = new Map<number, number>();
    for (const c of concepts) {
      if (c._count.problems > 0) playableTotals.set(c.id, c._count.problems);
    }
    const clearedSet = await this.getClearedConceptSet(userId, playableTotals);

    // 선형 잠금: 첫 번째 미클리어 플레이가능 노드 = 활성, 그 뒤 플레이가능 노드 = 잠금
    let firstUnclearedSeen = false;
    const nodes = concepts.map((concept) => {
      const playable = concept._count.problems > 0;
      const cleared = playable && clearedSet.has(concept.id);

      let locked: boolean;
      if (stageLocked || !playable) {
        locked = true;
      } else if (cleared) {
        locked = false;
      } else if (!firstUnclearedSeen) {
        firstUnclearedSeen = true;
        locked = false;
      } else {
        locked = true;
      }

      return {
        conceptId: concept.id,
        name: concept.name,
        order: concept.order,
        knowledgeTag: concept.knowledgeTag,
        problemCount: concept._count.problems,
        playable,
        cleared,
        locked,
      };
    });

    return {
      stage,
      slug: WORM_STAGES[stage - 1],
      grade,
      semester,
      stageLocked,
      totalNodes: playableTotals.size,
      clearedNodes: clearedSet.size,
      nodes,
    };
  }

  async getConceptProblems(userId: string, conceptId: number) {
    const [concept, user, problems, solvedRows] = await Promise.all([
      this.prisma.concept.findUnique({
        where: { id: conceptId },
        select: CONCEPT_NODE_SELECT,
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { wormStage: true },
      }),
      this.prisma.problem.findMany({
        where: { conceptId },
        orderBy: [{ difficulty: 'asc' }, { id: 'asc' }],
        select: PROBLEM_PUBLIC_SELECT,
      }),
      this.prisma.learningRecord.findMany({
        where: { userId, correct: true, problem: { conceptId } },
        select: { problemId: true },
        distinct: ['problemId'],
      }),
    ]);
    if (!concept) throw new NotFoundException('개념을 찾을 수 없습니다.');
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const stage = semesterToStage(concept.grade, concept.semester);
    if (stage > user.wormStage) {
      throw new BadRequestException('아직 잠금 해제되지 않은 스테이지입니다.');
    }

    const solvedProblemIds = new Set(solvedRows.map((r) => r.problemId));

    return {
      concept: {
        id: concept.id,
        name: concept.name,
        grade: concept.grade,
        semester: concept.semester,
      },
      problems: problems.map((p) => ({
        ...p,
        solved: solvedProblemIds.has(p.id),
      })),
      clearThreshold: problems.length,
      cleared: problems.length > 0 && solvedProblemIds.size >= problems.length,
    };
  }

  async submitAnswer(
    userId: string,
    dto: { problemId: number; answer: string; timeSpent: number },
  ) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: dto.problemId },
      select: {
        id: true,
        conceptId: true,
        difficulty: true,
        problemType: true,
        answer: true,
        choice1: true,
        choice2: true,
        choice3: true,
        choice4: true,
        explanation: true,
        concept: { select: { grade: true, semester: true } },
      },
    });
    if (!problem) throw new NotFoundException('문제를 찾을 수 없습니다.');

    const stage = semesterToStage(
      problem.concept.grade,
      problem.concept.semester,
    );
    const givenAnswer = dto.answer.trim();
    const correctAnswerText = resolveCorrectAnswer(problem);
    const correct = givenAnswer === correctAnswerText;
    const coinsEarned = correct
      ? calcCoinReward(problem.difficulty, dto.timeSpent)
      : 0;

    // 정적 데이터이므로 트랜잭션 락 밖에서 미리 조회
    const totalNodesPromise = correct
      ? this.prisma.concept.count({
          where: {
            grade: problem.concept.grade,
            semester: problem.concept.semester,
            problems: { some: {} },
          },
        })
      : Promise.resolve(0);
    const totalProblemsInConceptPromise = correct
      ? this.prisma.problem.count({ where: { conceptId: problem.conceptId } })
      : Promise.resolve(0);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          wormStage: true,
          wormProgress: true,
          coins: true,
          stars: true,
        },
      });
      if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
      if (stage > user.wormStage) {
        throw new BadRequestException(
          '아직 잠금 해제되지 않은 스테이지입니다.',
        );
      }

      const priorCorrectIds = await tx.learningRecord.findMany({
        where: {
          userId,
          correct: true,
          problem: { conceptId: problem.conceptId },
        },
        select: { problemId: true },
        distinct: ['problemId'],
      });
      const priorUniqueCorrect = priorCorrectIds.length;
      const alreadyCorrectOnThisProblem = priorCorrectIds.some(
        (r) => r.problemId === problem.id,
      );

      await tx.learningRecord.create({
        data: {
          userId,
          problemId: problem.id,
          correct,
          answerGiven: givenAnswer,
          timeSpent: dto.timeSpent,
          coinsEarned,
          starsEarned: 0,
        },
      });

      const totalProblemsInConcept = await totalProblemsInConceptPromise;
      const nodeNewlyCleared =
        correct &&
        !alreadyCorrectOnThisProblem &&
        totalProblemsInConcept > 0 &&
        priorUniqueCorrect < totalProblemsInConcept &&
        priorUniqueCorrect + 1 >= totalProblemsInConcept;

      let nextStage = user.wormStage;
      let nextProgress = user.wormProgress;
      let stageNewlyCleared = false;

      if (nodeNewlyCleared) {
        nextProgress = user.wormProgress + 1;
        const totalNodes = await totalNodesPromise;
        if (nextProgress >= totalNodes) {
          stageNewlyCleared = true;
          nextProgress = 0;
          if (nextStage < MAX_WORM_STAGE) {
            nextStage += 1;
          }
        }
      }

      const starsEarned = stageNewlyCleared ? 1 : 0;
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          coins: user.coins + coinsEarned,
          stars: user.stars + starsEarned,
          wormStage: nextStage,
          wormProgress: nextProgress,
        },
        select: USER_PUBLIC_SELECT,
      });

      return {
        correct,
        coinsEarned,
        starsEarned,
        nodeNewlyCleared,
        stageNewlyCleared,
        correctAnswer: correctAnswerText,
        explanation: problem.explanation,
        user: updatedUser,
      };
    });

    return result;
  }

  private async countClearedByConcept(
    userId: string,
    conceptIds?: number[],
  ): Promise<Map<number, number>> {
    const rows = await this.prisma.learningRecord.findMany({
      where: {
        userId,
        correct: true,
        ...(conceptIds && { problem: { conceptId: { in: conceptIds } } }),
      },
      select: { problemId: true, problem: { select: { conceptId: true } } },
      distinct: ['problemId'],
    });

    const counts = new Map<number, number>();
    for (const r of rows) {
      const cid = r.problem.conceptId;
      counts.set(cid, (counts.get(cid) ?? 0) + 1);
    }
    return counts;
  }

  private async getClearedConceptSet(
    userId: string,
    conceptTotals: Map<number, number>,
  ) {
    if (conceptTotals.size === 0) return new Set<number>();
    const counts = await this.countClearedByConcept(userId, [
      ...conceptTotals.keys(),
    ]);
    const cleared = new Set<number>();
    for (const [id, total] of conceptTotals) {
      if (total > 0 && (counts.get(id) ?? 0) >= total) cleared.add(id);
    }
    return cleared;
  }
}
