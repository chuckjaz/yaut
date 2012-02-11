# yaut - Yet another unit test module

This is the core of a unit test library but is often all I need.

## Tutorial

The core of the library is the `run()` method. It will run a set of unit tests given as a hash to the `run` method optionally given a name. Some utility functions are such as `equal()` and `expect()` which help verify results of a test. However, throwing any exception indicates the failure of a test so it should work with your favorite `assert()` such as `console.assert()`.

**yaut** plays nice with with promises such as from **yap** or **q**. If a test returns a promise then **yaut** will chain the success and failure of the test back to the promise. The results of the test will not be reported until all the promises returned are resolved or rejected.

### Example

```javascript
var yaut = require('yaut');
var myLibrary = require('myLibrary');
var expect = yaut.expect;
var assert = yaut.assert;

yaut.report("Verify myLibrary", {
  "Verify that foo returns bar": function() {
    expect("bar", myLibrary.foo());
  },
  "Verify that calling goo() succeeds": function () {
    assert(myLibrary.goo());
  }
});
```

## Functions

### equals(expected, actual)

Returns true if `expected` is structurally equal to `actual`. It uses `for..in` to enumerate objects and ignores all members that begin with `_` (that is two objects are considered equal if they only differ by the values of methods that begin with `_`).

### expect(expected, actual, [message])

Throws an exception if `equals()` returns false comparing `expected` to `actual` with a value of `message`, if supplied, or `"Expected " + expected + ", received " + actual + "."`.

### report([name], hash)

Calls `run()` and will format the result to `console.log()`. Returns a promise of a Boolean value that is `true` when all the tests succeed or `false` otherwise.

### run([name], hash)

Runs a set of unit tests given in `hash`. Each property of `hash` is expected to be a function containing a unit test. `run()` returns a promise for object containing the results of running the tests is a matching hash with the values of the hash property values with the following properties,

- `success` - `true` if the test passed, `false` if it failed.
- `error` - if `success` is `false` then `error` contains the exception that was thrown.

The result also contains a `name` property, if one is supplied to `run()`.

If a `progress` callback is supplied in the `then()`, it will be called with the results of each test as it is reported to **yaut**.