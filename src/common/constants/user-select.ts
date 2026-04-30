export const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  grade: true,
  level: true,
  coins: true,
  stars: true,
  wormStage: true,
  wormProgress: true,
  equippedHatId: true,
  equippedBodyId: true,
  equippedAccessoryId: true,
  createdAt: true,
  diagnosticCompletedAt: true,
  diagnosticScore: true,
  diagnosticGrade: true,
} as const;

export const USER_WITH_PASSWORD_SELECT = {
  ...USER_PUBLIC_SELECT,
  passwordHash: true,
} as const;

export const USER_WITH_REFRESH_SELECT = {
  ...USER_PUBLIC_SELECT,
  refreshToken: true,
} as const;
