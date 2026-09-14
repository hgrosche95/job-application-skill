import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JobPostingsService } from './job-postings.service';

interface MatchJobPostingRequest {
  postingText: string;
  resumeText: string;
}

@Controller('job-postings')
@UseGuards(JwtAuthGuard)
export class JobPostingsController {
  constructor(private readonly jobPostingsService: JobPostingsService) {}

  @Post('match')
  match(@Body() body: MatchJobPostingRequest) {
    return this.jobPostingsService.match(body);
  }
}
