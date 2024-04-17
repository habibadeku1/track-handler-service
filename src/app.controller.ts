import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { TrimTrackService } from './trim-track/trim-track.service';
import { AddBpmService } from './add-bpm/add-bpm.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly trimTrackService: TrimTrackService,
    private readonly addBpmService: AddBpmService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('track-trim')
  async getTrackMeta(): Promise<string> {
    return this.trimTrackService.updateTrackTrims();
  }

  @Get('track-bpm')
  async getTrackBpm(): Promise<string> {
    return this.addBpmService.updateTracksBpm();
  }
}
