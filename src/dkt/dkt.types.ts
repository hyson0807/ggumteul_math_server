export interface DktSkillEntry {
  knowledge_tag: number;
  skill_id: number;
  probability: number;
}

export interface DktDiagnosis {
  top_5_strong: DktSkillEntry[];
  bottom_5_weak: DktSkillEntry[];
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
}
