import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResumesService } from './resumes.service';

interface CreateResumeRequest {
  profile: Record<string, unknown>;
}

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post()
  create(@Body() body: CreateResumeRequest) {
    return this.resumesService.create(body.profile);
  }
}
