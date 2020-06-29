const { expect } = require('chai');
const { getResponseEvent } = require('../support');

const { originResponse } = require('../../lambdas/app');

describe('originResponse', () => {
  it('returns the message', async () => {
    const strictTransportSecurity = [{ key: 'Strict-Transport-Security', value: 'max-age=31536001; preload' }];
    const xFrameOptions = [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }];
    const xServer = [{ key: 'X-Server', value: 'Federalist' }];

    const response = await originResponse(getResponseEvent());

    expect(Object.keys(response.headers).length).to.equal(3);
    expect(response.headers['strict-transport-security']).to.deep.equal(strictTransportSecurity);
    expect(response.headers['X-Frame-Options']).to.deep.equal(xFrameOptions);
    expect(response.headers['X-Server']).to.deep.equal(xServer);
  });
});
