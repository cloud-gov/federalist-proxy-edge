// eslint-disable-next-line import/no-extraneous-dependencies
const AWS = require('aws-sdk');
const log = require('./logger');

const appConfig = {
  test: {
    siteDomain: 'sites-test.federalist.18f.gov',
    originDomain: 'app.cloud.gov',
    tableName: 'federalist-proxy-test',
    siteKey: 'Id',
    originKey: 'BucketName',
    originIndex: 'BucketNameIdx',
  },
  staging: {
    siteDomain: 'sites-staging.federalist.18f.gov',
    originDomain: 'app.cloud.gov',
    tableName: 'federalist-proxy-staging',
    siteKey: 'Id',
    originKey: 'BucketName',
    originIndex: 'BucketNameIdx',
  },
  prod: {
    siteDomain: 'sites-prod.federalist.18f.gov',
    originDomain: 'app.cloud.gov',
    tableName: 'federalist-proxy-prod',
    siteKey: 'Id',
    originKey: 'BucketName',
    originIndex: 'BucketNameIdx',
  },
};

// { httpOptions: { connectTimeout: 120000, timeout: 120000 } }
const getDocClient = (options = {}) => new AWS.DynamoDB.DocumentClient(options);

const getSite = async params => getDocClient()
  .get(params)
  .promise()
  .catch((err) => {
    throw new Error(`Unable to query. Error: ${JSON.stringify(err, null, 2)}`);
  })
  .then(({ Item }) => {
    if (Item) {
      log(`\nQuery succeeded: item found @id:${JSON.stringify(Item.Id)}\n`);
      return Item;
    }
    log('\nQuery succeeded: no results found!!\n');
    return undefined;
  });

const querySite = async params => getDocClient()
  .query(params)
  .promise()
  .catch((err) => {
    throw new Error(`Unable to query. Error: ${JSON.stringify(err, null, 2)}`);
  })
  .then(({ Items, Count }) => {
    if (Count) {
      log(`\nQuery succeeded: items found @Count:${Items.Count}\n`);
    }
    log('\nQuery succeeded: no results found!!\n');
    return Items;
  });

const functionNameRE = /^us-east-1.federalist-proxy-(prod|staging|test)-(viewer|origin)-(request|response)$/;

const getAppConfig = (functionName) => {
  const match = functionNameRE.exec(functionName);
  if (!match) {
    throw new Error(`Unable to find appConfig for @function: ${functionName}`);
  }
  return appConfig[match[1]];
};

const stripSiteIndexFromHost = (host, domain) => {
  if (host.endsWith(domain)) {
    return host.replace(new RegExp(`.${domain}$`), '');
  }
  throw new Error(`Unable to strip siteId from @host: ${host}`);
};

const getSiteItemParams = (host, functionName) => {
  const { tableName, siteKey, siteDomain } = getAppConfig(functionName);
  const siteKeyValue = stripSiteIndexFromHost(host, siteDomain);
  return {
    TableName: tableName,
    Key: {
      [siteKey]: siteKeyValue,
    },
  };
};

const getSiteQueryParams = (host, functionName) => {
  const {
    tableName, originKey, originDomain, originIndex,
  } = getAppConfig(functionName);
  const siteIndexValue = stripSiteIndexFromHost(host, originDomain);
  return {
    TableName: tableName,
    IndexName: originIndex,
    KeyConditionExpression: '#originKey = :origin_key_value',
    ExpressionAttributeNames: { '#originKey': originKey },
    ExpressionAttributeValues: { ':origin_key_value': { S: siteIndexValue } },
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

module.exports = {
  getSite,
  querySite,
  parseURI,
  getSiteQueryParams,
  getSiteItemParams,
  stripSiteIndexFromHost,
  getAppConfig,
  functionNameRE,
};
