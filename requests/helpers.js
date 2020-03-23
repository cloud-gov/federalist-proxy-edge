const AWS = require("aws-sdk");

const getSiteConfig = (params) => new Promise((resolve, reject) => {

  const docClient = new AWS.DynamoDB.DocumentClient();
  docClient.query(params, function(err, data) {
    if (err) {
      reject("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log(`\nQuery succeeded.\t${JSON.stringify(data)}\n`);
      if (data.Count > 0){
        data.Items.forEach(function(item) {
          console.log(JSON.stringify(item));
          const settings = item.settings;
          resolve(settings);
        });
      } else {
        console.log(`\nQuery succeeded: no results found\n`);
        resolve();
      }
    }
  });
});

const getSiteQueryParams = (tableName, owner, repository) => ({
  TableName: tableName,
  KeyConditionExpression: "#owner_repository = :owner_repository",
  ExpressionAttributeNames:{
   "#owner_repository": "owner_repository"
  },
  ExpressionAttributeValues: {
   ":owner_repository": `${[owner, repository].join('/')}`
  },
})

const parseURI = (uri) => {
	const atts = uri.split("/");
  const siteType = atts[1];
  const owner = atts[2];
  const repository = atts[3];

  let branch = null;
  if (siteType === 'preview') {
    branch = atts[4];
  }
  return { owner, repository, siteType, branch }
}
module.exports = { getSiteConfig, getSiteQueryParams, parseURI };