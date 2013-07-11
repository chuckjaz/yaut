var yaut = require('../yaut');
var yap = require('yap');

var expect = yaut.expect;
var equals = yaut.equals;
var assert = console.assert;

yaut.report("Test yaut", {
    "Empty should succeed": function () {
        // An empty method should always be reported as success
    },
    "Resolved promise should succeed": function () {
        return yap.resolved(true);
    },
    "Throwing an exception should fail": function () {
        return yaut.run({
            test: function () {
                throw new Error();
            }
        }).then(function (results) {
            assert(!results.test.success);
        });
    },
    "Should wait until all are done": function () {
        return yap.timeout(100, 100);
    },
    "Expect and equals should work": function () {
        expect(0, 0);
        expect(1, 1);
        expect("", "");
        expect("some", "some");
        expect({ a: 1, b: 2 }, { a: 1, b: 2 });
        assert(!equals(0, 1));
        assert(!equals(0, 1));
        assert(!equals("a", "b"));
        assert(!equals({a: 1, b: 2}, {a: 2, b: 1}));
    },
    "Returning a continuation function should work": function () {
        return function (cb) {
            yap.timeout(1).then(function () { cb(null, 0); });
        }
    },
    "Failing a continuation should fail": function () {
        return yaut.run({
            test: function () {
                return function (cb) {
                    yap.timeout(1).then(function () { cb(new Error("failed")); });
                }
            }
        }).then(function (result) {
            assert(!result.test.success)
        });
    }
});
