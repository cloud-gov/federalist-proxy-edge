module.exports = function log(msg) {
  if (process.env.NODE_ENV !== 'TEST') {
    // eslint-disable-next-line no-console
    console.log(msg);
  }
};
