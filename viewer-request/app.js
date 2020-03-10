'use strict';
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

const getCredentials = (owner, repository, branch = null) => new Promise((resolve, reject) => {

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
	console.log(`\nfed-proxy params:\t${JSON.stringify(params)}\n`);
	docClient.query(params, function(err, data) {
		if (err) {
		  reject("Unable to query. Error:", JSON.stringify(err, null, 2));
		} else {
		  console.log(`\nQuery succeeded.\t${JSON.stringify(data)}\n`);
		  if (data.Count > 0){
  		  data.Items.forEach(function(item) {
  		      console.log(JSON.stringify(item));
  		      const settings = item.settings;
  		      resolve(settings['basic_auth']);
  		  });
		  } else {
		    resolve();
		  }
		}
	});
});

exports.lambdaHandler = (event, context, callback) => {

  // Get the request and its headers
  let request = event.Records[0].cf.request;
  
  // custom/alternate domains
  // https://forums.aws.amazon.com/thread.jspa?threadID=261226
  // https://aws.amazon.com/blogs/networking-and-content-delivery/generating-dynamic-error-responses-in-amazon-cloudfront-with-lambdaedge/
  request.headers['x-forwarded-host'] = [
    { key: 'X-Forwarded-Host', value: request.headers.host[0].value }
  ];
  console.log(`request:\t${JSON.stringify(request)}`);
  const headers = request.headers;


  const uri = request.uri;
  const site_type = uri.split("/")[1];
  const owner = uri.split("/")[2];
  const repository = uri.split("/")[3];
  
  // if (['site','demo'].find(t => t === site_type)) {
  //   callback(null, request);
  // }
  
  // Specify the username and password to be used
  
  getCredentials(owner, repository)
    .then((credentials) => {
      if (credentials) {
        const user = credentials['user'];
        const pw = credentials['password'];
        
        // Build a Basic Authentication string
        const authString = 'Basic ' + Buffer.from(user + ':' + pw).toString('base64');
        
        // Challenge for auth if auth credentials are absent or incorrect
        if (typeof headers.authorization == 'undefined' || headers.authorization[0].value != authString) {
          request = {
            status: '401',
            statusDescription: 'Unauthorized',
            body: 'Unauthorized',
            headers: {
              'www-authenticate': [{key: 'WWW-Authenticate', value:'Basic'}]
            },
          };
        }
      }
    })
    .then(() => callback(null, request));
  

  // User has authenticated
  // callback(null, request);
};