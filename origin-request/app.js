'use strict';
const AWS = require("aws-sdk");
// const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

const getBucket = (owner, repository, branch = null) => new Promise((resolve, reject) => {
  if (!owner || !repository) {
    reject("owner and reposiotory not found");
  }
  const params = {
    // TableName: "federalist-proxy",
    TableName: "federalist-proxy-dev",
    KeyConditionExpression: "#owner_repository = :owner_repository",
    ExpressionAttributeNames:{
     "#owner_repository": "owner_repository"
    },
    ExpressionAttributeValues: {
     ":owner_repository": `${[owner, repository].join('/')}`
    }
  };
  
  // dynamodb.query(params, function(err, data) {
  docClient.query(params, function(err, data) {
    if (err) {
      reject("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log(`\nQuery succeeded.\t${JSON.stringify(data)}\n`);
      if (data.Count > 0){
        data.Items.forEach(function(item) {
            console.log(JSON.stringify(item));
            const settings = item.settings;
            resolve(settings['bucket_name']);
        });
      } else {
        console.log(`\nQuery succeeded: no results found\n`);
        resolve();
      }
    }
  });
});
 
exports.lambdaHandler = (event, context, callback) => {
  console.log(`event:\t${JSON.stringify(event)}`)
  const request = event.Records[0].cf.request;

   /**
    * Reads query string to check if S3 origin should be used, and
    * if true, sets S3 origin properties.
    */

  console.log(`\nrequest:\t${JSON.stringify(request)}\n`);
  const uri = request.uri;
  console.log(`\nuri:\t${uri}\n`);
  // if (uri) {
    const paths = uri.split("/");
    const site_type = paths[1];
    const owner = paths[2];
    const repository = paths[3];

    let branch;
    if (site_type === 'preview') {
      branch = paths[4];
    }

    console.log(`\nsite_type:\t${site_type}\n`);
    console.log(`\nowner:\t${owner}\n`);
    console.log(`\nrepository:\t${repository}\n`);
    console.log(`\nbranch:\t${branch}\n`);
      getBucket(owner, repository, branch)
        .then((bucket) => {
          if (bucket) {
            const s3DomainName = `${bucket}.app.cloud.gov`;
            // const s3DomainName = `${bucket}.s3-website-${region}.amazonaws.com`; // will need region
            /* Set S3 origin fields */
            // request.origin = {
            //     s3: {
            //         domainName: s3DomainName,
            //         //region: region, //'',
            //         //authMethod: 'none',
            //        // path: `/${paths.slice(5).join("/")}`, // '',
            //        //  customHeaders: {}
            //     }
            // };
  
            request.origin = {
              custom: {
                domainName: s3DomainName,
                port: 443,
                protocol: 'https',
                sslProtocols: ['TLSv1', 'TLSv1.1'],
                readTimeout: 5,
                keepaliveTimeout: 5,
                customHeaders: {},
              }
            };
            request.headers['host'] = [{ key: 'host', value: s3DomainName}];
          }
          console.log(`\nrequest.origin:\t${JSON.stringify(request.origin)}\n`);
        })
        .then(() => callback(null, request))
        .catch(error => callback(error, null));
};