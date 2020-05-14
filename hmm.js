// n: number of inner nodes, a: alphabet
var HMM = function(n, a) {
    this._nodes = [];
    this._init = [];
    this._alphabet = a;

    for (var obj, i = 0, j, k; i < n; i++) {
        obj = {
            'next': [],
            'prob': []
        };
        for (j = 0; j < n; j++) obj.next.push(1 / n);
        for (j = 0; j < a.length; j++) obj.prob.push(1 / a.length);
        this._nodes.push(obj);
        this._init.push(1 / n);
    }

    // random init values
    for (k = 0; k < 3 * n; k++) {
        i = ~~(Math.random() * n);
        j = ~~(Math.random() * n);
        if (i == j) continue;
        if (this._init[i] + this._init[j] > 0.9) continue;
        obj = this._init[i] * Math.random();
        this._init[i] -= obj;
        this._init[j] += obj;
    }
};

HMM.prototype.toString = function() {
    return JSON.stringify(this);
};

// Create HMM from a string.
HMM.create = function(data) {
    var _hmm = JSON.parse(data);
    var hmm = new HMM(_hmm._nodes.length, _hmm._alphabet);
    hmm._nodes = _hmm._nodes;
    hmm._init = _hmm._init;
    hmm._alphabet = _hmm._alphabet;

    return hmm;
};

// Train HMM with string s.
HMM.train = function(hmm, s, rate) {
    if (!rate && rate !== 0) rate = 0.1;
    var alpha = [],
        beta = [];
    var gamma = [],
        kappa = [];
    var input = [];
    var i, j, k, l, sum;
    var alphabet = hmm._alphabet,
        nodes = hmm._nodes,
        init = hmm._init;
    // E1
    for (i = 0; i < s.length; i++) {
        alpha[i] = [];
        beta[i] = [];
        gamma[i] = [];
        if (i < s.length - 1) kappa[i] = [];
        input.push(alphabet.indexOf(s[i]));
        if (input[i] == -1) throw new Error('Invalid character: ' + s[i]);
        for (j = 0; j < nodes.length; j++) {
            if (i == 0) {
                alpha[0][j] = init[j] * nodes[j].prob[input[0]];
            } else {
                for (k = sum = 0; k < nodes.length; k++) sum += alpha[i - 1][k] * nodes[k].next[j];
                alpha[i][j] = sum * nodes[j].prob[input[i]];
            }
        }
    }
    for (i = s.length; i-- > 0;) {
        for (j = 0; j < nodes.length; j++) {
            if (i == s.length - 1) {
                beta[i][j] = 1;
            } else {
                beta[i][j] = 0;
                for (k = 0; k < nodes.length; k++)
                    beta[i][j] += nodes[j].next[k] * nodes[k].prob[input[i + 1]] * beta[i + 1][k];
            }
        }
    }
    // E2
    for (i = 0; i < s.length; i++) {
        for (k = sum = 0; k < nodes.length; k++) sum += alpha[i][k] * beta[i][k];
        for (j = 0; j < nodes.length; j++) {
            gamma[i][j] = alpha[i][j] * beta[i][j] / sum;
        }
        if (i == s.length - 1) break;
        for (j = sum = 0; j < nodes.length; j++)
            for (k = 0; k < nodes.length; k++) {
                sum += alpha[i][j] * nodes[j].next[k] * nodes[k].prob[input[i + 1]] * beta[i + 1][k];
            }
        for (j = 0; j < nodes.length; j++)
            for (kappa[i][j] = [], k = 0; k < nodes.length; k++) {
                kappa[i][j][k] = alpha[i][j] * nodes[j].next[k] * nodes[k].prob[input[i + 1]] * beta[i + 1][k] / sum;
            }
    }

    // M
    var a = [],
        b = [],
        p = [],
        del;
    for (i = 0; i < nodes.length; i++) {
        a[i] = [];
        b[i] = [];
        for (k = sum = 0; k < s.length - 1; k++) sum += gamma[k][i];
        for (j = 0; j < nodes.length; j++) {
            for (k = a[i][j] = 0; k < s.length - 1; k++) a[i][j] += kappa[k][i][j];
            a[i][j] /= sum;

            del = a[i][j] - nodes[i].next[j];
            nodes[i].next[j] += del * rate;
        }
        sum += gamma[s.length - 1][i];
        for (j = 0; j < alphabet.length; j++) {
            for (k = b[i][j] = 0; k < s.length; k++)
                if (input[k] == j) b[i][j] += gamma[k][i];
            b[i][j] /= sum;

            del = b[i][j] - nodes[i].prob[j];
            nodes[i].prob[j] += del * rate;
        }
        p[i] = gamma[0][i];

        del = p[i] - init[i];
        init[i] += del * rate;
    }
};

// Generate string from HMM which ends with stop, and has min. length len.
// q determines minimum quality.
HMM.prototype.generate = function(stop, len, q) {
    q = q || 0;
    var choose = function(a) {
        var x = Math.random();
        for (i = 0; i < a.length && x > 0; i++) x -= a[i];
        return --i;
    };
    var s = "",
        c = '',
        n;
    var pos = choose(this._init);
    do {
        s = '';
        do {
            n = this._nodes[pos];
            c = this._alphabet[choose(n.prob)];
            if (len && s.length < len && c == stop) {
                c = stop + 'x';
            } else {
                s += c;
                pos = choose(n.next);
            }
        } while (c !== stop);
    } while (q > 0 && Math.pow(this.evaluate(s), 1 / s.length) < q);
    return s;
};

// Get probability how much possible a string s can be generated.
HMM.prototype.evaluate = function(s) {
    var alpha = [],
        i, j, k, sum, input;

    for (i = 0; i < s.length; i++) {
        alpha[i] = [];
        input = this._alphabet.indexOf(s[i]);
        if (input == -1) throw new Error('Invalid character: ' + s[i]);

        for (j = 0; j < this._nodes.length; j++) {
            if (i == 0) {
                alpha[0][j] = this._init[j] * this._nodes[j].prob[input];
            } else {
                for (k = sum = 0; k < this._nodes.length; k++) sum += alpha[i - 1][k] * this._nodes[k].next[j];
                alpha[i][j] = sum * this._nodes[j].prob[input];
            }
        }
    }
    for (sum = i = 0; i < this._nodes.length; i++) sum += alpha[s.length - 1][i];
    return sum;
};

// Train these words.
HMM.train_words = function(hmm, words, amount) {
    words.forEach(function(s) {
        console.log("Training: " + s);
        HMM.train(hmm, s, amount);
    });
};

// For node.js
if (typeof exports !== 'undefined') {
    exports.HMM = HMM;
}