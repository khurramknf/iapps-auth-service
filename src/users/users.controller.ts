// services/auth-service/backend/src/users/users.controller.ts
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { User } from './user.entity';
import { Public } from 'src/auth/public.decorator';

@Controller('users')
export class UsersController {
  private users: User[] = [
    { id: '1', email: 'test@example.com', name: 'Test User', password: 'password' },
    { id: '2', email: 'newuser@example.com', name: 'New User', password: 'password' }
  ];

  @Public()
  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    const user = this.users.find((u) => u.email === email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { user };
  }
}
