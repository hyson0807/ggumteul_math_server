export interface DktSkillEntry {
  knowledge_tag: number;
  skill_id: number;
  probability: number;
}

export interface DktDiagnosis {
  top_strong: DktSkillEntry[];
  bottom_weak: DktSkillEntry[];
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
}
