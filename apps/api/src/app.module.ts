import { Module } from '@nestjs/common';
import { HealthModule } from './health.module';
import { AuthModule } from './auth/auth.module';
import { ResumesModule } from './resumes/resumes.module';
import { ApplicationsModule } from './applications/applications.module';
import { JobPostingsModule } from './job-postings/job-postings.module';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    ResumesModule,
    ApplicationsModule,
    JobPostingsModule,
  ],
})
export class AppModule {}
