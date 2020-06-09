const AWS = require("aws-sdk");

const getSiteConfig = (params) => new Promise((resolve, reject) => {

  const docClient = new AWS.DynamoDB.DocumentClient({ httpOptions: { connectTimeout: 120000, timeout: 120000 }});
  docClient.query(params, function(err, data) {
    if (err) {
      reject("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else {
      if (data.Count > 0){
        data.Items.forEach(function(item) {
          console.log(`\nQuery succeeded: item found @id:${JSON.stringify(item.id)}\n`);
          const settings = item.settings;
          resolve(settings);
        });
      } else {
        console.log(`\nQuery succeeded: no results found!!\n`);
        resolve();
      }
    }
  });
});

const getSiteQueryParams = (tableName, site_key, site_key_value) => {
  const expressionAttributeNames = {};
  expressionAttributeNames[`\#${site_key}`] = site_key;

  const expressionAttributeValues = {};
  expressionAttributeValues[`\:${site_key}`] = site_key_value;

  return {
    TableName: tableName,
    KeyConditionExpression: `\#${site_key} = \:${site_key}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };
}

const parseURI = (request) => {
  const atts = request.uri.split("/");
  const siteType = atts[1];
  const owner = atts[2];
  const repository = atts[3];
  const subdomain = atts[0].split('.')[0];

  let branch = null;
  if (siteType === 'preview') {
    branch = atts[4];
  }
  return { owner, repository, siteType, branch }
}

const getSubdomain = (request) => request.headers['host'][0].value.split('.')[0];
const getAppEnv = (request) => request.headers['host'][0].value.split('.')[1].split('-')[1];

module.exports = { getSiteConfig, getSiteQueryParams, parseURI, getSubdomain, getAppEnv };