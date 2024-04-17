import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { S3Service } from 'src/s3/s3.service';
import * as fs from 'fs';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { ArrayUtils } from 'src/utils/arrayUtils';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

@Injectable()
export class TrimTrackService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly s3Service: S3Service,
  ) {}

  async updateTrackTrim(newRuntime, trimUpdated, trackId): Promise<boolean> {
    return this.databaseService
      .query(
        `UPDATE track
     SET runtime = ?, trim_updated = ? WHERE id = UUID_TO_BIN(?)`,
        [newRuntime, trimUpdated, trackId],
      )
      .then(async (result) => {
        return result.affectedRows > 0;
      });
  }

  async getTrackList(): Promise<string> {
    const query = 'SELECT * FROM track limit 10';
    return this.databaseService.query(query);
  }

  async trackTrimOperation(tracks) {
    await ArrayUtils.asyncForEach(tracks, async (_track) => {
      const track = _track;
      // console.log('track', track);
      if (track?.position > 0) {
        const data = await this.s3Service.download(
          `audio/encrypted/${track.id}`,
          'dev-naistro-main-gate',
        );
        let newBuffer: Buffer;
        let trimJobDone = false;
        if (track.type === 'TRIM_START') {
          if (track?.runtime > 0 && track?.runtime > track?.position) {
            newBuffer = (await this.trimMp3New(
              data.Body as Buffer,
              track.position,
              null,
              track.id,
            )) as Buffer;
            trimJobDone = true;
          }
        }
        // if (track.type === 'TRIM_END') {
        //   if (track?.runtime > 0 && track?.runtime > track?.position) {
        //     console.log('end track runtime', track.position);
        //     newBuffer = await this.trimMp3(
        //       data.Body as Buffer,
        //       null,
        //       track.position,
        //     );
        //     trimJobDone = true;
        //   }
        // }
        if (trimJobDone && newBuffer?.length > 0) {
          console.log('trim job done uploading to s3', track.id);
          await this.s3Service.upload(
            `audio/encrypted/${track.id}`,
            newBuffer,
            'dev-naistro-main-gate',
          );
          const newRuntime = track.runtime - track.position;
          const trimUpdated = 1;
          console.log('updating track trim', track.id, newRuntime, trimUpdated);
          const result = await this.updateTrackTrim(
            newRuntime,
            trimUpdated,
            track.id,
          );
          console.log(JSON.stringify(result + track.id));
        } else {
          console.log('No data in buffer');
        }
      } else {
        console.log('No track to trim');
      }
    }).catch((err) => {
      console.log('Error ' + err);
    });
  }

  async updateTrackTrims(): Promise<string> {
    const query = `SELECT BIN_TO_UUID(id) AS id, runtime, duration, type, position FROM track nt left outer join track_marker ntm on nt.id = ntm.track_id
    WHERE position > ? and state = ? and deleted = ? and type = 'TRIM_START' and (trim_updated = ? OR trim_updated IS NULL) and encrypted_filename_md5 != ? and title like '%Désaccord%' order by nt.id, ntm.type limit 2`;
    return new Promise((resolve) => {
      this.databaseService
        .query(query, [0, 'PUBLISHED', 'N', 0, 'null'])
        .then(async (result) => {
          this.trackTrimOperation(result);
          const resultHasdata = result.length > 0 ? 'job started' : 'No data';
          resolve(JSON.stringify(resultHasdata));
        })
        .catch((err) => {
          console.error(err);
          resolve('Error ' + err);
        });
    });
  }

  async getTracksAndFetchFromS3(): Promise<string> {
    return new Promise((resolve) => {
      const query =
        'SELECT BIN_TO_UUID(id) as id FROM track where bpm_overall is null limit 1';
      this.databaseService.query(query).then((result) => {
        console.log('track id ', result);
        this.s3Service
          .download(`audio/encrypted/${result[0].id}`, 'dev-naistro-main-gate')
          .then((data) => {
            console.log(data.Metadata);
            resolve(JSON.stringify(data.ContentLength));
          })
          .catch((err) => {
            console.error(err);
            resolve('Error');
          });
      });
    });
  }

  async trimMp3New(
    inputBuffer,
    startSeconds = null,
    endSeconds = null,
    trackId,
  ) {
    const tempInputPath = path.join('/tmp', 'input_temp.mp3');
    const tempOutputPath = path.join('/tmp', 'output_temp.mp3');
    // Create a temporary input file
    // this.setupFilePaths();

    return new Promise(async (resolve, reject) => {
      await fs.writeFile(tempInputPath, inputBuffer, (err) => {
        if (err) throw err;
      });
      console.log('startSeconds:', startSeconds);
      console.log('endSeconds:', endSeconds);

      if (startSeconds) {
        ffmpeg(tempInputPath)
          .setStartTime(startSeconds)
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
      } else if (endSeconds) {
        ffmpeg(tempInputPath)
          .setDuration(endSeconds)
          .output(tempOutputPath)
          .on('end', async function () {
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
              console.log('Error:', error);
              reject(error);
            }
          })
          .on('error', async function (err) {
            console.log('Error:', err);
            reject(err);

            // Attempt to clean up by deleting temporary files
            try {
              await fs.unlink(tempInputPath, () => {});
              await fs.unlink(tempOutputPath, () => {});
            } catch (cleanupError) {
              console.log('Cleanup error:', cleanupError);
              reject(cleanupError);
            }

            // Reject the promise with the error
            console.log('Error:', err);
            reject(err);
          })
          .run();
      }
    });
  }
}
