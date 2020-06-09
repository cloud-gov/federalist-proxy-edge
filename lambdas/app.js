'use strict';
const { getSiteConfig, getSiteQueryParams, parseURI, getSiteIdFromRequest } = require ("./helpers/dynamoDBHelper");
const site_key = 'id';

const origin_request = (event, context, callback) => {
  console.log(`origin_request event:\t${JSON.stringify(event)}`);
  const request = event.Records[0].cf.request;
  console.log(`\norigin_request(in):\t${JSON.stringify(request)}\n`);

   /**
    * Reads query string to check if S3 origin should be used, and
    * if true, sets S3 origin properties.
    */

  const siteId = getSiteIdFromRequest(request);

    const siteQueryParams = getSiteQueryParams("federalist-proxy-dev", site_key, siteId);
      getSiteConfig(siteQueryParams)
        .then((siteConfig) => {
          const bucket = siteConfig['bucket_name'];
          if (bucket) {
            const s3DomainName = `${bucket}.app.cloud.gov`;
  
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
          console.log(`\norigin_request(out):\t${JSON.stringify(request)}\n`);
        })
        .then(() => callback(null, request))
        .catch(error => {
          console.log(`\norigin_request(error):\t${error}`);
          callback(error, null);
        });
};

const origin_response = (event, context, callback) => {
  try {
    console.log(`origin_response event:\t${JSON.stringify(event)}`);
    const response = event.Records[0].cf.response;
    console.log(`\norigin_response(in):\t${JSON.stringify(response)}\n`);

    const headers = response.headers;
    headers['strict-transport-security'] = [{key: 'Strict-Transport-Security', value: 'max-age=31536001; preload'}];
    headers['X-Frame-Options'] = [{key: 'X-Frame-Options', value: 'SAMEORIGIN'}];
    response.headers = headers;
    console.log(`\norigin_response(out):\t${JSON.stringify(response)}\n`);
    callback(null, response);
  }
  catch (error) {
    console.log(`\norigin_response(error):\t${error}`);
    callback(error, null);
  }
};
// custom error handling
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-examples.html#lambda-examples-custom-error-new-site
// https://stackoverflow.com/questions/28449363/why-is-this-http-request-not-working-on-aws-lambda


const viewer_request = (event, context, callback) => {
  console.log(`viewer_request event:\t${JSON.stringify(event)}`);
  // Get the request and its headers
  let request = event.Records[0].cf.request;
  console.log(`\nviewer_request(in):\t${JSON.stringify(request)}\n`);

  if (parseURI(request).siteType !== 'preview') {
    callback(null, request);
  }
  
  request.headers['x-forwarded-host'] = [
    { key: 'X-Forwarded-Host', value: request.headers.host[0].value }
  ];


  const siteId = getSiteIdFromRequest(request);
  
  const siteQueryParams = getSiteQueryParams("federalist-proxy-dev", site_key, siteId);
  
  getSiteConfig(siteQueryParams)
    .then((siteConfig) => {
      const credentials = siteConfig['basic_auth'];
      if (credentials) {
        const user = credentials['username'];
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
      console.log(`\nviewer_request(out):\t${JSON.stringify(request)}\n`);
    })
    .then(() => callback(null, request)) // User has authenticated
    .catch(error => {
      console.log(`\nviewer_request(error):\t${error}`);
      callback(error, null);
    });

};

module.exports = { origin_request, viewer_request, origin_response  };