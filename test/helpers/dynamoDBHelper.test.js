const { expect } = require('chai');
const sinon = require('sinon');
const { stubDocDBQuery, host, getContext } = require('../support');
const {
  getSiteConfig, getSiteQueryParams, parseURI, getSiteKeyValue,
} = require('../../lambdas/helpers/dynamoDBHelper');

describe('getSiteConfig', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('fetches site config', async () => {
    const params = {};

    const results = {
      Count: 1,
      Items: [{ settings: { bucket_name: 'testBucket' } }],
    };

    stubDocDBQuery(() => results);

    const response = await getSiteConfig(params);
    expect(response).to.deep.equal({ bucket_name: 'testBucket' });
  });

  it('does not fetch site config - not found', async () => {
    const params = {};

    const results = {
      Count: 0,
      Items: [],
    };

    stubDocDBQuery(() => results);

    const response = await getSiteConfig(params);
    expect(response).to.eq(undefined);
  });

  it('rejected', async () => {
    const params = {};

    stubDocDBQuery(() => { throw new Error('test error'); });

    const err = await getSiteConfig(params).catch(e => e);

    expect(err).to.be.a('error');
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

describe('getSiteKeyValue', () => {
  it('fetches siteKey w/o periods', () => {
    const siteKey = 'thisIsIt';
    const host = `${siteKey}.sites-test.federalist.18f.gov`;
    const domain = 'sites-test.federalist.18f.gov';
    expect(getSiteKeyValue(host, domain)).to.equal(siteKey);
  });

  it('fetches siteKey w/ periods', () => {
    const siteKey = 'this.is.it.sites-test';
    const host = `${siteKey}.sites-test.federalist.18f.gov`;
    const domain = 'sites-test.federalist.18f.gov';
    expect(getSiteKeyValue(host, domain)).to.equal(siteKey);
  });
});

describe('getSiteQueryParams', () => {
  it('returns params', () => {
    const expectedParams = {
      TableName: 'federalist-proxy-test',
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames:
        {
          '#id': 'id',
        },
      ExpressionAttributeValues: {
        ':id': 'o-owner-r-repo',
      },
    };
    const context = getContext('viewer-request');
    expect(getSiteQueryParams(host, context.functionName)).to.deep.equal(expectedParams);
  });
});
