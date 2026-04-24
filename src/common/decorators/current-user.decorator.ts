import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as unknown as Record<string, unknown>)['user'] as
      | Record<string, unknown>
      | undefined;
    return data ? user?.[data] : user;
  },
);
