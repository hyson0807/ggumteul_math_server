export const MAX_WORM_STAGE = 6;

export const WORM_STAGES = [
  'deep_underground', // Stage 1 — 1학년 1학기
  'shallow_underground', // Stage 2 — 1학년 2학기
  'surface', // Stage 3 — 2학년 1학기
  'sky', // Stage 4 — 2학년 2학기
  'stratosphere', // Stage 5 — 3학년 1학기
  'space', // Stage 6 — 3학년 2학기
] as const;

export type WormStage = (typeof WORM_STAGES)[number];

export type StageSemester = { grade: 1 | 2 | 3; semester: 1 | 2 };

export const STAGE_TO_SEMESTER: Record<number, StageSemester> = {
  1: { grade: 1, semester: 1 },
  2: { grade: 1, semester: 2 },
  3: { grade: 2, semester: 1 },
  4: { grade: 2, semester: 2 },
  5: { grade: 3, semester: 1 },
  6: { grade: 3, semester: 2 },
};

export function stageToSemester(stage: number): StageSemester {
  const mapped = STAGE_TO_SEMESTER[stage];
  if (!mapped) throw new Error(`유효하지 않은 스테이지입니다: ${stage}`);
  return mapped;
}

export function semesterToStage(grade: number, semester: number): number {
  const entry = Object.entries(STAGE_TO_SEMESTER).find(
    ([, v]) => v.grade === grade && v.semester === semester,
  );
  if (!entry) throw new Error(`유효하지 않은 학기입니다: ${grade}-${semester}`);
  return Number(entry[0]);
}

// ──────────────────────────────────
// 애벌레 레벨 / 먹이 (수학 진도 wormStage 와 분리)
// ──────────────────────────────────
// 플레이가능 개념(문제 id < DIAGNOSTIC_PID_MIN 보유) 총 수 = 한 사용자가 모든 개념을
// 클리어해 얻을 수 있는 최대 먹이 수. (시드 기준 229개, problem.csv distinct concept_id)
export const MAX_FEED = 229;
// 애벌레 최고 레벨 (assets/images/caterpillars/level-01~10)
export const WORM_MAX_LEVEL = 10;

// 레벨 n 에 도달하는 데 필요한 누적 소비 먹이 임계값.
// threshold(1)=0, threshold(WORM_MAX_LEVEL)=MAX_FEED 가 되도록 균등 분배 →
// 모든 개념을 클리어(=MAX_FEED 먹이 소비)하면 정확히 최고 레벨에 도달한다.
export function feedThreshold(level: number): number {
  return Math.round(((level - 1) / (WORM_MAX_LEVEL - 1)) * MAX_FEED);
}

// 누적 소비 먹이 수 → 애벌레 레벨 (1 ~ WORM_MAX_LEVEL)
export function levelForConsumed(consumed: number): number {
  for (let n = WORM_MAX_LEVEL; n >= 2; n--) {
    if (consumed >= feedThreshold(n)) return n;
  }
  return 1;
}

export const EQUIP_SLOTS = ['hat', 'body', 'accessory'] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export function isEquipSlot(value: string): value is EquipSlot {
  return (EQUIP_SLOTS as readonly string[]).includes(value);
}
