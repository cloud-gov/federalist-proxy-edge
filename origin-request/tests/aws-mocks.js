const AWS = require('aws-sdk');

const mocks = {
  DynamoDB: {},
};

const mockableFunctions = {
  DynamoDB: [
    'query',
  ],
};

Object.keys(mockableFunctions).forEach((service) => {
  AWS[service] = function mock() {};

  mockableFunctions[service].forEach((functionName) => {
    AWS[service].prototype[functionName] = (params, cb) => {
      if (mocks[service][functionName]) {
        mocks[service][functionName](params, cb);
        return;
      }
      cb(null, {});
    };
  });
});

const resetMocks = () => {
  mocks.DynamoDB = {};
};

module.exports = { mocks, resetMocks };
