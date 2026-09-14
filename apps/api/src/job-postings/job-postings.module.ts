import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { JobPostingsController } from './job-postings.controller';
import { JobPostingsService } from './job-postings.service';

@Module({
  imports: [LlmModule],
  controllers: [JobPostingsController],
  providers: [JobPostingsService],
})
export class JobPostingsModule {}
