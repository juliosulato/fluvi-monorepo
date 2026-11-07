import type { MeResponse } from '@fluvi/contracts';
import { Controller, Get } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

@Controller('me')
export class UsersController {
  @Get()
  getMe(@Session() session: UserSession): MeResponse {
    const { id, name, email, image } = session.user;
    return { id, name, email, image: image ?? null };
  }
}
