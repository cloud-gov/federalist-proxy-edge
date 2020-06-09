const { expect } = require('chai');
const sinon = require('sinon');
const { stubDocDBQuery } = require('../support');

const { originRequest } = require('../../lambdas/app');

const event = {
  Records: [
    {
      cf: {
        config: {
          distributionId: 'EXAMPLE',
        },
        request: {
          uri: '/site/testOwner/testRepo/index.html',
          method: 'GET',
          clientIp: '2001:cdba::3257:9652',
          headers: {
            host: [
              {
                key: 'Host',
                value: 'd123.cf.net',
              },
            ],
            'user-agent': [
              {
                key: 'User-Agent',
                value: 'Test Agent',
              },
            ],
            'user-name': [
              {
                key: 'User-Name',
                value: 'aws-cloudfront',
              },
            ],
          },
        },
      },
    },
  ],
};

describe('originRequest', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns a message', async () => {
    const results = {
      Count: 1,
      Items: [{ settings: { bucket_name: 'testBucket' } }],
    };

    stubDocDBQuery(() => results);

    const response = await originRequest(event);
    expect(response.origin.custom.domainName.split('.')[0]).to.equal('testBucket');
    expect(response.headers.host[0].key).to.equal('host');
    expect(response.headers.host[0].value.split('.')[0]).to.equal('testBucket');
  });
});
