import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError, timer } from 'rxjs';
import { retry } from 'rxjs/operators';

// Neon Free 플랜은 5분 유휴 후 compute 가 suspend 됨.
// 그 상태의 첫 쿼리는 Prisma 레벨에서 다음 에러로 실패하는데,
// 세 경우 모두 "연결/준비 단계" 에러라 재시도가 안전 (서버 상태 변경 전에 실패).
//   P1001 - Can't reach database server
//   P1002 - Database reached but timed out (advisory lock timeout 등)
//   P2024 - Connection pool timed out acquiring a new connection
// 동일 요청이 Neon 을 깨우므로 짧은 대기 후 재시도하면 거의 항상 성공한다.
// 심사 제출/출시 기간 한정 임시 조치. Neon 유료 전환 + scale-to-zero=never 로 전환 시 제거.
const TRANSIENT_CODES = new Set(['P1001', 'P1002', 'P2024']);
const RETRY_DELAYS_MS = [1500, 3000] as const;

@Injectable()
export class PrismaRetryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PrismaRetryInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      retry({
        count: RETRY_DELAYS_MS.length,
        delay: (error, retryCount) => {
          const code = (error as { code?: string })?.code;
          if (!code || !TRANSIENT_CODES.has(code)) {
            return throwError(() => error);
          }
          const waitMs = RETRY_DELAYS_MS[retryCount - 1] ?? 3000;
          const handler = `${context.getClass().name}.${context.getHandler().name}`;
          this.logger.warn(
            `Neon cold-start retry ${retryCount}/${RETRY_DELAYS_MS.length}: ${handler} (${code}), waiting ${waitMs}ms`,
          );
          return timer(waitMs);
        },
      }),
    );
  }
}
