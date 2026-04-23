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

export const EQUIP_SLOTS = ['hat', 'body', 'accessory'] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export function isEquipSlot(value: string): value is EquipSlot {
  return (EQUIP_SLOTS as readonly string[]).includes(value);
}

/** 노드 클리어 판정: 해당 concept의 고유 정답 문제 수 기준 */
export const NODE_CLEAR_THRESHOLD = 2;
