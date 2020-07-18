// eslint-disable-next-line import/no-extraneous-dependencies
const AWS = require('aws-sdk');
const log = require('./logger');

const appConfig = {
  test: {
    domain: 'sites-test.federalist.18f.gov',
    tableName: 'federalist-proxy-test',
    siteKey: 'Id',
  },
  staging: {
    domain: 'sites-staging.federalist.18f.gov',
    tableName: 'federalist-proxy-staging',
    siteKey: 'Id',
  },
  prod: {
    domain: 'sites-prod.federalist.18f.gov',
    tableName: 'federalist-proxy-prod',
    siteKey: 'Id',
  },
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
        return Item.Settings;
      }
      log('\nQuery succeeded: no results found!!\n');
      return undefined;
    });
};

const functionNameRE = /^us-east-1.federalist-proxy-(prod|staging|test)-(viewer|origin)-(request|response)$/;

const getAppConfig = (functionName) => {
  const match = functionNameRE.exec(functionName);
  if (!match) {
    throw new Error(`Unable to find appConfig for @function: ${functionName}`);
  }
  return appConfig[match[1]];
};

const stripSiteIdFromHost = (host, appDomain) => {
  if (host.endsWith(appDomain)) {
    return host.replace(new RegExp(`.${appDomain}$`), '');
  }
  throw new Error(`Unable to strip siteId from @host: ${host}`);
};

const getSiteQueryParams = (host, functionName) => {
  const { tableName, siteKey, domain } = getAppConfig(functionName);
  const siteKeyValue = stripSiteIdFromHost(host, domain);
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
  getSiteConfig, parseURI, getSiteQueryParams, stripSiteIdFromHost, getAppConfig, functionNameRE,
};
