import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { USER_PUBLIC_SELECT } from '../../common/constants/user-select';
import { PROBLEM_PUBLIC_SELECT } from '../../common/constants/learning-select';
import { DIAGNOSTIC_PID_MIN } from '../../common/constants/diagnostic';
import { RecordSource } from '@prisma/client';
import { DktService } from '../../dkt/dkt.service';
import { ConceptCatalogService } from '../concept-catalog.service';
import { calcCoinReward, resolveCorrectAnswer } from '../utils/rewards';
import { SubmitRecommendationAnswerDto } from './dto/submit-recommendation-answer.dto';

// 한 추천 세션의 총 문제 수
const SESSION_SIZE = 5;
// ProblemPriority 기반으로 뽑는 추천 문제 수 (나머지는 학년 풀 랜덤)
const RECOMMENDED_COUNT = 2;
const RANDOM_COUNT = SESSION_SIZE - RECOMMENDED_COUNT;
// DKT bottom_weak top-K — PrerequisiteNeed 계산 시 "후행 약점" 정의에 사용
const BOTTOM_WEAK_K = 5;
// DKT 시계열 길이 상한 (모델 max_seq_len 보호 + 추론 시간 안정화)
const DKT_SEQUENCE_LIMIT = 200;
// 시계열에 없는 concept 의 P_DKT 디폴트 (중립값)
const DEFAULT_P_DKT = 0.5;
// 문제 difficulty (-3, 0, 3) → 정규화된 난이도 (0.2, 0.5, 0.8)
const DIFFICULTY_NORM: Record<number, number> = { [-3]: 0.2, 0: 0.5, 3: 0.8 };
const DIFFICULTY_NORM_FALLBACK = 0.5;

export type RecommendationSource = 'recommended' | 'random_grade';

export interface RecommendationProblem {
  id: number;
  conceptId: number;
  conceptName: string;
  problemType: 'SUBJ' | 'MCQ';
  difficulty: number;
  content: string;
  imageUrl: string | null;
  choice1: string | null;
  choice2: string | null;
  choice3: string | null;
  choice4: string | null;
  source: RecommendationSource;
  rank?: number;
}

@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dkt: DktService,
    private readonly conceptCatalog: ConceptCatalogService,
  ) {}

  async startSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        diagnosticCompletedAt: true,
        diagnosticGrade: true,
      },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (!user.diagnosticCompletedAt || !user.diagnosticGrade) {
      throw new BadRequestException('진단평가를 먼저 완료해주세요.');
    }
    const userGrade = user.diagnosticGrade;

    const [records, allTagsWithGrade, gradeProblems, solvedCorrectRows] =
      await Promise.all([
        // 시계열: 진단(PID >= DIAGNOSTIC_PID_MIN) + 추천 세션(source) 기록만.
        // 일반 개념 학습(problemId < DIAGNOSTIC_PID_MIN & CONCEPT)은 DKT 시계열에서 제외.
        // 진단 식별은 source 가 아닌 PID 기준 — 레거시 데이터(source=CONCEPT 로 저장된
        // 진단 기록)에서도 견고하게 동작한다 (getDiagnosticProfile 과 동일 패턴).
        this.prisma.learningRecord.findMany({
          where: {
            userId,
            OR: [
              { problemId: { gte: DIAGNOSTIC_PID_MIN } },
              { source: RecordSource.RECOMMENDATION },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: DKT_SEQUENCE_LIMIT,
          select: {
            correct: true,
            problem: {
              select: { concept: { select: { knowledgeTag: true } } },
            },
          },
        }),
        this.conceptCatalog.getTagsWithGrade(),
        // 출제 후보: 진단평가 제외 + 사용자 학년 이하
        this.prisma.problem.findMany({
          where: {
            id: { lt: DIAGNOSTIC_PID_MIN },
            concept: { grade: { lte: userGrade } },
          },
          select: {
            ...PROBLEM_PUBLIC_SELECT,
            concept: {
              select: {
                id: true,
                name: true,
                grade: true,
                knowledgeTag: true,
              },
            },
          },
        }),
        // 이미 정답 맞힌 problemId — 추천 풀에서 제외
        this.prisma.learningRecord.findMany({
          where: {
            userId,
            correct: true,
            problemId: { lt: DIAGNOSTIC_PID_MIN },
          },
          select: { problemId: true },
          distinct: ['problemId'],
        }),
      ]);

    // 시계열 입력: desc 로 받았으니 시간 오름차순으로 뒤집어 DKT 에 전달
    const orderedRecords = [...records].reverse();
    const knowledgeTags: number[] = [];
    const corrects: (0 | 1)[] = [];
    for (const r of orderedRecords) {
      const tag = r.problem.concept.knowledgeTag;
      if (tag === null || tag === undefined) continue;
      knowledgeTags.push(tag);
      corrects.push(r.correct ? 1 : 0);
    }
    if (knowledgeTags.length === 0) {
      throw new ServiceUnavailableException(
        '학습 데이터를 분석 입력으로 변환할 수 없습니다.',
      );
    }

    const restrictToTags = allTagsWithGrade
      .filter((c) => c.grade <= userGrade)
      .map((c) => c.tag);

    const dkt = await this.dkt.predict({
      studentId: userId,
      knowledgeTags,
      corrects,
      restrictToTags,
      topK: BOTTOM_WEAK_K,
      includeAllProbabilities: true,
    });

    const allProbabilities = dkt.diagnosis.all_probabilities;
    if (!allProbabilities || allProbabilities.length === 0) {
      throw new ServiceUnavailableException(
        'AI 분석 결과가 비어 있어 추천을 생성할 수 없습니다.',
      );
    }
    const probByTag = new Map<number, number>(
      allProbabilities.map((e) => [e.knowledge_tag, e.probability]),
    );
    const bottomWeakTags = new Set<number>(
      dkt.diagnosis.bottom_weak.map((e) => e.knowledge_tag),
    );

    // 후보 풀 (정답 제외)
    const solvedSet = new Set(solvedCorrectRows.map((r) => r.problemId));
    const candidatePool = gradeProblems.filter((p) => !solvedSet.has(p.id));
    if (candidatePool.length < SESSION_SIZE) {
      throw new BadRequestException(
        '추천할 문제가 부족합니다. 새로운 학습 활동 후 다시 시도해주세요.',
      );
    }

    const uniqueConceptIds = Array.from(
      new Set(candidatePool.map((p) => p.concept.id)),
    );
    const relations = await this.prisma.conceptRelation.findMany({
      where: { prerequisiteConceptId: { in: uniqueConceptIds } },
      select: {
        prerequisiteConceptId: true,
        targetConcept: { select: { knowledgeTag: true, grade: true } },
      },
    });

    // prereq conceptId → [후행 concept 의 knowledgeTag]. 학습 영역 외 후행은 제외.
    const targetsByPrereq = new Map<number, number[]>();
    for (const rel of relations) {
      const target = rel.targetConcept;
      if (target.knowledgeTag === null || target.grade > userGrade) continue;
      const arr = targetsByPrereq.get(rel.prerequisiteConceptId) ?? [];
      arr.push(target.knowledgeTag);
      targetsByPrereq.set(rel.prerequisiteConceptId, arr);
    }

    const conceptPriorityCache = new Map<number, number>();
    const getConceptPriority = (
      conceptId: number,
      conceptKnowledgeTag: number | null,
    ): number => {
      const cached = conceptPriorityCache.get(conceptId);
      if (cached !== undefined) return cached;

      const pDkt =
        conceptKnowledgeTag !== null
          ? probByTag.get(conceptKnowledgeTag) ?? DEFAULT_P_DKT
          : DEFAULT_P_DKT;
      const weakness = 1 - pDkt;

      const targetTags = targetsByPrereq.get(conceptId) ?? [];
      const weakTargetWeaknesses: number[] = [];
      for (const tag of targetTags) {
        if (!bottomWeakTags.has(tag)) continue;
        const p = probByTag.get(tag) ?? DEFAULT_P_DKT;
        weakTargetWeaknesses.push(1 - p);
      }

      let prereqNeed = 0;
      if (weakTargetWeaknesses.length > 0) {
        const avg =
          weakTargetWeaknesses.reduce((s, v) => s + v, 0) /
          weakTargetWeaknesses.length;
        const countBonus = Math.min(0.1 * weakTargetWeaknesses.length, 0.3);
        prereqNeed = avg + countBonus;
      }

      const priority = 0.7 * weakness + 0.3 * prereqNeed;
      conceptPriorityCache.set(conceptId, priority);
      return priority;
    };

    // ProblemPriority 산출
    const scored = candidatePool
      .map((p) => {
        const conceptTag = p.concept.knowledgeTag;
        const cp = getConceptPriority(p.concept.id, conceptTag);
        const pDkt =
          conceptTag !== null
            ? probByTag.get(conceptTag) ?? DEFAULT_P_DKT
            : DEFAULT_P_DKT;
        const diffNorm =
          DIFFICULTY_NORM[p.difficulty] ?? DIFFICULTY_NORM_FALLBACK;
        const fit = 1 - Math.abs(pDkt - diffNorm);
        const score = 0.85 * cp + 0.15 * fit;
        return { problem: p, score };
      })
      .sort((a, b) => b.score - a.score);

    const recommendedProblems = scored
      .slice(0, RECOMMENDED_COUNT)
      .map((s) => s.problem);
    const recommendedIds = new Set(recommendedProblems.map((p) => p.id));

    const randomCandidates = candidatePool.filter(
      (p) => !recommendedIds.has(p.id),
    );
    shuffleInPlace(randomCandidates);
    const randomProblems = randomCandidates.slice(0, RANDOM_COUNT);
    if (randomProblems.length < RANDOM_COUNT) {
      throw new BadRequestException(
        '추천할 문제가 부족합니다. 새로운 학습 활동 후 다시 시도해주세요.',
      );
    }

    type CandidateProblem = (typeof candidatePool)[number];
    interface OrderedEntry {
      problem: CandidateProblem;
      source: RecommendationSource;
      rank?: number;
    }

    // 인터리브 [random, recommended, random, recommended, random]
    const ordered: OrderedEntry[] = [];
    let recommendedRank = 0;
    for (let i = 0; i < SESSION_SIZE; i++) {
      const isRecommendedSlot = i % 2 === 1;
      const next = isRecommendedSlot
        ? recommendedProblems.shift() ?? randomProblems.shift()
        : randomProblems.shift() ?? recommendedProblems.shift();
      if (!next) break;
      const isRecommended = recommendedIds.has(next.id);
      ordered.push({
        problem: next,
        source: isRecommended ? 'recommended' : 'random_grade',
        rank: isRecommended ? ++recommendedRank : undefined,
      });
    }

    const problems: RecommendationProblem[] = ordered.map((entry) => {
      const p = entry.problem;
      return {
        id: p.id,
        conceptId: p.concept.id,
        conceptName: p.concept.name,
        problemType: p.problemType,
        difficulty: p.difficulty,
        content: p.content,
        imageUrl: p.imageUrl,
        choice1: p.choice1,
        choice2: p.choice2,
        choice3: p.choice3,
        choice4: p.choice4,
        source: entry.source,
        rank: entry.rank,
      };
    });

    return {
      sessionId: randomUUID(),
      generatedAt: new Date().toISOString(),
      problems,
    };
  }

  async submitAnswer(userId: string, dto: SubmitRecommendationAnswerDto) {
    if (dto.problemId >= DIAGNOSTIC_PID_MIN) {
      throw new BadRequestException(
        '진단평가 문제는 추천 세션에서 제출할 수 없습니다.',
      );
    }

    const [user, problem] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { diagnosticGrade: true },
      }),
      this.prisma.problem.findUnique({
        where: { id: dto.problemId },
        select: {
          id: true,
          problemType: true,
          difficulty: true,
          answer: true,
          choice1: true,
          choice2: true,
          choice3: true,
          choice4: true,
          explanation: true,
          concept: { select: { grade: true } },
        },
      }),
    ]);

    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (!user.diagnosticGrade) {
      throw new BadRequestException('진단평가를 먼저 완료해주세요.');
    }
    if (!problem) throw new NotFoundException('문제를 찾을 수 없습니다.');
    if (problem.concept.grade > user.diagnosticGrade) {
      throw new BadRequestException(
        '학년에 맞지 않는 문제는 추천 세션에서 제출할 수 없습니다.',
      );
    }

    const correctAnswer = resolveCorrectAnswer(problem);
    const userAnswer = dto.answer.trim();
    const correct = userAnswer === correctAnswer;
    const coinsEarned = correct
      ? calcCoinReward(problem.difficulty, dto.timeSpent)
      : 0;

    // 트랜잭션: LearningRecord 생성 + coins 증가 (wormProgress/wormStage 절대 미수정)
    const [, updatedUser] = await this.prisma.$transaction([
      this.prisma.learningRecord.create({
        data: {
          userId,
          problemId: problem.id,
          source: RecordSource.RECOMMENDATION,
          sessionId: dto.sessionId ?? null,
          correct,
          answerGiven: userAnswer,
          timeSpent: dto.timeSpent,
          coinsEarned,
          starsEarned: 0,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { coins: { increment: coinsEarned } },
        select: USER_PUBLIC_SELECT,
      }),
    ]);

    return {
      correct,
      coinsEarned,
      starsEarned: 0,
      correctAnswer,
      explanation: problem.explanation,
      user: updatedUser,
    };
  }

  async getHistory(userId: string) {
    const records = await this.prisma.learningRecord.findMany({
      where: { userId, source: RecordSource.RECOMMENDATION },
      select: {
        sessionId: true,
        createdAt: true,
        correct: true,
        coinsEarned: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // 세션 단위 그룹핑. sessionId 가 있으면 세션 키로 묶고, 없으면(구버전 기록)
    // 날짜 단위로 묶어 과거 동작과 호환시킨다.
    interface SessionGroup {
      sessionId: string | null;
      startedAt: Date; // 세션 내 가장 이른 기록 시각
      totalProblems: number;
      correctCount: number;
      coinsEarned: number;
    }
    const groups = new Map<string, SessionGroup>();
    for (const r of records) {
      const key = r.sessionId ?? `date:${r.createdAt.toISOString().slice(0, 10)}`;
      const g = groups.get(key);
      if (!g) {
        groups.set(key, {
          sessionId: r.sessionId,
          startedAt: r.createdAt,
          totalProblems: 1,
          correctCount: r.correct ? 1 : 0,
          coinsEarned: r.coinsEarned,
        });
      } else {
        g.totalProblems++;
        if (r.correct) g.correctCount++;
        g.coinsEarned += r.coinsEarned;
        // records 는 createdAt desc — 더 이른 시각으로 startedAt 갱신
        if (r.createdAt < g.startedAt) g.startedAt = r.createdAt;
      }
    }

    return [...groups.values()]
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, 30)
      .map((g) => ({
        sessionId: g.sessionId,
        startedAt: g.startedAt.toISOString(),
        totalProblems: g.totalProblems,
        correctCount: g.correctCount,
        coinsEarned: g.coinsEarned,
      }));
  }
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
