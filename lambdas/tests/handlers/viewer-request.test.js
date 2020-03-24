const { expect } = require('chai');
const AWSMocks = require('../support/aws-mocks');

const index = require('../../handlers/viewer-request');

const userPass = (user, pw) => ('Basic ' + Buffer.from(user + ':' + pw).toString('base64'));
const event = {
  "Records": [
    {
      "cf": {
        "config": {
          "distributionId": "EXAMPLE"
        },
        "request": {
          "uri": "/site/testOwner/testRepo/index.html",
          "method": "GET",
          "clientIp": "2001:cdba::3257:9652",
          "headers": {
            "host": [
              {
                "key": "Host",
                "value": "d123.cf.net"
              }
            ],
          }
        }
      }
    }
  ]
};

const lambdaHandler = (_event, context = undefined) => new Promise((resolve, reject) => {
  index.lambdaHandler(_event, context, (error, response) => {
    if (error) { reject(error) }
    resolve(response);
  });
});

describe("The handler function", () => {
    it("no basic auth", async () => {
      const username = 'testUser';
      const password = 'testPassword';
      queryResults = {
        Count: 1,
        Items: [{ settings: {} }],
      };
    
      AWSMocks.mocks.DynamoDB.DocumentClient.query = ({}, callback) => {
        callback(null, queryResults);
      };

      const response = await lambdaHandler(event, undefined);
      console.log(`\n\nresponse:\t${JSON.stringify(response)}\n\n`)
      
      expect(response.headers['x-forwarded-host'][0]['key']).to.equal('X-Forwarded-Host');
      expect(response.headers['x-forwarded-host'][0]['value']).to.equal(event.Records[0].cf.request.headers['host'][0].value);
      
    });

    it("password req'd - not present in request", async () => {
      const username = 'testUser';
      const password = 'testPassword';
      queryResults = {
        Count: 1,
        Items: [{ settings: { basic_auth: userPass(username, password) }}],
      };
    
      AWSMocks.mocks.DynamoDB.DocumentClient.query = ({}, callback) => {
        callback(null, queryResults);
      };

      const response = await lambdaHandler(event, undefined);
      console.log(`\n\nresponse:\t${JSON.stringify(response)}\n\n`)
      
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
      const user = 'testUser';
      const password = 'testPassword';
      queryResults = {
        Count: 1,
        Items: [{ settings: { basic_auth: { user, password }}}],
      };
    
      AWSMocks.mocks.DynamoDB.DocumentClient.query = ({}, callback) => {
        callback(null, queryResults);
      };

      const authEvent = Object.assign({}, event);
      authEvent["Records"][0].cf.request.headers.authorization = [{
        key: 'Authorization',
        value: userPass(user, password)
      }];

      const response = await lambdaHandler(authEvent, undefined);
      
      expect(response.headers['x-forwarded-host'][0]['key']).to.equal('X-Forwarded-Host');
      expect(response.headers['x-forwarded-host'][0]['value']).to.equal(event.Records[0].cf.request.headers['host'][0].value);
      
    });

  it("password req'd - invalid user password", async () => {
    const username = 'testUser';
    const password = 'testPassword';
    queryResults = {
      Count: 1,
      Items: [{ settings: { basic_auth: userPass(username, password) }}],
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
    console.log(`\n\nresponse:\t${JSON.stringify(response)}\n\n`)
    
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