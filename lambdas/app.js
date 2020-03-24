'use strict';
const { getSiteConfig, getSiteQueryParams, parseURI } = require ("./helpers/dynamoDBHelper");

const origin_request = (event, context, callback) => {
  console.log(`event:\t${JSON.stringify(event)}`)
  const request = event.Records[0].cf.request;

   /**
    * Reads query string to check if S3 origin should be used, and
    * if true, sets S3 origin properties.
    */

  console.log(`\nrequest:\t${JSON.stringify(request)}\n`);
  // const uri = request.uri;
  console.log(`\nuri:\t${request.uri}\n`);
  
    const { owner, repository, siteType, branch } = parseURI(request.uri);

    console.log(`\nsiteType:\t${siteType}\n`);
    console.log(`\nowner:\t${owner}\n`);
    console.log(`\nrepository:\t${repository}\n`);
    console.log(`\nbranch:\t${branch}\n`);
    const siteQueryParams = getSiteQueryParams("federalist-proxy-dev", owner, repository);
      getSiteConfig(siteQueryParams)
        .then((siteConfig) => {
          const bucket = siteConfig['bucket_name'];
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

const origin_response = async (event, context) => {
	console.log(`\nevent:\t${JSON.stringify(event)}\n`);
	console.log(`\ncontext:\t${JSON.stringify(context)}\n`);

    const response = event.Records[0].cf.response;
    const headers = response.headers;

    headers['strict-transport-security'] = [{key: 'Strict-Transport-Security', value: 'max-age=31536001; preload'}];
    headers['X-Frame-Options'] = [{key: 'X-Frame-Options', value: 'SAMEORIGIN'}];
    response.headers = headers;
    return response;
};
// custom error handling
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-examples.html#lambda-examples-custom-error-new-site
// https://stackoverflow.com/questions/28449363/why-is-this-http-request-not-working-on-aws-lambda


const viewer_request = (event, context, callback) => {

  // Get the request and its headers
  let request = event.Records[0].cf.request;
  
  request.headers['x-forwarded-host'] = [
    { key: 'X-Forwarded-Host', value: request.headers.host[0].value }
  ];
  console.log(`request:\t${JSON.stringify(request)}`);


  const { owner, repository, siteType, branch } = parseURI(request.uri);
  
  const siteQueryParams = getSiteQueryParams("federalist-proxy-dev", owner, repository);
  
  getSiteConfig(siteQueryParams)
    .then((siteConfig) => {
      const credentials = siteConfig['basic_auth'];
      if (credentials) {
        const user = credentials['user'];
        const pw = credentials['password'];
        
        // Build a Basic Authentication string
        const authString = 'Basic ' + Buffer.from(user + ':' + pw).toString('base64');
        
        // Challenge for auth if auth credentials are absent or incorrect
        const authorization = request.headers.authorization;
        if (authorization && authorization.length && authorization[0].value === authString) {
          return Promise.resolve();
        }
        
        request = {
          status: '401',
          statusDescription: 'Unauthorized',
          body: 'Unauthorized',
          headers: {
            'www-authenticate': [{key: 'WWW-Authenticate', value:'Basic'}]
          },
        };
      }
    })
    .then(() => callback(null, request))
    .catch(error => callback(error, null));
  

  // User has authenticated
  // callback(null, request);
};

module.exports = { origin_request, viewer_request, origin_response  };