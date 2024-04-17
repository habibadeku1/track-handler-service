import { Test, TestingModule } from '@nestjs/testing';
import { AddBpmService } from './add-bpm.service';

describe('AddBpmService', () => {
  let service: AddBpmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AddBpmService],
    }).compile();

    service = module.get<AddBpmService>(AddBpmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
