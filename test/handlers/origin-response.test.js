const { expect } = require('chai');
const { originResponse } = require('../../lambdas/app');

const event = {
  Records: [
    {
      cf: {
        response: {
          headers: {},
          status: '200',
          statusDescription: 'OK',
        },
      },
    },
  ],
};

const lambdaHandler = (_event, context = undefined) => new Promise((resolve, reject) => {
  originResponse(_event, context, (error, response) => {
    if (error) { reject(error); }
    resolve(response);
  });
});

describe('The handler function', () => {
  it('returns the message', async () => {
    const strict_transport_security = [{ key: 'Strict-Transport-Security', value: 'max-age=31536001; preload' }];
    const x_frame_options = [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }];

    const response = await lambdaHandler(event, {});

    expect(Object.keys(response.headers).length).to.equal(2);
    expect(response.headers['strict-transport-security']).to.deep.equal(strict_transport_security);
    expect(response.headers['X-Frame-Options']).to.deep.equal(x_frame_options);
  });
});
