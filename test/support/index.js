const AWS = require('aws-sdk');
const sinon = require('sinon');

const host = 'o-owner-r-repo.sites-test.federalist.18f.gov';

function stubDocDBQuery(fn) {
  return sinon.stub(AWS.DynamoDB, 'DocumentClient')
    .returns({
      query: () => ({
        promise: async () => fn(),
      }),
    });
}

const event = ({
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
                value: host,
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
});

const getContext = (eventType) => ({ functionName: `us-east-1:federalist-proxy-test-${eventType}:0`});

module.exports = {
  stubDocDBQuery, getContext, event, host
};
