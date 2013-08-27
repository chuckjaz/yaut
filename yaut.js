// Copyright (c) 2012, Chuck Jazdzewski
// Licensed via the Microsoft Reciprocal License (MS-RL) (http://opensource.org/licenses/MS-RL)
(function () {

    var yap = require('yap');

    function getTypeOf(obj) {
        var result = typeof obj;
        switch (result) {
            case "object":
            case "function":
                switch (obj.constructor) {
                    case new String().constructor: return "string";
                    case new Boolean().constructor: return "boolean";
                    case new Number().constructor: return "number";
                    case new Array().constructor: return "array";
                    case new RegExp().constructor: return "regexp";
                    case new Date().constructor: return "date";
                    case Function: return "function";
                }
        }
        return result;
    }

    // Returns true if `expected` is structurally equal to `actual`. It uses `for..in` to enumerate objects and ignores all
    // members that begin with `_` (that is two objects are considered equal if they only differ by the values of methods
    // that begin with `_`).
    function equals(expected, actual) {
        var actualType = getTypeOf(actual);
        var expectedType = getTypeOf(expected);
        if (actualType == expectedType) {
            switch (actualType) {
                case "number":
                case "boolean":
                case "function": return expected === actual;
                case "date":
                case "regexp":
                case "string": return expected.toString() == actual.toString();
                case "object":
                    for (var member in actual) {
                        if (member.substr(0, 1) != '_' && !equals(expected[member], actual[member]))
                            return false;
                    }
                    for (var member in expected) {
                        if (member.substr(0, 1) != '_' && !equals(expected[member], actual[member]))
                            return false;
                    }
                    return true;
                    break;
                case "array":
                    var len = expected.length;
                    if (len != actual.length)
                        return false;
                    for (var i = 0; i < len; i++)
                        if (!equals(expected[i], actual[i]))
                            return false;
                    return true;
                default: return false;
            }
        }
        return false;
    }

    // Throws an exception if `equals()` returns false comparing `expected` to `actual` with a value of `message`,
    // if supplied, or `"Expected " + expected + ", received " + actual + "."`.
    function expect(expected, actual, message) {
        if (!equals(expected, actual))
            throw Error(message || "Expected '" + expected + "', received '" + actual + "'");
    }

    function isSpecialName(name) {
        switch (name) {
            case "initialize":
            case "cleanup":
                return true;
        }
        return false;
    }

    function getTestNames(tests) {
        var result = [];
        for (var testName in tests) {
            if (+testName !== testName && !isSpecialName(testName)) {
                var test = tests[testName];
                if (getTypeOf(test) === "function")
                    result.push(testName);
            }
        }
        return result;
    }

    // Runs a set of unit tests given in `hash`. Each property of `hash` is expected to be a function containing a unit test.
    // `run()` returns a promise for object containing the results of running the tests is a matching hash with the values of
    // the hash property values with the following properties,
    //
    // - `success` - `true` if the test passed, `false` if it failed.
    // - `error` - if `success` is `false` then `error` contains the exception that was thrown.
    //
    // The result also contains a `name` property, if one is supplied to `run()`.
    //
    // If a `progress` callback is supplied in the `then()`, it will be called with the results of each test as it is reported
    // to **yaut**.
    function run(name, tests) {
        var results = {};
        if (typeof name == "string") {
            // first parameter is name.
            results.name = name;
        }
        else {
            // Name was not supplied. Use the first parameter as the tests.
            tests = name;

            // Support name being supplied as a member of `tests`
            if (tests.name) results.name = tests.name;
        }

        function execute(name) {
            return yap.defer(function (resolve, error, progress) {
                var succeeded;
                var result;
                function report(v) {
                    results[v.name] = { success: v.success, error: v.error };
                    if (progress) progress(v);
                    resolve(v);
                }
                function success() {
                    succeeded = true;
                    if (!isSpecialName(name))
                        report({ name: name, success: true, tests: result });
                    else
                        resolve();
                }
                function failed(e) {
                    if (isSpecialName(name))
                        return e;
                    report({ name: name, success: false, error: e, tests: result });
                }
                try {
                    var test = tests[name];
                    if (test)
                        result = tests[name]();
                }
                catch (e) {
                    failed(e);
                    return;
                }
                if (getTypeOf(result) === "function" && result.length == 1) {
                    // Assume the result is a continuation
                    result(function (error, value) {
                        if (error) failed(error);
                        else success(value);
                    });
                }
                else if (yap.like(result)) {
                    var time = tests.timeout || 10000;
                    var timeout = yap.timeout(time).then(function () {
                        if (!succeeded)
                            failed(new Error("Test exceeded " + (time / 1000) + " seconds"));
                    });
                    result.then(success, failed).then(function () { timeout.cancel(); });
                }
                else 
                    success();
            });
        }

        var initialize = execute("initialize");
        return initialize.then(function () {
            return yap.all(getTestNames(tests).map(execute));
        }).then(function () {
            return execute("cleanup");
        }).then(function () {
            return results;
        });
    }

    // Calls `run()` and will format the result to `console.log()`. Returns a promise of a Boolean value that is `true` when
    // all the tests succeed or `false` otherwise.
    function report(name, tests) {
        return run(name, tests).then(function (results) {
            if (results.name)
                console.log(results.name);
            var succeeded = 0;
            var failed = 0;
            getTestNames(tests).forEach(function (name) {
                var v = results[name];
                if (v.success) {
                    console.log("Success: " + name);
                    succeeded++;
                }
                else {
                    console.log("FAILED: " + name + ", " + v.error.message + (v.error.stack ? "\n" + v.error.stack : ""));
                    failed++;
                }
            });
            console.log("" + succeeded + "/" + (succeeded + failed) + " passed" + (failed ? (", " + failed + " FAILED") : "") + ".");
            return failed == 0;
        }, function (err) {
            console.error("ERROR: " + err.message + (err.stack ? "\n" + err.stack : ""));
        });
    }

    exports.run = run;
    exports.report = report;
    exports.equals = equals;
    exports.expect = expect;
})();