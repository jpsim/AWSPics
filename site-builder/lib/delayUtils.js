/* istanbul ignore next */
exports.delayBlock = function() {
  // This is a computationally expensive way to do a delay block -
  // this delay is ~100ms using processor allocated to 3008mb memory usage on a
  // Lambda instance.
  // Surely this could be done in a more node.js way, but if you're reading this,
  // Lambda computational power is likely cheaper than your time.
  let a = 0;
  for (let j = 5*10e6; j >= 0; j--) {
    a++;
  }
};
