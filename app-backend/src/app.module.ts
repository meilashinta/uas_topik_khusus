import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { RolesModule } from './modules/roles/roles.module';
import { PrioritiesModule } from './modules/priorities/priorities.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { CommentsModule } from './modules/comments/comments.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { StorageModule } from './infrastructure/storage/storage.module';

import { CommonModule } from './common/common.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { RabbitMQModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { HealthModule } from './modules/health/health.module';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { ScheduleModule } from '@nestjs/schedule';

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // 100 requests per minute
    }]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ScheduleModule.forRoot(),
    PrismaModule, CommonModule, RedisModule, RabbitMQModule, HealthModule, AuthModule, UsersModule, RolesModule, DepartmentsModule, CategoriesModule, PrioritiesModule, TicketsModule, AssignmentsModule, CommentsModule, AttachmentsModule, NotificationsModule, DashboardModule, ReportsModule, AuditLogModule, StorageModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule {}
