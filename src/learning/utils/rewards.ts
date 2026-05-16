export function calcCoinReward(difficulty: number, timeSpent: number) {
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
export function resolveCorrectAnswer(problem: {
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
