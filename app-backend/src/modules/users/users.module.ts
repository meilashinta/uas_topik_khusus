import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { EmailModule } from '../email/email.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { TechniciansController } from './technicians.controller';

@Module({
  imports: [PrismaModule, RedisModule, EmailModule, AuditLogModule],
  controllers: [UsersController, TechniciansController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
