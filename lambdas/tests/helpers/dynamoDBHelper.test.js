const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const AWSMocks = require('../support/aws-mocks');
const { expect } = chai;
chai.use(chaiAsPromised);

const { getSiteConfig, getSiteQueryParams, parseURI, getSiteIdFromRequest } = require('../../helpers/dynamoDBHelper');

describe("getSiteConfig", () => {
    it("fetches site config", async () => {
      const params = {};
      
      results = {
        Count: 1,
        Items: [{ settings: { bucket_name: 'testBucket' }}],
      };
    
      AWSMocks.mocks.DynamoDB.DocumentClient.query = ({}, callback) => {
        callback(null, results);
      };

      const response = await getSiteConfig(params);
      expect(response).to.deep.equal({ bucket_name: 'testBucket' });
    });

    it("does not fetch site config - not found", async () => {
      const params = {};
      
      results = {
        Count: 0,
        Items: [],
      };
    
      AWSMocks.mocks.DynamoDB.DocumentClient.query = ({}, callback) => {
        callback(null, results);
      };

      const response = await getSiteConfig(params);
      expect(response).to.be.undefined;
    });

    it("rejected", async () => {
      const params = {};
    
      AWSMocks.mocks.DynamoDB.DocumentClient.query = ({}, callback) => {
        callback(new Error('test error'), undefined);
      };

      expect(getSiteConfig(params)).to.eventually.be.rejected;
    });
});

describe("parseURI", () => {
  it("preview branch", () => {
    const request = { uri: '/preview/testOwner/testRepo/testBranch/index.html' };
    expect(parseURI(request)).to.deep.equal({
      owner: 'testOwner',
      repository: 'testRepo',
      siteType: 'preview',
      branch: 'testBranch',
    });
  });

  it("non-preview branch", () => {
    const request = { uri: '/site/testOwner/testRepo/index.html' };
    expect(parseURI(request)).to.deep.equal({
      owner: 'testOwner',
      repository: 'testRepo',
      siteType: 'site',
      branch: null,
    });
  });
})

describe("getSiteIdFromRequest", () => {
  it("fetches subdomain", () => {
    const request = {
      headers: {
        host: [
          {
            key: 'Host',
            value: 'siteId.with.dot.sites-test.example.gov',
          },
        ],
      }
    }
    expect(getSiteIdFromRequest(request)).to.equal('siteId.with.dot');
  });
})

describe("getSiteQueryParams", () => {
  it("returns params", () => {
    const tableName = 'testTable';
    // const owner = 'testOwner';
    // const repository = 'testRepo';
    const site_key = 'id';
    const site_key_value = 'site-key';

    const expectedParams = {
      "TableName":"testTable",
      "KeyConditionExpression": "#id = :id",
      "ExpressionAttributeNames":
        {
          "#id": "id",
        },
      "ExpressionAttributeValues": {
        ":id": "site-key",
      }
    };
    expect(getSiteQueryParams(tableName, site_key, site_key_value)).to.deep.equal(expectedParams);
  })
})