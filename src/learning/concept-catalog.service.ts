import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 우리 커리큘럼의 concept 메타데이터를 부팅 후 1회만 조회해 메모리에 캐싱.
 * 시드 변경 시 서버 재시작 필요.
 *
 * LearningService 와 RecommendationService 양쪽에서 동일한 캐시를 사용한다.
 */
@Injectable()
export class ConceptCatalogService {
  private cachedTagsWithGrade:
    | { tag: number; grade: number }[]
    | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getTagsWithGrade(): Promise<{ tag: number; grade: number }[]> {
    if (this.cachedTagsWithGrade) {
      return this.cachedTagsWithGrade;
    }
    const concepts = await this.prisma.concept.findMany({
      where: { knowledgeTag: { not: null } },
      select: { knowledgeTag: true, grade: true },
    });
    this.cachedTagsWithGrade = concepts
      .filter(
        (c): c is { knowledgeTag: number; grade: number } =>
          c.knowledgeTag !== null,
      )
      .map((c) => ({ tag: c.knowledgeTag, grade: c.grade }));
    return this.cachedTagsWithGrade;
  }
}
