const AWS = require('aws-sdk');
const sinon = require('sinon');

function stubDocDBQuery(fn) {
  return sinon.stub(AWS.DynamoDB, 'DocumentClient')
    .returns({
      query: () => ({
        promise: async () => fn(),
      }),
    });
}

module.exports = {
  stubDocDBQuery,
};
