'use strict';
const { getSiteConfig, getSiteQueryParams, parseURI } = require ("./helpers");

exports.lambdaHandler = (event, context, callback) => {

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