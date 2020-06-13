// eslint-disable-next-line import/no-extraneous-dependencies
const AWS = require('aws-sdk');
const log = require('./logger');

const getSiteConfig = async (host, functionName) => {
  const params = getSiteQueryParams(host, functionName);
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

const getSiteQueryParams = (host, functionName) => {
  const siteKey = 'id';
  const tableName = getTableName(functionName);
  const siteKeyValue = getSiteKeyValue(host, functionName);

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

const getAppEnv = (functionName) => {
  let appEnv;
  if  (validateProxyFunctionName(functionName)) {
    if (/staging/.test(functionName)) {
      appEnv = 'staging';
    }
    if (/prod/.test(functionName)) {
      appEnv = 'prod';
    }
  }
  return appEnv;
}

const validateProxyFunctionName = functionName => 
  /^(us|af|ap|ca|cn|eu|me|sa)\-(gov\-|north|south)?(east|west)\-\d+\:federalist\-proxy\-(prod|staging)\-(viewer|origin)-(request|response):\d+$/.test(functionName);

const getDomain = (functionName) => {
  let domain;
  const appEnv = getAppEnv(functionName);
  if appEnv === 'staging' {
    domain = 'sites-staging.federalist.18f.gov';
  }
  if appEnv === 'prod' {
    domain = 'sites-prod.federalist.18f.gov';
  }
  return tableName;
}

const getSiteKeyValue = (host, functionName) => {
  let siteKeyValue;
  let domain = getDomain(functionName);
  if (host.endsWith(domain)) {
    siteKeyValue = host.replace(new RegExp('\.' + domain + '$'), '');
  }
  return siteKeyValue;
}

const getTableName = functionName => {
  let tableName;
  const appEnv = getAppEnv(functionName);
  if appEnv === 'staging' {
    tableName = 'federalist-proxy-staging';
  } else if appEnv === 'prod' {
    tableName = 'federalist-proxy-prod'
  }
  return tableName;
}

module.exports = {
  getSiteConfig, parseURI,
};
