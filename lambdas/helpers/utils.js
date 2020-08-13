const https = require('https');

const getHost = request => request.headers.host[0].value;

const httpsGet = params => new Promise((resolve, reject) => {
  https.get(params, (res) => {
    resolve(res);
  }).on('error', (e) => {
    reject(e);
  });
});

const getDocument = async (params) =>  await httpsGet(params);

module.exports = { getHost, getDocument };
