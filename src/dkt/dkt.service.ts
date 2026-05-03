import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DktPredictInput,
  DktPredictResponse,
} from './dkt.types';

@Injectable()
export class DktService {
  private readonly logger = new Logger(DktService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('DKT_BASE_URL').replace(/\/+$/, '');
    this.timeoutMs = Number(config.get<string>('DKT_TIMEOUT_MS') ?? '10000');
  }

  async predict(input: DktPredictInput): Promise<DktPredictResponse> {
    const body = {
      student_id: input.studentId,
      knowledge_tags: input.knowledgeTags,
      corrects: input.corrects,
      restrict_to_tags: input.restrictToTags,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(
          `DKT predict 실패: status=${res.status} body=${text.slice(0, 200)}`,
        );
        throw new ServiceUnavailableException(
          'AI 분석 서버 호출에 실패했습니다.',
        );
      }

      const data = (await res.json()) as DktPredictResponse;
      if (!data?.diagnosis?.top_5_strong || !data?.diagnosis?.bottom_5_weak) {
        throw new ServiceUnavailableException(
          'AI 분석 서버가 비정상 응답을 반환했습니다.',
        );
      }
      return data;
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      const reason = e instanceof Error ? e.message : 'unknown';
      this.logger.warn(`DKT predict 예외: ${reason}`);
      throw new ServiceUnavailableException(
        'AI 분석 서버에 연결할 수 없습니다.',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
