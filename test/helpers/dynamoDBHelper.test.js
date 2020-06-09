const { expect } = require('chai');
const AWSMocks = require('../support/aws-mocks');

const {
  getSiteConfig, getSiteQueryParams, parseURI, getSubdomain,
} = require('../../lambdas/helpers/dynamoDBHelper');

describe.only('getSiteConfig', () => {
  afterEach(() => {
    AWSMocks.resetMocks();
  });

  it('fetches site config', async () => {
    const params = {};

    const results = {
      Count: 1,
      Items: [{ settings: { bucket_name: 'testBucket' } }],
    };

    AWSMocks.mocks.DynamoDB.DocumentClient.query = () => results;

    const response = await getSiteConfig(params);
    expect(response).to.deep.equal({ bucket_name: 'testBucket' });
  });

  it('does not fetch site config - not found', async () => {
    const params = {};

    const results = {
      Count: 0,
      Items: [],
    };

    AWSMocks.mocks.DynamoDB.DocumentClient.query = () => results;

    const response = await getSiteConfig(params);
    expect(response).to.be.undefined;
  });

  it('rejected', async () => {
    const params = {};

    AWSMocks.mocks.DynamoDB.DocumentClient.query = () => {
      throw new Error('test error');
    };

    expect(getSiteConfig(params)).to.eventually.be.rejected;
  });
});

describe('parseURI', () => {
  it('preview branch', () => {
    const request = { uri: '/preview/testOwner/testRepo/testBranch/index.html' };
    expect(parseURI(request)).to.deep.equal({
      owner: 'testOwner',
      repository: 'testRepo',
      siteType: 'preview',
      branch: 'testBranch',
    });
  });

  it('non-preview branch', () => {
    const request = { uri: '/site/testOwner/testRepo/index.html' };
    expect(parseURI(request)).to.deep.equal({
      owner: 'testOwner',
      repository: 'testRepo',
      siteType: 'site',
      branch: null,
    });
  });
});

describe('getSubdomain', () => {
  it('fetches subdomain', () => {
    const request = {
      headers: {
        host: [
          {
            key: 'Host',
            value: 'subdomain.example.gov',
          },
        ],
      },
    };
    expect(getSubdomain(request)).to.equal('subdomain');
  });
});

describe('getSiteQueryParams', () => {
  it('returns params', () => {
    const tableName = 'testTable';
    // const owner = 'testOwner';
    // const repository = 'testRepo';
    const siteKey = 'id';
    const siteKeyValue = 'site-key';

    const expectedParams = {
      TableName: 'testTable',
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames:
        {
          '#id': 'id',
        },
      ExpressionAttributeValues: {
        ':id': 'site-key',
      },
    };
    expect(getSiteQueryParams(tableName, siteKey, siteKeyValue)).to.deep.equal(expectedParams);
  });
});
