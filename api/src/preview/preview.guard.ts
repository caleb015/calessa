import { CanActivate, ExecutionContext, Injectable, createParamDecorator } from '@nestjs/common';
import { PREVIEW_HEADER, PreviewService } from './preview.service';

/** Never blocks: marks the request as a preview when it carries a valid preview token. */
@Injectable()
export class PreviewGuard implements CanActivate {
  constructor(private readonly preview: PreviewService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.sitePreview = await this.preview.isValid(req.headers?.[PREVIEW_HEADER]);
    return true;
  }
}

/** True when PreviewGuard found a valid preview token on the request. */
export const SitePreview = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): boolean => ctx.switchToHttp().getRequest().sitePreview === true,
);
