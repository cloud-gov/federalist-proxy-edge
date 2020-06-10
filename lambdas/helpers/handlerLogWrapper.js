const log = require('./logger');

module.exports = function handlerLogWrapper(name, fn) {
  return async (event, context) => {
    log(`${name} event:\t${JSON.stringify(event)}\n`);
    log(`${name} (in):\t${JSON.stringify(event.Records[0].cf.request)}\n`);
    return fn(event, context)
      .then((value) => {
        log(`${name} (out):\t${JSON.stringify(value)}\n`);
        return value;
      })
      .catch((error) => {
        log(`${name} (error):\t${error}\n`);
        throw error;
      });
  };
};
