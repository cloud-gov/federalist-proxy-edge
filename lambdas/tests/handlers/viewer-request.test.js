const { expect } = require('chai');
const AWSMocks = require('../support/aws-mocks');

const { viewerRequest } = require('../../app');

const userPass = (user, pw) => ('Basic ' + Buffer.from(user + ':' + pw).toString('base64'));

const lambdaHandler = (_event, context = undefined) => new Promise((resolve, reject) => {
  viewerRequest(_event, context, (error, response) => {
    if (error) { reject(error) }
    resolve(response);
  });
});

describe("The handler function", () => {
  let event;
  beforeEach(() => {
    event = {
      "Records": [
        {
          "cf": {
            "config": {
              "distributionId": "EXAMPLE"
            },
            "request": {
              "uri": "/preview/testOwner/testRepo/testBranch/index.html",
              "method": "GET",
              "clientIp": "2001:cdba::3257:9652",
              "headers": {
                "host": [
                  {
                    "key": "Host",
                    "value": "d123.cf-dev.net"
                  }
                ],
              }
            }
          }
        }
      ]
    };
  });
  it("basic auth disabled", async () => {
    const username = 'testUser';
    const password = 'testPassword';
    const queryResults = {
      Count: 1,
      Items: [{ settings: {} }],
    };
  
    AWSMocks.mocks.DynamoDB.DocumentClient.query = ({}, callback) => {
      callback(null, queryResults);
    };

    const response = await lambdaHandler(event, undefined);

    expect(response.headers['x-forwarded-host'][0]['key']).to.equal('X-Forwarded-Host');
    expect(response.headers['x-forwarded-host'][0]['value']).to.equal(event.Records[0].cf.request.headers['host'][0].value);

  });

  it("non-preview site - no basic auth", async () => {
    event.Records[0].cf.request.uri = '/site/testOwner/testRepo/index.html'
    const username = 'testUser';
    const password = 'testPassword';
    const queryResults = {
      Count: 1,
      Items: [{ settings: { basic_auth: { username, password }}}],
    };

    const response = await lambdaHandler(event, undefined);
    
    expect(response.headers['x-forwarded-host'][0]['key']).to.equal('X-Forwarded-Host');
    expect(response.headers['x-forwarded-host'][0]['value']).to.equal(event.Records[0].cf.request.headers['host'][0].value);
    
  });

  it("password req'd - not present in request", async () => {
    const username = 'testUser';
    const password = 'testPassword';
    const queryResults = {
      Count: 1,
      Items: [{ settings: { basic_auth: { username, password }}}],
    };
  
    AWSMocks.mocks.DynamoDB.DocumentClient.query = ({}, callback) => {
      callback(null, queryResults);
    };

    const response = await lambdaHandler(event, undefined);
    
    expect(response).to.deep.equal({
      status: "401",
      statusDescription: "Unauthorized",
      body: "Unauthorized",
      headers: {
        "www-authenticate": [
          { 
            key: "WWW-Authenticate",
            value: "Basic",
          }
        ]
      }
    });
  });

  it("basic auth successful", async () => {
    const username = 'testUser';
    const password = 'testPassword';
    const queryResults = {
      Count: 1,
      Items: [{ settings: { basic_auth: { username, password }}}],
    };
  
    AWSMocks.mocks.DynamoDB.DocumentClient.query = ({}, callback) => {
      callback(null, queryResults);
    };

    const authEvent = Object.assign({}, event);
    authEvent["Records"][0].cf.request.headers.authorization = [{
      key: 'Authorization',
      value: userPass(username, password)
    }];

    const response = await lambdaHandler(authEvent, undefined);
    
    expect(response.headers['x-forwarded-host'][0]['key']).to.equal('X-Forwarded-Host');
    expect(response.headers['x-forwarded-host'][0]['value']).to.equal(event.Records[0].cf.request.headers['host'][0].value);
    
  });

  it("password req'd - invalid user password", async () => {
    const username = 'testUser';
    const password = 'testPassword';
    const queryResults = {
      Count: 1,
      Items: [{ settings: { basic_auth: { username, password }}}],
    };
  
    AWSMocks.mocks.DynamoDB.DocumentClient.query = ({}, callback) => {
      callback(null, queryResults);
    };

    const authEvent = Object.assign({}, event);
    authEvent["Records"][0].cf.request.headers.authorization = [{
      key: 'Authorization',
      value: 'invalidUserPassword',
    }];

    const response = await lambdaHandler(authEvent, undefined);
    
    expect(response).to.deep.equal({
      status: "401",
      statusDescription: "Unauthorized",
      body: "Unauthorized",
      headers: {
        "www-authenticate": [
          { 
            key: "WWW-Authenticate",
            value: "Basic",
          }
        ]
      }
    });
  });
});