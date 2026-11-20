import {
  COMPRESS_STEPS,
  compressWith,
  fitWithin,
  MAX_UPLOAD_BYTES,
  PhotoProblem,
  type PickedPhoto,
} from './photo-plan';

const photo = (bytes: number): PickedPhoto => ({
  uri: `file:///${bytes}.jpg`,
  width: 1280,
  height: 960,
  bytes,
});

describe('fitWithin', () => {
  it('scales the longest edge down to the cap, keeping the ratio', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
  });

  it('never upscales a small image', () => {
    expect(fitWithin(800, 600, 1280)).toBeNull();
    expect(fitWithin(1280, 720, 1280)).toBeNull();
    expect(fitWithin(0, 0, 1280)).toBeNull();
  });
});

describe('compressWith', () => {
  it('keeps the first pass when it is small enough', async () => {
    const encode = jest.fn().mockResolvedValue(photo(300_000));
    await expect(compressWith(encode)).resolves.toMatchObject({ bytes: 300_000 });
    expect(encode).toHaveBeenCalledTimes(1);
    expect(encode).toHaveBeenCalledWith(COMPRESS_STEPS[0]);
  });

  it('redoes it smaller and stronger when the first pass is over 1 MB', async () => {
    const encode = jest
      .fn()
      .mockResolvedValueOnce(photo(1_400_000))
      .mockResolvedValueOnce(photo(600_000));
    await expect(compressWith(encode)).resolves.toMatchObject({ bytes: 600_000 });
    expect(encode).toHaveBeenLastCalledWith(COMPRESS_STEPS[1]);
  });

  it('refuses a photo still over the upload limit', async () => {
    const encode = jest.fn().mockResolvedValue(photo(MAX_UPLOAD_BYTES + 1));
    await expect(compressWith(encode)).rejects.toEqual(new PhotoProblem('tooLarge'));
  });
});
