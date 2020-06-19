const { expect } = require('chai');
const { getResponseEvent } = require('../support');

const { originResponse } = require('../../lambdas/app');

describe('originResponse', () => {
  it('returns the message', async () => {
    const strictTransportSecurity = [{ key: 'Strict-Transport-Security', value: 'max-age=31536001; preload' }];
    const xFrameOptions = [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }];

    const response = await originResponse(getResponseEvent());

    expect(Object.keys(response.headers).length).to.equal(2);
    expect(response.headers['strict-transport-security']).to.deep.equal(strictTransportSecurity);
    expect(response.headers['X-Frame-Options']).to.deep.equal(xFrameOptions);
  });
});
