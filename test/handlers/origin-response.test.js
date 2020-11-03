const { expect } = require('chai');
const { getResponseEvent } = require('../support');

const { originResponse } = require('../../lambdas/app');

describe('originResponse', () => {
  it('returns the message', async () => {
    const strictTransportSecurity = [{ key: 'Strict-Transport-Security', value: 'max-age=31536001; preload' }];
    const xFrameOptions = [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }];
    const xContentTypeOptions = [{ key: 'X-Content-Type-Options', value: 'nosniff' }];
    const xServer = [{ key: 'X-Server', value: 'Federalist' }];

    const response = await originResponse(getResponseEvent());

    expect(Object.keys(response.headers).length).to.equal(4);
    expect(response.headers['strict-transport-security']).to.deep.equal(strictTransportSecurity);
    expect(response.headers['x-frame-options']).to.deep.equal(xFrameOptions);
    expect(response.headers['x-content-type-options']).to.deep.equal(xContentTypeOptions);
    expect(response.headers['x-server']).to.deep.equal(xServer);
  });
});
