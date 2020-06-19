const { expect } = require('chai');
const { getRequestEvent } = require('../support');
const { getHost } = require('../../lambdas/helpers/utils');

describe('getHost', () => {
  it('fetches host from request', () => {
    const { request } = getRequestEvent().Records[0].cf;
    expect(getHost(request)).to.equal('o-owner-r-repo.sites-test.federalist.18f.gov');
  });
});
