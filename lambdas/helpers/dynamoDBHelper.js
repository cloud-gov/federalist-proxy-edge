// eslint-disable-next-line import/no-extraneous-dependencies
const AWS = require('aws-sdk');
const log = require('./logger');

const getSiteConfig = (params) => {
  const docClient = new AWS.DynamoDB.DocumentClient({
    httpOptions: { connectTimeout: 120000, timeout: 120000 },
  });
  return docClient.query(params)
    .promise()
    .catch((err) => {
      throw new Error(`Unable to query. Error: ${JSON.stringify(err, null, 2)}`);
    })
    .then(({ Count, Items }) => {
      if (Count > 0) {
        const [item] = Items;
        log(`\nQuery succeeded: item found @id:${JSON.stringify(item.id)}\n`);
        return item.settings;
      }
      log('\nQuery succeeded: no results found!!\n');
      return undefined;
    });
};

const getSiteQueryParams = (tableName, siteKey, siteKeyValue) => {
  const expressionAttributeNames = {
    [`#${siteKey}`]: siteKey,
  };

  const expressionAttributeValues = {
    [`:${siteKey}`]: siteKeyValue,
  };

  return {
    TableName: tableName,
    KeyConditionExpression: `#${siteKey} = :${siteKey}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };
};

const parseURI = (request) => {
  const [, siteType, owner, repository, branch] = request.uri.split('/');
  return {
    owner,
    repository,
    siteType,
    branch: siteType === 'preview' ? branch : null,
  };
};

const getSubdomain = request => request.headers.host[0].value.split('.')[0];

module.exports = {
  getSiteConfig, getSiteQueryParams, parseURI, getSubdomain,
};
