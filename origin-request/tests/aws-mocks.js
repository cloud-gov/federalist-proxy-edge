const AWS = require('aws-sdk');

const mocks = {
  DynamoDB: {
    DocumentClient: {},
  },
};

AWS.DynamoDB.DocumentClient = function mock() {};
AWS.DynamoDB.DocumentClient.prototype.query = (params, cb) => {
  if (mocks.DynamoDB.DocumentClient.query) {
    mocks.DynamoDB.DocumentClient.query(params, cb);
    return;
  }
  cb(null, {})
};

const resetMocks = () => {
  mocks.DynamoDB = {
    DocumentClient: {},
  };
};

module.exports = { mocks, resetMocks };
