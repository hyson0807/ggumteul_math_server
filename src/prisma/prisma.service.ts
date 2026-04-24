import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Neon Free 플랜은 5분 유휴 후 compute 가 suspend 됨. 그 상태에서 첫 쿼리는
// P1001("Can't reach database server") 또는 P1002(advisory lock timeout) 로 실패하지만,
// 동일 요청이 Neon 을 깨우므로 짧은 대기 후 재시도하면 거의 항상 성공.
// P2024 는 connection pool 타임아웃으로, cold-start 구간에서 동반 발생.
const TRANSIENT_CODES = new Set(['P1001', 'P1002', 'P2024']);
// 지수 백오프: 1차 실패 → 1.5s 대기 → 2차 시도 → 실패 시 3s 대기 → 3차 시도.
// 2회 재시도 기준 "여전히 suspend" 확률은 1% 이하로 떨어짐.
const RETRY_DELAYS_MS = [1500, 3000] as const;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();

    const extended = this.$extends({
      name: 'neonColdStartRetry',
      query: {
        async $allOperations({ args, query, operation, model }) {
          let lastErr: unknown;
          for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
            try {
              return await query(args);
            } catch (e) {
              const code = (e as { code?: string })?.code;
              if (!code || !TRANSIENT_CODES.has(code)) throw e;
              lastErr = e;
              if (attempt === RETRY_DELAYS_MS.length) break;
              const delay = RETRY_DELAYS_MS[attempt];
              PrismaService.logger.warn(
                `Neon cold-start retry ${attempt + 1}/${RETRY_DELAYS_MS.length}: ${model ?? ''}.${operation} (${code}), waiting ${delay}ms`,
              );
              await new Promise((r) => setTimeout(r, delay));
            }
          }
          throw lastErr;
        },
      },
    });

    // 모델 쿼리/raw 쿼리/$transaction 등은 retry 가 적용된 확장 클라이언트로 위임.
    // onModuleInit/Destroy 는 Nest 생명주기 메서드이므로 서비스 인스턴스에 유지.
    // $connect/$disconnect 는 extended 가 베이스와 엔진을 공유하므로 양쪽 어느 쪽을
    // 호출해도 동일하지만, 명시적으로 extended 를 통해 호출해 retry 보호를 받는다.
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop === 'onModuleInit' || prop === 'onModuleDestroy') {
          return Reflect.get(target, prop, receiver);
        }
        const value = (extended as unknown as Record<string | symbol, unknown>)[
          prop as string
        ];
        if (value !== undefined) {
          return typeof value === 'function'
            ? (value as (...a: unknown[]) => unknown).bind(extended)
            : value;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
