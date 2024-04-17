import { Test, TestingModule } from '@nestjs/testing';
import { TrimTrackService } from './trim-track.service';

describe('TrimTrackService', () => {
  let service: TrimTrackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrimTrackService],
    }).compile();

    service = module.get<TrimTrackService>(TrimTrackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
