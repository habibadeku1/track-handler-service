import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { S3Service } from 'src/s3/s3.service';
import { ArrayUtils } from 'src/utils/arrayUtils';
import * as fs from 'fs';
import * as wav from 'node-wav';
import * as ffmpeg from 'fluent-ffmpeg';
import * as musicTempo from 'music-tempo';
import * as path from 'path';

@Injectable()
export class AddBpmService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly s3Service: S3Service,
  ) {}

  async updateTrackBpm(bpm, trackId): Promise<boolean> {
    return this.databaseService
      .query(
        `UPDATE track
     SET bpm_overall = ?, bpm_updated = 1 WHERE id = UUID_TO_BIN(?)`,
        [bpm, trackId],
      )
      .then(async (result) => {
        return result.affectedRows > 0;
      });
  }

  calculateBPM(buffer) {
    try {
      const decoded = wav.decode(buffer);
      if (decoded.sampleRate !== 44100)
        throw new Error('Sample rate must be 44100 Hz');
      const mt = new musicTempo(decoded.channelData[0], { expiryTime: 60 });
      console.log('BPM:', mt.tempo);
      return mt.tempo;
    } catch (error) {
      console.error('Error calculating BPM:', error);
    }
  }

  async getBpm(buffer, trackId) {
    const tempInputPath = path.join('/tmp', 'input_temp.mp3');
    const tempOutputPath = path.join('/tmp', 'output_temp.mp3');
    return new Promise(async (resolve, reject) => {
      await fs.writeFile(tempInputPath, buffer, (err) => {
        if (err) throw err;
      });
      ffmpeg(tempInputPath)
        .toFormat('wav')
        .output(tempOutputPath)
        .on('end', async () => {
          try {
            await fs.readFile(tempOutputPath, async (err, data) => {
              if (err) throw err;
              console.log('The file has been read! ' + trackId);

              // Clean up: Delete temporary files
              await fs.unlink(tempInputPath, () => {});
              await fs.unlink(tempOutputPath, () => {});

              // Resolve the promise with the output buffer
              resolve(data);
            });
          } catch (error) {
            console.log('Error:', error + trackId);
            reject(error);
          }
        })
        .on('error', async function (err) {
          console.log('Error:', err + trackId);

          // Attempt to clean up by deleting temporary files
          try {
            await fs.unlink(tempInputPath, () => {});
            await fs.unlink(tempOutputPath, () => {});
          } catch (cleanupError) {
            console.log('Cleanup error:', cleanupError);
            reject(cleanupError);
          }

          // Reject the promise with the error
          console.log('Error:', err + trackId);
          reject(err);
        })
        .run();
    });
  }

  async trackBpmOperation(tracks) {
    await ArrayUtils.asyncForEach(tracks, async (_track) => {
      const track = _track;
      await this.s3Service
        .download(
          `audio/normalized/${track.id}`,
          'production-naistro-main-gate',
        )
        .then(async (data) => {
          const trackBuffer = data.Body as Buffer;
          const wavBuffer = await this.getBpm(trackBuffer, track.id);

          const bpm = parseInt(this.calculateBPM(wavBuffer));

          console.log('updating track bpm ', track.id, bpm);
          const result = await this.updateTrackBpm(bpm, track.id);
          console.log(JSON.stringify(result + track.id));
        })
        .catch((err) => {
          console.log('Error ' + err);
        });
    }).catch((err) => {
      console.log('Error ' + err);
    });
  }

  async updateTracksBpm(): Promise<string> {
    const query = `SELECT BIN_TO_UUID(id) AS id FROM track where (bpm_updated = 0 OR bpm_updated IS NULL) and deleted = 'N' and encrypted_filename_md5 != 'null' and state = 'PUBLISHED' limit 1000`;
    return new Promise((resolve) => {
      this.databaseService
        .query(query, [0, 'PUBLISHED', 'N', 0, 'null'])
        .then(async (result) => {
          if (result.length > 0) {
            this.trackBpmOperation(result);
          }
          const resultHasdata = result.length > 0 ? 'job started' : 'No data';
          resolve(JSON.stringify(resultHasdata));
        })
        .catch((err) => {
          console.error(err);
          resolve('Error ' + err);
        });
    });
  }
}
