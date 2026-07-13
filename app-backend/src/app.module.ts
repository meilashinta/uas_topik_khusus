import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { PrioritiesModule } from './modules/priorities/priorities.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { CommentsModule } from './modules/comments/comments.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';

@Module({
  imports: [AuthModule, UsersModule, DepartmentsModule, CategoriesModule, PrioritiesModule, TicketsModule, AssignmentsModule, CommentsModule, AttachmentsModule, NotificationsModule, DashboardModule, ReportsModule, AuditLogModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
