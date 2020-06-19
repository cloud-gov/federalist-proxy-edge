const getHost = request => request.headers.host[0].value;

module.exports = { getHost };
