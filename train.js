var fs = require('fs');
var words = fs.readFileSync('words.txt').toString().split('\n');
words = words.filter(function(s) { return s && s[0] !== '#' }).map(function(s) { return s + '$' });

var NUM_TRAINING = ~~process.argv[2] || 10;

var HMM = require('./hmm.js').HMM;

var hmm = HMM.create(fs.readFileSync('hmm.txt').toString());

for (var i = 0; i < NUM_TRAINING; i++) {
    console.time('train');
    console.log('Training... (' + (1 + i) + '/' + NUM_TRAINING + ')');
    words = words.sort(function() { return Math.random() > 0.5 ? 1 : -1 });

    HMM.train_words(hmm, words, 0.0005);
    console.timeEnd('train');
}

console.log('Generating...');
for (var i = 0; i < 20; i++)
    console.log(hmm.generate('$', 4, 0.09));

fs.writeFileSync('hmm.txt', hmm.toString());