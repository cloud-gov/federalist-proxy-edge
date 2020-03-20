const mocha = require('mocha');
const chai = require('chai');
const should = chai.should();

const index = require('../app');
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
            "user-agent": [
              {
                "key": "User-Agent",
                "value": "Test Agent"
              }
            ],
            "user-name": [
              {
                "key": "User-Name",
                "value": "aws-cloudfront"
              }
            ]
          }
        }
      }
    }
  ]
};
describe("The handler function", () => {
    it("returns a message", () => {
        index.lambdaHandler(event, undefined, function(error, response){
            let body = JSON.parse(response.body);
            body.message.should.be.equal('Go Serverless v1.0! Your function executed successfully!');
        });
    });
});