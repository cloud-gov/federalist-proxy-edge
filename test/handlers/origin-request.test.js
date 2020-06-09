const { expect } = require('chai');
const AWSMocks = require('../support/aws-mocks');

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

const lambdaHandler = (_event, context = undefined) => new Promise((resolve, reject) => {
  originRequest(_event, context, (error, response) => {
    if (error) { reject(error); }
    resolve(response);
  });
});

describe('The handler function', () => {
  it('returns a message', async () => {
    results = {
      Count: 1,
      Items: [{ settings: { bucket_name: 'testBucket' } }],
    };

    AWSMocks.mocks.DynamoDB.DocumentClient.query = ({}, callback) => {
      callback(null, results);
    };

    const response = await lambdaHandler(event, undefined);
    expect(response.origin.custom.domainName.split('.')[0]).to.equal('testBucket');
    expect(response.headers.host[0].key).to.equal('host');
    expect(response.headers.host[0].value.split('.')[0]).to.equal('testBucket');
  });
});
