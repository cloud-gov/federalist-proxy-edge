const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const AWSMocks = require('../support/aws-mocks');
const { expect } = chai;
chai.use(chaiAsPromised);

const { getSiteConfig, getSiteQueryParams, parseURI } = require('../../helpers/DynamoDBHelper');

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
    const uri = '/preview/testOwner/testRepo/testBranch/index.html';
    expect(parseURI(uri)).to.deep.equal({
      owner: 'testOwner',
      repository: 'testRepo',
      siteType: 'preview',
      branch: 'testBranch',
    });
  });

  it("non-preview branch", () => {
    const uri = '/site/testOwner/testRepo/index.html';
    expect(parseURI(uri)).to.deep.equal({
      owner: 'testOwner',
      repository: 'testRepo',
      siteType: 'site',
      branch: null,
    });
  });
})

describe("getSiteQueryParams", () => {
  it("returns params", () => {
    const tableName = 'testTable';
    const owner = 'testOwner';
    const repository = 'testRepo';

    const expectedParams = {
      "TableName":"testTable",
      "KeyConditionExpression": "#owner_repository = :owner_repository",
      "ExpressionAttributeNames":
        {
          "#owner_repository": "owner_repository",
        },
      "ExpressionAttributeValues": {
        ":owner_repository": "testOwner/testRepo",
      }
    };
    expect(getSiteQueryParams(tableName, owner, repository)).to.deep.equal(expectedParams);
  })
})