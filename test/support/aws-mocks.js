const AWS = require('aws-sdk');

const mocks = {
  DynamoDB: {
    DocumentClient: {},
  },
};

AWS.DynamoDB.DocumentClient = function mock() {};
AWS.DynamoDB.DocumentClient.prototype.query = {
  promise: async (params) => {
    if (mocks.DynamoDB.DocumentClient.query) {
      return mocks.DynamoDB.DocumentClient.query(params);
    }
    return {};
  },
};

const resetMocks = () => {
  mocks.DynamoDB = {
    DocumentClient: {},
  };
};

module.exports = { mocks, resetMocks };
