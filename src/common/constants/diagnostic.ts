export const DIAGNOSTIC_PID_MIN = 10001;

export const DIAGNOSTIC_PROBLEM_IDS: Record<1 | 2 | 3, readonly number[]> = {
  1: [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010],
  2: [10021, 10022, 10023, 10024, 10025, 10026, 10027, 10028, 10029, 10030],
  3: [10011, 10012, 10013, 10014, 10015, 10016, 10017, 10018, 10019, 10020],
} as const;

export const DIAGNOSTIC_PROBLEM_COUNT = 10;

/**
 * 학년 → 진단평가 PID 배열. 유효 학년이 아니면 null.
 * Prisma 의 `in` 절이 mutable 배열을 받으므로 사본을 반환한다.
 */
export function getDiagnosticIds(grade: number): number[] | null {
  if (grade === 1 || grade === 2 || grade === 3) {
    return [...DIAGNOSTIC_PROBLEM_IDS[grade]];
  }
  return null;
}
