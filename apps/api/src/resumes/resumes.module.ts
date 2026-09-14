import { Module } from '@nestjs/common';
import { ScriptsModule } from '../scripts/scripts.module';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

@Module({
  imports: [ScriptsModule],
  controllers: [ResumesController],
  providers: [ResumesService],
})
export class ResumesModule {}
