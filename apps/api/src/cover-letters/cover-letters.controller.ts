import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoverLettersService } from './cover-letters.service';

interface DraftCoverLetterRequest {
  postingText: string;
  resumeText: string;
  applicantName: string;
  previousDraft?: string;
  feedback?: string;
}

@Controller('cover-letters')
@UseGuards(JwtAuthGuard)
export class CoverLettersController {
  constructor(private readonly coverLettersService: CoverLettersService) {}

  @Post()
  draft(@Body() body: DraftCoverLetterRequest) {
    return this.coverLettersService.draft(body);
  }
}
