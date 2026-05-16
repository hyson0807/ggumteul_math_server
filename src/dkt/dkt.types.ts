export interface DktSkillEntry {
  knowledge_tag: number;
  skill_id: number;
  probability: number;
}

export interface DktProbabilityEntry {
  knowledge_tag: number;
  probability: number;
}

export interface DktDiagnosis {
  top_strong: DktSkillEntry[];
  bottom_weak: DktSkillEntry[];
  all_probabilities?: DktProbabilityEntry[];
}

export interface DktPredictResponse {
  student_id: string;
  diagnosis: DktDiagnosis;
}

export interface DktPredictInput {
  studentId: string;
  knowledgeTags: number[];
  corrects: (0 | 1)[];
  restrictToTags: number[];
  // 강·약점 각각 몇 개씩 받을지. 미지정 시 DKT 서버 기본 (5).
  topK?: number;
  // True 이면 restrictToTags 범위의 모든 tag별 P_DKT 를 응답에 포함.
  // 추천 알고리즘의 ConceptPriority 계산용.
  includeAllProbabilities?: boolean;
}
