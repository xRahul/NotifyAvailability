const moment = require('moment');

const ITERATIONS = 1000000;

console.log(`Running benchmark with ${ITERATIONS} iterations...`);

// Benchmark Moment.js
const startMoment = process.hrtime();
for (let i = 0; i < ITERATIONS; i++) {
  moment()
    .valueOf()
    .toString();
}
const endMoment = process.hrtime(startMoment);
const timeMoment = endMoment[0] * 1000 + endMoment[1] / 1000000;

// Benchmark Date.now()
const startDate = process.hrtime();
for (let i = 0; i < ITERATIONS; i++) {
  Date.now().toString();
}
const endDate = process.hrtime(startDate);
const timeDate = endDate[0] * 1000 + endDate[1] / 1000000;

console.log(`Moment.js: ${timeMoment.toFixed(2)}ms`);
console.log(`Date.now(): ${timeDate.toFixed(2)}ms`);
console.log(`Improvement: ${(timeMoment / timeDate).toFixed(2)}x faster`);
