import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
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
import {
  DIAGNOSTIC_PID_MIN,
  getDiagnosticIds,
} from '../common/constants/diagnostic';
import { CompleteDiagnosticDto } from './dto/complete-diagnostic.dto';
import { DktService } from '../dkt/dkt.service';

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
  // 우리 커리큘럼의 knowledgeTag 목록 (DKT restrict_to_tags 용).
  // 시드는 부팅 후 변경되지 않으므로 첫 호출 시 1회만 로드.
  private cachedConceptTags: number[] | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dkt: DktService,
  ) {}

  async getStages(userId: string) {
    const [user, playableConcepts, clearedCounts] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { wormStage: true, wormProgress: true },
      }),
      this.prisma.concept.findMany({
        where: { problems: { some: { id: { lt: DIAGNOSTIC_PID_MIN } } } },
        select: {
          id: true,
          grade: true,
          semester: true,
          _count: {
            select: {
              problems: { where: { id: { lt: DIAGNOSTIC_PID_MIN } } },
            },
          },
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
          _count: {
            select: {
              problems: { where: { id: { lt: DIAGNOSTIC_PID_MIN } } },
            },
          },
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
        where: { conceptId, id: { lt: DIAGNOSTIC_PID_MIN } },
        orderBy: [{ difficulty: 'asc' }, { id: 'asc' }],
        select: PROBLEM_PUBLIC_SELECT,
      }),
      this.prisma.learningRecord.findMany({
        where: {
          userId,
          correct: true,
          problemId: { lt: DIAGNOSTIC_PID_MIN },
          problem: { conceptId },
        },
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
    if (dto.problemId >= DIAGNOSTIC_PID_MIN) {
      throw new BadRequestException(
        '진단평가 문제는 이 엔드포인트로 풀 수 없습니다.',
      );
    }
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
      ? this.prisma.problem.count({
          where: {
            conceptId: problem.conceptId,
            id: { lt: DIAGNOSTIC_PID_MIN },
          },
        })
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
          problemId: { lt: DIAGNOSTIC_PID_MIN },
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

  async getDiagnostic(grade: number) {
    const ids = getDiagnosticIds(grade);
    if (!ids) throw new BadRequestException('유효하지 않은 학년입니다.');

    const problems = await this.prisma.problem.findMany({
      where: { id: { in: ids } },
      select: PROBLEM_PUBLIC_SELECT,
    });
    const byId = new Map(problems.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p) => p !== undefined);
  }

  async completeDiagnostic(userId: string, dto: CompleteDiagnosticDto) {
    const ids = getDiagnosticIds(dto.grade);
    if (!ids) throw new BadRequestException('유효하지 않은 학년입니다.');

    const expected = new Set(ids);
    const submitted = new Set(dto.answers.map((a) => a.problemId));
    if (
      submitted.size !== expected.size ||
      ids.some((id) => !submitted.has(id))
    ) {
      throw new BadRequestException(
        '제출된 문제 ID 가 진단평가 문제 집합과 일치하지 않습니다.',
      );
    }

    // idempotent gate 와 채점용 problem 조회는 독립적이므로 병렬.
    const [gateUser, problems] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          diagnosticCompletedAt: true,
          diagnosticScore: true,
        },
      }),
      this.prisma.problem.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          problemType: true,
          answer: true,
          choice1: true,
          choice2: true,
          choice3: true,
          choice4: true,
        },
      }),
    ]);
    if (!gateUser) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    if (gateUser.diagnosticCompletedAt) {
      // 이미 완료 — 기존 결과만 그대로 반환 (LR 중복 생성 X). 전체 user 응답은 별도 조회.
      const fullUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: USER_PUBLIC_SELECT,
      });
      return { user: fullUser!, score: gateUser.diagnosticScore ?? 0 };
    }

    const problemById = new Map(problems.map((p) => [p.id, p]));
    const records = dto.answers.map((a) => {
      const problem = problemById.get(a.problemId);
      if (!problem) {
        throw new BadRequestException(
          `문제 ${a.problemId} 를 찾을 수 없습니다.`,
        );
      }
      const correctText = resolveCorrectAnswer(problem);
      const givenAnswer = a.answer.trim();
      return {
        userId,
        problemId: a.problemId,
        correct: givenAnswer === correctText,
        answerGiven: givenAnswer,
        timeSpent: a.timeSpent ?? 0,
        coinsEarned: 0,
        starsEarned: 0,
      };
    });
    const correctCount = records.filter((r) => r.correct).length;

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.learningRecord.createMany({ data: records });
      return tx.user.update({
        where: { id: userId },
        data: {
          diagnosticCompletedAt: new Date(),
          diagnosticScore: correctCount,
          diagnosticGrade: dto.grade,
        },
        select: USER_PUBLIC_SELECT,
      });
    });

    return { user: updatedUser, score: correctCount };
  }

  async getDiagnosticResult(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        diagnosticCompletedAt: true,
        diagnosticScore: true,
        diagnosticGrade: true,
      },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (!user.diagnosticCompletedAt || !user.diagnosticGrade) {
      throw new NotFoundException('아직 진단평가를 완료하지 않았습니다.');
    }

    const ids = getDiagnosticIds(user.diagnosticGrade) ?? [];
    const records = await this.prisma.learningRecord.findMany({
      where: { userId, problemId: { in: ids } },
      orderBy: { createdAt: 'asc' },
      select: {
        problemId: true,
        correct: true,
        answerGiven: true,
        timeSpent: true,
        problem: {
          select: {
            id: true,
            problemType: true,
            content: true,
            imageUrl: true,
            choice1: true,
            choice2: true,
            choice3: true,
            choice4: true,
            answer: true,
            explanation: true,
            concept: { select: { name: true, grade: true } },
          },
        },
      },
    });

    const recordByPid = new Map(records.map((r) => [r.problemId, r]));
    const items = ids
      .map((pid) => recordByPid.get(pid))
      .filter((r): r is NonNullable<typeof r> => r !== undefined)
      .map((r) => ({
        problemId: r.problemId,
        problemType: r.problem.problemType,
        content: r.problem.content,
        imageUrl: r.problem.imageUrl,
        choice1: r.problem.choice1,
        choice2: r.problem.choice2,
        choice3: r.problem.choice3,
        choice4: r.problem.choice4,
        conceptName: r.problem.concept.name,
        myAnswer: r.answerGiven,
        correctAnswer: resolveCorrectAnswer(r.problem),
        correct: r.correct,
        explanation: r.problem.explanation,
      }));

    return {
      score: user.diagnosticScore ?? 0,
      grade: user.diagnosticGrade,
      completedAt: user.diagnosticCompletedAt,
      items,
    };
  }

  async getDiagnosticProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        diagnosticCompletedAt: true,
        diagnosticGrade: true,
      },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (!user.diagnosticCompletedAt || !user.diagnosticGrade) {
      throw new NotFoundException('아직 진단평가를 완료하지 않았습니다.');
    }

    const ids = getDiagnosticIds(user.diagnosticGrade) ?? [];
    const records = await this.prisma.learningRecord.findMany({
      where: { userId, problemId: { in: ids } },
      orderBy: { createdAt: 'asc' },
      select: {
        correct: true,
        problem: {
          select: { concept: { select: { knowledgeTag: true } } },
        },
      },
    });

    const knowledgeTags: number[] = [];
    const corrects: (0 | 1)[] = [];
    for (const r of records) {
      const tag = r.problem.concept.knowledgeTag;
      if (tag === null || tag === undefined) continue;
      knowledgeTags.push(tag);
      corrects.push(r.correct ? 1 : 0);
    }
    if (knowledgeTags.length === 0) {
      throw new ServiceUnavailableException(
        '진단평가 데이터를 분석 입력으로 변환할 수 없습니다.',
      );
    }

    const restrictToTags = await this.getCachedConceptTags();

    const dkt = await this.dkt.predict({
      studentId: userId,
      knowledgeTags,
      corrects,
      restrictToTags,
    });

    const allEntries = [
      ...dkt.diagnosis.top_5_strong,
      ...dkt.diagnosis.bottom_5_weak,
    ];
    const tags = Array.from(new Set(allEntries.map((e) => e.knowledge_tag)));
    const concepts = await this.prisma.concept.findMany({
      where: { knowledgeTag: { in: tags } },
      select: {
        id: true,
        name: true,
        grade: true,
        semester: true,
        knowledgeTag: true,
      },
    });
    const conceptByTag = new Map(
      concepts
        .filter((c) => c.knowledgeTag !== null)
        .map((c) => [c.knowledgeTag as number, c]),
    );

    const enrich = (
      entries: typeof dkt.diagnosis.top_5_strong,
    ): Array<{
      conceptId: number;
      conceptName: string;
      grade: number;
      semester: number;
      knowledgeTag: number;
      probability: number;
    }> =>
      entries
        .map((e) => {
          const concept = conceptByTag.get(e.knowledge_tag);
          if (!concept) return null;
          return {
            conceptId: concept.id,
            conceptName: concept.name,
            grade: concept.grade,
            semester: concept.semester,
            knowledgeTag: e.knowledge_tag,
            probability: e.probability,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      strong: enrich(dkt.diagnosis.top_5_strong),
      weak: enrich(dkt.diagnosis.bottom_5_weak),
      fetchedAt: new Date().toISOString(),
    };
  }

  private async getCachedConceptTags(): Promise<number[]> {
    if (this.cachedConceptTags) return this.cachedConceptTags;
    const concepts = await this.prisma.concept.findMany({
      where: { knowledgeTag: { not: null } },
      select: { knowledgeTag: true },
    });
    this.cachedConceptTags = concepts
      .map((c) => c.knowledgeTag)
      .filter((t): t is number => t !== null);
    return this.cachedConceptTags;
  }

  private async countClearedByConcept(
    userId: string,
    conceptIds?: number[],
  ): Promise<Map<number, number>> {
    const rows = await this.prisma.learningRecord.findMany({
      where: {
        userId,
        correct: true,
        problemId: { lt: DIAGNOSTIC_PID_MIN },
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
