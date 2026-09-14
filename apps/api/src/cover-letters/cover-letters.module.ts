import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { CoverLettersController } from './cover-letters.controller';
import { CoverLettersService } from './cover-letters.service';

@Module({
  imports: [LlmModule],
  controllers: [CoverLettersController],
  providers: [CoverLettersService],
})
export class CoverLettersModule {}
