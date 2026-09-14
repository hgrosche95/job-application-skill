import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApplicationsService } from './applications.service';

interface CreateApplicationRequest {
  company: string;
  date?: string;
  resumePaths?: string[];
  attachmentPaths?: string[];
}

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  create(@Body() body: CreateApplicationRequest) {
    return this.applicationsService.create(body);
  }

  @Get()
  list() {
    return this.applicationsService.list();
  }
}
