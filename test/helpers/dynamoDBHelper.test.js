const { expect } = require('chai');
const sinon = require('sinon');
const { stubDocDBQuery, getContext } = require('../support');
const {
  getSiteConfig, getSiteQueryParams, parseURI, getSiteKeyValue, getAppConfig,
} = require('../../lambdas/helpers/dynamoDBHelper');

describe('getSiteConfig', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('fetches site config', async () => {
    const params = {};

    const results = {
      Item: { settings: { bucket_name: 'testBucket' } },
    };

    stubDocDBQuery(() => results);

    const response = await getSiteConfig(params);
    expect(response).to.deep.equal({ bucket_name: 'testBucket' });
  });

  it('does not fetch site config - not found', async () => {
    const params = {};

    const results = {};

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
      Key: {
        id: 'the.site.key',
      },
    };
    const context = getContext('viewer-request');
    const host = 'the.site.key.sites-test.federalist.18f.gov';
    expect(getSiteQueryParams(host, context.functionName)).to.deep.equal(expectedParams);
  });
});

describe('getAppConfig', () => {
  it('get test', () => {
    const context = getContext('viewer-request');
    expect(getAppConfig(context.functionName)).to.deep.equal({
      appEnv: 'test',
      domain: 'sites-test.federalist.18f.gov',
      tableName: 'federalist-proxy-test',
      siteKey: 'id',
    });
  });

  it('get staging', () => {
    const context = getContext('viewer-request');
    expect(getAppConfig(context.functionName.replace('test', 'staging'))).to.deep.equal({
      appEnv: 'staging',
      domain: 'sites-staging.federalist.18f.gov',
      tableName: 'federalist-proxy-staging',
      siteKey: 'id',
    });
  });

  it('get prod', () => {
    const context = getContext('viewer-request');
    expect(getAppConfig(context.functionName.replace('test', 'prod'))).to.deep.equal({
      appEnv: 'production',
      domain: 'sites-prod.federalist.18f.gov',
      tableName: 'federalist-proxy-prod',
      siteKey: 'id',
    });
  });
});
