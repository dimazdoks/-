var fs = require('fs');
var HMM = require('./hmm.js').HMM;

var hmm = HMM.create(fs.readFileSync('hmm.txt').toString());

console.log('Generating...');

let str = '';

for (var i = 0; i < 100; i++)
    str += hmm.generate('$', ~~(Math.random() * 4 + 4), 0.09).slice(0, -1) + ' ';

console.log(str);