import { parseCloudinaryUrl, signParams } from './cloudinary';

describe('parseCloudinaryUrl', () => {
  it('reads key, secret and cloud name', () => {
    expect(parseCloudinaryUrl('cloudinary://123456:abc-SECRET_x@my-cloud')).toEqual({
      apiKey: '123456', apiSecret: 'abc-SECRET_x', cloudName: 'my-cloud',
    });
  });

  it('returns null when missing or malformed', () => {
    expect(parseCloudinaryUrl(undefined)).toBeNull();
    expect(parseCloudinaryUrl('')).toBeNull();
    expect(parseCloudinaryUrl('https://example.com')).toBeNull();
  });
});

describe('signParams', () => {
  // Example from Cloudinary's "Generating authentication signatures" docs.
  it('matches Cloudinary\'s documented signature', () => {
    const signature = signParams(
      { eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 },
      'abcd',
    );
    expect(signature).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });

  it('does not depend on the order params are given in', () => {
    expect(signParams({ b: 2, a: 1 }, 's')).toBe(signParams({ a: 1, b: 2 }, 's'));
  });
});
