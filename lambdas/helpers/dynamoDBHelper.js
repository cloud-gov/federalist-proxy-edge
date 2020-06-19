// eslint-disable-next-line import/no-extraneous-dependencies
const AWS = require('aws-sdk');
const log = require('./logger');

const testConfig = {
  appEnv: 'test',
  domain: 'sites-test.federalist.18f.gov',
  tableName: 'federalist-proxy-test',
  siteKey: 'id',
};

const stagingConfig = {
  appEnv: 'staging',
  domain: 'sites-staging.federalist.18f.gov',
  tableName: 'federalist-proxy-staging',
  siteKey: 'id',
};

const prodConfig = {
  appEnv: 'production',
  domain: 'sites-prod.federalist.18f.gov',
  tableName: 'federalist-proxy-prod',
  siteKey: 'id',
};

const getSiteConfig = async (params) => {
  const docClient = new AWS.DynamoDB.DocumentClient({
    httpOptions: { connectTimeout: 120000, timeout: 120000 },
  });
  return docClient.get(params)
    .promise()
    .catch((err) => {
      throw new Error(`Unable to query. Error: ${JSON.stringify(err, null, 2)}`);
    })
    .then(({ Item }) => {
      if (Item) {
        log(`\nQuery succeeded: item found @id:${JSON.stringify(Item.id)}\n`);
        return Item.settings;
      }
      log('\nQuery succeeded: no results found!!\n');
      return undefined;
    });
};

const validateProxyFunctionName = functionName => /^us-east-1:federalist-proxy-(prod|staging|test)-(viewer|origin)-(request|response):\d+$/
  .test(functionName);

const getAppConfig = (functionName) => {
  let appConfig = {};
  if (validateProxyFunctionName(functionName)) {
    if (/staging/.test(functionName)) {
      appConfig = stagingConfig;
    } else if (/prod/.test(functionName)) {
      appConfig = prodConfig;
    } else if (/test/.test(functionName)) {
      appConfig = testConfig;
    }
  }
  return appConfig;
};

const getSiteKeyValue = (host, appDomain) => {
  let siteKeyValue;
  if (host.endsWith(appDomain)) {
    siteKeyValue = host.replace(new RegExp(`.${appDomain}$`), '');
  }
  return siteKeyValue;
};

const getSiteQueryParams = (host, functionName) => {
  const { tableName, siteKey, domain } = getAppConfig(functionName);
  const siteKeyValue = getSiteKeyValue(host, domain);
  return {
    TableName: tableName,
    Key: {
      [siteKey]: siteKeyValue,
    },
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
  getSiteConfig, parseURI, getSiteQueryParams, getSiteKeyValue, getAppConfig,
};
