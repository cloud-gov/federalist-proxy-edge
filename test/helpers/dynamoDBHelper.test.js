const { expect } = require('chai');
const sinon = require('sinon');
const { stubDocDBQuery, getContext } = require('../support');
const {
  getSite, querySite, getSiteQueryParams, getSiteItemParams, parseURI, stripSiteIndexFromHost, getAppConfig, functionNameRE,
} = require('../../lambdas/helpers/dynamoDBHelper');

describe('getSite', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('fetches site config', async () => {
    const params = {};

    const results = {
      Item: { Settings: { BucketName: 'testBucket' } },
    };

    stubDocDBQuery(() => results);

    const response = await getSite(params);
    expect(response).to.deep.equal({ Settings: { BucketName: 'testBucket' } });
  });

  it('does not fetch site config - not found', async () => {
    const params = {};

    const results = {};

    stubDocDBQuery(() => results);

    const response = await getSite(params);
    expect(response).to.eq(undefined);
  });

  it('rejected', async () => {
    const params = {};

    stubDocDBQuery(() => { throw new Error('test error'); });

    const err = await getSite(params).catch(e => e);

    expect(err).to.be.a('error');
  });
});

describe('querySite', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('fetches sites by query - results found', async () => {
    const params = {};

    const results = {
      Count: 1,
      Items: [{ Settings: { BucketName: 'testBucket' } }],
    };

    stubDocDBQuery(() => results);

    const response = await querySite(params);
    expect(response).to.deep.equal([{ Settings: { BucketName: 'testBucket' } }]);
  });

  it('fetches sites by query - results not found', async () => {
    const params = {};

    const results = {
      Count: 0,
      Items: [],
    };

    stubDocDBQuery(() => results);

    const response = await querySite(params);
    expect(response).to.deep.equal([]);
  });

  it('fetches sites by query - rejected', async () => {
    const params = {};

    stubDocDBQuery(() => { throw new Error('test error'); });

    const err = await querySite(params).catch(e => e);

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

describe('stripSiteIndexFromHost', () => {
  it('fetches siteKey w/o periods', () => {
    const siteKey = 'thisIsIt';
    const host = `${siteKey}.sites-test.federalist.18f.gov`;
    const domain = 'sites-test.federalist.18f.gov';
    expect(stripSiteIndexFromHost(host, domain)).to.equal(siteKey);
  });

  it('fetches siteKey w/ periods', () => {
    const siteKey = 'this.is.it.sites-test';
    const host = `${siteKey}.sites-test.federalist.18f.gov`;
    const domain = 'sites-test.federalist.18f.gov';
    expect(stripSiteIndexFromHost(host, domain)).to.equal(siteKey);
  });

  it('fetches siteKey w/o periods', () => {
    const siteKey = 'thisIsIt';
    const host = `${siteKey}.sites-dev.federalist.18f.gov`;
    const domain = 'sites-test.federalist.18f.gov';
    expect(() => stripSiteIndexFromHost(host, domain)).to.throw();
  });
});


describe('getSiteItemParams', () => {
  it('returns params', () => {
    const expectedParams = {
      TableName: 'federalist-proxy-test',
      Key: {
        Id: 'the.site.key',
      },
    };
    const context = getContext('viewer-request');
    const host = 'the.site.key.sites-test.federalist.18f.gov';
    expect(getSiteItemParams(host, context.functionName)).to.deep.equal(expectedParams);
  });
});

describe('getSiteQueryParams', () => {
  it('returns params', () => {
    const expectedParams = {
      TableName: 'federalist-proxy-test',
      ExpressionAttributeNames: {
        '#originKey': 'BucketName',
      },
      ExpressionAttributeValues: {
        ':origin_key_value': {
          'S': 'theBucket',
        },
      },
      IndexName: 'BucketNameIdx',
      KeyConditionExpression: '#originKey = :origin_key_value',
    };
    const context = getContext('origin-response');
    const host = 'theBucket.app.cloud.gov';
    expect(getSiteQueryParams(host, context.functionName)).to.deep.equal(expectedParams);
  });
});

describe('functionNameRE', () => {
  /* eslint-disable no-unused-expressions */
  it('returns matches', () => {
    const appEnvs = ['test', 'staging', 'prod'];
    const eventTypes = ['origin-request', 'origin-response', 'viewer-request', 'viewer-response'];
    let i;
    let j;
    let match;
    let functionName;
    for (i = 0; i < appEnvs.length; i += 1) {
      for (j = 0; j < eventTypes.length; j += 1) {
        functionName = `us-east-1.federalist-proxy-${appEnvs[i]}-${eventTypes[j]}`;
        match = functionNameRE.exec(functionName);
        expect(match).to.be.an('array');
      }
    }
  });

  it('fails for non test, staging and prod envs', () => {
    const functionName = 'us-east-1.federalist-proxy-dev-viewer-request';
    const match = functionNameRE.exec(functionName);
    expect(match).to.be.null;
  });

  it('fails for non-viwer/origin request', () => {
    const functionName = 'us-east-1.federalist-proxy-test-blah-request';
    const match = functionNameRE.exec(functionName);
    expect(match).to.be.null;
  });

  it('fails for non request/response events', () => {
    const functionName = 'us-east-1.federalist-proxy-test-viewer-blah';
    const match = functionNameRE.exec(functionName);
    expect(match).to.be.null;
  });
  /* eslint-enable no-unused-expressions */
});

describe('getAppConfig', () => {
  it('get test', () => {
    const context = getContext('viewer-request');
    expect(getAppConfig(context.functionName)).to.deep.equal({
      siteDomain: 'sites-test.federalist.18f.gov',
      tableName: 'federalist-proxy-test',
      siteKey: 'Id',
      originDomain: 'app.cloud.gov',
      originIndex: 'BucketNameIdx',
      originKey: 'BucketName',
    });
  });

  it('get staging', () => {
    const context = getContext('viewer-request');
    expect(getAppConfig(context.functionName.replace('test', 'staging'))).to.deep.equal({
      siteDomain: 'sites-staging.federalist.18f.gov',
      tableName: 'federalist-proxy-staging',
      siteKey: 'Id',
      originDomain: 'app.cloud.gov',
      originIndex: 'BucketNameIdx',
      originKey: 'BucketName',
    });
  });

  it('get prod', () => {
    const context = getContext('viewer-request');
    expect(getAppConfig(context.functionName.replace('test', 'prod'))).to.deep.equal({
      siteDomain: 'sites-prod.federalist.18f.gov',
      tableName: 'federalist-proxy-prod',
      siteKey: 'Id',
      originDomain: 'app.cloud.gov',
      originIndex: 'BucketNameIdx',
      originKey: 'BucketName',
    });
  });

  it('env not found', () => {
    const context = getContext('viewer-request');
    expect(() => getAppConfig(context.functionName.replace('test', 'dev'))).to.throw();
  });
});
