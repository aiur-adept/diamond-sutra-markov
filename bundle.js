(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process,setImmediate){(function (){
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.async = {})));
}(this, (function (exports) { 'use strict';

    /**
     * Creates a continuation function with some arguments already applied.
     *
     * Useful as a shorthand when combined with other control flow functions. Any
     * arguments passed to the returned function are added to the arguments
     * originally passed to apply.
     *
     * @name apply
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {Function} fn - The function you want to eventually apply all
     * arguments to. Invokes with (arguments...).
     * @param {...*} arguments... - Any number of arguments to automatically apply
     * when the continuation is called.
     * @returns {Function} the partially-applied function
     * @example
     *
     * // using apply
     * async.parallel([
     *     async.apply(fs.writeFile, 'testfile1', 'test1'),
     *     async.apply(fs.writeFile, 'testfile2', 'test2')
     * ]);
     *
     *
     * // the same process without using apply
     * async.parallel([
     *     function(callback) {
     *         fs.writeFile('testfile1', 'test1', callback);
     *     },
     *     function(callback) {
     *         fs.writeFile('testfile2', 'test2', callback);
     *     }
     * ]);
     *
     * // It's possible to pass any number of additional arguments when calling the
     * // continuation:
     *
     * node> var fn = async.apply(sys.puts, 'one');
     * node> fn('two', 'three');
     * one
     * two
     * three
     */
    function apply(fn, ...args) {
        return (...callArgs) => fn(...args,...callArgs);
    }

    function initialParams (fn) {
        return function (...args/*, callback*/) {
            var callback = args.pop();
            return fn.call(this, args, callback);
        };
    }

    /* istanbul ignore file */

    var hasQueueMicrotask = typeof queueMicrotask === 'function' && queueMicrotask;
    var hasSetImmediate = typeof setImmediate === 'function' && setImmediate;
    var hasNextTick = typeof process === 'object' && typeof process.nextTick === 'function';

    function fallback(fn) {
        setTimeout(fn, 0);
    }

    function wrap(defer) {
        return (fn, ...args) => defer(() => fn(...args));
    }

    var _defer;

    if (hasQueueMicrotask) {
        _defer = queueMicrotask;
    } else if (hasSetImmediate) {
        _defer = setImmediate;
    } else if (hasNextTick) {
        _defer = process.nextTick;
    } else {
        _defer = fallback;
    }

    var setImmediate$1 = wrap(_defer);

    /**
     * Take a sync function and make it async, passing its return value to a
     * callback. This is useful for plugging sync functions into a waterfall,
     * series, or other async functions. Any arguments passed to the generated
     * function will be passed to the wrapped function (except for the final
     * callback argument). Errors thrown will be passed to the callback.
     *
     * If the function passed to `asyncify` returns a Promise, that promises's
     * resolved/rejected state will be used to call the callback, rather than simply
     * the synchronous return value.
     *
     * This also means you can asyncify ES2017 `async` functions.
     *
     * @name asyncify
     * @static
     * @memberOf module:Utils
     * @method
     * @alias wrapSync
     * @category Util
     * @param {Function} func - The synchronous function, or Promise-returning
     * function to convert to an {@link AsyncFunction}.
     * @returns {AsyncFunction} An asynchronous wrapper of the `func`. To be
     * invoked with `(args..., callback)`.
     * @example
     *
     * // passing a regular synchronous function
     * async.waterfall([
     *     async.apply(fs.readFile, filename, "utf8"),
     *     async.asyncify(JSON.parse),
     *     function (data, next) {
     *         // data is the result of parsing the text.
     *         // If there was a parsing error, it would have been caught.
     *     }
     * ], callback);
     *
     * // passing a function returning a promise
     * async.waterfall([
     *     async.apply(fs.readFile, filename, "utf8"),
     *     async.asyncify(function (contents) {
     *         return db.model.create(contents);
     *     }),
     *     function (model, next) {
     *         // `model` is the instantiated model object.
     *         // If there was an error, this function would be skipped.
     *     }
     * ], callback);
     *
     * // es2017 example, though `asyncify` is not needed if your JS environment
     * // supports async functions out of the box
     * var q = async.queue(async.asyncify(async function(file) {
     *     var intermediateStep = await processFile(file);
     *     return await somePromise(intermediateStep)
     * }));
     *
     * q.push(files);
     */
    function asyncify(func) {
        if (isAsync(func)) {
            return function (...args/*, callback*/) {
                const callback = args.pop();
                const promise = func.apply(this, args);
                return handlePromise(promise, callback)
            }
        }

        return initialParams(function (args, callback) {
            var result;
            try {
                result = func.apply(this, args);
            } catch (e) {
                return callback(e);
            }
            // if result is Promise object
            if (result && typeof result.then === 'function') {
                return handlePromise(result, callback)
            } else {
                callback(null, result);
            }
        });
    }

    function handlePromise(promise, callback) {
        return promise.then(value => {
            invokeCallback(callback, null, value);
        }, err => {
            invokeCallback(callback, err && err.message ? err : new Error(err));
        });
    }

    function invokeCallback(callback, error, value) {
        try {
            callback(error, value);
        } catch (err) {
            setImmediate$1(e => { throw e }, err);
        }
    }

    function isAsync(fn) {
        return fn[Symbol.toStringTag] === 'AsyncFunction';
    }

    function isAsyncGenerator(fn) {
        return fn[Symbol.toStringTag] === 'AsyncGenerator';
    }

    function isAsyncIterable(obj) {
        return typeof obj[Symbol.asyncIterator] === 'function';
    }

    function wrapAsync(asyncFn) {
        if (typeof asyncFn !== 'function') throw new Error('expected a function')
        return isAsync(asyncFn) ? asyncify(asyncFn) : asyncFn;
    }

    // conditionally promisify a function.
    // only return a promise if a callback is omitted
    function awaitify (asyncFn, arity = asyncFn.length) {
        if (!arity) throw new Error('arity is undefined')
        function awaitable (...args) {
            if (typeof args[arity - 1] === 'function') {
                return asyncFn.apply(this, args)
            }

            return new Promise((resolve, reject) => {
                args[arity - 1] = (err, ...cbArgs) => {
                    if (err) return reject(err)
                    resolve(cbArgs.length > 1 ? cbArgs : cbArgs[0]);
                };
                asyncFn.apply(this, args);
            })
        }

        return awaitable
    }

    function applyEach (eachfn) {
        return function applyEach(fns, ...callArgs) {
            const go = awaitify(function (callback) {
                var that = this;
                return eachfn(fns, (fn, cb) => {
                    wrapAsync(fn).apply(that, callArgs.concat(cb));
                }, callback);
            });
            return go;
        };
    }

    function _asyncMap(eachfn, arr, iteratee, callback) {
        arr = arr || [];
        var results = [];
        var counter = 0;
        var _iteratee = wrapAsync(iteratee);

        return eachfn(arr, (value, _, iterCb) => {
            var index = counter++;
            _iteratee(value, (err, v) => {
                results[index] = v;
                iterCb(err);
            });
        }, err => {
            callback(err, results);
        });
    }

    function isArrayLike(value) {
        return value &&
            typeof value.length === 'number' &&
            value.length >= 0 &&
            value.length % 1 === 0;
    }

    // A temporary value used to identify if the loop should be broken.
    // See #1064, #1293
    const breakLoop = {};

    function once(fn) {
        function wrapper (...args) {
            if (fn === null) return;
            var callFn = fn;
            fn = null;
            callFn.apply(this, args);
        }
        Object.assign(wrapper, fn);
        return wrapper
    }

    function getIterator (coll) {
        return coll[Symbol.iterator] && coll[Symbol.iterator]();
    }

    function createArrayIterator(coll) {
        var i = -1;
        var len = coll.length;
        return function next() {
            return ++i < len ? {value: coll[i], key: i} : null;
        }
    }

    function createES2015Iterator(iterator) {
        var i = -1;
        return function next() {
            var item = iterator.next();
            if (item.done)
                return null;
            i++;
            return {value: item.value, key: i};
        }
    }

    function createObjectIterator(obj) {
        var okeys = obj ? Object.keys(obj) : [];
        var i = -1;
        var len = okeys.length;
        return function next() {
            var key = okeys[++i];
            if (key === '__proto__') {
                return next();
            }
            return i < len ? {value: obj[key], key} : null;
        };
    }

    function createIterator(coll) {
        if (isArrayLike(coll)) {
            return createArrayIterator(coll);
        }

        var iterator = getIterator(coll);
        return iterator ? createES2015Iterator(iterator) : createObjectIterator(coll);
    }

    function onlyOnce(fn) {
        return function (...args) {
            if (fn === null) throw new Error("Callback was already called.");
            var callFn = fn;
            fn = null;
            callFn.apply(this, args);
        };
    }

    // for async generators
    function asyncEachOfLimit(generator, limit, iteratee, callback) {
        let done = false;
        let canceled = false;
        let awaiting = false;
        let running = 0;
        let idx = 0;

        function replenish() {
            //console.log('replenish')
            if (running >= limit || awaiting || done) return
            //console.log('replenish awaiting')
            awaiting = true;
            generator.next().then(({value, done: iterDone}) => {
                //console.log('got value', value)
                if (canceled || done) return
                awaiting = false;
                if (iterDone) {
                    done = true;
                    if (running <= 0) {
                        //console.log('done nextCb')
                        callback(null);
                    }
                    return;
                }
                running++;
                iteratee(value, idx, iterateeCallback);
                idx++;
                replenish();
            }).catch(handleError);
        }

        function iterateeCallback(err, result) {
            //console.log('iterateeCallback')
            running -= 1;
            if (canceled) return
            if (err) return handleError(err)

            if (err === false) {
                done = true;
                canceled = true;
                return
            }

            if (result === breakLoop || (done && running <= 0)) {
                done = true;
                //console.log('done iterCb')
                return callback(null);
            }
            replenish();
        }

        function handleError(err) {
            if (canceled) return
            awaiting = false;
            done = true;
            callback(err);
        }

        replenish();
    }

    var eachOfLimit = (limit) => {
        return (obj, iteratee, callback) => {
            callback = once(callback);
            if (limit <= 0) {
                throw new RangeError('concurrency limit cannot be less than 1')
            }
            if (!obj) {
                return callback(null);
            }
            if (isAsyncGenerator(obj)) {
                return asyncEachOfLimit(obj, limit, iteratee, callback)
            }
            if (isAsyncIterable(obj)) {
                return asyncEachOfLimit(obj[Symbol.asyncIterator](), limit, iteratee, callback)
            }
            var nextElem = createIterator(obj);
            var done = false;
            var canceled = false;
            var running = 0;
            var looping = false;

            function iterateeCallback(err, value) {
                if (canceled) return
                running -= 1;
                if (err) {
                    done = true;
                    callback(err);
                }
                else if (err === false) {
                    done = true;
                    canceled = true;
                }
                else if (value === breakLoop || (done && running <= 0)) {
                    done = true;
                    return callback(null);
                }
                else if (!looping) {
                    replenish();
                }
            }

            function replenish () {
                looping = true;
                while (running < limit && !done) {
                    var elem = nextElem();
                    if (elem === null) {
                        done = true;
                        if (running <= 0) {
                            callback(null);
                        }
                        return;
                    }
                    running += 1;
                    iteratee(elem.value, elem.key, onlyOnce(iterateeCallback));
                }
                looping = false;
            }

            replenish();
        };
    };

    /**
     * The same as [`eachOf`]{@link module:Collections.eachOf} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name eachOfLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.eachOf]{@link module:Collections.eachOf}
     * @alias forEachOfLimit
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each
     * item in `coll`. The `key` is the item's key, or index in the case of an
     * array.
     * Invoked with (item, key, callback).
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     * @returns {Promise} a promise, if a callback is omitted
     */
    function eachOfLimit$1(coll, limit, iteratee, callback) {
        return eachOfLimit(limit)(coll, wrapAsync(iteratee), callback);
    }

    var eachOfLimit$2 = awaitify(eachOfLimit$1, 4);

    // eachOf implementation optimized for array-likes
    function eachOfArrayLike(coll, iteratee, callback) {
        callback = once(callback);
        var index = 0,
            completed = 0,
            {length} = coll,
            canceled = false;
        if (length === 0) {
            callback(null);
        }

        function iteratorCallback(err, value) {
            if (err === false) {
                canceled = true;
            }
            if (canceled === true) return
            if (err) {
                callback(err);
            } else if ((++completed === length) || value === breakLoop) {
                callback(null);
            }
        }

        for (; index < length; index++) {
            iteratee(coll[index], index, onlyOnce(iteratorCallback));
        }
    }

    // a generic version of eachOf which can handle array, object, and iterator cases.
    function eachOfGeneric (coll, iteratee, callback) {
        return eachOfLimit$2(coll, Infinity, iteratee, callback);
    }

    /**
     * Like [`each`]{@link module:Collections.each}, except that it passes the key (or index) as the second argument
     * to the iteratee.
     *
     * @name eachOf
     * @static
     * @memberOf module:Collections
     * @method
     * @alias forEachOf
     * @category Collection
     * @see [async.each]{@link module:Collections.each}
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each
     * item in `coll`.
     * The `key` is the item's key, or index in the case of an array.
     * Invoked with (item, key, callback).
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     * @returns {Promise} a promise, if a callback is omitted
     * @example
     *
     * // dev.json is a file containing a valid json object config for dev environment
     * // dev.json is a file containing a valid json object config for test environment
     * // prod.json is a file containing a valid json object config for prod environment
     * // invalid.json is a file with a malformed json object
     *
     * let configs = {}; //global variable
     * let validConfigFileMap = {dev: 'dev.json', test: 'test.json', prod: 'prod.json'};
     * let invalidConfigFileMap = {dev: 'dev.json', test: 'test.json', invalid: 'invalid.json'};
     *
     * // asynchronous function that reads a json file and parses the contents as json object
     * function parseFile(file, key, callback) {
     *     fs.readFile(file, "utf8", function(err, data) {
     *         if (err) return calback(err);
     *         try {
     *             configs[key] = JSON.parse(data);
     *         } catch (e) {
     *             return callback(e);
     *         }
     *         callback();
     *     });
     * }
     *
     * // Using callbacks
     * async.forEachOf(validConfigFileMap, parseFile, function (err) {
     *     if (err) {
     *         console.error(err);
     *     } else {
     *         console.log(configs);
     *         // configs is now a map of JSON data, e.g.
     *         // { dev: //parsed dev.json, test: //parsed test.json, prod: //parsed prod.json}
     *     }
     * });
     *
     * //Error handing
     * async.forEachOf(invalidConfigFileMap, parseFile, function (err) {
     *     if (err) {
     *         console.error(err);
     *         // JSON parse error exception
     *     } else {
     *         console.log(configs);
     *     }
     * });
     *
     * // Using Promises
     * async.forEachOf(validConfigFileMap, parseFile)
     * .then( () => {
     *     console.log(configs);
     *     // configs is now a map of JSON data, e.g.
     *     // { dev: //parsed dev.json, test: //parsed test.json, prod: //parsed prod.json}
     * }).catch( err => {
     *     console.error(err);
     * });
     *
     * //Error handing
     * async.forEachOf(invalidConfigFileMap, parseFile)
     * .then( () => {
     *     console.log(configs);
     * }).catch( err => {
     *     console.error(err);
     *     // JSON parse error exception
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.forEachOf(validConfigFileMap, parseFile);
     *         console.log(configs);
     *         // configs is now a map of JSON data, e.g.
     *         // { dev: //parsed dev.json, test: //parsed test.json, prod: //parsed prod.json}
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * //Error handing
     * async () => {
     *     try {
     *         let result = await async.forEachOf(invalidConfigFileMap, parseFile);
     *         console.log(configs);
     *     }
     *     catch (err) {
     *         console.log(err);
     *         // JSON parse error exception
     *     }
     * }
     *
     */
    function eachOf(coll, iteratee, callback) {
        var eachOfImplementation = isArrayLike(coll) ? eachOfArrayLike : eachOfGeneric;
        return eachOfImplementation(coll, wrapAsync(iteratee), callback);
    }

    var eachOf$1 = awaitify(eachOf, 3);

    /**
     * Produces a new collection of values by mapping each value in `coll` through
     * the `iteratee` function. The `iteratee` is called with an item from `coll`
     * and a callback for when it has finished processing. Each of these callbacks
     * takes 2 arguments: an `error`, and the transformed item from `coll`. If
     * `iteratee` passes an error to its callback, the main `callback` (for the
     * `map` function) is immediately called with the error.
     *
     * Note, that since this function applies the `iteratee` to each item in
     * parallel, there is no guarantee that the `iteratee` functions will complete
     * in order. However, the results array will be in the same order as the
     * original `coll`.
     *
     * If `map` is passed an Object, the results will be an Array.  The results
     * will roughly be in the order of the original Objects' keys (but this can
     * vary across JavaScript engines).
     *
     * @name map
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with the transformed item.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Results is an Array of the
     * transformed items from the `coll`. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * // file1.txt is a file that is 1000 bytes in size
     * // file2.txt is a file that is 2000 bytes in size
     * // file3.txt is a file that is 3000 bytes in size
     * // file4.txt does not exist
     *
     * const fileList = ['file1.txt','file2.txt','file3.txt'];
     * const withMissingFileList = ['file1.txt','file2.txt','file4.txt'];
     *
     * // asynchronous function that returns the file size in bytes
     * function getFileSizeInBytes(file, callback) {
     *     fs.stat(file, function(err, stat) {
     *         if (err) {
     *             return callback(err);
     *         }
     *         callback(null, stat.size);
     *     });
     * }
     *
     * // Using callbacks
     * async.map(fileList, getFileSizeInBytes, function(err, results) {
     *     if (err) {
     *         console.log(err);
     *     } else {
     *         console.log(results);
     *         // results is now an array of the file size in bytes for each file, e.g.
     *         // [ 1000, 2000, 3000]
     *     }
     * });
     *
     * // Error Handling
     * async.map(withMissingFileList, getFileSizeInBytes, function(err, results) {
     *     if (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     } else {
     *         console.log(results);
     *     }
     * });
     *
     * // Using Promises
     * async.map(fileList, getFileSizeInBytes)
     * .then( results => {
     *     console.log(results);
     *     // results is now an array of the file size in bytes for each file, e.g.
     *     // [ 1000, 2000, 3000]
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Error Handling
     * async.map(withMissingFileList, getFileSizeInBytes)
     * .then( results => {
     *     console.log(results);
     * }).catch( err => {
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let results = await async.map(fileList, getFileSizeInBytes);
     *         console.log(results);
     *         // results is now an array of the file size in bytes for each file, e.g.
     *         // [ 1000, 2000, 3000]
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // Error Handling
     * async () => {
     *     try {
     *         let results = await async.map(withMissingFileList, getFileSizeInBytes);
     *         console.log(results);
     *     }
     *     catch (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     }
     * }
     *
     */
    function map (coll, iteratee, callback) {
        return _asyncMap(eachOf$1, coll, iteratee, callback)
    }
    var map$1 = awaitify(map, 3);

    /**
     * Applies the provided arguments to each function in the array, calling
     * `callback` after all functions have completed. If you only provide the first
     * argument, `fns`, then it will return a function which lets you pass in the
     * arguments as if it were a single function call. If more arguments are
     * provided, `callback` is required while `args` is still optional. The results
     * for each of the applied async functions are passed to the final callback
     * as an array.
     *
     * @name applyEach
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array|Iterable|AsyncIterable|Object} fns - A collection of {@link AsyncFunction}s
     * to all call with the same arguments
     * @param {...*} [args] - any number of separate arguments to pass to the
     * function.
     * @param {Function} [callback] - the final argument should be the callback,
     * called when all functions have completed processing.
     * @returns {AsyncFunction} - Returns a function that takes no args other than
     * an optional callback, that is the result of applying the `args` to each
     * of the functions.
     * @example
     *
     * const appliedFn = async.applyEach([enableSearch, updateSchema], 'bucket')
     *
     * appliedFn((err, results) => {
     *     // results[0] is the results for `enableSearch`
     *     // results[1] is the results for `updateSchema`
     * });
     *
     * // partial application example:
     * async.each(
     *     buckets,
     *     async (bucket) => async.applyEach([enableSearch, updateSchema], bucket)(),
     *     callback
     * );
     */
    var applyEach$1 = applyEach(map$1);

    /**
     * The same as [`eachOf`]{@link module:Collections.eachOf} but runs only a single async operation at a time.
     *
     * @name eachOfSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.eachOf]{@link module:Collections.eachOf}
     * @alias forEachOfSeries
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * Invoked with (item, key, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Invoked with (err).
     * @returns {Promise} a promise, if a callback is omitted
     */
    function eachOfSeries(coll, iteratee, callback) {
        return eachOfLimit$2(coll, 1, iteratee, callback)
    }
    var eachOfSeries$1 = awaitify(eachOfSeries, 3);

    /**
     * The same as [`map`]{@link module:Collections.map} but runs only a single async operation at a time.
     *
     * @name mapSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.map]{@link module:Collections.map}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with the transformed item.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Results is an array of the
     * transformed items from the `coll`. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback is passed
     */
    function mapSeries (coll, iteratee, callback) {
        return _asyncMap(eachOfSeries$1, coll, iteratee, callback)
    }
    var mapSeries$1 = awaitify(mapSeries, 3);

    /**
     * The same as [`applyEach`]{@link module:ControlFlow.applyEach} but runs only a single async operation at a time.
     *
     * @name applyEachSeries
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.applyEach]{@link module:ControlFlow.applyEach}
     * @category Control Flow
     * @param {Array|Iterable|AsyncIterable|Object} fns - A collection of {@link AsyncFunction}s to all
     * call with the same arguments
     * @param {...*} [args] - any number of separate arguments to pass to the
     * function.
     * @param {Function} [callback] - the final argument should be the callback,
     * called when all functions have completed processing.
     * @returns {AsyncFunction} - A function, that when called, is the result of
     * appling the `args` to the list of functions.  It takes no args, other than
     * a callback.
     */
    var applyEachSeries = applyEach(mapSeries$1);

    const PROMISE_SYMBOL = Symbol('promiseCallback');

    function promiseCallback () {
        let resolve, reject;
        function callback (err, ...args) {
            if (err) return reject(err)
            resolve(args.length > 1 ? args : args[0]);
        }

        callback[PROMISE_SYMBOL] = new Promise((res, rej) => {
            resolve = res,
            reject = rej;
        });

        return callback
    }

    /**
     * Determines the best order for running the {@link AsyncFunction}s in `tasks`, based on
     * their requirements. Each function can optionally depend on other functions
     * being completed first, and each function is run as soon as its requirements
     * are satisfied.
     *
     * If any of the {@link AsyncFunction}s pass an error to their callback, the `auto` sequence
     * will stop. Further tasks will not execute (so any other functions depending
     * on it will not run), and the main `callback` is immediately called with the
     * error.
     *
     * {@link AsyncFunction}s also receive an object containing the results of functions which
     * have completed so far as the first argument, if they have dependencies. If a
     * task function has no dependencies, it will only be passed a callback.
     *
     * @name auto
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Object} tasks - An object. Each of its properties is either a
     * function or an array of requirements, with the {@link AsyncFunction} itself the last item
     * in the array. The object's key of a property serves as the name of the task
     * defined by that property, i.e. can be used when specifying requirements for
     * other tasks. The function receives one or two arguments:
     * * a `results` object, containing the results of the previously executed
     *   functions, only passed if the task has any dependencies,
     * * a `callback(err, result)` function, which must be called when finished,
     *   passing an `error` (which can be `null`) and the result of the function's
     *   execution.
     * @param {number} [concurrency=Infinity] - An optional `integer` for
     * determining the maximum number of tasks that can be run in parallel. By
     * default, as many as possible.
     * @param {Function} [callback] - An optional callback which is called when all
     * the tasks have been completed. It receives the `err` argument if any `tasks`
     * pass an error to their callback. Results are always returned; however, if an
     * error occurs, no further `tasks` will be performed, and the results object
     * will only contain partial results. Invoked with (err, results).
     * @returns {Promise} a promise, if a callback is not passed
     * @example
     *
     * //Using Callbacks
     * async.auto({
     *     get_data: function(callback) {
     *         // async code to get some data
     *         callback(null, 'data', 'converted to array');
     *     },
     *     make_folder: function(callback) {
     *         // async code to create a directory to store a file in
     *         // this is run at the same time as getting the data
     *         callback(null, 'folder');
     *     },
     *     write_file: ['get_data', 'make_folder', function(results, callback) {
     *         // once there is some data and the directory exists,
     *         // write the data to a file in the directory
     *         callback(null, 'filename');
     *     }],
     *     email_link: ['write_file', function(results, callback) {
     *         // once the file is written let's email a link to it...
     *         callback(null, {'file':results.write_file, 'email':'user@example.com'});
     *     }]
     * }, function(err, results) {
     *     if (err) {
     *         console.log('err = ', err);
     *     }
     *     console.log('results = ', results);
     *     // results = {
     *     //     get_data: ['data', 'converted to array']
     *     //     make_folder; 'folder',
     *     //     write_file: 'filename'
     *     //     email_link: { file: 'filename', email: 'user@example.com' }
     *     // }
     * });
     *
     * //Using Promises
     * async.auto({
     *     get_data: function(callback) {
     *         console.log('in get_data');
     *         // async code to get some data
     *         callback(null, 'data', 'converted to array');
     *     },
     *     make_folder: function(callback) {
     *         console.log('in make_folder');
     *         // async code to create a directory to store a file in
     *         // this is run at the same time as getting the data
     *         callback(null, 'folder');
     *     },
     *     write_file: ['get_data', 'make_folder', function(results, callback) {
     *         // once there is some data and the directory exists,
     *         // write the data to a file in the directory
     *         callback(null, 'filename');
     *     }],
     *     email_link: ['write_file', function(results, callback) {
     *         // once the file is written let's email a link to it...
     *         callback(null, {'file':results.write_file, 'email':'user@example.com'});
     *     }]
     * }).then(results => {
     *     console.log('results = ', results);
     *     // results = {
     *     //     get_data: ['data', 'converted to array']
     *     //     make_folder; 'folder',
     *     //     write_file: 'filename'
     *     //     email_link: { file: 'filename', email: 'user@example.com' }
     *     // }
     * }).catch(err => {
     *     console.log('err = ', err);
     * });
     *
     * //Using async/await
     * async () => {
     *     try {
     *         let results = await async.auto({
     *             get_data: function(callback) {
     *                 // async code to get some data
     *                 callback(null, 'data', 'converted to array');
     *             },
     *             make_folder: function(callback) {
     *                 // async code to create a directory to store a file in
     *                 // this is run at the same time as getting the data
     *                 callback(null, 'folder');
     *             },
     *             write_file: ['get_data', 'make_folder', function(results, callback) {
     *                 // once there is some data and the directory exists,
     *                 // write the data to a file in the directory
     *                 callback(null, 'filename');
     *             }],
     *             email_link: ['write_file', function(results, callback) {
     *                 // once the file is written let's email a link to it...
     *                 callback(null, {'file':results.write_file, 'email':'user@example.com'});
     *             }]
     *         });
     *         console.log('results = ', results);
     *         // results = {
     *         //     get_data: ['data', 'converted to array']
     *         //     make_folder; 'folder',
     *         //     write_file: 'filename'
     *         //     email_link: { file: 'filename', email: 'user@example.com' }
     *         // }
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function auto(tasks, concurrency, callback) {
        if (typeof concurrency !== 'number') {
            // concurrency is optional, shift the args.
            callback = concurrency;
            concurrency = null;
        }
        callback = once(callback || promiseCallback());
        var numTasks = Object.keys(tasks).length;
        if (!numTasks) {
            return callback(null);
        }
        if (!concurrency) {
            concurrency = numTasks;
        }

        var results = {};
        var runningTasks = 0;
        var canceled = false;
        var hasError = false;

        var listeners = Object.create(null);

        var readyTasks = [];

        // for cycle detection:
        var readyToCheck = []; // tasks that have been identified as reachable
        // without the possibility of returning to an ancestor task
        var uncheckedDependencies = {};

        Object.keys(tasks).forEach(key => {
            var task = tasks[key];
            if (!Array.isArray(task)) {
                // no dependencies
                enqueueTask(key, [task]);
                readyToCheck.push(key);
                return;
            }

            var dependencies = task.slice(0, task.length - 1);
            var remainingDependencies = dependencies.length;
            if (remainingDependencies === 0) {
                enqueueTask(key, task);
                readyToCheck.push(key);
                return;
            }
            uncheckedDependencies[key] = remainingDependencies;

            dependencies.forEach(dependencyName => {
                if (!tasks[dependencyName]) {
                    throw new Error('async.auto task `' + key +
                        '` has a non-existent dependency `' +
                        dependencyName + '` in ' +
                        dependencies.join(', '));
                }
                addListener(dependencyName, () => {
                    remainingDependencies--;
                    if (remainingDependencies === 0) {
                        enqueueTask(key, task);
                    }
                });
            });
        });

        checkForDeadlocks();
        processQueue();

        function enqueueTask(key, task) {
            readyTasks.push(() => runTask(key, task));
        }

        function processQueue() {
            if (canceled) return
            if (readyTasks.length === 0 && runningTasks === 0) {
                return callback(null, results);
            }
            while(readyTasks.length && runningTasks < concurrency) {
                var run = readyTasks.shift();
                run();
            }

        }

        function addListener(taskName, fn) {
            var taskListeners = listeners[taskName];
            if (!taskListeners) {
                taskListeners = listeners[taskName] = [];
            }

            taskListeners.push(fn);
        }

        function taskComplete(taskName) {
            var taskListeners = listeners[taskName] || [];
            taskListeners.forEach(fn => fn());
            processQueue();
        }


        function runTask(key, task) {
            if (hasError) return;

            var taskCallback = onlyOnce((err, ...result) => {
                runningTasks--;
                if (err === false) {
                    canceled = true;
                    return
                }
                if (result.length < 2) {
                    [result] = result;
                }
                if (err) {
                    var safeResults = {};
                    Object.keys(results).forEach(rkey => {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[key] = result;
                    hasError = true;
                    listeners = Object.create(null);
                    if (canceled) return
                    callback(err, safeResults);
                } else {
                    results[key] = result;
                    taskComplete(key);
                }
            });

            runningTasks++;
            var taskFn = wrapAsync(task[task.length - 1]);
            if (task.length > 1) {
                taskFn(results, taskCallback);
            } else {
                taskFn(taskCallback);
            }
        }

        function checkForDeadlocks() {
            // Kahn's algorithm
            // https://en.wikipedia.org/wiki/Topological_sorting#Kahn.27s_algorithm
            // http://connalle.blogspot.com/2013/10/topological-sortingkahn-algorithm.html
            var currentTask;
            var counter = 0;
            while (readyToCheck.length) {
                currentTask = readyToCheck.pop();
                counter++;
                getDependents(currentTask).forEach(dependent => {
                    if (--uncheckedDependencies[dependent] === 0) {
                        readyToCheck.push(dependent);
                    }
                });
            }

            if (counter !== numTasks) {
                throw new Error(
                    'async.auto cannot execute tasks due to a recursive dependency'
                );
            }
        }

        function getDependents(taskName) {
            var result = [];
            Object.keys(tasks).forEach(key => {
                const task = tasks[key];
                if (Array.isArray(task) && task.indexOf(taskName) >= 0) {
                    result.push(key);
                }
            });
            return result;
        }

        return callback[PROMISE_SYMBOL]
    }

    var FN_ARGS = /^(?:async\s+)?(?:function)?\s*\w*\s*\(\s*([^)]+)\s*\)(?:\s*{)/;
    var ARROW_FN_ARGS = /^(?:async\s+)?\(?\s*([^)=]+)\s*\)?(?:\s*=>)/;
    var FN_ARG_SPLIT = /,/;
    var FN_ARG = /(=.+)?(\s*)$/;

    function stripComments(string) {
        let stripped = '';
        let index = 0;
        let endBlockComment = string.indexOf('*/');
        while (index < string.length) {
            if (string[index] === '/' && string[index+1] === '/') {
                // inline comment
                let endIndex = string.indexOf('\n', index);
                index = (endIndex === -1) ? string.length : endIndex;
            } else if ((endBlockComment !== -1) && (string[index] === '/') && (string[index+1] === '*')) {
                // block comment
                let endIndex = string.indexOf('*/', index);
                if (endIndex !== -1) {
                    index = endIndex + 2;
                    endBlockComment = string.indexOf('*/', index);
                } else {
                    stripped += string[index];
                    index++;
                }
            } else {
                stripped += string[index];
                index++;
            }
        }
        return stripped;
    }

    function parseParams(func) {
        const src = stripComments(func.toString());
        let match = src.match(FN_ARGS);
        if (!match) {
            match = src.match(ARROW_FN_ARGS);
        }
        if (!match) throw new Error('could not parse args in autoInject\nSource:\n' + src)
        let [, args] = match;
        return args
            .replace(/\s/g, '')
            .split(FN_ARG_SPLIT)
            .map((arg) => arg.replace(FN_ARG, '').trim());
    }

    /**
     * A dependency-injected version of the [async.auto]{@link module:ControlFlow.auto} function. Dependent
     * tasks are specified as parameters to the function, after the usual callback
     * parameter, with the parameter names matching the names of the tasks it
     * depends on. This can provide even more readable task graphs which can be
     * easier to maintain.
     *
     * If a final callback is specified, the task results are similarly injected,
     * specified as named parameters after the initial error parameter.
     *
     * The autoInject function is purely syntactic sugar and its semantics are
     * otherwise equivalent to [async.auto]{@link module:ControlFlow.auto}.
     *
     * @name autoInject
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.auto]{@link module:ControlFlow.auto}
     * @category Control Flow
     * @param {Object} tasks - An object, each of whose properties is an {@link AsyncFunction} of
     * the form 'func([dependencies...], callback). The object's key of a property
     * serves as the name of the task defined by that property, i.e. can be used
     * when specifying requirements for other tasks.
     * * The `callback` parameter is a `callback(err, result)` which must be called
     *   when finished, passing an `error` (which can be `null`) and the result of
     *   the function's execution. The remaining parameters name other tasks on
     *   which the task is dependent, and the results from those tasks are the
     *   arguments of those parameters.
     * @param {Function} [callback] - An optional callback which is called when all
     * the tasks have been completed. It receives the `err` argument if any `tasks`
     * pass an error to their callback, and a `results` object with any completed
     * task results, similar to `auto`.
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * //  The example from `auto` can be rewritten as follows:
     * async.autoInject({
     *     get_data: function(callback) {
     *         // async code to get some data
     *         callback(null, 'data', 'converted to array');
     *     },
     *     make_folder: function(callback) {
     *         // async code to create a directory to store a file in
     *         // this is run at the same time as getting the data
     *         callback(null, 'folder');
     *     },
     *     write_file: function(get_data, make_folder, callback) {
     *         // once there is some data and the directory exists,
     *         // write the data to a file in the directory
     *         callback(null, 'filename');
     *     },
     *     email_link: function(write_file, callback) {
     *         // once the file is written let's email a link to it...
     *         // write_file contains the filename returned by write_file.
     *         callback(null, {'file':write_file, 'email':'user@example.com'});
     *     }
     * }, function(err, results) {
     *     console.log('err = ', err);
     *     console.log('email_link = ', results.email_link);
     * });
     *
     * // If you are using a JS minifier that mangles parameter names, `autoInject`
     * // will not work with plain functions, since the parameter names will be
     * // collapsed to a single letter identifier.  To work around this, you can
     * // explicitly specify the names of the parameters your task function needs
     * // in an array, similar to Angular.js dependency injection.
     *
     * // This still has an advantage over plain `auto`, since the results a task
     * // depends on are still spread into arguments.
     * async.autoInject({
     *     //...
     *     write_file: ['get_data', 'make_folder', function(get_data, make_folder, callback) {
     *         callback(null, 'filename');
     *     }],
     *     email_link: ['write_file', function(write_file, callback) {
     *         callback(null, {'file':write_file, 'email':'user@example.com'});
     *     }]
     *     //...
     * }, function(err, results) {
     *     console.log('err = ', err);
     *     console.log('email_link = ', results.email_link);
     * });
     */
    function autoInject(tasks, callback) {
        var newTasks = {};

        Object.keys(tasks).forEach(key => {
            var taskFn = tasks[key];
            var params;
            var fnIsAsync = isAsync(taskFn);
            var hasNoDeps =
                (!fnIsAsync && taskFn.length === 1) ||
                (fnIsAsync && taskFn.length === 0);

            if (Array.isArray(taskFn)) {
                params = [...taskFn];
                taskFn = params.pop();

                newTasks[key] = params.concat(params.length > 0 ? newTask : taskFn);
            } else if (hasNoDeps) {
                // no dependencies, use the function as-is
                newTasks[key] = taskFn;
            } else {
                params = parseParams(taskFn);
                if ((taskFn.length === 0 && !fnIsAsync) && params.length === 0) {
                    throw new Error("autoInject task functions require explicit parameters.");
                }

                // remove callback param
                if (!fnIsAsync) params.pop();

                newTasks[key] = params.concat(newTask);
            }

            function newTask(results, taskCb) {
                var newArgs = params.map(name => results[name]);
                newArgs.push(taskCb);
                wrapAsync(taskFn)(...newArgs);
            }
        });

        return auto(newTasks, callback);
    }

    // Simple doubly linked list (https://en.wikipedia.org/wiki/Doubly_linked_list) implementation
    // used for queues. This implementation assumes that the node provided by the user can be modified
    // to adjust the next and last properties. We implement only the minimal functionality
    // for queue support.
    class DLL {
        constructor() {
            this.head = this.tail = null;
            this.length = 0;
        }

        removeLink(node) {
            if (node.prev) node.prev.next = node.next;
            else this.head = node.next;
            if (node.next) node.next.prev = node.prev;
            else this.tail = node.prev;

            node.prev = node.next = null;
            this.length -= 1;
            return node;
        }

        empty () {
            while(this.head) this.shift();
            return this;
        }

        insertAfter(node, newNode) {
            newNode.prev = node;
            newNode.next = node.next;
            if (node.next) node.next.prev = newNode;
            else this.tail = newNode;
            node.next = newNode;
            this.length += 1;
        }

        insertBefore(node, newNode) {
            newNode.prev = node.prev;
            newNode.next = node;
            if (node.prev) node.prev.next = newNode;
            else this.head = newNode;
            node.prev = newNode;
            this.length += 1;
        }

        unshift(node) {
            if (this.head) this.insertBefore(this.head, node);
            else setInitial(this, node);
        }

        push(node) {
            if (this.tail) this.insertAfter(this.tail, node);
            else setInitial(this, node);
        }

        shift() {
            return this.head && this.removeLink(this.head);
        }

        pop() {
            return this.tail && this.removeLink(this.tail);
        }

        toArray() {
            return [...this]
        }

        *[Symbol.iterator] () {
            var cur = this.head;
            while (cur) {
                yield cur.data;
                cur = cur.next;
            }
        }

        remove (testFn) {
            var curr = this.head;
            while(curr) {
                var {next} = curr;
                if (testFn(curr)) {
                    this.removeLink(curr);
                }
                curr = next;
            }
            return this;
        }
    }

    function setInitial(dll, node) {
        dll.length = 1;
        dll.head = dll.tail = node;
    }

    function queue(worker, concurrency, payload) {
        if (concurrency == null) {
            concurrency = 1;
        }
        else if(concurrency === 0) {
            throw new RangeError('Concurrency must not be zero');
        }

        var _worker = wrapAsync(worker);
        var numRunning = 0;
        var workersList = [];
        const events = {
            error: [],
            drain: [],
            saturated: [],
            unsaturated: [],
            empty: []
        };

        function on (event, handler) {
            events[event].push(handler);
        }

        function once (event, handler) {
            const handleAndRemove = (...args) => {
                off(event, handleAndRemove);
                handler(...args);
            };
            events[event].push(handleAndRemove);
        }

        function off (event, handler) {
            if (!event) return Object.keys(events).forEach(ev => events[ev] = [])
            if (!handler) return events[event] = []
            events[event] = events[event].filter(ev => ev !== handler);
        }

        function trigger (event, ...args) {
            events[event].forEach(handler => handler(...args));
        }

        var processingScheduled = false;
        function _insert(data, insertAtFront, rejectOnError, callback) {
            if (callback != null && typeof callback !== 'function') {
                throw new Error('task callback must be a function');
            }
            q.started = true;

            var res, rej;
            function promiseCallback (err, ...args) {
                // we don't care about the error, let the global error handler
                // deal with it
                if (err) return rejectOnError ? rej(err) : res()
                if (args.length <= 1) return res(args[0])
                res(args);
            }

            var item = q._createTaskItem(
                data,
                rejectOnError ? promiseCallback :
                    (callback || promiseCallback)
            );

            if (insertAtFront) {
                q._tasks.unshift(item);
            } else {
                q._tasks.push(item);
            }

            if (!processingScheduled) {
                processingScheduled = true;
                setImmediate$1(() => {
                    processingScheduled = false;
                    q.process();
                });
            }

            if (rejectOnError || !callback) {
                return new Promise((resolve, reject) => {
                    res = resolve;
                    rej = reject;
                })
            }
        }

        function _createCB(tasks) {
            return function (err, ...args) {
                numRunning -= 1;

                for (var i = 0, l = tasks.length; i < l; i++) {
                    var task = tasks[i];

                    var index = workersList.indexOf(task);
                    if (index === 0) {
                        workersList.shift();
                    } else if (index > 0) {
                        workersList.splice(index, 1);
                    }

                    task.callback(err, ...args);

                    if (err != null) {
                        trigger('error', err, task.data);
                    }
                }

                if (numRunning <= (q.concurrency - q.buffer) ) {
                    trigger('unsaturated');
                }

                if (q.idle()) {
                    trigger('drain');
                }
                q.process();
            };
        }

        function _maybeDrain(data) {
            if (data.length === 0 && q.idle()) {
                // call drain immediately if there are no tasks
                setImmediate$1(() => trigger('drain'));
                return true
            }
            return false
        }

        const eventMethod = (name) => (handler) => {
            if (!handler) {
                return new Promise((resolve, reject) => {
                    once(name, (err, data) => {
                        if (err) return reject(err)
                        resolve(data);
                    });
                })
            }
            off(name);
            on(name, handler);

        };

        var isProcessing = false;
        var q = {
            _tasks: new DLL(),
            _createTaskItem (data, callback) {
                return {
                    data,
                    callback
                };
            },
            *[Symbol.iterator] () {
                yield* q._tasks[Symbol.iterator]();
            },
            concurrency,
            payload,
            buffer: concurrency / 4,
            started: false,
            paused: false,
            push (data, callback) {
                if (Array.isArray(data)) {
                    if (_maybeDrain(data)) return
                    return data.map(datum => _insert(datum, false, false, callback))
                }
                return _insert(data, false, false, callback);
            },
            pushAsync (data, callback) {
                if (Array.isArray(data)) {
                    if (_maybeDrain(data)) return
                    return data.map(datum => _insert(datum, false, true, callback))
                }
                return _insert(data, false, true, callback);
            },
            kill () {
                off();
                q._tasks.empty();
            },
            unshift (data, callback) {
                if (Array.isArray(data)) {
                    if (_maybeDrain(data)) return
                    return data.map(datum => _insert(datum, true, false, callback))
                }
                return _insert(data, true, false, callback);
            },
            unshiftAsync (data, callback) {
                if (Array.isArray(data)) {
                    if (_maybeDrain(data)) return
                    return data.map(datum => _insert(datum, true, true, callback))
                }
                return _insert(data, true, true, callback);
            },
            remove (testFn) {
                q._tasks.remove(testFn);
            },
            process () {
                // Avoid trying to start too many processing operations. This can occur
                // when callbacks resolve synchronously (#1267).
                if (isProcessing) {
                    return;
                }
                isProcessing = true;
                while(!q.paused && numRunning < q.concurrency && q._tasks.length){
                    var tasks = [], data = [];
                    var l = q._tasks.length;
                    if (q.payload) l = Math.min(l, q.payload);
                    for (var i = 0; i < l; i++) {
                        var node = q._tasks.shift();
                        tasks.push(node);
                        workersList.push(node);
                        data.push(node.data);
                    }

                    numRunning += 1;

                    if (q._tasks.length === 0) {
                        trigger('empty');
                    }

                    if (numRunning === q.concurrency) {
                        trigger('saturated');
                    }

                    var cb = onlyOnce(_createCB(tasks));
                    _worker(data, cb);
                }
                isProcessing = false;
            },
            length () {
                return q._tasks.length;
            },
            running () {
                return numRunning;
            },
            workersList () {
                return workersList;
            },
            idle() {
                return q._tasks.length + numRunning === 0;
            },
            pause () {
                q.paused = true;
            },
            resume () {
                if (q.paused === false) { return; }
                q.paused = false;
                setImmediate$1(q.process);
            }
        };
        // define these as fixed properties, so people get useful errors when updating
        Object.defineProperties(q, {
            saturated: {
                writable: false,
                value: eventMethod('saturated')
            },
            unsaturated: {
                writable: false,
                value: eventMethod('unsaturated')
            },
            empty: {
                writable: false,
                value: eventMethod('empty')
            },
            drain: {
                writable: false,
                value: eventMethod('drain')
            },
            error: {
                writable: false,
                value: eventMethod('error')
            },
        });
        return q;
    }

    /**
     * Creates a `cargo` object with the specified payload. Tasks added to the
     * cargo will be processed altogether (up to the `payload` limit). If the
     * `worker` is in progress, the task is queued until it becomes available. Once
     * the `worker` has completed some tasks, each callback of those tasks is
     * called. Check out [these](https://camo.githubusercontent.com/6bbd36f4cf5b35a0f11a96dcd2e97711ffc2fb37/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130382f62626330636662302d356632392d313165322d393734662d3333393763363464633835382e676966) [animations](https://camo.githubusercontent.com/f4810e00e1c5f5f8addbe3e9f49064fd5d102699/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130312f38346339323036362d356632392d313165322d383134662d3964336430323431336266642e676966)
     * for how `cargo` and `queue` work.
     *
     * While [`queue`]{@link module:ControlFlow.queue} passes only one task to one of a group of workers
     * at a time, cargo passes an array of tasks to a single worker, repeating
     * when the worker is finished.
     *
     * @name cargo
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.queue]{@link module:ControlFlow.queue}
     * @category Control Flow
     * @param {AsyncFunction} worker - An asynchronous function for processing an array
     * of queued tasks. Invoked with `(tasks, callback)`.
     * @param {number} [payload=Infinity] - An optional `integer` for determining
     * how many tasks should be processed per round; if omitted, the default is
     * unlimited.
     * @returns {module:ControlFlow.QueueObject} A cargo object to manage the tasks. Callbacks can
     * attached as certain properties to listen for specific events during the
     * lifecycle of the cargo and inner queue.
     * @example
     *
     * // create a cargo object with payload 2
     * var cargo = async.cargo(function(tasks, callback) {
     *     for (var i=0; i<tasks.length; i++) {
     *         console.log('hello ' + tasks[i].name);
     *     }
     *     callback();
     * }, 2);
     *
     * // add some items
     * cargo.push({name: 'foo'}, function(err) {
     *     console.log('finished processing foo');
     * });
     * cargo.push({name: 'bar'}, function(err) {
     *     console.log('finished processing bar');
     * });
     * await cargo.push({name: 'baz'});
     * console.log('finished processing baz');
     */
    function cargo(worker, payload) {
        return queue(worker, 1, payload);
    }

    /**
     * Creates a `cargoQueue` object with the specified payload. Tasks added to the
     * cargoQueue will be processed together (up to the `payload` limit) in `concurrency` parallel workers.
     * If the all `workers` are in progress, the task is queued until one becomes available. Once
     * a `worker` has completed some tasks, each callback of those tasks is
     * called. Check out [these](https://camo.githubusercontent.com/6bbd36f4cf5b35a0f11a96dcd2e97711ffc2fb37/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130382f62626330636662302d356632392d313165322d393734662d3333393763363464633835382e676966) [animations](https://camo.githubusercontent.com/f4810e00e1c5f5f8addbe3e9f49064fd5d102699/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130312f38346339323036362d356632392d313165322d383134662d3964336430323431336266642e676966)
     * for how `cargo` and `queue` work.
     *
     * While [`queue`]{@link module:ControlFlow.queue} passes only one task to one of a group of workers
     * at a time, and [`cargo`]{@link module:ControlFlow.cargo} passes an array of tasks to a single worker,
     * the cargoQueue passes an array of tasks to multiple parallel workers.
     *
     * @name cargoQueue
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.queue]{@link module:ControlFlow.queue}
     * @see [async.cargo]{@link module:ControlFLow.cargo}
     * @category Control Flow
     * @param {AsyncFunction} worker - An asynchronous function for processing an array
     * of queued tasks. Invoked with `(tasks, callback)`.
     * @param {number} [concurrency=1] - An `integer` for determining how many
     * `worker` functions should be run in parallel.  If omitted, the concurrency
     * defaults to `1`.  If the concurrency is `0`, an error is thrown.
     * @param {number} [payload=Infinity] - An optional `integer` for determining
     * how many tasks should be processed per round; if omitted, the default is
     * unlimited.
     * @returns {module:ControlFlow.QueueObject} A cargoQueue object to manage the tasks. Callbacks can
     * attached as certain properties to listen for specific events during the
     * lifecycle of the cargoQueue and inner queue.
     * @example
     *
     * // create a cargoQueue object with payload 2 and concurrency 2
     * var cargoQueue = async.cargoQueue(function(tasks, callback) {
     *     for (var i=0; i<tasks.length; i++) {
     *         console.log('hello ' + tasks[i].name);
     *     }
     *     callback();
     * }, 2, 2);
     *
     * // add some items
     * cargoQueue.push({name: 'foo'}, function(err) {
     *     console.log('finished processing foo');
     * });
     * cargoQueue.push({name: 'bar'}, function(err) {
     *     console.log('finished processing bar');
     * });
     * cargoQueue.push({name: 'baz'}, function(err) {
     *     console.log('finished processing baz');
     * });
     * cargoQueue.push({name: 'boo'}, function(err) {
     *     console.log('finished processing boo');
     * });
     */
    function cargo$1(worker, concurrency, payload) {
        return queue(worker, concurrency, payload);
    }

    /**
     * Reduces `coll` into a single value using an async `iteratee` to return each
     * successive step. `memo` is the initial state of the reduction. This function
     * only operates in series.
     *
     * For performance reasons, it may make sense to split a call to this function
     * into a parallel map, and then use the normal `Array.prototype.reduce` on the
     * results. This function is for situations where each step in the reduction
     * needs to be async; if you can get the data before reducing it, then it's
     * probably a good idea to do so.
     *
     * @name reduce
     * @static
     * @memberOf module:Collections
     * @method
     * @alias inject
     * @alias foldl
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {*} memo - The initial state of the reduction.
     * @param {AsyncFunction} iteratee - A function applied to each item in the
     * array to produce the next step in the reduction.
     * The `iteratee` should complete with the next state of the reduction.
     * If the iteratee completes with an error, the reduction is stopped and the
     * main `callback` is immediately called with the error.
     * Invoked with (memo, item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result is the reduced value. Invoked with
     * (err, result).
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * // file1.txt is a file that is 1000 bytes in size
     * // file2.txt is a file that is 2000 bytes in size
     * // file3.txt is a file that is 3000 bytes in size
     * // file4.txt does not exist
     *
     * const fileList = ['file1.txt','file2.txt','file3.txt'];
     * const withMissingFileList = ['file1.txt','file2.txt','file3.txt', 'file4.txt'];
     *
     * // asynchronous function that computes the file size in bytes
     * // file size is added to the memoized value, then returned
     * function getFileSizeInBytes(memo, file, callback) {
     *     fs.stat(file, function(err, stat) {
     *         if (err) {
     *             return callback(err);
     *         }
     *         callback(null, memo + stat.size);
     *     });
     * }
     *
     * // Using callbacks
     * async.reduce(fileList, 0, getFileSizeInBytes, function(err, result) {
     *     if (err) {
     *         console.log(err);
     *     } else {
     *         console.log(result);
     *         // 6000
     *         // which is the sum of the file sizes of the three files
     *     }
     * });
     *
     * // Error Handling
     * async.reduce(withMissingFileList, 0, getFileSizeInBytes, function(err, result) {
     *     if (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     } else {
     *         console.log(result);
     *     }
     * });
     *
     * // Using Promises
     * async.reduce(fileList, 0, getFileSizeInBytes)
     * .then( result => {
     *     console.log(result);
     *     // 6000
     *     // which is the sum of the file sizes of the three files
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Error Handling
     * async.reduce(withMissingFileList, 0, getFileSizeInBytes)
     * .then( result => {
     *     console.log(result);
     * }).catch( err => {
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.reduce(fileList, 0, getFileSizeInBytes);
     *         console.log(result);
     *         // 6000
     *         // which is the sum of the file sizes of the three files
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // Error Handling
     * async () => {
     *     try {
     *         let result = await async.reduce(withMissingFileList, 0, getFileSizeInBytes);
     *         console.log(result);
     *     }
     *     catch (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     }
     * }
     *
     */
    function reduce(coll, memo, iteratee, callback) {
        callback = once(callback);
        var _iteratee = wrapAsync(iteratee);
        return eachOfSeries$1(coll, (x, i, iterCb) => {
            _iteratee(memo, x, (err, v) => {
                memo = v;
                iterCb(err);
            });
        }, err => callback(err, memo));
    }
    var reduce$1 = awaitify(reduce, 4);

    /**
     * Version of the compose function that is more natural to read. Each function
     * consumes the return value of the previous function. It is the equivalent of
     * [compose]{@link module:ControlFlow.compose} with the arguments reversed.
     *
     * Each function is executed with the `this` binding of the composed function.
     *
     * @name seq
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.compose]{@link module:ControlFlow.compose}
     * @category Control Flow
     * @param {...AsyncFunction} functions - the asynchronous functions to compose
     * @returns {Function} a function that composes the `functions` in order
     * @example
     *
     * // Requires lodash (or underscore), express3 and dresende's orm2.
     * // Part of an app, that fetches cats of the logged user.
     * // This example uses `seq` function to avoid overnesting and error
     * // handling clutter.
     * app.get('/cats', function(request, response) {
     *     var User = request.models.User;
     *     async.seq(
     *         User.get.bind(User),  // 'User.get' has signature (id, callback(err, data))
     *         function(user, fn) {
     *             user.getCats(fn);      // 'getCats' has signature (callback(err, data))
     *         }
     *     )(req.session.user_id, function (err, cats) {
     *         if (err) {
     *             console.error(err);
     *             response.json({ status: 'error', message: err.message });
     *         } else {
     *             response.json({ status: 'ok', message: 'Cats found', data: cats });
     *         }
     *     });
     * });
     */
    function seq(...functions) {
        var _functions = functions.map(wrapAsync);
        return function (...args) {
            var that = this;

            var cb = args[args.length - 1];
            if (typeof cb == 'function') {
                args.pop();
            } else {
                cb = promiseCallback();
            }

            reduce$1(_functions, args, (newargs, fn, iterCb) => {
                fn.apply(that, newargs.concat((err, ...nextargs) => {
                    iterCb(err, nextargs);
                }));
            },
            (err, results) => cb(err, ...results));

            return cb[PROMISE_SYMBOL]
        };
    }

    /**
     * Creates a function which is a composition of the passed asynchronous
     * functions. Each function consumes the return value of the function that
     * follows. Composing functions `f()`, `g()`, and `h()` would produce the result
     * of `f(g(h()))`, only this version uses callbacks to obtain the return values.
     *
     * If the last argument to the composed function is not a function, a promise
     * is returned when you call it.
     *
     * Each function is executed with the `this` binding of the composed function.
     *
     * @name compose
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {...AsyncFunction} functions - the asynchronous functions to compose
     * @returns {Function} an asynchronous function that is the composed
     * asynchronous `functions`
     * @example
     *
     * function add1(n, callback) {
     *     setTimeout(function () {
     *         callback(null, n + 1);
     *     }, 10);
     * }
     *
     * function mul3(n, callback) {
     *     setTimeout(function () {
     *         callback(null, n * 3);
     *     }, 10);
     * }
     *
     * var add1mul3 = async.compose(mul3, add1);
     * add1mul3(4, function (err, result) {
     *     // result now equals 15
     * });
     */
    function compose(...args) {
        return seq(...args.reverse());
    }

    /**
     * The same as [`map`]{@link module:Collections.map} but runs a maximum of `limit` async operations at a time.
     *
     * @name mapLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.map]{@link module:Collections.map}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with the transformed item.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Results is an array of the
     * transformed items from the `coll`. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback is passed
     */
    function mapLimit (coll, limit, iteratee, callback) {
        return _asyncMap(eachOfLimit(limit), coll, iteratee, callback)
    }
    var mapLimit$1 = awaitify(mapLimit, 4);

    /**
     * The same as [`concat`]{@link module:Collections.concat} but runs a maximum of `limit` async operations at a time.
     *
     * @name concatLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.concat]{@link module:Collections.concat}
     * @category Collection
     * @alias flatMapLimit
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`,
     * which should use an array as its result. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished, or an error occurs. Results is an array
     * containing the concatenated results of the `iteratee` function. Invoked with
     * (err, results).
     * @returns A Promise, if no callback is passed
     */
    function concatLimit(coll, limit, iteratee, callback) {
        var _iteratee = wrapAsync(iteratee);
        return mapLimit$1(coll, limit, (val, iterCb) => {
            _iteratee(val, (err, ...args) => {
                if (err) return iterCb(err);
                return iterCb(err, args);
            });
        }, (err, mapResults) => {
            var result = [];
            for (var i = 0; i < mapResults.length; i++) {
                if (mapResults[i]) {
                    result = result.concat(...mapResults[i]);
                }
            }

            return callback(err, result);
        });
    }
    var concatLimit$1 = awaitify(concatLimit, 4);

    /**
     * Applies `iteratee` to each item in `coll`, concatenating the results. Returns
     * the concatenated list. The `iteratee`s are called in parallel, and the
     * results are concatenated as they return. The results array will be returned in
     * the original order of `coll` passed to the `iteratee` function.
     *
     * @name concat
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @alias flatMap
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`,
     * which should use an array as its result. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished, or an error occurs. Results is an array
     * containing the concatenated results of the `iteratee` function. Invoked with
     * (err, results).
     * @returns A Promise, if no callback is passed
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     * // dir4 does not exist
     *
     * let directoryList = ['dir1','dir2','dir3'];
     * let withMissingDirectoryList = ['dir1','dir2','dir3', 'dir4'];
     *
     * // Using callbacks
     * async.concat(directoryList, fs.readdir, function(err, results) {
     *    if (err) {
     *        console.log(err);
     *    } else {
     *        console.log(results);
     *        // [ 'file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', file5.txt ]
     *    }
     * });
     *
     * // Error Handling
     * async.concat(withMissingDirectoryList, fs.readdir, function(err, results) {
     *    if (err) {
     *        console.log(err);
     *        // [ Error: ENOENT: no such file or directory ]
     *        // since dir4 does not exist
     *    } else {
     *        console.log(results);
     *    }
     * });
     *
     * // Using Promises
     * async.concat(directoryList, fs.readdir)
     * .then(results => {
     *     console.log(results);
     *     // [ 'file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', file5.txt ]
     * }).catch(err => {
     *      console.log(err);
     * });
     *
     * // Error Handling
     * async.concat(withMissingDirectoryList, fs.readdir)
     * .then(results => {
     *     console.log(results);
     * }).catch(err => {
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     *     // since dir4 does not exist
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let results = await async.concat(directoryList, fs.readdir);
     *         console.log(results);
     *         // [ 'file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', file5.txt ]
     *     } catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // Error Handling
     * async () => {
     *     try {
     *         let results = await async.concat(withMissingDirectoryList, fs.readdir);
     *         console.log(results);
     *     } catch (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *         // since dir4 does not exist
     *     }
     * }
     *
     */
    function concat(coll, iteratee, callback) {
        return concatLimit$1(coll, Infinity, iteratee, callback)
    }
    var concat$1 = awaitify(concat, 3);

    /**
     * The same as [`concat`]{@link module:Collections.concat} but runs only a single async operation at a time.
     *
     * @name concatSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.concat]{@link module:Collections.concat}
     * @category Collection
     * @alias flatMapSeries
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`.
     * The iteratee should complete with an array an array of results.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished, or an error occurs. Results is an array
     * containing the concatenated results of the `iteratee` function. Invoked with
     * (err, results).
     * @returns A Promise, if no callback is passed
     */
    function concatSeries(coll, iteratee, callback) {
        return concatLimit$1(coll, 1, iteratee, callback)
    }
    var concatSeries$1 = awaitify(concatSeries, 3);

    /**
     * Returns a function that when called, calls-back with the values provided.
     * Useful as the first function in a [`waterfall`]{@link module:ControlFlow.waterfall}, or for plugging values in to
     * [`auto`]{@link module:ControlFlow.auto}.
     *
     * @name constant
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {...*} arguments... - Any number of arguments to automatically invoke
     * callback with.
     * @returns {AsyncFunction} Returns a function that when invoked, automatically
     * invokes the callback with the previous given arguments.
     * @example
     *
     * async.waterfall([
     *     async.constant(42),
     *     function (value, next) {
     *         // value === 42
     *     },
     *     //...
     * ], callback);
     *
     * async.waterfall([
     *     async.constant(filename, "utf8"),
     *     fs.readFile,
     *     function (fileData, next) {
     *         //...
     *     }
     *     //...
     * ], callback);
     *
     * async.auto({
     *     hostname: async.constant("https://server.net/"),
     *     port: findFreePort,
     *     launchServer: ["hostname", "port", function (options, cb) {
     *         startServer(options, cb);
     *     }],
     *     //...
     * }, callback);
     */
    function constant(...args) {
        return function (...ignoredArgs/*, callback*/) {
            var callback = ignoredArgs.pop();
            return callback(null, ...args);
        };
    }

    function _createTester(check, getResult) {
        return (eachfn, arr, _iteratee, cb) => {
            var testPassed = false;
            var testResult;
            const iteratee = wrapAsync(_iteratee);
            eachfn(arr, (value, _, callback) => {
                iteratee(value, (err, result) => {
                    if (err || err === false) return callback(err);

                    if (check(result) && !testResult) {
                        testPassed = true;
                        testResult = getResult(true, value);
                        return callback(null, breakLoop);
                    }
                    callback();
                });
            }, err => {
                if (err) return cb(err);
                cb(null, testPassed ? testResult : getResult(false));
            });
        };
    }

    /**
     * Returns the first value in `coll` that passes an async truth test. The
     * `iteratee` is applied in parallel, meaning the first iteratee to return
     * `true` will fire the detect `callback` with that result. That means the
     * result might not be the first item in the original `coll` (in terms of order)
     * that passes the test.

     * If order within the original `coll` is important, then look at
     * [`detectSeries`]{@link module:Collections.detectSeries}.
     *
     * @name detect
     * @static
     * @memberOf module:Collections
     * @method
     * @alias find
     * @category Collections
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
     * The iteratee must complete with a boolean value as its result.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the `iteratee` functions have finished.
     * Result will be the first item in the array that passes the truth test
     * (iteratee) or the value `undefined` if none passed. Invoked with
     * (err, result).
     * @returns {Promise} a promise, if a callback is omitted
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     *
     * // asynchronous function that checks if a file exists
     * function fileExists(file, callback) {
     *    fs.access(file, fs.constants.F_OK, (err) => {
     *        callback(null, !err);
     *    });
     * }
     *
     * async.detect(['file3.txt','file2.txt','dir1/file1.txt'], fileExists,
     *    function(err, result) {
     *        console.log(result);
     *        // dir1/file1.txt
     *        // result now equals the first file in the list that exists
     *    }
     *);
     *
     * // Using Promises
     * async.detect(['file3.txt','file2.txt','dir1/file1.txt'], fileExists)
     * .then(result => {
     *     console.log(result);
     *     // dir1/file1.txt
     *     // result now equals the first file in the list that exists
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.detect(['file3.txt','file2.txt','dir1/file1.txt'], fileExists);
     *         console.log(result);
     *         // dir1/file1.txt
     *         // result now equals the file in the list that exists
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function detect(coll, iteratee, callback) {
        return _createTester(bool => bool, (res, item) => item)(eachOf$1, coll, iteratee, callback)
    }
    var detect$1 = awaitify(detect, 3);

    /**
     * The same as [`detect`]{@link module:Collections.detect} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name detectLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.detect]{@link module:Collections.detect}
     * @alias findLimit
     * @category Collections
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
     * The iteratee must complete with a boolean value as its result.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the `iteratee` functions have finished.
     * Result will be the first item in the array that passes the truth test
     * (iteratee) or the value `undefined` if none passed. Invoked with
     * (err, result).
     * @returns {Promise} a promise, if a callback is omitted
     */
    function detectLimit(coll, limit, iteratee, callback) {
        return _createTester(bool => bool, (res, item) => item)(eachOfLimit(limit), coll, iteratee, callback)
    }
    var detectLimit$1 = awaitify(detectLimit, 4);

    /**
     * The same as [`detect`]{@link module:Collections.detect} but runs only a single async operation at a time.
     *
     * @name detectSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.detect]{@link module:Collections.detect}
     * @alias findSeries
     * @category Collections
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
     * The iteratee must complete with a boolean value as its result.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the `iteratee` functions have finished.
     * Result will be the first item in the array that passes the truth test
     * (iteratee) or the value `undefined` if none passed. Invoked with
     * (err, result).
     * @returns {Promise} a promise, if a callback is omitted
     */
    function detectSeries(coll, iteratee, callback) {
        return _createTester(bool => bool, (res, item) => item)(eachOfLimit(1), coll, iteratee, callback)
    }

    var detectSeries$1 = awaitify(detectSeries, 3);

    function consoleFunc(name) {
        return (fn, ...args) => wrapAsync(fn)(...args, (err, ...resultArgs) => {
            /* istanbul ignore else */
            if (typeof console === 'object') {
                /* istanbul ignore else */
                if (err) {
                    /* istanbul ignore else */
                    if (console.error) {
                        console.error(err);
                    }
                } else if (console[name]) { /* istanbul ignore else */
                    resultArgs.forEach(x => console[name](x));
                }
            }
        })
    }

    /**
     * Logs the result of an [`async` function]{@link AsyncFunction} to the
     * `console` using `console.dir` to display the properties of the resulting object.
     * Only works in Node.js or in browsers that support `console.dir` and
     * `console.error` (such as FF and Chrome).
     * If multiple arguments are returned from the async function,
     * `console.dir` is called on each argument in order.
     *
     * @name dir
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} function - The function you want to eventually apply
     * all arguments to.
     * @param {...*} arguments... - Any number of arguments to apply to the function.
     * @example
     *
     * // in a module
     * var hello = function(name, callback) {
     *     setTimeout(function() {
     *         callback(null, {hello: name});
     *     }, 1000);
     * };
     *
     * // in the node repl
     * node> async.dir(hello, 'world');
     * {hello: 'world'}
     */
    var dir = consoleFunc('dir');

    /**
     * The post-check version of [`whilst`]{@link module:ControlFlow.whilst}. To reflect the difference in
     * the order of operations, the arguments `test` and `iteratee` are switched.
     *
     * `doWhilst` is to `whilst` as `do while` is to `while` in plain JavaScript.
     *
     * @name doWhilst
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.whilst]{@link module:ControlFlow.whilst}
     * @category Control Flow
     * @param {AsyncFunction} iteratee - A function which is called each time `test`
     * passes. Invoked with (callback).
     * @param {AsyncFunction} test - asynchronous truth test to perform after each
     * execution of `iteratee`. Invoked with (...args, callback), where `...args` are the
     * non-error args from the previous callback of `iteratee`.
     * @param {Function} [callback] - A callback which is called after the test
     * function has failed and repeated execution of `iteratee` has stopped.
     * `callback` will be passed an error and any arguments passed to the final
     * `iteratee`'s callback. Invoked with (err, [results]);
     * @returns {Promise} a promise, if no callback is passed
     */
    function doWhilst(iteratee, test, callback) {
        callback = onlyOnce(callback);
        var _fn = wrapAsync(iteratee);
        var _test = wrapAsync(test);
        var results;

        function next(err, ...args) {
            if (err) return callback(err);
            if (err === false) return;
            results = args;
            _test(...args, check);
        }

        function check(err, truth) {
            if (err) return callback(err);
            if (err === false) return;
            if (!truth) return callback(null, ...results);
            _fn(next);
        }

        return check(null, true);
    }

    var doWhilst$1 = awaitify(doWhilst, 3);

    /**
     * Like ['doWhilst']{@link module:ControlFlow.doWhilst}, except the `test` is inverted. Note the
     * argument ordering differs from `until`.
     *
     * @name doUntil
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.doWhilst]{@link module:ControlFlow.doWhilst}
     * @category Control Flow
     * @param {AsyncFunction} iteratee - An async function which is called each time
     * `test` fails. Invoked with (callback).
     * @param {AsyncFunction} test - asynchronous truth test to perform after each
     * execution of `iteratee`. Invoked with (...args, callback), where `...args` are the
     * non-error args from the previous callback of `iteratee`
     * @param {Function} [callback] - A callback which is called after the test
     * function has passed and repeated execution of `iteratee` has stopped. `callback`
     * will be passed an error and any arguments passed to the final `iteratee`'s
     * callback. Invoked with (err, [results]);
     * @returns {Promise} a promise, if no callback is passed
     */
    function doUntil(iteratee, test, callback) {
        const _test = wrapAsync(test);
        return doWhilst$1(iteratee, (...args) => {
            const cb = args.pop();
            _test(...args, (err, truth) => cb (err, !truth));
        }, callback);
    }

    function _withoutIndex(iteratee) {
        return (value, index, callback) => iteratee(value, callback);
    }

    /**
     * Applies the function `iteratee` to each item in `coll`, in parallel.
     * The `iteratee` is called with an item from the list, and a callback for when
     * it has finished. If the `iteratee` passes an error to its `callback`, the
     * main `callback` (for the `each` function) is immediately called with the
     * error.
     *
     * Note, that since this function applies `iteratee` to each item in parallel,
     * there is no guarantee that the iteratee functions will complete in order.
     *
     * @name each
     * @static
     * @memberOf module:Collections
     * @method
     * @alias forEach
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to
     * each item in `coll`. Invoked with (item, callback).
     * The array index is not passed to the iteratee.
     * If you need the index, use `eachOf`.
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     * @returns {Promise} a promise, if a callback is omitted
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     * // dir4 does not exist
     *
     * const fileList = [ 'dir1/file2.txt', 'dir2/file3.txt', 'dir/file5.txt'];
     * const withMissingFileList = ['dir1/file1.txt', 'dir4/file2.txt'];
     *
     * // asynchronous function that deletes a file
     * const deleteFile = function(file, callback) {
     *     fs.unlink(file, callback);
     * };
     *
     * // Using callbacks
     * async.each(fileList, deleteFile, function(err) {
     *     if( err ) {
     *         console.log(err);
     *     } else {
     *         console.log('All files have been deleted successfully');
     *     }
     * });
     *
     * // Error Handling
     * async.each(withMissingFileList, deleteFile, function(err){
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     *     // since dir4/file2.txt does not exist
     *     // dir1/file1.txt could have been deleted
     * });
     *
     * // Using Promises
     * async.each(fileList, deleteFile)
     * .then( () => {
     *     console.log('All files have been deleted successfully');
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Error Handling
     * async.each(fileList, deleteFile)
     * .then( () => {
     *     console.log('All files have been deleted successfully');
     * }).catch( err => {
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     *     // since dir4/file2.txt does not exist
     *     // dir1/file1.txt could have been deleted
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         await async.each(files, deleteFile);
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // Error Handling
     * async () => {
     *     try {
     *         await async.each(withMissingFileList, deleteFile);
     *     }
     *     catch (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *         // since dir4/file2.txt does not exist
     *         // dir1/file1.txt could have been deleted
     *     }
     * }
     *
     */
    function eachLimit(coll, iteratee, callback) {
        return eachOf$1(coll, _withoutIndex(wrapAsync(iteratee)), callback);
    }

    var each = awaitify(eachLimit, 3);

    /**
     * The same as [`each`]{@link module:Collections.each} but runs a maximum of `limit` async operations at a time.
     *
     * @name eachLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.each]{@link module:Collections.each}
     * @alias forEachLimit
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The array index is not passed to the iteratee.
     * If you need the index, use `eachOfLimit`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     * @returns {Promise} a promise, if a callback is omitted
     */
    function eachLimit$1(coll, limit, iteratee, callback) {
        return eachOfLimit(limit)(coll, _withoutIndex(wrapAsync(iteratee)), callback);
    }
    var eachLimit$2 = awaitify(eachLimit$1, 4);

    /**
     * The same as [`each`]{@link module:Collections.each} but runs only a single async operation at a time.
     *
     * Note, that unlike [`each`]{@link module:Collections.each}, this function applies iteratee to each item
     * in series and therefore the iteratee functions will complete in order.

     * @name eachSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.each]{@link module:Collections.each}
     * @alias forEachSeries
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each
     * item in `coll`.
     * The array index is not passed to the iteratee.
     * If you need the index, use `eachOfSeries`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     * @returns {Promise} a promise, if a callback is omitted
     */
    function eachSeries(coll, iteratee, callback) {
        return eachLimit$2(coll, 1, iteratee, callback)
    }
    var eachSeries$1 = awaitify(eachSeries, 3);

    /**
     * Wrap an async function and ensure it calls its callback on a later tick of
     * the event loop.  If the function already calls its callback on a next tick,
     * no extra deferral is added. This is useful for preventing stack overflows
     * (`RangeError: Maximum call stack size exceeded`) and generally keeping
     * [Zalgo](http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony)
     * contained. ES2017 `async` functions are returned as-is -- they are immune
     * to Zalgo's corrupting influences, as they always resolve on a later tick.
     *
     * @name ensureAsync
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} fn - an async function, one that expects a node-style
     * callback as its last argument.
     * @returns {AsyncFunction} Returns a wrapped function with the exact same call
     * signature as the function passed in.
     * @example
     *
     * function sometimesAsync(arg, callback) {
     *     if (cache[arg]) {
     *         return callback(null, cache[arg]); // this would be synchronous!!
     *     } else {
     *         doSomeIO(arg, callback); // this IO would be asynchronous
     *     }
     * }
     *
     * // this has a risk of stack overflows if many results are cached in a row
     * async.mapSeries(args, sometimesAsync, done);
     *
     * // this will defer sometimesAsync's callback if necessary,
     * // preventing stack overflows
     * async.mapSeries(args, async.ensureAsync(sometimesAsync), done);
     */
    function ensureAsync(fn) {
        if (isAsync(fn)) return fn;
        return function (...args/*, callback*/) {
            var callback = args.pop();
            var sync = true;
            args.push((...innerArgs) => {
                if (sync) {
                    setImmediate$1(() => callback(...innerArgs));
                } else {
                    callback(...innerArgs);
                }
            });
            fn.apply(this, args);
            sync = false;
        };
    }

    /**
     * Returns `true` if every element in `coll` satisfies an async test. If any
     * iteratee call returns `false`, the main `callback` is immediately called.
     *
     * @name every
     * @static
     * @memberOf module:Collections
     * @method
     * @alias all
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collection in parallel.
     * The iteratee must complete with a boolean result value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result will be either `true` or `false`
     * depending on the values of the async tests. Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     * // dir4 does not exist
     *
     * const fileList = ['dir1/file1.txt','dir2/file3.txt','dir3/file5.txt'];
     * const withMissingFileList = ['file1.txt','file2.txt','file4.txt'];
     *
     * // asynchronous function that checks if a file exists
     * function fileExists(file, callback) {
     *    fs.access(file, fs.constants.F_OK, (err) => {
     *        callback(null, !err);
     *    });
     * }
     *
     * // Using callbacks
     * async.every(fileList, fileExists, function(err, result) {
     *     console.log(result);
     *     // true
     *     // result is true since every file exists
     * });
     *
     * async.every(withMissingFileList, fileExists, function(err, result) {
     *     console.log(result);
     *     // false
     *     // result is false since NOT every file exists
     * });
     *
     * // Using Promises
     * async.every(fileList, fileExists)
     * .then( result => {
     *     console.log(result);
     *     // true
     *     // result is true since every file exists
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * async.every(withMissingFileList, fileExists)
     * .then( result => {
     *     console.log(result);
     *     // false
     *     // result is false since NOT every file exists
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.every(fileList, fileExists);
     *         console.log(result);
     *         // true
     *         // result is true since every file exists
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * async () => {
     *     try {
     *         let result = await async.every(withMissingFileList, fileExists);
     *         console.log(result);
     *         // false
     *         // result is false since NOT every file exists
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function every(coll, iteratee, callback) {
        return _createTester(bool => !bool, res => !res)(eachOf$1, coll, iteratee, callback)
    }
    var every$1 = awaitify(every, 3);

    /**
     * The same as [`every`]{@link module:Collections.every} but runs a maximum of `limit` async operations at a time.
     *
     * @name everyLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.every]{@link module:Collections.every}
     * @alias allLimit
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collection in parallel.
     * The iteratee must complete with a boolean result value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result will be either `true` or `false`
     * depending on the values of the async tests. Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     */
    function everyLimit(coll, limit, iteratee, callback) {
        return _createTester(bool => !bool, res => !res)(eachOfLimit(limit), coll, iteratee, callback)
    }
    var everyLimit$1 = awaitify(everyLimit, 4);

    /**
     * The same as [`every`]{@link module:Collections.every} but runs only a single async operation at a time.
     *
     * @name everySeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.every]{@link module:Collections.every}
     * @alias allSeries
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collection in series.
     * The iteratee must complete with a boolean result value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result will be either `true` or `false`
     * depending on the values of the async tests. Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     */
    function everySeries(coll, iteratee, callback) {
        return _createTester(bool => !bool, res => !res)(eachOfSeries$1, coll, iteratee, callback)
    }
    var everySeries$1 = awaitify(everySeries, 3);

    function filterArray(eachfn, arr, iteratee, callback) {
        var truthValues = new Array(arr.length);
        eachfn(arr, (x, index, iterCb) => {
            iteratee(x, (err, v) => {
                truthValues[index] = !!v;
                iterCb(err);
            });
        }, err => {
            if (err) return callback(err);
            var results = [];
            for (var i = 0; i < arr.length; i++) {
                if (truthValues[i]) results.push(arr[i]);
            }
            callback(null, results);
        });
    }

    function filterGeneric(eachfn, coll, iteratee, callback) {
        var results = [];
        eachfn(coll, (x, index, iterCb) => {
            iteratee(x, (err, v) => {
                if (err) return iterCb(err);
                if (v) {
                    results.push({index, value: x});
                }
                iterCb(err);
            });
        }, err => {
            if (err) return callback(err);
            callback(null, results
                .sort((a, b) => a.index - b.index)
                .map(v => v.value));
        });
    }

    function _filter(eachfn, coll, iteratee, callback) {
        var filter = isArrayLike(coll) ? filterArray : filterGeneric;
        return filter(eachfn, coll, wrapAsync(iteratee), callback);
    }

    /**
     * Returns a new array of all the values in `coll` which pass an async truth
     * test. This operation is performed in parallel, but the results array will be
     * in the same order as the original.
     *
     * @name filter
     * @static
     * @memberOf module:Collections
     * @method
     * @alias select
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {Function} iteratee - A truth test to apply to each item in `coll`.
     * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
     * with a boolean argument once it has completed. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback provided
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     *
     * const files = ['dir1/file1.txt','dir2/file3.txt','dir3/file6.txt'];
     *
     * // asynchronous function that checks if a file exists
     * function fileExists(file, callback) {
     *    fs.access(file, fs.constants.F_OK, (err) => {
     *        callback(null, !err);
     *    });
     * }
     *
     * // Using callbacks
     * async.filter(files, fileExists, function(err, results) {
     *    if(err) {
     *        console.log(err);
     *    } else {
     *        console.log(results);
     *        // [ 'dir1/file1.txt', 'dir2/file3.txt' ]
     *        // results is now an array of the existing files
     *    }
     * });
     *
     * // Using Promises
     * async.filter(files, fileExists)
     * .then(results => {
     *     console.log(results);
     *     // [ 'dir1/file1.txt', 'dir2/file3.txt' ]
     *     // results is now an array of the existing files
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let results = await async.filter(files, fileExists);
     *         console.log(results);
     *         // [ 'dir1/file1.txt', 'dir2/file3.txt' ]
     *         // results is now an array of the existing files
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function filter (coll, iteratee, callback) {
        return _filter(eachOf$1, coll, iteratee, callback)
    }
    var filter$1 = awaitify(filter, 3);

    /**
     * The same as [`filter`]{@link module:Collections.filter} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name filterLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.filter]{@link module:Collections.filter}
     * @alias selectLimit
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {Function} iteratee - A truth test to apply to each item in `coll`.
     * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
     * with a boolean argument once it has completed. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback provided
     */
    function filterLimit (coll, limit, iteratee, callback) {
        return _filter(eachOfLimit(limit), coll, iteratee, callback)
    }
    var filterLimit$1 = awaitify(filterLimit, 4);

    /**
     * The same as [`filter`]{@link module:Collections.filter} but runs only a single async operation at a time.
     *
     * @name filterSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.filter]{@link module:Collections.filter}
     * @alias selectSeries
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {Function} iteratee - A truth test to apply to each item in `coll`.
     * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
     * with a boolean argument once it has completed. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results)
     * @returns {Promise} a promise, if no callback provided
     */
    function filterSeries (coll, iteratee, callback) {
        return _filter(eachOfSeries$1, coll, iteratee, callback)
    }
    var filterSeries$1 = awaitify(filterSeries, 3);

    /**
     * Calls the asynchronous function `fn` with a callback parameter that allows it
     * to call itself again, in series, indefinitely.

     * If an error is passed to the callback then `errback` is called with the
     * error, and execution stops, otherwise it will never be called.
     *
     * @name forever
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {AsyncFunction} fn - an async function to call repeatedly.
     * Invoked with (next).
     * @param {Function} [errback] - when `fn` passes an error to it's callback,
     * this function will be called, and execution stops. Invoked with (err).
     * @returns {Promise} a promise that rejects if an error occurs and an errback
     * is not passed
     * @example
     *
     * async.forever(
     *     function(next) {
     *         // next is suitable for passing to things that need a callback(err [, whatever]);
     *         // it will result in this function being called again.
     *     },
     *     function(err) {
     *         // if next is called with a value in its first parameter, it will appear
     *         // in here as 'err', and execution will stop.
     *     }
     * );
     */
    function forever(fn, errback) {
        var done = onlyOnce(errback);
        var task = wrapAsync(ensureAsync(fn));

        function next(err) {
            if (err) return done(err);
            if (err === false) return;
            task(next);
        }
        return next();
    }
    var forever$1 = awaitify(forever, 2);

    /**
     * The same as [`groupBy`]{@link module:Collections.groupBy} but runs a maximum of `limit` async operations at a time.
     *
     * @name groupByLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.groupBy]{@link module:Collections.groupBy}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with a `key` to group the value under.
     * Invoked with (value, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Result is an `Object` whoses
     * properties are arrays of values which returned the corresponding key.
     * @returns {Promise} a promise, if no callback is passed
     */
    function groupByLimit(coll, limit, iteratee, callback) {
        var _iteratee = wrapAsync(iteratee);
        return mapLimit$1(coll, limit, (val, iterCb) => {
            _iteratee(val, (err, key) => {
                if (err) return iterCb(err);
                return iterCb(err, {key, val});
            });
        }, (err, mapResults) => {
            var result = {};
            // from MDN, handle object having an `hasOwnProperty` prop
            var {hasOwnProperty} = Object.prototype;

            for (var i = 0; i < mapResults.length; i++) {
                if (mapResults[i]) {
                    var {key} = mapResults[i];
                    var {val} = mapResults[i];

                    if (hasOwnProperty.call(result, key)) {
                        result[key].push(val);
                    } else {
                        result[key] = [val];
                    }
                }
            }

            return callback(err, result);
        });
    }

    var groupByLimit$1 = awaitify(groupByLimit, 4);

    /**
     * Returns a new object, where each value corresponds to an array of items, from
     * `coll`, that returned the corresponding key. That is, the keys of the object
     * correspond to the values passed to the `iteratee` callback.
     *
     * Note: Since this function applies the `iteratee` to each item in parallel,
     * there is no guarantee that the `iteratee` functions will complete in order.
     * However, the values for each key in the `result` will be in the same order as
     * the original `coll`. For Objects, the values will roughly be in the order of
     * the original Objects' keys (but this can vary across JavaScript engines).
     *
     * @name groupBy
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with a `key` to group the value under.
     * Invoked with (value, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Result is an `Object` whoses
     * properties are arrays of values which returned the corresponding key.
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     * // dir4 does not exist
     *
     * const files = ['dir1/file1.txt','dir2','dir4']
     *
     * // asynchronous function that detects file type as none, file, or directory
     * function detectFile(file, callback) {
     *     fs.stat(file, function(err, stat) {
     *         if (err) {
     *             return callback(null, 'none');
     *         }
     *         callback(null, stat.isDirectory() ? 'directory' : 'file');
     *     });
     * }
     *
     * //Using callbacks
     * async.groupBy(files, detectFile, function(err, result) {
     *     if(err) {
     *         console.log(err);
     *     } else {
     *	       console.log(result);
     *         // {
     *         //     file: [ 'dir1/file1.txt' ],
     *         //     none: [ 'dir4' ],
     *         //     directory: [ 'dir2']
     *         // }
     *         // result is object containing the files grouped by type
     *     }
     * });
     *
     * // Using Promises
     * async.groupBy(files, detectFile)
     * .then( result => {
     *     console.log(result);
     *     // {
     *     //     file: [ 'dir1/file1.txt' ],
     *     //     none: [ 'dir4' ],
     *     //     directory: [ 'dir2']
     *     // }
     *     // result is object containing the files grouped by type
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.groupBy(files, detectFile);
     *         console.log(result);
     *         // {
     *         //     file: [ 'dir1/file1.txt' ],
     *         //     none: [ 'dir4' ],
     *         //     directory: [ 'dir2']
     *         // }
     *         // result is object containing the files grouped by type
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function groupBy (coll, iteratee, callback) {
        return groupByLimit$1(coll, Infinity, iteratee, callback)
    }

    /**
     * The same as [`groupBy`]{@link module:Collections.groupBy} but runs only a single async operation at a time.
     *
     * @name groupBySeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.groupBy]{@link module:Collections.groupBy}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with a `key` to group the value under.
     * Invoked with (value, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Result is an `Object` whose
     * properties are arrays of values which returned the corresponding key.
     * @returns {Promise} a promise, if no callback is passed
     */
    function groupBySeries (coll, iteratee, callback) {
        return groupByLimit$1(coll, 1, iteratee, callback)
    }

    /**
     * Logs the result of an `async` function to the `console`. Only works in
     * Node.js or in browsers that support `console.log` and `console.error` (such
     * as FF and Chrome). If multiple arguments are returned from the async
     * function, `console.log` is called on each argument in order.
     *
     * @name log
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} function - The function you want to eventually apply
     * all arguments to.
     * @param {...*} arguments... - Any number of arguments to apply to the function.
     * @example
     *
     * // in a module
     * var hello = function(name, callback) {
     *     setTimeout(function() {
     *         callback(null, 'hello ' + name);
     *     }, 1000);
     * };
     *
     * // in the node repl
     * node> async.log(hello, 'world');
     * 'hello world'
     */
    var log = consoleFunc('log');

    /**
     * The same as [`mapValues`]{@link module:Collections.mapValues} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name mapValuesLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.mapValues]{@link module:Collections.mapValues}
     * @category Collection
     * @param {Object} obj - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - A function to apply to each value and key
     * in `coll`.
     * The iteratee should complete with the transformed value as its result.
     * Invoked with (value, key, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. `result` is a new object consisting
     * of each key from `obj`, with each transformed value on the right-hand side.
     * Invoked with (err, result).
     * @returns {Promise} a promise, if no callback is passed
     */
    function mapValuesLimit(obj, limit, iteratee, callback) {
        callback = once(callback);
        var newObj = {};
        var _iteratee = wrapAsync(iteratee);
        return eachOfLimit(limit)(obj, (val, key, next) => {
            _iteratee(val, key, (err, result) => {
                if (err) return next(err);
                newObj[key] = result;
                next(err);
            });
        }, err => callback(err, newObj));
    }

    var mapValuesLimit$1 = awaitify(mapValuesLimit, 4);

    /**
     * A relative of [`map`]{@link module:Collections.map}, designed for use with objects.
     *
     * Produces a new Object by mapping each value of `obj` through the `iteratee`
     * function. The `iteratee` is called each `value` and `key` from `obj` and a
     * callback for when it has finished processing. Each of these callbacks takes
     * two arguments: an `error`, and the transformed item from `obj`. If `iteratee`
     * passes an error to its callback, the main `callback` (for the `mapValues`
     * function) is immediately called with the error.
     *
     * Note, the order of the keys in the result is not guaranteed.  The keys will
     * be roughly in the order they complete, (but this is very engine-specific)
     *
     * @name mapValues
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Object} obj - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each value and key
     * in `coll`.
     * The iteratee should complete with the transformed value as its result.
     * Invoked with (value, key, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. `result` is a new object consisting
     * of each key from `obj`, with each transformed value on the right-hand side.
     * Invoked with (err, result).
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * // file1.txt is a file that is 1000 bytes in size
     * // file2.txt is a file that is 2000 bytes in size
     * // file3.txt is a file that is 3000 bytes in size
     * // file4.txt does not exist
     *
     * const fileMap = {
     *     f1: 'file1.txt',
     *     f2: 'file2.txt',
     *     f3: 'file3.txt'
     * };
     *
     * const withMissingFileMap = {
     *     f1: 'file1.txt',
     *     f2: 'file2.txt',
     *     f3: 'file4.txt'
     * };
     *
     * // asynchronous function that returns the file size in bytes
     * function getFileSizeInBytes(file, key, callback) {
     *     fs.stat(file, function(err, stat) {
     *         if (err) {
     *             return callback(err);
     *         }
     *         callback(null, stat.size);
     *     });
     * }
     *
     * // Using callbacks
     * async.mapValues(fileMap, getFileSizeInBytes, function(err, result) {
     *     if (err) {
     *         console.log(err);
     *     } else {
     *         console.log(result);
     *         // result is now a map of file size in bytes for each file, e.g.
     *         // {
     *         //     f1: 1000,
     *         //     f2: 2000,
     *         //     f3: 3000
     *         // }
     *     }
     * });
     *
     * // Error handling
     * async.mapValues(withMissingFileMap, getFileSizeInBytes, function(err, result) {
     *     if (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     } else {
     *         console.log(result);
     *     }
     * });
     *
     * // Using Promises
     * async.mapValues(fileMap, getFileSizeInBytes)
     * .then( result => {
     *     console.log(result);
     *     // result is now a map of file size in bytes for each file, e.g.
     *     // {
     *     //     f1: 1000,
     *     //     f2: 2000,
     *     //     f3: 3000
     *     // }
     * }).catch (err => {
     *     console.log(err);
     * });
     *
     * // Error Handling
     * async.mapValues(withMissingFileMap, getFileSizeInBytes)
     * .then( result => {
     *     console.log(result);
     * }).catch (err => {
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.mapValues(fileMap, getFileSizeInBytes);
     *         console.log(result);
     *         // result is now a map of file size in bytes for each file, e.g.
     *         // {
     *         //     f1: 1000,
     *         //     f2: 2000,
     *         //     f3: 3000
     *         // }
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // Error Handling
     * async () => {
     *     try {
     *         let result = await async.mapValues(withMissingFileMap, getFileSizeInBytes);
     *         console.log(result);
     *     }
     *     catch (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     }
     * }
     *
     */
    function mapValues(obj, iteratee, callback) {
        return mapValuesLimit$1(obj, Infinity, iteratee, callback)
    }

    /**
     * The same as [`mapValues`]{@link module:Collections.mapValues} but runs only a single async operation at a time.
     *
     * @name mapValuesSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.mapValues]{@link module:Collections.mapValues}
     * @category Collection
     * @param {Object} obj - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each value and key
     * in `coll`.
     * The iteratee should complete with the transformed value as its result.
     * Invoked with (value, key, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. `result` is a new object consisting
     * of each key from `obj`, with each transformed value on the right-hand side.
     * Invoked with (err, result).
     * @returns {Promise} a promise, if no callback is passed
     */
    function mapValuesSeries(obj, iteratee, callback) {
        return mapValuesLimit$1(obj, 1, iteratee, callback)
    }

    /**
     * Caches the results of an async function. When creating a hash to store
     * function results against, the callback is omitted from the hash and an
     * optional hash function can be used.
     *
     * **Note: if the async function errs, the result will not be cached and
     * subsequent calls will call the wrapped function.**
     *
     * If no hash function is specified, the first argument is used as a hash key,
     * which may work reasonably if it is a string or a data type that converts to a
     * distinct string. Note that objects and arrays will not behave reasonably.
     * Neither will cases where the other arguments are significant. In such cases,
     * specify your own hash function.
     *
     * The cache of results is exposed as the `memo` property of the function
     * returned by `memoize`.
     *
     * @name memoize
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} fn - The async function to proxy and cache results from.
     * @param {Function} hasher - An optional function for generating a custom hash
     * for storing results. It has all the arguments applied to it apart from the
     * callback, and must be synchronous.
     * @returns {AsyncFunction} a memoized version of `fn`
     * @example
     *
     * var slow_fn = function(name, callback) {
     *     // do something
     *     callback(null, result);
     * };
     * var fn = async.memoize(slow_fn);
     *
     * // fn can now be used as if it were slow_fn
     * fn('some name', function() {
     *     // callback
     * });
     */
    function memoize(fn, hasher = v => v) {
        var memo = Object.create(null);
        var queues = Object.create(null);
        var _fn = wrapAsync(fn);
        var memoized = initialParams((args, callback) => {
            var key = hasher(...args);
            if (key in memo) {
                setImmediate$1(() => callback(null, ...memo[key]));
            } else if (key in queues) {
                queues[key].push(callback);
            } else {
                queues[key] = [callback];
                _fn(...args, (err, ...resultArgs) => {
                    // #1465 don't memoize if an error occurred
                    if (!err) {
                        memo[key] = resultArgs;
                    }
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                        q[i](err, ...resultArgs);
                    }
                });
            }
        });
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    }

    /* istanbul ignore file */

    /**
     * Calls `callback` on a later loop around the event loop. In Node.js this just
     * calls `process.nextTick`.  In the browser it will use `setImmediate` if
     * available, otherwise `setTimeout(callback, 0)`, which means other higher
     * priority events may precede the execution of `callback`.
     *
     * This is used internally for browser-compatibility purposes.
     *
     * @name nextTick
     * @static
     * @memberOf module:Utils
     * @method
     * @see [async.setImmediate]{@link module:Utils.setImmediate}
     * @category Util
     * @param {Function} callback - The function to call on a later loop around
     * the event loop. Invoked with (args...).
     * @param {...*} args... - any number of additional arguments to pass to the
     * callback on the next tick.
     * @example
     *
     * var call_order = [];
     * async.nextTick(function() {
     *     call_order.push('two');
     *     // call_order now equals ['one','two']
     * });
     * call_order.push('one');
     *
     * async.setImmediate(function (a, b, c) {
     *     // a, b, and c equal 1, 2, and 3
     * }, 1, 2, 3);
     */
    var _defer$1;

    if (hasNextTick) {
        _defer$1 = process.nextTick;
    } else if (hasSetImmediate) {
        _defer$1 = setImmediate;
    } else {
        _defer$1 = fallback;
    }

    var nextTick = wrap(_defer$1);

    var parallel = awaitify((eachfn, tasks, callback) => {
        var results = isArrayLike(tasks) ? [] : {};

        eachfn(tasks, (task, key, taskCb) => {
            wrapAsync(task)((err, ...result) => {
                if (result.length < 2) {
                    [result] = result;
                }
                results[key] = result;
                taskCb(err);
            });
        }, err => callback(err, results));
    }, 3);

    /**
     * Run the `tasks` collection of functions in parallel, without waiting until
     * the previous function has completed. If any of the functions pass an error to
     * its callback, the main `callback` is immediately called with the value of the
     * error. Once the `tasks` have completed, the results are passed to the final
     * `callback` as an array.
     *
     * **Note:** `parallel` is about kicking-off I/O tasks in parallel, not about
     * parallel execution of code.  If your tasks do not use any timers or perform
     * any I/O, they will actually be executed in series.  Any synchronous setup
     * sections for each task will happen one after the other.  JavaScript remains
     * single-threaded.
     *
     * **Hint:** Use [`reflect`]{@link module:Utils.reflect} to continue the
     * execution of other tasks when a task fails.
     *
     * It is also possible to use an object instead of an array. Each property will
     * be run as a function and the results will be passed to the final `callback`
     * as an object instead of an array. This can be a more readable way of handling
     * results from {@link async.parallel}.
     *
     * @name parallel
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection of
     * [async functions]{@link AsyncFunction} to run.
     * Each async function can complete with any number of optional `result` values.
     * @param {Function} [callback] - An optional callback to run once all the
     * functions have completed successfully. This function gets a results array
     * (or object) containing all the result arguments passed to the task callbacks.
     * Invoked with (err, results).
     * @returns {Promise} a promise, if a callback is not passed
     *
     * @example
     *
     * //Using Callbacks
     * async.parallel([
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ], function(err, results) {
     *     console.log(results);
     *     // results is equal to ['one','two'] even though
     *     // the second function had a shorter timeout.
     * });
     *
     * // an example using an object instead of an array
     * async.parallel({
     *     one: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 1);
     *         }, 200);
     *     },
     *     two: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 2);
     *         }, 100);
     *     }
     * }, function(err, results) {
     *     console.log(results);
     *     // results is equal to: { one: 1, two: 2 }
     * });
     *
     * //Using Promises
     * async.parallel([
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ]).then(results => {
     *     console.log(results);
     *     // results is equal to ['one','two'] even though
     *     // the second function had a shorter timeout.
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * // an example using an object instead of an array
     * async.parallel({
     *     one: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 1);
     *         }, 200);
     *     },
     *     two: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 2);
     *         }, 100);
     *     }
     * }).then(results => {
     *     console.log(results);
     *     // results is equal to: { one: 1, two: 2 }
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * //Using async/await
     * async () => {
     *     try {
     *         let results = await async.parallel([
     *             function(callback) {
     *                 setTimeout(function() {
     *                     callback(null, 'one');
     *                 }, 200);
     *             },
     *             function(callback) {
     *                 setTimeout(function() {
     *                     callback(null, 'two');
     *                 }, 100);
     *             }
     *         ]);
     *         console.log(results);
     *         // results is equal to ['one','two'] even though
     *         // the second function had a shorter timeout.
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // an example using an object instead of an array
     * async () => {
     *     try {
     *         let results = await async.parallel({
     *             one: function(callback) {
     *                 setTimeout(function() {
     *                     callback(null, 1);
     *                 }, 200);
     *             },
     *            two: function(callback) {
     *                 setTimeout(function() {
     *                     callback(null, 2);
     *                 }, 100);
     *            }
     *         });
     *         console.log(results);
     *         // results is equal to: { one: 1, two: 2 }
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function parallel$1(tasks, callback) {
        return parallel(eachOf$1, tasks, callback);
    }

    /**
     * The same as [`parallel`]{@link module:ControlFlow.parallel} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name parallelLimit
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.parallel]{@link module:ControlFlow.parallel}
     * @category Control Flow
     * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection of
     * [async functions]{@link AsyncFunction} to run.
     * Each async function can complete with any number of optional `result` values.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {Function} [callback] - An optional callback to run once all the
     * functions have completed successfully. This function gets a results array
     * (or object) containing all the result arguments passed to the task callbacks.
     * Invoked with (err, results).
     * @returns {Promise} a promise, if a callback is not passed
     */
    function parallelLimit(tasks, limit, callback) {
        return parallel(eachOfLimit(limit), tasks, callback);
    }

    /**
     * A queue of tasks for the worker function to complete.
     * @typedef {Iterable} QueueObject
     * @memberOf module:ControlFlow
     * @property {Function} length - a function returning the number of items
     * waiting to be processed. Invoke with `queue.length()`.
     * @property {boolean} started - a boolean indicating whether or not any
     * items have been pushed and processed by the queue.
     * @property {Function} running - a function returning the number of items
     * currently being processed. Invoke with `queue.running()`.
     * @property {Function} workersList - a function returning the array of items
     * currently being processed. Invoke with `queue.workersList()`.
     * @property {Function} idle - a function returning false if there are items
     * waiting or being processed, or true if not. Invoke with `queue.idle()`.
     * @property {number} concurrency - an integer for determining how many `worker`
     * functions should be run in parallel. This property can be changed after a
     * `queue` is created to alter the concurrency on-the-fly.
     * @property {number} payload - an integer that specifies how many items are
     * passed to the worker function at a time. only applies if this is a
     * [cargo]{@link module:ControlFlow.cargo} object
     * @property {AsyncFunction} push - add a new task to the `queue`. Calls `callback`
     * once the `worker` has finished processing the task. Instead of a single task,
     * a `tasks` array can be submitted. The respective callback is used for every
     * task in the list. Invoke with `queue.push(task, [callback])`,
     * @property {AsyncFunction} unshift - add a new task to the front of the `queue`.
     * Invoke with `queue.unshift(task, [callback])`.
     * @property {AsyncFunction} pushAsync - the same as `q.push`, except this returns
     * a promise that rejects if an error occurs.
     * @property {AsyncFunction} unshiftAsync - the same as `q.unshift`, except this returns
     * a promise that rejects if an error occurs.
     * @property {Function} remove - remove items from the queue that match a test
     * function.  The test function will be passed an object with a `data` property,
     * and a `priority` property, if this is a
     * [priorityQueue]{@link module:ControlFlow.priorityQueue} object.
     * Invoked with `queue.remove(testFn)`, where `testFn` is of the form
     * `function ({data, priority}) {}` and returns a Boolean.
     * @property {Function} saturated - a function that sets a callback that is
     * called when the number of running workers hits the `concurrency` limit, and
     * further tasks will be queued.  If the callback is omitted, `q.saturated()`
     * returns a promise for the next occurrence.
     * @property {Function} unsaturated - a function that sets a callback that is
     * called when the number of running workers is less than the `concurrency` &
     * `buffer` limits, and further tasks will not be queued. If the callback is
     * omitted, `q.unsaturated()` returns a promise for the next occurrence.
     * @property {number} buffer - A minimum threshold buffer in order to say that
     * the `queue` is `unsaturated`.
     * @property {Function} empty - a function that sets a callback that is called
     * when the last item from the `queue` is given to a `worker`. If the callback
     * is omitted, `q.empty()` returns a promise for the next occurrence.
     * @property {Function} drain - a function that sets a callback that is called
     * when the last item from the `queue` has returned from the `worker`. If the
     * callback is omitted, `q.drain()` returns a promise for the next occurrence.
     * @property {Function} error - a function that sets a callback that is called
     * when a task errors. Has the signature `function(error, task)`. If the
     * callback is omitted, `error()` returns a promise that rejects on the next
     * error.
     * @property {boolean} paused - a boolean for determining whether the queue is
     * in a paused state.
     * @property {Function} pause - a function that pauses the processing of tasks
     * until `resume()` is called. Invoke with `queue.pause()`.
     * @property {Function} resume - a function that resumes the processing of
     * queued tasks when the queue is paused. Invoke with `queue.resume()`.
     * @property {Function} kill - a function that removes the `drain` callback and
     * empties remaining tasks from the queue forcing it to go idle. No more tasks
     * should be pushed to the queue after calling this function. Invoke with `queue.kill()`.
     *
     * @example
     * const q = async.queue(worker, 2)
     * q.push(item1)
     * q.push(item2)
     * q.push(item3)
     * // queues are iterable, spread into an array to inspect
     * const items = [...q] // [item1, item2, item3]
     * // or use for of
     * for (let item of q) {
     *     console.log(item)
     * }
     *
     * q.drain(() => {
     *     console.log('all done')
     * })
     * // or
     * await q.drain()
     */

    /**
     * Creates a `queue` object with the specified `concurrency`. Tasks added to the
     * `queue` are processed in parallel (up to the `concurrency` limit). If all
     * `worker`s are in progress, the task is queued until one becomes available.
     * Once a `worker` completes a `task`, that `task`'s callback is called.
     *
     * @name queue
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {AsyncFunction} worker - An async function for processing a queued task.
     * If you want to handle errors from an individual task, pass a callback to
     * `q.push()`. Invoked with (task, callback).
     * @param {number} [concurrency=1] - An `integer` for determining how many
     * `worker` functions should be run in parallel.  If omitted, the concurrency
     * defaults to `1`.  If the concurrency is `0`, an error is thrown.
     * @returns {module:ControlFlow.QueueObject} A queue object to manage the tasks. Callbacks can be
     * attached as certain properties to listen for specific events during the
     * lifecycle of the queue.
     * @example
     *
     * // create a queue object with concurrency 2
     * var q = async.queue(function(task, callback) {
     *     console.log('hello ' + task.name);
     *     callback();
     * }, 2);
     *
     * // assign a callback
     * q.drain(function() {
     *     console.log('all items have been processed');
     * });
     * // or await the end
     * await q.drain()
     *
     * // assign an error callback
     * q.error(function(err, task) {
     *     console.error('task experienced an error');
     * });
     *
     * // add some items to the queue
     * q.push({name: 'foo'}, function(err) {
     *     console.log('finished processing foo');
     * });
     * // callback is optional
     * q.push({name: 'bar'});
     *
     * // add some items to the queue (batch-wise)
     * q.push([{name: 'baz'},{name: 'bay'},{name: 'bax'}], function(err) {
     *     console.log('finished processing item');
     * });
     *
     * // add some items to the front of the queue
     * q.unshift({name: 'bar'}, function (err) {
     *     console.log('finished processing bar');
     * });
     */
    function queue$1 (worker, concurrency) {
        var _worker = wrapAsync(worker);
        return queue((items, cb) => {
            _worker(items[0], cb);
        }, concurrency, 1);
    }

    // Binary min-heap implementation used for priority queue.
    // Implementation is stable, i.e. push time is considered for equal priorities
    class Heap {
        constructor() {
            this.heap = [];
            this.pushCount = Number.MIN_SAFE_INTEGER;
        }

        get length() {
            return this.heap.length;
        }

        empty () {
            this.heap = [];
            return this;
        }

        percUp(index) {
            let p;

            while (index > 0 && smaller(this.heap[index], this.heap[p=parent(index)])) {
                let t = this.heap[index];
                this.heap[index] = this.heap[p];
                this.heap[p] = t;

                index = p;
            }
        }

        percDown(index) {
            let l;

            while ((l=leftChi(index)) < this.heap.length) {
                if (l+1 < this.heap.length && smaller(this.heap[l+1], this.heap[l])) {
                    l = l+1;
                }

                if (smaller(this.heap[index], this.heap[l])) {
                    break;
                }

                let t = this.heap[index];
                this.heap[index] = this.heap[l];
                this.heap[l] = t;

                index = l;
            }
        }

        push(node) {
            node.pushCount = ++this.pushCount;
            this.heap.push(node);
            this.percUp(this.heap.length-1);
        }

        unshift(node) {
            return this.heap.push(node);
        }

        shift() {
            let [top] = this.heap;

            this.heap[0] = this.heap[this.heap.length-1];
            this.heap.pop();
            this.percDown(0);

            return top;
        }

        toArray() {
            return [...this];
        }

        *[Symbol.iterator] () {
            for (let i = 0; i < this.heap.length; i++) {
                yield this.heap[i].data;
            }
        }

        remove (testFn) {
            let j = 0;
            for (let i = 0; i < this.heap.length; i++) {
                if (!testFn(this.heap[i])) {
                    this.heap[j] = this.heap[i];
                    j++;
                }
            }

            this.heap.splice(j);

            for (let i = parent(this.heap.length-1); i >= 0; i--) {
                this.percDown(i);
            }

            return this;
        }
    }

    function leftChi(i) {
        return (i<<1)+1;
    }

    function parent(i) {
        return ((i+1)>>1)-1;
    }

    function smaller(x, y) {
        if (x.priority !== y.priority) {
            return x.priority < y.priority;
        }
        else {
            return x.pushCount < y.pushCount;
        }
    }

    /**
     * The same as [async.queue]{@link module:ControlFlow.queue} only tasks are assigned a priority and
     * completed in ascending priority order.
     *
     * @name priorityQueue
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.queue]{@link module:ControlFlow.queue}
     * @category Control Flow
     * @param {AsyncFunction} worker - An async function for processing a queued task.
     * If you want to handle errors from an individual task, pass a callback to
     * `q.push()`.
     * Invoked with (task, callback).
     * @param {number} concurrency - An `integer` for determining how many `worker`
     * functions should be run in parallel.  If omitted, the concurrency defaults to
     * `1`.  If the concurrency is `0`, an error is thrown.
     * @returns {module:ControlFlow.QueueObject} A priorityQueue object to manage the tasks. There are three
     * differences between `queue` and `priorityQueue` objects:
     * * `push(task, priority, [callback])` - `priority` should be a number. If an
     *   array of `tasks` is given, all tasks will be assigned the same priority.
     * * `pushAsync(task, priority, [callback])` - the same as `priorityQueue.push`,
     *   except this returns a promise that rejects if an error occurs.
     * * The `unshift` and `unshiftAsync` methods were removed.
     */
    function priorityQueue(worker, concurrency) {
        // Start with a normal queue
        var q = queue$1(worker, concurrency);

        var {
            push,
            pushAsync
        } = q;

        q._tasks = new Heap();
        q._createTaskItem = ({data, priority}, callback) => {
            return {
                data,
                priority,
                callback
            };
        };

        function createDataItems(tasks, priority) {
            if (!Array.isArray(tasks)) {
                return {data: tasks, priority};
            }
            return tasks.map(data => { return {data, priority}; });
        }

        // Override push to accept second parameter representing priority
        q.push = function(data, priority = 0, callback) {
            return push(createDataItems(data, priority), callback);
        };

        q.pushAsync = function(data, priority = 0, callback) {
            return pushAsync(createDataItems(data, priority), callback);
        };

        // Remove unshift functions
        delete q.unshift;
        delete q.unshiftAsync;

        return q;
    }

    /**
     * Runs the `tasks` array of functions in parallel, without waiting until the
     * previous function has completed. Once any of the `tasks` complete or pass an
     * error to its callback, the main `callback` is immediately called. It's
     * equivalent to `Promise.race()`.
     *
     * @name race
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array} tasks - An array containing [async functions]{@link AsyncFunction}
     * to run. Each function can complete with an optional `result` value.
     * @param {Function} callback - A callback to run once any of the functions have
     * completed. This function gets an error or result from the first function that
     * completed. Invoked with (err, result).
     * @returns {Promise} a promise, if a callback is omitted
     * @example
     *
     * async.race([
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ],
     * // main callback
     * function(err, result) {
     *     // the result will be equal to 'two' as it finishes earlier
     * });
     */
    function race(tasks, callback) {
        callback = once(callback);
        if (!Array.isArray(tasks)) return callback(new TypeError('First argument to race must be an array of functions'));
        if (!tasks.length) return callback();
        for (var i = 0, l = tasks.length; i < l; i++) {
            wrapAsync(tasks[i])(callback);
        }
    }

    var race$1 = awaitify(race, 2);

    /**
     * Same as [`reduce`]{@link module:Collections.reduce}, only operates on `array` in reverse order.
     *
     * @name reduceRight
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.reduce]{@link module:Collections.reduce}
     * @alias foldr
     * @category Collection
     * @param {Array} array - A collection to iterate over.
     * @param {*} memo - The initial state of the reduction.
     * @param {AsyncFunction} iteratee - A function applied to each item in the
     * array to produce the next step in the reduction.
     * The `iteratee` should complete with the next state of the reduction.
     * If the iteratee completes with an error, the reduction is stopped and the
     * main `callback` is immediately called with the error.
     * Invoked with (memo, item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result is the reduced value. Invoked with
     * (err, result).
     * @returns {Promise} a promise, if no callback is passed
     */
    function reduceRight (array, memo, iteratee, callback) {
        var reversed = [...array].reverse();
        return reduce$1(reversed, memo, iteratee, callback);
    }

    /**
     * Wraps the async function in another function that always completes with a
     * result object, even when it errors.
     *
     * The result object has either the property `error` or `value`.
     *
     * @name reflect
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} fn - The async function you want to wrap
     * @returns {Function} - A function that always passes null to it's callback as
     * the error. The second argument to the callback will be an `object` with
     * either an `error` or a `value` property.
     * @example
     *
     * async.parallel([
     *     async.reflect(function(callback) {
     *         // do some stuff ...
     *         callback(null, 'one');
     *     }),
     *     async.reflect(function(callback) {
     *         // do some more stuff but error ...
     *         callback('bad stuff happened');
     *     }),
     *     async.reflect(function(callback) {
     *         // do some more stuff ...
     *         callback(null, 'two');
     *     })
     * ],
     * // optional callback
     * function(err, results) {
     *     // values
     *     // results[0].value = 'one'
     *     // results[1].error = 'bad stuff happened'
     *     // results[2].value = 'two'
     * });
     */
    function reflect(fn) {
        var _fn = wrapAsync(fn);
        return initialParams(function reflectOn(args, reflectCallback) {
            args.push((error, ...cbArgs) => {
                let retVal = {};
                if (error) {
                    retVal.error = error;
                }
                if (cbArgs.length > 0){
                    var value = cbArgs;
                    if (cbArgs.length <= 1) {
                        [value] = cbArgs;
                    }
                    retVal.value = value;
                }
                reflectCallback(null, retVal);
            });

            return _fn.apply(this, args);
        });
    }

    /**
     * A helper function that wraps an array or an object of functions with `reflect`.
     *
     * @name reflectAll
     * @static
     * @memberOf module:Utils
     * @method
     * @see [async.reflect]{@link module:Utils.reflect}
     * @category Util
     * @param {Array|Object|Iterable} tasks - The collection of
     * [async functions]{@link AsyncFunction} to wrap in `async.reflect`.
     * @returns {Array} Returns an array of async functions, each wrapped in
     * `async.reflect`
     * @example
     *
     * let tasks = [
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         // do some more stuff but error ...
     *         callback(new Error('bad stuff happened'));
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ];
     *
     * async.parallel(async.reflectAll(tasks),
     * // optional callback
     * function(err, results) {
     *     // values
     *     // results[0].value = 'one'
     *     // results[1].error = Error('bad stuff happened')
     *     // results[2].value = 'two'
     * });
     *
     * // an example using an object instead of an array
     * let tasks = {
     *     one: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     two: function(callback) {
     *         callback('two');
     *     },
     *     three: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'three');
     *         }, 100);
     *     }
     * };
     *
     * async.parallel(async.reflectAll(tasks),
     * // optional callback
     * function(err, results) {
     *     // values
     *     // results.one.value = 'one'
     *     // results.two.error = 'two'
     *     // results.three.value = 'three'
     * });
     */
    function reflectAll(tasks) {
        var results;
        if (Array.isArray(tasks)) {
            results = tasks.map(reflect);
        } else {
            results = {};
            Object.keys(tasks).forEach(key => {
                results[key] = reflect.call(this, tasks[key]);
            });
        }
        return results;
    }

    function reject(eachfn, arr, _iteratee, callback) {
        const iteratee = wrapAsync(_iteratee);
        return _filter(eachfn, arr, (value, cb) => {
            iteratee(value, (err, v) => {
                cb(err, !v);
            });
        }, callback);
    }

    /**
     * The opposite of [`filter`]{@link module:Collections.filter}. Removes values that pass an `async` truth test.
     *
     * @name reject
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.filter]{@link module:Collections.filter}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {Function} iteratee - An async truth test to apply to each item in
     * `coll`.
     * The should complete with a boolean value as its `result`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     *
     * const fileList = ['dir1/file1.txt','dir2/file3.txt','dir3/file6.txt'];
     *
     * // asynchronous function that checks if a file exists
     * function fileExists(file, callback) {
     *    fs.access(file, fs.constants.F_OK, (err) => {
     *        callback(null, !err);
     *    });
     * }
     *
     * // Using callbacks
     * async.reject(fileList, fileExists, function(err, results) {
     *    // [ 'dir3/file6.txt' ]
     *    // results now equals an array of the non-existing files
     * });
     *
     * // Using Promises
     * async.reject(fileList, fileExists)
     * .then( results => {
     *     console.log(results);
     *     // [ 'dir3/file6.txt' ]
     *     // results now equals an array of the non-existing files
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let results = await async.reject(fileList, fileExists);
     *         console.log(results);
     *         // [ 'dir3/file6.txt' ]
     *         // results now equals an array of the non-existing files
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function reject$1 (coll, iteratee, callback) {
        return reject(eachOf$1, coll, iteratee, callback)
    }
    var reject$2 = awaitify(reject$1, 3);

    /**
     * The same as [`reject`]{@link module:Collections.reject} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name rejectLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.reject]{@link module:Collections.reject}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {Function} iteratee - An async truth test to apply to each item in
     * `coll`.
     * The should complete with a boolean value as its `result`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback is passed
     */
    function rejectLimit (coll, limit, iteratee, callback) {
        return reject(eachOfLimit(limit), coll, iteratee, callback)
    }
    var rejectLimit$1 = awaitify(rejectLimit, 4);

    /**
     * The same as [`reject`]{@link module:Collections.reject} but runs only a single async operation at a time.
     *
     * @name rejectSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.reject]{@link module:Collections.reject}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {Function} iteratee - An async truth test to apply to each item in
     * `coll`.
     * The should complete with a boolean value as its `result`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback is passed
     */
    function rejectSeries (coll, iteratee, callback) {
        return reject(eachOfSeries$1, coll, iteratee, callback)
    }
    var rejectSeries$1 = awaitify(rejectSeries, 3);

    function constant$1(value) {
        return function () {
            return value;
        }
    }

    /**
     * Attempts to get a successful response from `task` no more than `times` times
     * before returning an error. If the task is successful, the `callback` will be
     * passed the result of the successful task. If all attempts fail, the callback
     * will be passed the error and result (if any) of the final attempt.
     *
     * @name retry
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @see [async.retryable]{@link module:ControlFlow.retryable}
     * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - Can be either an
     * object with `times` and `interval` or a number.
     * * `times` - The number of attempts to make before giving up.  The default
     *   is `5`.
     * * `interval` - The time to wait between retries, in milliseconds.  The
     *   default is `0`. The interval may also be specified as a function of the
     *   retry count (see example).
     * * `errorFilter` - An optional synchronous function that is invoked on
     *   erroneous result. If it returns `true` the retry attempts will continue;
     *   if the function returns `false` the retry flow is aborted with the current
     *   attempt's error and result being returned to the final callback.
     *   Invoked with (err).
     * * If `opts` is a number, the number specifies the number of times to retry,
     *   with the default interval of `0`.
     * @param {AsyncFunction} task - An async function to retry.
     * Invoked with (callback).
     * @param {Function} [callback] - An optional callback which is called when the
     * task has succeeded, or after the final failed attempt. It receives the `err`
     * and `result` arguments of the last attempt at completing the `task`. Invoked
     * with (err, results).
     * @returns {Promise} a promise if no callback provided
     *
     * @example
     *
     * // The `retry` function can be used as a stand-alone control flow by passing
     * // a callback, as shown below:
     *
     * // try calling apiMethod 3 times
     * async.retry(3, apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // try calling apiMethod 3 times, waiting 200 ms between each retry
     * async.retry({times: 3, interval: 200}, apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // try calling apiMethod 10 times with exponential backoff
     * // (i.e. intervals of 100, 200, 400, 800, 1600, ... milliseconds)
     * async.retry({
     *   times: 10,
     *   interval: function(retryCount) {
     *     return 50 * Math.pow(2, retryCount);
     *   }
     * }, apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // try calling apiMethod the default 5 times no delay between each retry
     * async.retry(apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // try calling apiMethod only when error condition satisfies, all other
     * // errors will abort the retry control flow and return to final callback
     * async.retry({
     *   errorFilter: function(err) {
     *     return err.message === 'Temporary error'; // only retry on a specific error
     *   }
     * }, apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // to retry individual methods that are not as reliable within other
     * // control flow functions, use the `retryable` wrapper:
     * async.auto({
     *     users: api.getUsers.bind(api),
     *     payments: async.retryable(3, api.getPayments.bind(api))
     * }, function(err, results) {
     *     // do something with the results
     * });
     *
     */
    const DEFAULT_TIMES = 5;
    const DEFAULT_INTERVAL = 0;

    function retry(opts, task, callback) {
        var options = {
            times: DEFAULT_TIMES,
            intervalFunc: constant$1(DEFAULT_INTERVAL)
        };

        if (arguments.length < 3 && typeof opts === 'function') {
            callback = task || promiseCallback();
            task = opts;
        } else {
            parseTimes(options, opts);
            callback = callback || promiseCallback();
        }

        if (typeof task !== 'function') {
            throw new Error("Invalid arguments for async.retry");
        }

        var _task = wrapAsync(task);

        var attempt = 1;
        function retryAttempt() {
            _task((err, ...args) => {
                if (err === false) return
                if (err && attempt++ < options.times &&
                    (typeof options.errorFilter != 'function' ||
                        options.errorFilter(err))) {
                    setTimeout(retryAttempt, options.intervalFunc(attempt - 1));
                } else {
                    callback(err, ...args);
                }
            });
        }

        retryAttempt();
        return callback[PROMISE_SYMBOL]
    }

    function parseTimes(acc, t) {
        if (typeof t === 'object') {
            acc.times = +t.times || DEFAULT_TIMES;

            acc.intervalFunc = typeof t.interval === 'function' ?
                t.interval :
                constant$1(+t.interval || DEFAULT_INTERVAL);

            acc.errorFilter = t.errorFilter;
        } else if (typeof t === 'number' || typeof t === 'string') {
            acc.times = +t || DEFAULT_TIMES;
        } else {
            throw new Error("Invalid arguments for async.retry");
        }
    }

    /**
     * A close relative of [`retry`]{@link module:ControlFlow.retry}.  This method
     * wraps a task and makes it retryable, rather than immediately calling it
     * with retries.
     *
     * @name retryable
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.retry]{@link module:ControlFlow.retry}
     * @category Control Flow
     * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - optional
     * options, exactly the same as from `retry`, except for a `opts.arity` that
     * is the arity of the `task` function, defaulting to `task.length`
     * @param {AsyncFunction} task - the asynchronous function to wrap.
     * This function will be passed any arguments passed to the returned wrapper.
     * Invoked with (...args, callback).
     * @returns {AsyncFunction} The wrapped function, which when invoked, will
     * retry on an error, based on the parameters specified in `opts`.
     * This function will accept the same parameters as `task`.
     * @example
     *
     * async.auto({
     *     dep1: async.retryable(3, getFromFlakyService),
     *     process: ["dep1", async.retryable(3, function (results, cb) {
     *         maybeProcessData(results.dep1, cb);
     *     })]
     * }, callback);
     */
    function retryable (opts, task) {
        if (!task) {
            task = opts;
            opts = null;
        }
        let arity = (opts && opts.arity) || task.length;
        if (isAsync(task)) {
            arity += 1;
        }
        var _task = wrapAsync(task);
        return initialParams((args, callback) => {
            if (args.length < arity - 1 || callback == null) {
                args.push(callback);
                callback = promiseCallback();
            }
            function taskFn(cb) {
                _task(...args, cb);
            }

            if (opts) retry(opts, taskFn, callback);
            else retry(taskFn, callback);

            return callback[PROMISE_SYMBOL]
        });
    }

    /**
     * Run the functions in the `tasks` collection in series, each one running once
     * the previous function has completed. If any functions in the series pass an
     * error to its callback, no more functions are run, and `callback` is
     * immediately called with the value of the error. Otherwise, `callback`
     * receives an array of results when `tasks` have completed.
     *
     * It is also possible to use an object instead of an array. Each property will
     * be run as a function, and the results will be passed to the final `callback`
     * as an object instead of an array. This can be a more readable way of handling
     *  results from {@link async.series}.
     *
     * **Note** that while many implementations preserve the order of object
     * properties, the [ECMAScript Language Specification](http://www.ecma-international.org/ecma-262/5.1/#sec-8.6)
     * explicitly states that
     *
     * > The mechanics and order of enumerating the properties is not specified.
     *
     * So if you rely on the order in which your series of functions are executed,
     * and want this to work on all platforms, consider using an array.
     *
     * @name series
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection containing
     * [async functions]{@link AsyncFunction} to run in series.
     * Each function can complete with any number of optional `result` values.
     * @param {Function} [callback] - An optional callback to run once all the
     * functions have completed. This function gets a results array (or object)
     * containing all the result arguments passed to the `task` callbacks. Invoked
     * with (err, result).
     * @return {Promise} a promise, if no callback is passed
     * @example
     *
     * //Using Callbacks
     * async.series([
     *     function(callback) {
     *         setTimeout(function() {
     *             // do some async task
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             // then do another async task
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ], function(err, results) {
     *     console.log(results);
     *     // results is equal to ['one','two']
     * });
     *
     * // an example using objects instead of arrays
     * async.series({
     *     one: function(callback) {
     *         setTimeout(function() {
     *             // do some async task
     *             callback(null, 1);
     *         }, 200);
     *     },
     *     two: function(callback) {
     *         setTimeout(function() {
     *             // then do another async task
     *             callback(null, 2);
     *         }, 100);
     *     }
     * }, function(err, results) {
     *     console.log(results);
     *     // results is equal to: { one: 1, two: 2 }
     * });
     *
     * //Using Promises
     * async.series([
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ]).then(results => {
     *     console.log(results);
     *     // results is equal to ['one','two']
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * // an example using an object instead of an array
     * async.series({
     *     one: function(callback) {
     *         setTimeout(function() {
     *             // do some async task
     *             callback(null, 1);
     *         }, 200);
     *     },
     *     two: function(callback) {
     *         setTimeout(function() {
     *             // then do another async task
     *             callback(null, 2);
     *         }, 100);
     *     }
     * }).then(results => {
     *     console.log(results);
     *     // results is equal to: { one: 1, two: 2 }
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * //Using async/await
     * async () => {
     *     try {
     *         let results = await async.series([
     *             function(callback) {
     *                 setTimeout(function() {
     *                     // do some async task
     *                     callback(null, 'one');
     *                 }, 200);
     *             },
     *             function(callback) {
     *                 setTimeout(function() {
     *                     // then do another async task
     *                     callback(null, 'two');
     *                 }, 100);
     *             }
     *         ]);
     *         console.log(results);
     *         // results is equal to ['one','two']
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // an example using an object instead of an array
     * async () => {
     *     try {
     *         let results = await async.parallel({
     *             one: function(callback) {
     *                 setTimeout(function() {
     *                     // do some async task
     *                     callback(null, 1);
     *                 }, 200);
     *             },
     *            two: function(callback) {
     *                 setTimeout(function() {
     *                     // then do another async task
     *                     callback(null, 2);
     *                 }, 100);
     *            }
     *         });
     *         console.log(results);
     *         // results is equal to: { one: 1, two: 2 }
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function series(tasks, callback) {
        return parallel(eachOfSeries$1, tasks, callback);
    }

    /**
     * Returns `true` if at least one element in the `coll` satisfies an async test.
     * If any iteratee call returns `true`, the main `callback` is immediately
     * called.
     *
     * @name some
     * @static
     * @memberOf module:Collections
     * @method
     * @alias any
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collections in parallel.
     * The iteratee should complete with a boolean `result` value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the iteratee functions have finished.
     * Result will be either `true` or `false` depending on the values of the async
     * tests. Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     * // dir4 does not exist
     *
     * // asynchronous function that checks if a file exists
     * function fileExists(file, callback) {
     *    fs.access(file, fs.constants.F_OK, (err) => {
     *        callback(null, !err);
     *    });
     * }
     *
     * // Using callbacks
     * async.some(['dir1/missing.txt','dir2/missing.txt','dir3/file5.txt'], fileExists,
     *    function(err, result) {
     *        console.log(result);
     *        // true
     *        // result is true since some file in the list exists
     *    }
     *);
     *
     * async.some(['dir1/missing.txt','dir2/missing.txt','dir4/missing.txt'], fileExists,
     *    function(err, result) {
     *        console.log(result);
     *        // false
     *        // result is false since none of the files exists
     *    }
     *);
     *
     * // Using Promises
     * async.some(['dir1/missing.txt','dir2/missing.txt','dir3/file5.txt'], fileExists)
     * .then( result => {
     *     console.log(result);
     *     // true
     *     // result is true since some file in the list exists
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * async.some(['dir1/missing.txt','dir2/missing.txt','dir4/missing.txt'], fileExists)
     * .then( result => {
     *     console.log(result);
     *     // false
     *     // result is false since none of the files exists
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.some(['dir1/missing.txt','dir2/missing.txt','dir3/file5.txt'], fileExists);
     *         console.log(result);
     *         // true
     *         // result is true since some file in the list exists
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * async () => {
     *     try {
     *         let result = await async.some(['dir1/missing.txt','dir2/missing.txt','dir4/missing.txt'], fileExists);
     *         console.log(result);
     *         // false
     *         // result is false since none of the files exists
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function some(coll, iteratee, callback) {
        return _createTester(Boolean, res => res)(eachOf$1, coll, iteratee, callback)
    }
    var some$1 = awaitify(some, 3);

    /**
     * The same as [`some`]{@link module:Collections.some} but runs a maximum of `limit` async operations at a time.
     *
     * @name someLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.some]{@link module:Collections.some}
     * @alias anyLimit
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collections in parallel.
     * The iteratee should complete with a boolean `result` value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the iteratee functions have finished.
     * Result will be either `true` or `false` depending on the values of the async
     * tests. Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     */
    function someLimit(coll, limit, iteratee, callback) {
        return _createTester(Boolean, res => res)(eachOfLimit(limit), coll, iteratee, callback)
    }
    var someLimit$1 = awaitify(someLimit, 4);

    /**
     * The same as [`some`]{@link module:Collections.some} but runs only a single async operation at a time.
     *
     * @name someSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.some]{@link module:Collections.some}
     * @alias anySeries
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collections in series.
     * The iteratee should complete with a boolean `result` value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the iteratee functions have finished.
     * Result will be either `true` or `false` depending on the values of the async
     * tests. Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     */
    function someSeries(coll, iteratee, callback) {
        return _createTester(Boolean, res => res)(eachOfSeries$1, coll, iteratee, callback)
    }
    var someSeries$1 = awaitify(someSeries, 3);

    /**
     * Sorts a list by the results of running each `coll` value through an async
     * `iteratee`.
     *
     * @name sortBy
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with a value to use as the sort criteria as
     * its `result`.
     * Invoked with (item, callback).
     * @param {Function} callback - A callback which is called after all the
     * `iteratee` functions have finished, or an error occurs. Results is the items
     * from the original `coll` sorted by the values returned by the `iteratee`
     * calls. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback passed
     * @example
     *
     * // bigfile.txt is a file that is 251100 bytes in size
     * // mediumfile.txt is a file that is 11000 bytes in size
     * // smallfile.txt is a file that is 121 bytes in size
     *
     * // asynchronous function that returns the file size in bytes
     * function getFileSizeInBytes(file, callback) {
     *     fs.stat(file, function(err, stat) {
     *         if (err) {
     *             return callback(err);
     *         }
     *         callback(null, stat.size);
     *     });
     * }
     *
     * // Using callbacks
     * async.sortBy(['mediumfile.txt','smallfile.txt','bigfile.txt'], getFileSizeInBytes,
     *     function(err, results) {
     *         if (err) {
     *             console.log(err);
     *         } else {
     *             console.log(results);
     *             // results is now the original array of files sorted by
     *             // file size (ascending by default), e.g.
     *             // [ 'smallfile.txt', 'mediumfile.txt', 'bigfile.txt']
     *         }
     *     }
     * );
     *
     * // By modifying the callback parameter the
     * // sorting order can be influenced:
     *
     * // ascending order
     * async.sortBy(['mediumfile.txt','smallfile.txt','bigfile.txt'], function(file, callback) {
     *     getFileSizeInBytes(file, function(getFileSizeErr, fileSize) {
     *         if (getFileSizeErr) return callback(getFileSizeErr);
     *         callback(null, fileSize);
     *     });
     * }, function(err, results) {
     *         if (err) {
     *             console.log(err);
     *         } else {
     *             console.log(results);
     *             // results is now the original array of files sorted by
     *             // file size (ascending by default), e.g.
     *             // [ 'smallfile.txt', 'mediumfile.txt', 'bigfile.txt']
     *         }
     *     }
     * );
     *
     * // descending order
     * async.sortBy(['bigfile.txt','mediumfile.txt','smallfile.txt'], function(file, callback) {
     *     getFileSizeInBytes(file, function(getFileSizeErr, fileSize) {
     *         if (getFileSizeErr) {
     *             return callback(getFileSizeErr);
     *         }
     *         callback(null, fileSize * -1);
     *     });
     * }, function(err, results) {
     *         if (err) {
     *             console.log(err);
     *         } else {
     *             console.log(results);
     *             // results is now the original array of files sorted by
     *             // file size (ascending by default), e.g.
     *             // [ 'bigfile.txt', 'mediumfile.txt', 'smallfile.txt']
     *         }
     *     }
     * );
     *
     * // Error handling
     * async.sortBy(['mediumfile.txt','smallfile.txt','missingfile.txt'], getFileSizeInBytes,
     *     function(err, results) {
     *         if (err) {
     *             console.log(err);
     *             // [ Error: ENOENT: no such file or directory ]
     *         } else {
     *             console.log(results);
     *         }
     *     }
     * );
     *
     * // Using Promises
     * async.sortBy(['mediumfile.txt','smallfile.txt','bigfile.txt'], getFileSizeInBytes)
     * .then( results => {
     *     console.log(results);
     *     // results is now the original array of files sorted by
     *     // file size (ascending by default), e.g.
     *     // [ 'smallfile.txt', 'mediumfile.txt', 'bigfile.txt']
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Error handling
     * async.sortBy(['mediumfile.txt','smallfile.txt','missingfile.txt'], getFileSizeInBytes)
     * .then( results => {
     *     console.log(results);
     * }).catch( err => {
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     * });
     *
     * // Using async/await
     * (async () => {
     *     try {
     *         let results = await async.sortBy(['bigfile.txt','mediumfile.txt','smallfile.txt'], getFileSizeInBytes);
     *         console.log(results);
     *         // results is now the original array of files sorted by
     *         // file size (ascending by default), e.g.
     *         // [ 'smallfile.txt', 'mediumfile.txt', 'bigfile.txt']
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * })();
     *
     * // Error handling
     * async () => {
     *     try {
     *         let results = await async.sortBy(['missingfile.txt','mediumfile.txt','smallfile.txt'], getFileSizeInBytes);
     *         console.log(results);
     *     }
     *     catch (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     }
     * }
     *
     */
    function sortBy (coll, iteratee, callback) {
        var _iteratee = wrapAsync(iteratee);
        return map$1(coll, (x, iterCb) => {
            _iteratee(x, (err, criteria) => {
                if (err) return iterCb(err);
                iterCb(err, {value: x, criteria});
            });
        }, (err, results) => {
            if (err) return callback(err);
            callback(null, results.sort(comparator).map(v => v.value));
        });

        function comparator(left, right) {
            var a = left.criteria, b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;
        }
    }
    var sortBy$1 = awaitify(sortBy, 3);

    /**
     * Sets a time limit on an asynchronous function. If the function does not call
     * its callback within the specified milliseconds, it will be called with a
     * timeout error. The code property for the error object will be `'ETIMEDOUT'`.
     *
     * @name timeout
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} asyncFn - The async function to limit in time.
     * @param {number} milliseconds - The specified time limit.
     * @param {*} [info] - Any variable you want attached (`string`, `object`, etc)
     * to timeout Error for more information..
     * @returns {AsyncFunction} Returns a wrapped function that can be used with any
     * of the control flow functions.
     * Invoke this function with the same parameters as you would `asyncFunc`.
     * @example
     *
     * function myFunction(foo, callback) {
     *     doAsyncTask(foo, function(err, data) {
     *         // handle errors
     *         if (err) return callback(err);
     *
     *         // do some stuff ...
     *
     *         // return processed data
     *         return callback(null, data);
     *     });
     * }
     *
     * var wrapped = async.timeout(myFunction, 1000);
     *
     * // call `wrapped` as you would `myFunction`
     * wrapped({ bar: 'bar' }, function(err, data) {
     *     // if `myFunction` takes < 1000 ms to execute, `err`
     *     // and `data` will have their expected values
     *
     *     // else `err` will be an Error with the code 'ETIMEDOUT'
     * });
     */
    function timeout(asyncFn, milliseconds, info) {
        var fn = wrapAsync(asyncFn);

        return initialParams((args, callback) => {
            var timedOut = false;
            var timer;

            function timeoutCallback() {
                var name = asyncFn.name || 'anonymous';
                var error  = new Error('Callback function "' + name + '" timed out.');
                error.code = 'ETIMEDOUT';
                if (info) {
                    error.info = info;
                }
                timedOut = true;
                callback(error);
            }

            args.push((...cbArgs) => {
                if (!timedOut) {
                    callback(...cbArgs);
                    clearTimeout(timer);
                }
            });

            // setup timer and call original function
            timer = setTimeout(timeoutCallback, milliseconds);
            fn(...args);
        });
    }

    function range(size) {
        var result = Array(size);
        while (size--) {
            result[size] = size;
        }
        return result;
    }

    /**
     * The same as [times]{@link module:ControlFlow.times} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name timesLimit
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.times]{@link module:ControlFlow.times}
     * @category Control Flow
     * @param {number} count - The number of times to run the function.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - The async function to call `n` times.
     * Invoked with the iteration index and a callback: (n, next).
     * @param {Function} callback - see [async.map]{@link module:Collections.map}.
     * @returns {Promise} a promise, if no callback is provided
     */
    function timesLimit(count, limit, iteratee, callback) {
        var _iteratee = wrapAsync(iteratee);
        return mapLimit$1(range(count), limit, _iteratee, callback);
    }

    /**
     * Calls the `iteratee` function `n` times, and accumulates results in the same
     * manner you would use with [map]{@link module:Collections.map}.
     *
     * @name times
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.map]{@link module:Collections.map}
     * @category Control Flow
     * @param {number} n - The number of times to run the function.
     * @param {AsyncFunction} iteratee - The async function to call `n` times.
     * Invoked with the iteration index and a callback: (n, next).
     * @param {Function} callback - see {@link module:Collections.map}.
     * @returns {Promise} a promise, if no callback is provided
     * @example
     *
     * // Pretend this is some complicated async factory
     * var createUser = function(id, callback) {
     *     callback(null, {
     *         id: 'user' + id
     *     });
     * };
     *
     * // generate 5 users
     * async.times(5, function(n, next) {
     *     createUser(n, function(err, user) {
     *         next(err, user);
     *     });
     * }, function(err, users) {
     *     // we should now have 5 users
     * });
     */
    function times (n, iteratee, callback) {
        return timesLimit(n, Infinity, iteratee, callback)
    }

    /**
     * The same as [times]{@link module:ControlFlow.times} but runs only a single async operation at a time.
     *
     * @name timesSeries
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.times]{@link module:ControlFlow.times}
     * @category Control Flow
     * @param {number} n - The number of times to run the function.
     * @param {AsyncFunction} iteratee - The async function to call `n` times.
     * Invoked with the iteration index and a callback: (n, next).
     * @param {Function} callback - see {@link module:Collections.map}.
     * @returns {Promise} a promise, if no callback is provided
     */
    function timesSeries (n, iteratee, callback) {
        return timesLimit(n, 1, iteratee, callback)
    }

    /**
     * A relative of `reduce`.  Takes an Object or Array, and iterates over each
     * element in parallel, each step potentially mutating an `accumulator` value.
     * The type of the accumulator defaults to the type of collection passed in.
     *
     * @name transform
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {*} [accumulator] - The initial state of the transform.  If omitted,
     * it will default to an empty Object or Array, depending on the type of `coll`
     * @param {AsyncFunction} iteratee - A function applied to each item in the
     * collection that potentially modifies the accumulator.
     * Invoked with (accumulator, item, key, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result is the transformed accumulator.
     * Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     * @example
     *
     * // file1.txt is a file that is 1000 bytes in size
     * // file2.txt is a file that is 2000 bytes in size
     * // file3.txt is a file that is 3000 bytes in size
     *
     * // helper function that returns human-readable size format from bytes
     * function formatBytes(bytes, decimals = 2) {
     *   // implementation not included for brevity
     *   return humanReadbleFilesize;
     * }
     *
     * const fileList = ['file1.txt','file2.txt','file3.txt'];
     *
     * // asynchronous function that returns the file size, transformed to human-readable format
     * // e.g. 1024 bytes = 1KB, 1234 bytes = 1.21 KB, 1048576 bytes = 1MB, etc.
     * function transformFileSize(acc, value, key, callback) {
     *     fs.stat(value, function(err, stat) {
     *         if (err) {
     *             return callback(err);
     *         }
     *         acc[key] = formatBytes(stat.size);
     *         callback(null);
     *     });
     * }
     *
     * // Using callbacks
     * async.transform(fileList, transformFileSize, function(err, result) {
     *     if(err) {
     *         console.log(err);
     *     } else {
     *         console.log(result);
     *         // [ '1000 Bytes', '1.95 KB', '2.93 KB' ]
     *     }
     * });
     *
     * // Using Promises
     * async.transform(fileList, transformFileSize)
     * .then(result => {
     *     console.log(result);
     *     // [ '1000 Bytes', '1.95 KB', '2.93 KB' ]
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * (async () => {
     *     try {
     *         let result = await async.transform(fileList, transformFileSize);
     *         console.log(result);
     *         // [ '1000 Bytes', '1.95 KB', '2.93 KB' ]
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * })();
     *
     * @example
     *
     * // file1.txt is a file that is 1000 bytes in size
     * // file2.txt is a file that is 2000 bytes in size
     * // file3.txt is a file that is 3000 bytes in size
     *
     * // helper function that returns human-readable size format from bytes
     * function formatBytes(bytes, decimals = 2) {
     *   // implementation not included for brevity
     *   return humanReadbleFilesize;
     * }
     *
     * const fileMap = { f1: 'file1.txt', f2: 'file2.txt', f3: 'file3.txt' };
     *
     * // asynchronous function that returns the file size, transformed to human-readable format
     * // e.g. 1024 bytes = 1KB, 1234 bytes = 1.21 KB, 1048576 bytes = 1MB, etc.
     * function transformFileSize(acc, value, key, callback) {
     *     fs.stat(value, function(err, stat) {
     *         if (err) {
     *             return callback(err);
     *         }
     *         acc[key] = formatBytes(stat.size);
     *         callback(null);
     *     });
     * }
     *
     * // Using callbacks
     * async.transform(fileMap, transformFileSize, function(err, result) {
     *     if(err) {
     *         console.log(err);
     *     } else {
     *         console.log(result);
     *         // { f1: '1000 Bytes', f2: '1.95 KB', f3: '2.93 KB' }
     *     }
     * });
     *
     * // Using Promises
     * async.transform(fileMap, transformFileSize)
     * .then(result => {
     *     console.log(result);
     *     // { f1: '1000 Bytes', f2: '1.95 KB', f3: '2.93 KB' }
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.transform(fileMap, transformFileSize);
     *         console.log(result);
     *         // { f1: '1000 Bytes', f2: '1.95 KB', f3: '2.93 KB' }
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function transform (coll, accumulator, iteratee, callback) {
        if (arguments.length <= 3 && typeof accumulator === 'function') {
            callback = iteratee;
            iteratee = accumulator;
            accumulator = Array.isArray(coll) ? [] : {};
        }
        callback = once(callback || promiseCallback());
        var _iteratee = wrapAsync(iteratee);

        eachOf$1(coll, (v, k, cb) => {
            _iteratee(accumulator, v, k, cb);
        }, err => callback(err, accumulator));
        return callback[PROMISE_SYMBOL]
    }

    /**
     * It runs each task in series but stops whenever any of the functions were
     * successful. If one of the tasks were successful, the `callback` will be
     * passed the result of the successful task. If all tasks fail, the callback
     * will be passed the error and result (if any) of the final attempt.
     *
     * @name tryEach
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection containing functions to
     * run, each function is passed a `callback(err, result)` it must call on
     * completion with an error `err` (which can be `null`) and an optional `result`
     * value.
     * @param {Function} [callback] - An optional callback which is called when one
     * of the tasks has succeeded, or all have failed. It receives the `err` and
     * `result` arguments of the last attempt at completing the `task`. Invoked with
     * (err, results).
     * @returns {Promise} a promise, if no callback is passed
     * @example
     * async.tryEach([
     *     function getDataFromFirstWebsite(callback) {
     *         // Try getting the data from the first website
     *         callback(err, data);
     *     },
     *     function getDataFromSecondWebsite(callback) {
     *         // First website failed,
     *         // Try getting the data from the backup website
     *         callback(err, data);
     *     }
     * ],
     * // optional callback
     * function(err, results) {
     *     Now do something with the data.
     * });
     *
     */
    function tryEach(tasks, callback) {
        var error = null;
        var result;
        return eachSeries$1(tasks, (task, taskCb) => {
            wrapAsync(task)((err, ...args) => {
                if (err === false) return taskCb(err);

                if (args.length < 2) {
                    [result] = args;
                } else {
                    result = args;
                }
                error = err;
                taskCb(err ? null : {});
            });
        }, () => callback(error, result));
    }

    var tryEach$1 = awaitify(tryEach);

    /**
     * Undoes a [memoize]{@link module:Utils.memoize}d function, reverting it to the original,
     * unmemoized form. Handy for testing.
     *
     * @name unmemoize
     * @static
     * @memberOf module:Utils
     * @method
     * @see [async.memoize]{@link module:Utils.memoize}
     * @category Util
     * @param {AsyncFunction} fn - the memoized function
     * @returns {AsyncFunction} a function that calls the original unmemoized function
     */
    function unmemoize(fn) {
        return (...args) => {
            return (fn.unmemoized || fn)(...args);
        };
    }

    /**
     * Repeatedly call `iteratee`, while `test` returns `true`. Calls `callback` when
     * stopped, or an error occurs.
     *
     * @name whilst
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {AsyncFunction} test - asynchronous truth test to perform before each
     * execution of `iteratee`. Invoked with ().
     * @param {AsyncFunction} iteratee - An async function which is called each time
     * `test` passes. Invoked with (callback).
     * @param {Function} [callback] - A callback which is called after the test
     * function has failed and repeated execution of `iteratee` has stopped. `callback`
     * will be passed an error and any arguments passed to the final `iteratee`'s
     * callback. Invoked with (err, [results]);
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * var count = 0;
     * async.whilst(
     *     function test(cb) { cb(null, count < 5); },
     *     function iter(callback) {
     *         count++;
     *         setTimeout(function() {
     *             callback(null, count);
     *         }, 1000);
     *     },
     *     function (err, n) {
     *         // 5 seconds have passed, n = 5
     *     }
     * );
     */
    function whilst(test, iteratee, callback) {
        callback = onlyOnce(callback);
        var _fn = wrapAsync(iteratee);
        var _test = wrapAsync(test);
        var results = [];

        function next(err, ...rest) {
            if (err) return callback(err);
            results = rest;
            if (err === false) return;
            _test(check);
        }

        function check(err, truth) {
            if (err) return callback(err);
            if (err === false) return;
            if (!truth) return callback(null, ...results);
            _fn(next);
        }

        return _test(check);
    }
    var whilst$1 = awaitify(whilst, 3);

    /**
     * Repeatedly call `iteratee` until `test` returns `true`. Calls `callback` when
     * stopped, or an error occurs. `callback` will be passed an error and any
     * arguments passed to the final `iteratee`'s callback.
     *
     * The inverse of [whilst]{@link module:ControlFlow.whilst}.
     *
     * @name until
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.whilst]{@link module:ControlFlow.whilst}
     * @category Control Flow
     * @param {AsyncFunction} test - asynchronous truth test to perform before each
     * execution of `iteratee`. Invoked with (callback).
     * @param {AsyncFunction} iteratee - An async function which is called each time
     * `test` fails. Invoked with (callback).
     * @param {Function} [callback] - A callback which is called after the test
     * function has passed and repeated execution of `iteratee` has stopped. `callback`
     * will be passed an error and any arguments passed to the final `iteratee`'s
     * callback. Invoked with (err, [results]);
     * @returns {Promise} a promise, if a callback is not passed
     *
     * @example
     * const results = []
     * let finished = false
     * async.until(function test(cb) {
     *     cb(null, finished)
     * }, function iter(next) {
     *     fetchPage(url, (err, body) => {
     *         if (err) return next(err)
     *         results = results.concat(body.objects)
     *         finished = !!body.next
     *         next(err)
     *     })
     * }, function done (err) {
     *     // all pages have been fetched
     * })
     */
    function until(test, iteratee, callback) {
        const _test = wrapAsync(test);
        return whilst$1((cb) => _test((err, truth) => cb (err, !truth)), iteratee, callback);
    }

    /**
     * Runs the `tasks` array of functions in series, each passing their results to
     * the next in the array. However, if any of the `tasks` pass an error to their
     * own callback, the next function is not executed, and the main `callback` is
     * immediately called with the error.
     *
     * @name waterfall
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array} tasks - An array of [async functions]{@link AsyncFunction}
     * to run.
     * Each function should complete with any number of `result` values.
     * The `result` values will be passed as arguments, in order, to the next task.
     * @param {Function} [callback] - An optional callback to run once all the
     * functions have completed. This will be passed the results of the last task's
     * callback. Invoked with (err, [results]).
     * @returns {Promise} a promise, if a callback is omitted
     * @example
     *
     * async.waterfall([
     *     function(callback) {
     *         callback(null, 'one', 'two');
     *     },
     *     function(arg1, arg2, callback) {
     *         // arg1 now equals 'one' and arg2 now equals 'two'
     *         callback(null, 'three');
     *     },
     *     function(arg1, callback) {
     *         // arg1 now equals 'three'
     *         callback(null, 'done');
     *     }
     * ], function (err, result) {
     *     // result now equals 'done'
     * });
     *
     * // Or, with named functions:
     * async.waterfall([
     *     myFirstFunction,
     *     mySecondFunction,
     *     myLastFunction,
     * ], function (err, result) {
     *     // result now equals 'done'
     * });
     * function myFirstFunction(callback) {
     *     callback(null, 'one', 'two');
     * }
     * function mySecondFunction(arg1, arg2, callback) {
     *     // arg1 now equals 'one' and arg2 now equals 'two'
     *     callback(null, 'three');
     * }
     * function myLastFunction(arg1, callback) {
     *     // arg1 now equals 'three'
     *     callback(null, 'done');
     * }
     */
    function waterfall (tasks, callback) {
        callback = once(callback);
        if (!Array.isArray(tasks)) return callback(new Error('First argument to waterfall must be an array of functions'));
        if (!tasks.length) return callback();
        var taskIndex = 0;

        function nextTask(args) {
            var task = wrapAsync(tasks[taskIndex++]);
            task(...args, onlyOnce(next));
        }

        function next(err, ...args) {
            if (err === false) return
            if (err || taskIndex === tasks.length) {
                return callback(err, ...args);
            }
            nextTask(args);
        }

        nextTask([]);
    }

    var waterfall$1 = awaitify(waterfall);

    /**
     * An "async function" in the context of Async is an asynchronous function with
     * a variable number of parameters, with the final parameter being a callback.
     * (`function (arg1, arg2, ..., callback) {}`)
     * The final callback is of the form `callback(err, results...)`, which must be
     * called once the function is completed.  The callback should be called with a
     * Error as its first argument to signal that an error occurred.
     * Otherwise, if no error occurred, it should be called with `null` as the first
     * argument, and any additional `result` arguments that may apply, to signal
     * successful completion.
     * The callback must be called exactly once, ideally on a later tick of the
     * JavaScript event loop.
     *
     * This type of function is also referred to as a "Node-style async function",
     * or a "continuation passing-style function" (CPS). Most of the methods of this
     * library are themselves CPS/Node-style async functions, or functions that
     * return CPS/Node-style async functions.
     *
     * Wherever we accept a Node-style async function, we also directly accept an
     * [ES2017 `async` function]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function}.
     * In this case, the `async` function will not be passed a final callback
     * argument, and any thrown error will be used as the `err` argument of the
     * implicit callback, and the return value will be used as the `result` value.
     * (i.e. a `rejected` of the returned Promise becomes the `err` callback
     * argument, and a `resolved` value becomes the `result`.)
     *
     * Note, due to JavaScript limitations, we can only detect native `async`
     * functions and not transpilied implementations.
     * Your environment must have `async`/`await` support for this to work.
     * (e.g. Node > v7.6, or a recent version of a modern browser).
     * If you are using `async` functions through a transpiler (e.g. Babel), you
     * must still wrap the function with [asyncify]{@link module:Utils.asyncify},
     * because the `async function` will be compiled to an ordinary function that
     * returns a promise.
     *
     * @typedef {Function} AsyncFunction
     * @static
     */

    var index = {
        apply,
        applyEach: applyEach$1,
        applyEachSeries,
        asyncify,
        auto,
        autoInject,
        cargo,
        cargoQueue: cargo$1,
        compose,
        concat: concat$1,
        concatLimit: concatLimit$1,
        concatSeries: concatSeries$1,
        constant,
        detect: detect$1,
        detectLimit: detectLimit$1,
        detectSeries: detectSeries$1,
        dir,
        doUntil,
        doWhilst: doWhilst$1,
        each,
        eachLimit: eachLimit$2,
        eachOf: eachOf$1,
        eachOfLimit: eachOfLimit$2,
        eachOfSeries: eachOfSeries$1,
        eachSeries: eachSeries$1,
        ensureAsync,
        every: every$1,
        everyLimit: everyLimit$1,
        everySeries: everySeries$1,
        filter: filter$1,
        filterLimit: filterLimit$1,
        filterSeries: filterSeries$1,
        forever: forever$1,
        groupBy,
        groupByLimit: groupByLimit$1,
        groupBySeries,
        log,
        map: map$1,
        mapLimit: mapLimit$1,
        mapSeries: mapSeries$1,
        mapValues,
        mapValuesLimit: mapValuesLimit$1,
        mapValuesSeries,
        memoize,
        nextTick,
        parallel: parallel$1,
        parallelLimit,
        priorityQueue,
        queue: queue$1,
        race: race$1,
        reduce: reduce$1,
        reduceRight,
        reflect,
        reflectAll,
        reject: reject$2,
        rejectLimit: rejectLimit$1,
        rejectSeries: rejectSeries$1,
        retry,
        retryable,
        seq,
        series,
        setImmediate: setImmediate$1,
        some: some$1,
        someLimit: someLimit$1,
        someSeries: someSeries$1,
        sortBy: sortBy$1,
        timeout,
        times,
        timesLimit,
        timesSeries,
        transform,
        tryEach: tryEach$1,
        unmemoize,
        until,
        waterfall: waterfall$1,
        whilst: whilst$1,

        // aliases
        all: every$1,
        allLimit: everyLimit$1,
        allSeries: everySeries$1,
        any: some$1,
        anyLimit: someLimit$1,
        anySeries: someSeries$1,
        find: detect$1,
        findLimit: detectLimit$1,
        findSeries: detectSeries$1,
        flatMap: concat$1,
        flatMapLimit: concatLimit$1,
        flatMapSeries: concatSeries$1,
        forEach: each,
        forEachSeries: eachSeries$1,
        forEachLimit: eachLimit$2,
        forEachOf: eachOf$1,
        forEachOfSeries: eachOfSeries$1,
        forEachOfLimit: eachOfLimit$2,
        inject: reduce$1,
        foldl: reduce$1,
        foldr: reduceRight,
        select: filter$1,
        selectLimit: filterLimit$1,
        selectSeries: filterSeries$1,
        wrapSync: asyncify,
        during: whilst$1,
        doDuring: doWhilst$1
    };

    exports.default = index;
    exports.apply = apply;
    exports.applyEach = applyEach$1;
    exports.applyEachSeries = applyEachSeries;
    exports.asyncify = asyncify;
    exports.auto = auto;
    exports.autoInject = autoInject;
    exports.cargo = cargo;
    exports.cargoQueue = cargo$1;
    exports.compose = compose;
    exports.concat = concat$1;
    exports.concatLimit = concatLimit$1;
    exports.concatSeries = concatSeries$1;
    exports.constant = constant;
    exports.detect = detect$1;
    exports.detectLimit = detectLimit$1;
    exports.detectSeries = detectSeries$1;
    exports.dir = dir;
    exports.doUntil = doUntil;
    exports.doWhilst = doWhilst$1;
    exports.each = each;
    exports.eachLimit = eachLimit$2;
    exports.eachOf = eachOf$1;
    exports.eachOfLimit = eachOfLimit$2;
    exports.eachOfSeries = eachOfSeries$1;
    exports.eachSeries = eachSeries$1;
    exports.ensureAsync = ensureAsync;
    exports.every = every$1;
    exports.everyLimit = everyLimit$1;
    exports.everySeries = everySeries$1;
    exports.filter = filter$1;
    exports.filterLimit = filterLimit$1;
    exports.filterSeries = filterSeries$1;
    exports.forever = forever$1;
    exports.groupBy = groupBy;
    exports.groupByLimit = groupByLimit$1;
    exports.groupBySeries = groupBySeries;
    exports.log = log;
    exports.map = map$1;
    exports.mapLimit = mapLimit$1;
    exports.mapSeries = mapSeries$1;
    exports.mapValues = mapValues;
    exports.mapValuesLimit = mapValuesLimit$1;
    exports.mapValuesSeries = mapValuesSeries;
    exports.memoize = memoize;
    exports.nextTick = nextTick;
    exports.parallel = parallel$1;
    exports.parallelLimit = parallelLimit;
    exports.priorityQueue = priorityQueue;
    exports.queue = queue$1;
    exports.race = race$1;
    exports.reduce = reduce$1;
    exports.reduceRight = reduceRight;
    exports.reflect = reflect;
    exports.reflectAll = reflectAll;
    exports.reject = reject$2;
    exports.rejectLimit = rejectLimit$1;
    exports.rejectSeries = rejectSeries$1;
    exports.retry = retry;
    exports.retryable = retryable;
    exports.seq = seq;
    exports.series = series;
    exports.setImmediate = setImmediate$1;
    exports.some = some$1;
    exports.someLimit = someLimit$1;
    exports.someSeries = someSeries$1;
    exports.sortBy = sortBy$1;
    exports.timeout = timeout;
    exports.times = times;
    exports.timesLimit = timesLimit;
    exports.timesSeries = timesSeries;
    exports.transform = transform;
    exports.tryEach = tryEach$1;
    exports.unmemoize = unmemoize;
    exports.until = until;
    exports.waterfall = waterfall$1;
    exports.whilst = whilst$1;
    exports.all = every$1;
    exports.allLimit = everyLimit$1;
    exports.allSeries = everySeries$1;
    exports.any = some$1;
    exports.anyLimit = someLimit$1;
    exports.anySeries = someSeries$1;
    exports.find = detect$1;
    exports.findLimit = detectLimit$1;
    exports.findSeries = detectSeries$1;
    exports.flatMap = concat$1;
    exports.flatMapLimit = concatLimit$1;
    exports.flatMapSeries = concatSeries$1;
    exports.forEach = each;
    exports.forEachSeries = eachSeries$1;
    exports.forEachLimit = eachLimit$2;
    exports.forEachOf = eachOf$1;
    exports.forEachOfSeries = eachOfSeries$1;
    exports.forEachOfLimit = eachOfLimit$2;
    exports.inject = reduce$1;
    exports.foldl = reduce$1;
    exports.foldr = reduceRight;
    exports.select = filter$1;
    exports.selectLimit = filterLimit$1;
    exports.selectSeries = filterSeries$1;
    exports.wrapSync = asyncify;
    exports.during = whilst$1;
    exports.doDuring = doWhilst$1;

    Object.defineProperty(exports, '__esModule', { value: true });

})));

}).call(this)}).call(this,require('_process'),require("timers").setImmediate)

},{"_process":10,"timers":11}],2:[function(require,module,exports){
module.exports=[
  "This is what I heard.",
  "At one time the Buddha was staying in the Jeta Grove, near the city of Sravasti.",
  "With him there was a community of 1,250 venerable monks and devoted disciples.",
  "One day before dawn, the Buddha clothed himself, and along with his disciples took up his alms bowl and entered the city to beg for food door to door, as was his custom.",
  "After he had returned and eaten, he put away his bowl and cloak, bathed his feet, and then sat with his legs crossed and body upright upon the seat arranged for him.",
  "He began mindfully fixing his attention in front of himself, while many monks approached the Buddha, and showing great reverence, seated themselves around him.",
  "After a time a most venerable monk named Subhuti, who was sitting in the congregation, rose from his seat.",
  "He uncovered his right shoulder, placed his right knee on the ground, and as he joined his palms together he respectfully bowed and then addressed the Buddha:",
  "“Most Honored One, It is truly majestic how much knowledge and wisdom your monks and disciples have been given through your most inspired teachings! It is remarkable that you look after our welfare so selflessly and so completely.”",
  "“Most Honored One, I have a question to ask you. If sons and daughters of good families want to develop the highest, most fulfilled and awakened mind, if they wish to attain the Highest Perfect Wisdom, what should they do to help quiet their drifting minds and help subdue their craving thoughts?”",
  "The Buddha then replied:",
  "“So it is as you say, Subhuti. Monks and disciples have been favored with the highest favor by the Buddha, the monks and disciples have been instructed with the highest instruction by the Buddha. The Buddha is constantly mindful of the welfare of his followers. Listen carefully with your full attention, and I will speak to your question.”",
  "“If sons and daughters of good families want to develop the highest, most fulfilled and awakened mind, if they wish to attain the Highest Perfect Wisdom and quiet their drifting minds while subduing their craving thoughts, then they should follow what I am about to say to you. Those who follow what I am about to say here will be able to subdue their discriminative thoughts and craving desires. It is possible to attain perfect tranquility and clarity of mind by absorbing and dwelling on the teachings I am about to give.”",
  "Then the Buddha addressed the assembly.",
  "“All living beings, whether born from eggs, from the womb, from moisture, or spontaneously; whether they have form or do not have form; whether they are aware or unaware, whether they are not aware or not unaware, all living beings will eventually be led by me to the final Nirvana, the final ending of the cycle of birth and death. And when this unfathomable, infinite number of living beings have all been liberated, in truth not even a single being has actually been liberated.”",
  "“Why Subhuti? Because if a disciple still clings to the arbitrary illusions of form or phenomena such as an ego, a personality, a self, a separate person, or a universal self existing eternally, then that person is not an authentic disciple.”",
  "“Furthermore, Subhuti, in the practice of compassion and charity a disciple should be detached. That is to say, he should practice compassion and charity without regard to appearances, without regard to form, without regard to sound, smell, taste, touch, or any quality of any kind. Subhuti, this is how the disciple should practice compassion and charity. Why? Because practicing compassion and charity without attachment is the way to reaching the Highest Perfect Wisdom, it is the way to becoming a living Buddha.”",
  "“Subhuti, do you think that you can measure all of the space in the Eastern Heavens?”",
  "“No, Most Honored One. One cannot possibly measure all of the space in the Eastern Heavens.”",
  "“Subhuti, can space in all the Western, Southern, and Northern Heavens, both above and below, be measured?”",
  "“No, Most Honored One. One cannot possibly measure all the space in the Western, Southern, and Northern Heavens.”",
  "“Well, Subhuti, the same is true of the merit of the disciple who practices compassion and charity without any attachment to appearances, without cherishing any idea of form. It is impossible to measure the merit they will accrue. Subhuti, my disciples should let their minds absorb and dwell in the teachings I have just given.”",
  "“Subhuti, what do you think? Can the Buddha be recognized by means of his bodily form?”",
  "“No, Most Honored One, the Buddha cannot be recognized by means of his bodily form. Why? Because when the Buddha speaks of bodily form, it is not a real form, but only an illusion.”",
  "The Buddha then spoke to Subhuti: “All that has a form is illusive and unreal. When you see that all forms are illusive and unreal, then you will begin to perceive your true Buddha nature.”",
  "Subhuti respectfully asked the lord Buddha, “Most Honored One! In the future, if a person hears this teaching, even if it is only a phrase or sentence, is it possible for that person to have a true faith and knowledge of Enlightenment awaken in their mind?”",
  "“Without a doubt, Subhuti. Even 500 years after the Enlightenment of this Buddha there will be some who are virtuous and wise, and while practicing compassion and charity, will believe in the words and phrases of this Sutra and will awaken their minds purely. After they come to hear these teachings, they will be inspired with belief. This is because when some people hear these words, they will have understood intuitively that these words are the truth.”",
  "“But you must also remember, Subhuti, that such persons have long ago planted the seeds of goodness and merit that lead to this realization. They have planted the seeds of good deeds and charity not simply before one Buddhist temple, or two temples, or five, but before hundreds of thousands of Buddhas and temples. So when a person who hears the words and phrases of this Sutra is ready for it to happen, a pure faith and clarity can awaken within their minds.”",
  "“Subhuti, any person who awakens faith upon hearing the words or phrases of this Sutra will accumulate countless blessings and merit.”",
  "“How do I know this? Because this person must have discarded all arbitrary notions of the existence of a personal self, of other people, or of a universal self. Otherwise their minds would still grasp after such relative conceptions. Furthermore, these people must have already discarded all arbitrary notions of the non-existence of a personal self, other people, or a universal self. Otherwise, their minds would still be grasping at such notions. Therefore anyone who seeks total Enlightenment should discard not only all conceptions of their own selfhood, of other selves, or of a universal self, but they should also discard all notions of the non-existence of such concepts.”",
  "“When the Buddha explains these things using such concepts and ideas, people should remember the unreality of all such concepts and ideas. They should recall that in teaching spiritual truths the Buddha always uses these concepts and ideas in the way that a raft is used to cross a river. Once the river has been crossed over, the raft is of no more use, and should be discarded. These arbitrary concepts and ideas about spiritual things need to be explained to us as we seek to attain Enlightenment. However, ultimately these arbitrary conceptions can be discarded. Think Subhuti, isn’t it even more obvious that we should also give up our conceptions of non-existent things?”",
  "Then Buddha asked Subhuti, “What do you think, Subhuti, has the Buddha arrived at the highest, most fulfilled, most awakened and enlightened mind? Does the Buddha teach any teaching?”",
  "Subhuti replied, “As far as I have understood the lord Buddha’s teachings, there is no independently existing object of mind called the highest, most fulfilled, awakened or enlightened mind. Nor is there any independently existing teaching that the Buddha teaches. Why? Because the teachings that the Buddha has realized and spoken of cannot be conceived of as separate, independent things and therefore cannot be described. The truth in them is uncontainable and inexpressible. It neither is, nor is it not. What does this mean? What this means is that Buddhas and disciples are not enlightened by a set method of teachings, but by an internally intuitive process which is spontaneous and is part of their own inner nature.”",
  "“Let me ask you Subhuti? If a person filled over ten thousand galaxies with the seven treasures for the purpose of compassion, charity, and giving alms, would this person not gain great merit and spread much happiness?”",
  "“Yes, Most Honored One. This person would gain great merit and spread much happiness, even though, in truth, this person does not have a separate existence to which merit could accrue. Why? Because this person’s merit is characterized with the quality of not being merit.”",
  "The Buddha continued, “Then suppose another person understood only four lines of this Sutra, but nevertheless took it upon themselves to explain these lines to someone else. This person’s merit would be even greater than the other person’s. Why? Because all Buddhas and all the teachings and values of the highest, most fulfilled, most awakened minds arise from the teachings in this Sutra. And yet, even as I speak, Subhuti, I must take back my words as soon as they are uttered, for there are no Buddhas and there are no teachings.”",
  "Buddha then asked, “What do you think, Subhuti, does one who has entered the stream which flows to Enlightenment, say ‘I have entered the stream’?”",
  "“No, Buddha”, Subhuti replied. “A true disciple entering the stream would not think of themselves as a separate person that could be entering anything. Only that disciple who does not differentiate themselves from others, who has no regard for name, shape, sound, odor, taste, touch or for any quality can truly be called a disciple who has entered the stream.”",
  "Buddha continued, “Does a disciple who is subject to only one more rebirth say to himself, ‘I am entitled to the honors and rewards of a Once-to-be-reborn.’?”",
  "“No, Lord. ‘Once-to-be-reborn’ is only a name. There is no passing away, or coming into, existence. Only one who realizes this can really be called a disciple.”",
  "“Subhuti, does a venerable One who will never more be reborn as a mortal say to himself, ‘I am entitled to the honor and rewards of a Non-returner.’?”",
  "“No, Perfectly Enlightened One. A ‘Non-returner’ is merely a name. There is actually no one returning and no one not-returning.”",
  "“Tell me, Subhuti. Does a Buddha say to himself, ‘I have obtained Perfect Enlightenment.’?”",
  "“No, lord. There is no such thing as Perfect Enlightenment to obtain. If a Perfectly Enlightened Buddha were to say to himself, ‘I am enlightened’ he would be admitting there is an individual person, a separate self and personality, and would therefore not be a Perfectly Enlightened Buddha.”",
  "Subhuti then said, “Most Honored One! You have said that I, Subhuti, excel amongst thy disciples in knowing the bliss of Enlightenment, in being perfectly content in seclusion, and in being free from all passions. Yet I do not say to myself that I am so, for if I ever thought of myself as such then it would not be true that I escaped ego delusion. I know that in truth there is no Subhuti and therefore Subhuti abides nowhere, that he neither knows nor does he not know bliss, and that he is neither free from nor enslaved by his passions.”",
  "The Buddha then continued, “What do you think, Subhuti? When I was in a previous life, with Dipankara Buddha, did I receive any definite teaching or attain any degree of self-control, whereby I later became a Buddha?”",
  "“No, honorable one. When you were a disciple of Dipankara Buddha, in truth, you received no definite teaching, nor did you attain any definite degree of self-control.”",
  "“Subhuti, know also that if any Buddha would say, ‘I will create a paradise,’ he would speak falsely. Why? Because a paradise cannot be created nor can it not be uncreated.”",
  "“A disciple should develop a mind which is in no way dependent upon sights, sounds, smells, tastes, sensory sensations or any mental conceptions. A disciple should develop a mind which does not rely on anything.”",
  "“Therefore, Subhuti, the minds of all disciples should be purified of all thoughts that relate to seeing, hearing, tasting, smelling, touching, and discriminating. They should use their minds spontaneously and naturally, without being constrained by preconceived notions arising from the senses.”",
  "“Suppose, Subhuti, a man had an enormous body. Would the sense of personal existence he had also be enormous?”",
  "“Yes, indeed, Buddha,” Subhuti answered. “His sense of personal existence would be enormous. But the Buddha has taught that personal existence is just a name, for it is in fact neither existence nor non-existence. So it only has the name ‘personal existence’.”",
  "“Subhuti, if there were as many Ganges rivers as the number of grains of sand in the Ganges, would you say that the number of grains of sand in all those Ganges rivers would be very many?”",
  "Subhuti answered, “Very many indeed, Most Honored One. If the number of Ganges rivers were that large, how much more so would be the number of grains of sand in all those Ganges rivers.”",
  "“Subhuti, I will declare a truth to you. If a good man or a good woman filled over ten thousand galaxies of worlds with the seven treasures for each grain of sand in all those Ganges rivers, and gave it all away for the purpose of compassion, charity and giving alms, would this man or woman not gain great merit and spread much happiness?”",
  "Subhuti replied, “Very much so, Most Honored One.”",
  "“Subhuti, if after studying and observing even a single stanza of this Sutra, another person were to explain it to others, the happiness and merit that would result from this virtuous act would be far greater.”",
  "“Furthermore, Subhuti, if any person in any place were to teach even four lines of this Sutra, the place where they taught it would become sacred ground and would be revered by all kinds of beings. How much more sacred would the place become if that person then studied and observed the whole Sutra! Subhuti, you should know that any person who does that would surely attain something rare and profound. Wherever this Sutra is honored and revered there is a sacred site enshrining the presence of the Buddha or one of the Buddha’s most venerable disciples.”",
  "Subhuti said to the Buddha, “By what name shall we know this Sutra, so that it can be honored and studied?”",
  "The lord Buddha replied, “This Sutra shall be known as",
  "‘The Diamond that Cuts through Illusion’.",
  "By this name it shall be revered and studied and observed. What does this name mean? It means that when the Buddha named it, he did not have in mind any definite or arbitrary conception, and so named it. This Sutra is hard and sharp, like a diamond that will cut away all arbitrary conceptions and bring one to the other shore of Enlightenment.”",
  "“What do you think, Subhuti? Has the Buddha taught any definite teaching in this Sutra?”",
  "“No lord, the Buddha has not taught any definite teaching in this Sutra.”",
  "“What do you think, Subhuti? Are there many particles of dust in this vast universe?”",
  "Subhuti replied: “Yes, many, Most Honored One!”",
  "“Subhuti, when the Buddha speaks of particles of dust, it does not mean I am thinking of any definite or arbitrary thought, I am merely using these words as a figure of speech. They are not real, only illusion. It is just the same with the word universe; these words do not assert any definite or arbitrary idea, I am only using the words as words.”",
  "“Subhuti, what do you think? Can the Buddha be perceived by means of his thirty-two physical characteristics?”",
  "“No, Most Honored One. The Buddha cannot be perceived by his thirty-two physical characteristics. Why? Because the Buddha teaches that they are not real but are merely called the thirty-two physical characteristics.”",
  "“Subhuti, if a good and faithful person, whether male or female, has, for the sake of compassion and charity, been sacrificing their life for generation upon generation, for as many generations as the grains of sands in 3,000 universes; and another follower has been studying and observing even a single section of this Sutra and explains it to others, that person’s blessings and merit would be far greater.”",
  "At that time, after listening to this Sutra, Subhuti had understood its profound meaning and was moved to tears.",
  "He said, “What a rare and precious thing it is that you should deliver such a deeply profound teaching. Since the day I attained the eyes of understanding, thanks to the guidance of the Buddha, I have never before heard teachings so deep and wonderful as these. Most Honored One, if someone hears this Sutra, and has pure and clear confidence in it they will have a profound insight into the truth. Having perceived that profound insight, that person will realize the rarest kind of virtue. Most Honored One, that insight into the truth is essentially not insight into the truth, but is what the Buddha calls insight into the truth.”",
  "“Most Honored One, having listened to this Sutra, I am able to receive and retain it with faith and understanding. This is not difficult for me, but in ages to come – in the last five hundred years, if there is a person who hears this Sutra, who receives and retains it with faith and understanding, then that person will be a rare one, a person of most remarkable achievement. Such a person will be able to awaken pure faith because they have ceased to cherish any arbitrary notions of their own selfhood, other selves, living beings, or a universal self. Why? Because if they continue to hold onto arbitrary conceptions as to their own selfhood, they will be holding onto something that is non-existent. It is the same with all arbitrary conceptions of other selves, living beings, or a universal self. These are all expressions of non-existent things. Buddhas are Buddhas because they have been able to discard all arbitrary conceptions of form and phenomena, they have transcended all perceptions, and have penetrated the illusion of all forms.”",
  "The Buddha replied:",
  "“So it is, Subhuti. Most wonderfully blest will be those beings who, on hearing this Sutra, will not tremble, nor be frightened, or terrified in any way. And why? The Buddha has taught this Sutra as the highest perfection. And what the Buddha teaches as the highest perfection, that also the innumerable Blessed Buddhas do teach. Therefore is it called the ‘highest perfection’.”",
  "“Subhuti, when I talk about the practice of transcendent patience, I do not hold onto any arbitrary conceptions about the phenomena of patience, I merely refer to it as the practice of transcendent patience. And why is that? Because when, thousands of lifetimes ago, the Prince of Kalinga severed the flesh from my limbs and my body I had no perception of a self, a being, a soul, or a universal self. If I had cherished any of these arbitrary notions at the time my limbs were being torn away, I would have fallen into anger and hatred.”",
  "“I also remember Subhuti that during my five hundred previous lives I had used life after life to practice patience and to look upon my life humbly, as though I were a saint called upon to suffer humility. Even then my mind was free of arbitrary conceptions of the phenomena of my self, a being, a soul, or a universal self.”",
  "“Therefore, Subhuti, disciples should leave behind all distinctions of phenomena and awaken the thought of the attainment of Supreme Enlightenment. A disciple should do this by not allowing their mind to depend upon ideas evoked by the world of the senses – by not allowing their mind to depend upon ideas stirred by sounds, odors, flavors, sensory touch, or any other qualities. The disciple’s mind should be kept independent of any thoughts that might arise within it. If the disciple’s mind depends upon anything in the sensory realm it will have no solid foundation in any reality. This is why Buddha teaches that the mind of a disciple should not accept the appearances of things as a basis when exercising charity. Subhuti, as disciples practice compassion and charity for the welfare of all living beings they should do it without relying on appearances, and without attachment. Just as the Buddha declares that form is not form, so he also declares that all living beings are, in fact, not living beings.”",
  "“Subhuti, if on the one hand, a son or daughter of a good family gives up his or her life in the morning as many times as there are grains of sand in the Ganges river as an act of generosity, and gives as many again in the afternoon and as many again in the evening, and continues doing so for countless ages; and if, on the other hand, another person listens to this Sutra with complete confidence and without contention, that person’s happiness will be far greater. But the happiness of one who writes this Sutra down, receives, recites, and explains it to others cannot even be compared it is so great.”",
  "“Subhuti, we can summarize by saying that the merit and virtue of this Sutra is inconceivable, incalculable and boundless. The Buddha has declared this teaching for the benefit of initiates on the path to Enlightenment; he has declared it for the benefit of initiates on the path to Nirvana. If there is someone capable of receiving, practicing, reciting, and sharing this Sutra with others, the Buddha will see and know that person, and he or she will receive immeasurable, incalculable, and boundless merit and virtue. Such a person is known to be carrying the Supreme Enlightenment attained by the Buddha. Why? Subhuti, if a person is satisfied with lesser teachings than those I present here, if he or she is still caught up in the idea of a self, a person, a living being, or a universal self, then that person would not be able to listen to, receive, recite, or explain this Sutra to others.”",
  "“Subhuti, wherever this Sutra shall be observed, studied and explained, that place will become sacred ground to which countless spiritually advanced beings will bring offerings. Such places, however humble they may be, will be revered as though they were famous temples, and countless pilgrims will come there to worship. Such a place is a shrine and should be venerated with formal ceremonies, and offerings of flowers and incense. That is the power of this Sutra.”",
  "“Furthermore, Subhuti, if a good man or good woman who accepts, upholds, reads or recites this Sutra is disdained or slandered, if they are despised or insulted, it means that in prior lives they committed evil acts and as a result are now suffering the fruits of their actions. When their prior life’s evil acts have finally been dissolved and extinguished, he or she will attain the supreme clarity of the most fulfilled, and awakened mind.”",
  "“Subhuti, in ancient times before I met Dipankara Buddha, I had made offerings to and had been attendant of all 84,000 million Buddhas. If someone is able to receive, recite, study, and practice this Sutra in a later, more distant age, then the happiness and merit brought about by this virtuous act would be hundreds of thousands of times greater than that which I brought about by my service to the Buddhas in ancient times. In fact, such happiness and merit cannot be conceived or compared with anything, even mathematically. If I were to explain all this in detail now some people might become suspicious and disbelieving, and their minds may even become disoriented or confused. Subhuti, you should know that the meaning of this Sutra is beyond conception and discussion. Likewise, the fruit resulting from receiving and practicing this Sutra is beyond conception and discussion.”",
  "At that time, the venerable Subhuti then asked the Buddha, “World-Honored One, may I ask you a question again? If sons or daughters of a good family want to develop the highest, most fulfilled and awakened mind, if they wish to attain the Highest Perfect Wisdom, what should they do to help quiet their drifting minds and master their thinking?”",
  "The Buddha replied:",
  "“Subhuti, a good son or daughter who wants to give rise to the highest, most fulfilled, and awakened mind must create this resolved attitude of mind: ‘I must help to lead all beings to the shore of awakening, but, after these beings have become liberated, in truth I know that not even a single being has been liberated.’ Why is this so? If a disciple cherishes the idea of a self, a person, a living being or a universal self, then that person is not an authentic disciple. Why? Because in fact there is no independently existing object of mind called the highest, most fulfilled, and awakened mind.”",
  "“What do you think, Subhuti? In ancient times, when the Buddha was living with Dipankara Buddha, did he attain anything called the highest, most fulfilled, and awakened mind?”",
  "“No, Most Honored One. According to what I understand from the teachings of the Buddha, there is no attaining of anything called the highest, most fulfilled, and awakened mind.”",
  "The Buddha said:",
  "“You are correct, Subhuti. In fact, there does not exist any so-called highest, most fulfilled, and awakened mind that the Buddha attains. Because if there had been any such thing, Dipankara Buddha would not have predicted of me, ‘In the future, you will come to be a Buddha known as The Most Honored One’. This prediction was made because there is, in fact, nothing to be attained. Someone would be mistaken to say that the Buddha has attained the highest, most fulfilled, and awakened mind because there is no such thing as a highest, most fulfilled, or awakened mind to be attained.”",
  "“Subhuti, a comparison can be made with the idea of a large human body. What would you understand me to mean if I spoke of a ‘large human body’?”",
  "“I would understand that the lord Buddha was speaking of a ‘large human body’ not as an arbitrary conception of its being, but as a series of words only. I would understand that the words carried merely an imaginary meaning. When the Buddha speaks of a large human body, he uses the words only as words.”",
  "“Subhuti, it is just the same when a disciple speaks of liberating numberless sentient beings. If they have in mind any arbitrary conception of sentient beings or of definite numbers, then they are unworthy of being called a disciple. Subhuti, my teachings reveal that even such a thing as is called a ‘disciple’ is non-existent. Furthermore, there is really nothing for a disciple to liberate.”",
  "“A true disciple knows that there is no such thing as a self, a person, a living being, or a universal self. A true disciple knows that all things are devoid of selfhood, devoid of any separate individuality.”",
  "To make this teaching even more emphatic, the lord Buddha continued,",
  "“If a disciple were to speak as follows, ‘I have to create a serene and beautiful Buddha field’, that person is not yet truly a disciple. Why? What the Buddha calls a ‘serene and beautiful Buddha field’ is not in fact a serene and beautiful Buddha field. And that is why it is called a serene and beautiful Buddha field. Subhuti, only a disciple who is wholly devoid of any conception of separate selfhood is worthy of being called a disciple.”",
  "The Buddha then asked Subhuti, “What do you think? Does the Buddha have human eyes?”",
  "Subhuti replied, “Yes, he has human eyes.”",
  "“Does he have the eyes of Enlightenment?”",
  "“Of course, the Buddha has the eyes of Enlightenment, otherwise he would not be the Buddha.”",
  "“Does the Buddha have the eyes of transcendent intelligence?”",
  "“Yes, the Buddha has the eyes of transcendent intelligence.”",
  "“Does the Buddha have the eyes of spiritual intuition?”",
  "“Yes, lord, the Buddha has the eyes of spiritual intuition.”",
  "“Does the Buddha have the eyes of love and compassion for all sentient beings?”",
  "Subhuti agreed and said, “Lord, you love all sentient life.”",
  "“What do you think, Subhuti? When I referred to the grains of sand in the river Ganges, did I assert that they were truly grains of sand?”",
  "“No blessed lord, you only spoke of them as grains of sand.”",
  "“Subhuti, if there were as many Ganges rivers as there are grains of sand in the river Ganges, and if there were as many buddhalands as there are grains of sand in all those innumerable rivers, would these buddhalands be considered numerous?”",
  "“Very numerous indeed, lord Buddha.”",
  "“Subhuti, I know the mind of every sentient being in all the host of universes, regardless of any modes of thought, conceptions or tendencies. For all modes, conceptions and tendencies of thought are not mind. And yet they are called ‘mind’. Why? It is impossible to retain a past thought, to seize a future thought, and even to hold onto a present thought.”",
  "The Buddha continued:",
  "“What do you think Subhuti? If a follower were to give away enough treasures to fill 3,000 universes, would a great blessing and merit incur to him or her?”",
  "Subhuti replied, “Honored one, such a follower would acquire considerable blessings and merit.”",
  "The lord Buddha said:",
  "“Subhuti, if such a blessing had any substantiality, if it were anything other than a figure of speech, the Most Honored One would not have used the words ‘blessings and merit’.”",
  "“Subhuti, what do you think, should one look for Buddha in his perfect physical body?”",
  "“No, Perfectly Enlightened One, one should not look for Buddha in his perfect physical body. Why? The Buddha has said that the perfect physical body is not the perfect physical body. Therefore it is called the perfect physical body.”",
  "“Subhuti, what do you think, should one look for Buddha in all his perfect appearances?”",
  "“No Most Honored One, one should not look for Buddha in all his perfect appearances. Why? The Buddha has said perfect appearances are not perfect appearances. Therefore they are called perfect appearances.”",
  "“Subhuti, do not maintain that the Buddha has this thought: ‘I have spoken spiritual truths.’ Do not think that way. Why? If someone says the Buddha has spoken spiritual truths, he slanders the Buddha due to his inability to understand what the Buddha teaches. Subhuti, as to speaking truth, no truth can be spoken. Therefore it is called ‘speaking truth’.”",
  "At that time Subhuti, the wise elder, addressed the Buddha, “Most Honored One, will there be living beings in the future who believe in this Sutra when they hear it?”",
  "The Buddha said:",
  "“The living beings to whom you refer are neither living beings nor not living beings. Why? Subhuti, all the different kinds of living beings the Buddha speaks of are not living beings. But they are referred to as living beings.”",
  "Subhuti again asked, “Blessed lord, when you attained complete Enlightenment, did you feel in your mind that nothing had been acquired?”",
  "The Buddha replied:",
  "“That is it exactly, Subhuti. When I attained total Enlightenment, I did not feel, as the mind feels, any arbitrary conception of spiritual truth, not even the slightest. Even the words ‘total Enlightenment’ are merely words, they are used merely as a figure of speech.”",
  "“Furthermore Subhuti, what I have attained in total Enlightenment is the same as what all others have attained. It is undifferentiated, regarded neither as a high state, nor a low state. It is wholly independent of any definite or arbitrary conceptions of an individual self, other selves, living beings, or a universal self.”",
  "“Subhuti, when someone is selflessly charitable, they should also practice being ethical by remembering that there is no distinction between one’s self and the selfhood of others. Thus one practices charity by giving not only gifts, but through kindness and sympathy. Practice kindness and charity without attachment and you can become fully enlightened.”",
  "“Subhuti, what I just said about kindness does not mean that when someone is being charitable they should hold onto arbitrary conceptions about kindness, for kindness is, after all, only a word and charity needs to be spontaneous and selfless, done without regard for appearances.”",
  "The Buddha continued:",
  "“Subhuti, if a person collected treasures as high as 3,000 of the highest mountains, and gave them all to others, their merit would be less than what would accrue to another person who simply observed and studied this Sutra and, out of kindness, explained it to others. The latter person would accumulate hundreds of times the merit, hundreds of thousands of millions of times the merit. There is no conceivable comparison.”",
  "“Subhuti, do not say that the Buddha has the idea, ‘I will lead all sentient beings to Nirvana.’ Do not think that way, Subhuti. Why? In truth there is not one single being for the Buddha to lead to Enlightenment. If the Buddha were to think there was, he would be caught in the idea of a self, a person, a living being, or a universal self. Subhuti, what the Buddha calls a self essentially has no self in the way that ordinary persons think there is a self. Subhuti, the Buddha does not regard anyone as an ordinary person. That is why he can speak of them as ordinary persons.”",
  "Then the Buddha inquired of Subhuti:",
  "“What do you think Subhuti? Is it possible to recognize the Buddha by the 32 physical marks?”",
  "Subhuti replied, “Yes, Most Honored One, the Buddha may thus be recognized.”",
  "“Subhuti, if that were true then Chakravartin, the mythological king who also had the 32 marks, would be called a Buddha.”",
  "Then Subhuti, realizing his error, said, “Most Honored One, now I realize that the Buddha cannot be recognized merely by his 32 physical marks of excellence.”",
  "The Buddha then said:",
  "“Should anyone, looking at an image or likeness of the Buddha, claim to know the Buddha and worship him, that person would be mistaken, not knowing the true Buddha.”",
  "“However, Subhuti, if you think that the Buddha realizes the highest, most fulfilled, and awakened mind and does not need to have all the marks, you are mistaken. Subhuti, do not think in that way. Do not think that when one gives rise to the highest, most fulfilled, and awakened mind, one needs to see all objects of mind as nonexistent, cut off from life. Please do not think in that way. One who gives rise to the highest, most fulfilled, and awakened mind does not contend that all objects of mind are nonexistent and cut off from life. That is not what I say.”",
  "The lord Buddha continued:",
  "“Subhuti, if someone gives treasures equal to the number of sands on the shores of the Ganges river, and if another, having realized the egolessness of all things, thereby understands selflessness, the latter would be more blessed than the one who practiced external charity. Why? Because great disciples do not see blessings and merit as a private possession, as something to be gained.”",
  "Subhuti inquired of the lord Buddha, “What do you mean ‘great disciples do not see blessings and merit as a private possession’?”",
  "The Buddha replied:",
  "“Because those blessings and merit have never been sought after by those great disciples, they do not see them as private possessions, but they see them as the common possession of all beings.”",
  "The Buddha said:",
  "“Subhuti, if any person were to say that the Buddha is now coming or going, or sitting up or lying down, they would not have understood the principle I have been teaching. Why? Because while the expression ‘Buddha’ means ‘he who has thus come, thus gone,’ the true Buddha is never coming from anywhere or going anywhere. The name ‘Buddha’ is merely an expression, a figure of speech.”",
  "The lord Buddha resumed:",
  "“Subhuti, if any good person, either man or woman, were to take 3,000 galaxies and grind them into microscopic powder and blow it into space, what do you think, would this powder have any individual existence?”",
  "Subhuti replied, “Yes, lord, as a microscopic powder blown into space, it might be said to have a relative existence, but as you use words, it has no existence. The words are used only as a figure of speech. Otherwise the words would imply a belief in the existence of matter as an independent and self-existent thing, which it is not.”",
  "“Furthermore, when the Most Honored One refers to the ‘3,000 galaxies,’ he could only do so as a figure of speech. Why? Because if the 3,000 galaxies really existed, their only reality would consist in their cosmic unity. Whether as microscopic powder or as galaxies, what does it matter? Only in the sense of the cosmic unity of ultimate being can the Buddha rightfully refer to it.”",
  "The lord Buddha was very pleased with this reply and said:",
  "“Subhuti, although ordinary people have always grasped after an arbitrary conception of matter and galaxies, the concept has no true basis; it is an illusion of the mortal mind. Even when it is referred to as ‘cosmic unity’ it is unthinkable and unknowable.”",
  "The lord Buddha continued:",
  "“If any person were to say that the Buddha, in his teachings, has constantly referred to himself, to other selves, to living beings, or to a universal self, what do you think, would that person have understood my meaning?”",
  "Subhuti replied, “No, blessed lord. That person would not have understood the meaning of your teachings. For when you refer to those things, you are not referring to their actual existence, you only use the words as figures of speech, as symbols. Only in that sense can words be used, for conceptions, ideas, limited truths, and spiritual truths have no more reality than have matter or phenomena.”",
  "Then the lord Buddha made his meaning even more emphatic by saying:",
  "“Subhuti, when people begin their practice of seeking to attaining total Enlightenment, they ought to see, to perceive, to know, to understand, and to realize that all things and all spiritual truths are no-things, and, therefore, they ought not to conceive within their minds any arbitrary conceptions whatsoever.”",
  "Buddha continued:",
  "“Subhuti, if anyone gave to the Buddha an immeasurable quantity of the seven treasures sufficient to fill the whole universe; and if another person, whether a man or woman, in seeking to attain complete Enlightenment were to earnestly and faithfully observe and study even a single section of this Sutra and explain it to others, the accumulated blessing and merit of that latter person would be far greater.”",
  "“Subhuti, how can one explain this Sutra to others without holding in mind any arbitrary conception of forms or phenomena or spiritual truths? It can only be done, Subhuti, by keeping the mind in perfect tranquility and free from any attachment to appearances.”",
  "“So I say to you –",
  "This is how to contemplate our conditioned existence in this fleeting world:”",
  "“Like a tiny drop of dew, or a bubble floating in a stream;",
  "Like a flash of lightning in a summer cloud,",
  "Or a flickering lamp, an illusion, a phantom, or a dream.”",
  "“So is all conditioned existence to be seen.”",
  "Thus spoke Buddha."
]
},{}],3:[function(require,module,exports){
var MarkovChain = require('markovchain');
var sutra = require('./diamond_sutra.json');
var text = sutra.join(' ');
const markov = new MarkovChain(text);

let ix = 0;

const src = ['*'];

function generateAndDisplayText() {
    let txt = ';';
    let gold = false;

    if ((ix > 1 && ix % 32) == 1 || Math.random() < 0.01) {
        txt = sutra[Math.floor(Math.random() * sutra.length)];
        gold = true;
    } else if (Math.random() < 0.80) {
        const n = Math.floor(Math.random() * 108);
        for (let i = 0; i < n; i++) {
            txt += src[Math.floor(Math.random() * src.length)];
            if (i % 32 == 0) {
                txt += ' ';
            }
        }
    } else {
        txt = markov.start('what').end(8 + Math.floor(Math.random() * 26)).process();
    }

    const txtElem = document.createElement('div');
    txtElem.classList.add('txt');
    if (gold) {
        txtElem.style.color = 'gold';
    }

    // Simulate typing effect
    const typingSpeed = 5; // milliseconds per character
    let charIndex = 0;

    function typeCharacter() {
        if (charIndex < txt.length) {
            txtElem.textContent += txt[charIndex];
            charIndex++;
            scrollToBottom();
            setTimeout(typeCharacter, typingSpeed);
        }
    }

    typeCharacter();

    document.getElementById('terminal').appendChild(txtElem);

    ix++;
}


function scrollToBottom() {
    var terminal = document.getElementById('terminal');
    terminal.scrollTop = terminal.scrollHeight;
}

window.addEventListener('keydown', function (event) {
    generateAndDisplayText();
});

document.getElementById('terminal').addEventListener('click', function (event) {
    generateAndDisplayText();
});

},{"./diamond_sutra.json":2,"markovchain":5}],4:[function(require,module,exports){

},{}],5:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var pickOneByWeight = require('pick-one-by-weight');

var isType = function isType(t) {
  return Object.prototype.toString.call(t).slice(8, -1).toLowerCase();
};

var MarkovChain = (function () {
  function MarkovChain(contents) {
    var normFn = arguments.length <= 1 || arguments[1] === undefined ? function (word) {
      return word.replace(/\.$/ig, '');
    } : arguments[1];

    _classCallCheck(this, MarkovChain);

    this.wordBank = Object.create(null);
    this.sentence = '';
    this._normalizeFn = normFn;
    this.parseBy = /(?:\.|\?|\n)/ig;
    this.parse(contents);
  }

  _createClass(MarkovChain, [{
    key: 'startFn',
    value: function startFn(wordList) {
      var k = Object.keys(wordList);
      var l = k.length;
      return k[~ ~(Math.random() * l)];
    }
  }, {
    key: 'endFn',
    value: function endFn() {
      return this.sentence.split(' ').length > 7;
    }
  }, {
    key: 'process',
    value: function process() {
      var curWord = this.startFn(this.wordBank);
      this.sentence = curWord;
      while (this.wordBank[curWord] && !this.endFn()) {
        curWord = pickOneByWeight(this.wordBank[curWord]);
        this.sentence += ' ' + curWord;
      }
      return this.sentence;
    }
  }, {
    key: 'parse',
    value: function parse() {
      var _this = this;

      var text = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
      var parseBy = arguments.length <= 1 || arguments[1] === undefined ? this.parseBy : arguments[1];

      text.split(parseBy).forEach(function (lines) {
        var words = lines.split(' ').filter(function (w) {
          return w.trim() !== '';
        });
        for (var i = 0; i < words.length - 1; i++) {
          var curWord = _this._normalize(words[i]);
          var nextWord = _this._normalize(words[i + 1]);

          if (!_this.wordBank[curWord]) {
            _this.wordBank[curWord] = Object.create(null);
          }
          if (!_this.wordBank[curWord][nextWord]) {
            _this.wordBank[curWord][nextWord] = 1;
          } else {
            _this.wordBank[curWord][nextWord] += 1;
          }
        }
      });
      return this;
    }
  }, {
    key: 'start',
    value: function start(fnStr) {
      var startType = isType(fnStr);
      if (startType === 'string') {
        this.startFn = function () {
          return fnStr;
        };
      } else if (startType === 'function') {
        this.startFn = function (wordList) {
          return fnStr(wordList);
        };
      } else {
        throw new Error('Must pass a function, or string into start()');
      }
      return this;
    }
  }, {
    key: 'end',
    value: function end(fnStrOrNum) {
      var _this2 = this;

      var endType = isType(fnStrOrNum);
      var self = this;

      if (endType === 'function') {
        this.endFn = function () {
          return fnStrOrNum(_this2.sentence);
        };
      } else if (endType === 'string') {
        this.endFn = function () {
          return _this2.sentence.split(' ').slice(-1)[0] === fnStrOrNum;
        };
      } else if (endType === 'number' || fnStrOrNum === undefined) {
        fnStrOrNum = fnStrOrNum || Infinity;
        this.endFn = function () {
          return self.sentence.split(' ').length > fnStrOrNum;
        };
      } else {
        throw new Error('Must pass a function, string or number into end()');
      }
      return this;
    }
  }, {
    key: '_normalize',
    value: function _normalize(word) {
      return this._normalizeFn(word);
    }
  }, {
    key: 'normalize',
    value: function normalize(fn) {
      this._normalizeFn = fn;
      return this;
    }
  }], [{
    key: 'VERSION',
    get: function get() {
      return require('../package').version;
    }
  }, {
    key: 'MarkovChain',
    get: function get() {
      // load older MarkovChain
      return require('../older/index.js').MarkovChain;
    }
  }]);

  return MarkovChain;
})();

module.exports = MarkovChain;
},{"../older/index.js":6,"../package":7,"pick-one-by-weight":9}],6:[function(require,module,exports){
(function (process){(function (){
'use strict';

var async = require('async')
  , fs = require('fs')
  , path = require('path')
  , pickOneByWeight = require('pick-one-by-weight')
  , isType
  , kindaFile
  , MarkovChain

isType = function(t) {
  return Object.prototype.toString.call(t).slice(8, -1).toLowerCase()
}

kindaFile = function(file) {
  return file.indexOf('.' + path.sep) === 0 || file.indexOf(path.sep) === 0
}

MarkovChain = function(args) {
  if (!args) { args = {} }
  this.wordBank = {}
  this.sentence = ''
  this.files = []
  if (args.files) {
    return this.use(args.files)
  }

  this.startFn = function(wordList) {
    var k = Object.keys(wordList)
    var l = k.length

    return k[~~(Math.random()*l)]
  }

  this.endFn = function() {
    return this.sentence.split(' ').length > 7
  }

  return this
}

MarkovChain.prototype.VERSION = require('../package').version

MarkovChain.prototype.use = function(files) {
  if (isType(files) === 'array') {
    this.files = files
  }
  else if (isType(files) === 'string') {
    this.files = [files]
  }
  else {
    throw new Error('Need to pass a string or array for use()')
  }
  return this
}

MarkovChain.prototype.readFile = function(file) {
  return function(callback) {
    fs.readFile(file, 'utf8', function(err, data) {
      if (err) {
        // if the file does not exist,
        // if `file` starts with ./ or /, assuming trying to be a file
        // if `file` has a '.', and the string after that has no space, assume file
        if (err.code === 'ENOENT' && !kindaFile(file)) {
          return callback(null, file);
        }
        return callback(err)
      }
      process.nextTick(function() { callback(null, data) })
    })
  }
}

MarkovChain.prototype.countTotal = function(word) {
  var total = 0
    , prop

  for (prop in this.wordBank[word]) {
    if (this.wordBank[word].hasOwnProperty(prop)) {
      total += this.wordBank[word][prop]
    }
  }
  return total
}

MarkovChain.prototype.process = function(callback) {
  var readFiles = []

  this.files.forEach(function(file) {
    readFiles.push(this.readFile(file))
  }.bind(this))

  async.parallel(readFiles, function(err, retFiles) {
    var words
      , curWord
    this.parseFile(retFiles.toString())

    curWord = this.startFn(this.wordBank)

    this.sentence = curWord

    while (this.wordBank[curWord] && !this.endFn()) {
      curWord = pickOneByWeight(this.wordBank[curWord])
      this.sentence += ' ' + curWord
    }
    callback(null, this.sentence.trim())

  }.bind(this))

  return this
}

MarkovChain.prototype.parseFile = function(file) {
  // splits sentences based on either an end line
  // or a period (followed by a space)
  file.split(/(?:\. |\n)/ig).forEach(function(lines) {
    var curWord
      , i
      , nextWord
      , words

    words = lines.split(' ').filter(function(w) { return (w.trim() !== '') })
    for (i = 0; i < words.length - 1; i++) {
      curWord = this.normalize(words[i])
      nextWord = this.normalize(words[i + 1])
      if (!this.wordBank[curWord]) {
        this.wordBank[curWord] = {}
      }
      if (!this.wordBank[curWord][nextWord]) {
        this.wordBank[curWord][nextWord] = 1
      }
      else {
        this.wordBank[curWord][nextWord] += 1
      }
    }
  }.bind(this))
}

MarkovChain.prototype.start = function(fnStr) {
  var startType = isType(fnStr)
  if (startType === 'string') {
    this.startFn = function() {
      return fnStr
    }
  }
  else if (startType === 'function') {
    this.startFn = function(wordList) {
      return fnStr(wordList)
    }
  }
  else {
    throw new Error('Must pass a function, or string into start()')
  }
  return this
}

MarkovChain.prototype.end = function(fnStrOrNum) {
  var endType = isType(fnStrOrNum)
  var self = this;

  if (endType === 'function') {
    this.endFn = function() { return fnStrOrNum(this.sentence) }
  }
  else if (endType === 'string') {
    this.endFn = function() {
      return self.sentence.split(' ').slice(-1)[0] === fnStrOrNum
    }
  }
  else if (endType === 'number' || fnStrOrNum === undefined) {
    fnStrOrNum = fnStrOrNum || Infinity
    this.endFn = function() { return self.sentence.split(' ').length > fnStrOrNum }
  }
  else {
    throw new Error('Must pass a function, string or number into end()')
  }
  return this
}

MarkovChain.prototype.normalize = function(word) {
  return word.replace(/\.$/ig, '')
}

module.exports.MarkovChain = MarkovChain

}).call(this)}).call(this,require('_process'))

},{"../package":7,"_process":10,"async":1,"fs":4,"path":8,"pick-one-by-weight":9}],7:[function(require,module,exports){
module.exports={
  "name": "markovchain",
  "version": "1.0.2",
  "description": "generates a markov chain of words based on input files",
  "main": "lib/index.js",
  "directories": {
    "test": "test"
  },
  "scripts": {
    "test": "mocha test/test*.js",
    "babel-watch": "babel src --watch --out-dir lib",
    "compile": "babel src --out-dir lib",
    "preversion": "npm test",
    "prepublish": "npm run compile && npm test",
    "postpublish": "rm -rf ./lib/*.js"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/swang/markovchain"
  },
  "keywords": [
    "markov chain",
    "markov"
  ],
  "dependencies": {
    "pick-one-by-weight": "~1.0.0"
  },
  "devDependencies": {
    "babel": "~5.8.23",
    "chai": "~3.4.1",
    "mocha": "~2.3.4"
  },
  "author": "Shuan Wang",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/swang/markovchain/issues"
  },
  "engines": {
    "node": ">=0.8"
  }
}

},{}],8:[function(require,module,exports){
(function (process){(function (){
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;

}).call(this)}).call(this,require('_process'))

},{"_process":10}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = pickOneByWeight;

function pickOneByWeight(anObj) {
  var _keys = Object.keys(anObj);
  var sum = _keys.reduce(function (p, c) {
    return p + anObj[c];
  }, 0);
  if (!Number.isFinite(sum)) {
    throw new Error("All values in object must be a numeric value");
  }
  var choose = ~ ~(Math.random() * sum);
  for (var i = 0, count = 0; i < _keys.length; i++) {
    count += anObj[_keys[i]];
    if (count > choose) {
      return _keys[i];
    }
  }
}

module.exports = exports["default"];
},{}],10:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],11:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)

},{"process/browser.js":10,"timers":11}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvYXN5bmMvZGlzdC9hc3luYy5qcyIsImRpYW1vbmRfc3V0cmEuanNvbiIsImluZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIm5vZGVfbW9kdWxlcy9tYXJrb3ZjaGFpbi9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbWFya292Y2hhaW4vb2xkZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbWFya292Y2hhaW4vcGFja2FnZS5qc29uIiwibm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9waWNrLW9uZS1ieS13ZWlnaHQvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy90aW1lcnMtYnJvd3NlcmlmeS9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzM2TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN2TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2poQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gICAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG4gICAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KSA6XG4gICAgKGZhY3RvcnkoKGdsb2JhbC5hc3luYyA9IHt9KSkpO1xufSh0aGlzLCAoZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGNvbnRpbnVhdGlvbiBmdW5jdGlvbiB3aXRoIHNvbWUgYXJndW1lbnRzIGFscmVhZHkgYXBwbGllZC5cbiAgICAgKlxuICAgICAqIFVzZWZ1bCBhcyBhIHNob3J0aGFuZCB3aGVuIGNvbWJpbmVkIHdpdGggb3RoZXIgY29udHJvbCBmbG93IGZ1bmN0aW9ucy4gQW55XG4gICAgICogYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgcmV0dXJuZWQgZnVuY3Rpb24gYXJlIGFkZGVkIHRvIHRoZSBhcmd1bWVudHNcbiAgICAgKiBvcmlnaW5hbGx5IHBhc3NlZCB0byBhcHBseS5cbiAgICAgKlxuICAgICAqIEBuYW1lIGFwcGx5XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6VXRpbHNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGNhdGVnb3J5IFV0aWxcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiAtIFRoZSBmdW5jdGlvbiB5b3Ugd2FudCB0byBldmVudHVhbGx5IGFwcGx5IGFsbFxuICAgICAqIGFyZ3VtZW50cyB0by4gSW52b2tlcyB3aXRoIChhcmd1bWVudHMuLi4pLlxuICAgICAqIEBwYXJhbSB7Li4uKn0gYXJndW1lbnRzLi4uIC0gQW55IG51bWJlciBvZiBhcmd1bWVudHMgdG8gYXV0b21hdGljYWxseSBhcHBseVxuICAgICAqIHdoZW4gdGhlIGNvbnRpbnVhdGlvbiBpcyBjYWxsZWQuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSB0aGUgcGFydGlhbGx5LWFwcGxpZWQgZnVuY3Rpb25cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogLy8gdXNpbmcgYXBwbHlcbiAgICAgKiBhc3luYy5wYXJhbGxlbChbXG4gICAgICogICAgIGFzeW5jLmFwcGx5KGZzLndyaXRlRmlsZSwgJ3Rlc3RmaWxlMScsICd0ZXN0MScpLFxuICAgICAqICAgICBhc3luYy5hcHBseShmcy53cml0ZUZpbGUsICd0ZXN0ZmlsZTInLCAndGVzdDInKVxuICAgICAqIF0pO1xuICAgICAqXG4gICAgICpcbiAgICAgKiAvLyB0aGUgc2FtZSBwcm9jZXNzIHdpdGhvdXQgdXNpbmcgYXBwbHlcbiAgICAgKiBhc3luYy5wYXJhbGxlbChbXG4gICAgICogICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICBmcy53cml0ZUZpbGUoJ3Rlc3RmaWxlMScsICd0ZXN0MScsIGNhbGxiYWNrKTtcbiAgICAgKiAgICAgfSxcbiAgICAgKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIGZzLndyaXRlRmlsZSgndGVzdGZpbGUyJywgJ3Rlc3QyJywgY2FsbGJhY2spO1xuICAgICAqICAgICB9XG4gICAgICogXSk7XG4gICAgICpcbiAgICAgKiAvLyBJdCdzIHBvc3NpYmxlIHRvIHBhc3MgYW55IG51bWJlciBvZiBhZGRpdGlvbmFsIGFyZ3VtZW50cyB3aGVuIGNhbGxpbmcgdGhlXG4gICAgICogLy8gY29udGludWF0aW9uOlxuICAgICAqXG4gICAgICogbm9kZT4gdmFyIGZuID0gYXN5bmMuYXBwbHkoc3lzLnB1dHMsICdvbmUnKTtcbiAgICAgKiBub2RlPiBmbigndHdvJywgJ3RocmVlJyk7XG4gICAgICogb25lXG4gICAgICogdHdvXG4gICAgICogdGhyZWVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBhcHBseShmbiwgLi4uYXJncykge1xuICAgICAgICByZXR1cm4gKC4uLmNhbGxBcmdzKSA9PiBmbiguLi5hcmdzLC4uLmNhbGxBcmdzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbml0aWFsUGFyYW1zIChmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKC4uLmFyZ3MvKiwgY2FsbGJhY2sqLykge1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiBmbi5jYWxsKHRoaXMsIGFyZ3MsIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZmlsZSAqL1xuXG4gICAgdmFyIGhhc1F1ZXVlTWljcm90YXNrID0gdHlwZW9mIHF1ZXVlTWljcm90YXNrID09PSAnZnVuY3Rpb24nICYmIHF1ZXVlTWljcm90YXNrO1xuICAgIHZhciBoYXNTZXRJbW1lZGlhdGUgPSB0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSAnZnVuY3Rpb24nICYmIHNldEltbWVkaWF0ZTtcbiAgICB2YXIgaGFzTmV4dFRpY2sgPSB0eXBlb2YgcHJvY2VzcyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHByb2Nlc3MubmV4dFRpY2sgPT09ICdmdW5jdGlvbic7XG5cbiAgICBmdW5jdGlvbiBmYWxsYmFjayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB3cmFwKGRlZmVyKSB7XG4gICAgICAgIHJldHVybiAoZm4sIC4uLmFyZ3MpID0+IGRlZmVyKCgpID0+IGZuKC4uLmFyZ3MpKTtcbiAgICB9XG5cbiAgICB2YXIgX2RlZmVyO1xuXG4gICAgaWYgKGhhc1F1ZXVlTWljcm90YXNrKSB7XG4gICAgICAgIF9kZWZlciA9IHF1ZXVlTWljcm90YXNrO1xuICAgIH0gZWxzZSBpZiAoaGFzU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIF9kZWZlciA9IHNldEltbWVkaWF0ZTtcbiAgICB9IGVsc2UgaWYgKGhhc05leHRUaWNrKSB7XG4gICAgICAgIF9kZWZlciA9IHByb2Nlc3MubmV4dFRpY2s7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgX2RlZmVyID0gZmFsbGJhY2s7XG4gICAgfVxuXG4gICAgdmFyIHNldEltbWVkaWF0ZSQxID0gd3JhcChfZGVmZXIpO1xuXG4gICAgLyoqXG4gICAgICogVGFrZSBhIHN5bmMgZnVuY3Rpb24gYW5kIG1ha2UgaXQgYXN5bmMsIHBhc3NpbmcgaXRzIHJldHVybiB2YWx1ZSB0byBhXG4gICAgICogY2FsbGJhY2suIFRoaXMgaXMgdXNlZnVsIGZvciBwbHVnZ2luZyBzeW5jIGZ1bmN0aW9ucyBpbnRvIGEgd2F0ZXJmYWxsLFxuICAgICAqIHNlcmllcywgb3Igb3RoZXIgYXN5bmMgZnVuY3Rpb25zLiBBbnkgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgZ2VuZXJhdGVkXG4gICAgICogZnVuY3Rpb24gd2lsbCBiZSBwYXNzZWQgdG8gdGhlIHdyYXBwZWQgZnVuY3Rpb24gKGV4Y2VwdCBmb3IgdGhlIGZpbmFsXG4gICAgICogY2FsbGJhY2sgYXJndW1lbnQpLiBFcnJvcnMgdGhyb3duIHdpbGwgYmUgcGFzc2VkIHRvIHRoZSBjYWxsYmFjay5cbiAgICAgKlxuICAgICAqIElmIHRoZSBmdW5jdGlvbiBwYXNzZWQgdG8gYGFzeW5jaWZ5YCByZXR1cm5zIGEgUHJvbWlzZSwgdGhhdCBwcm9taXNlcydzXG4gICAgICogcmVzb2x2ZWQvcmVqZWN0ZWQgc3RhdGUgd2lsbCBiZSB1c2VkIHRvIGNhbGwgdGhlIGNhbGxiYWNrLCByYXRoZXIgdGhhbiBzaW1wbHlcbiAgICAgKiB0aGUgc3luY2hyb25vdXMgcmV0dXJuIHZhbHVlLlxuICAgICAqXG4gICAgICogVGhpcyBhbHNvIG1lYW5zIHlvdSBjYW4gYXN5bmNpZnkgRVMyMDE3IGBhc3luY2AgZnVuY3Rpb25zLlxuICAgICAqXG4gICAgICogQG5hbWUgYXN5bmNpZnlcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpVdGlsc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAYWxpYXMgd3JhcFN5bmNcbiAgICAgKiBAY2F0ZWdvcnkgVXRpbFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgLSBUaGUgc3luY2hyb25vdXMgZnVuY3Rpb24sIG9yIFByb21pc2UtcmV0dXJuaW5nXG4gICAgICogZnVuY3Rpb24gdG8gY29udmVydCB0byBhbiB7QGxpbmsgQXN5bmNGdW5jdGlvbn0uXG4gICAgICogQHJldHVybnMge0FzeW5jRnVuY3Rpb259IEFuIGFzeW5jaHJvbm91cyB3cmFwcGVyIG9mIHRoZSBgZnVuY2AuIFRvIGJlXG4gICAgICogaW52b2tlZCB3aXRoIGAoYXJncy4uLiwgY2FsbGJhY2spYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogLy8gcGFzc2luZyBhIHJlZ3VsYXIgc3luY2hyb25vdXMgZnVuY3Rpb25cbiAgICAgKiBhc3luYy53YXRlcmZhbGwoW1xuICAgICAqICAgICBhc3luYy5hcHBseShmcy5yZWFkRmlsZSwgZmlsZW5hbWUsIFwidXRmOFwiKSxcbiAgICAgKiAgICAgYXN5bmMuYXN5bmNpZnkoSlNPTi5wYXJzZSksXG4gICAgICogICAgIGZ1bmN0aW9uIChkYXRhLCBuZXh0KSB7XG4gICAgICogICAgICAgICAvLyBkYXRhIGlzIHRoZSByZXN1bHQgb2YgcGFyc2luZyB0aGUgdGV4dC5cbiAgICAgKiAgICAgICAgIC8vIElmIHRoZXJlIHdhcyBhIHBhcnNpbmcgZXJyb3IsIGl0IHdvdWxkIGhhdmUgYmVlbiBjYXVnaHQuXG4gICAgICogICAgIH1cbiAgICAgKiBdLCBjYWxsYmFjayk7XG4gICAgICpcbiAgICAgKiAvLyBwYXNzaW5nIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgcHJvbWlzZVxuICAgICAqIGFzeW5jLndhdGVyZmFsbChbXG4gICAgICogICAgIGFzeW5jLmFwcGx5KGZzLnJlYWRGaWxlLCBmaWxlbmFtZSwgXCJ1dGY4XCIpLFxuICAgICAqICAgICBhc3luYy5hc3luY2lmeShmdW5jdGlvbiAoY29udGVudHMpIHtcbiAgICAgKiAgICAgICAgIHJldHVybiBkYi5tb2RlbC5jcmVhdGUoY29udGVudHMpO1xuICAgICAqICAgICB9KSxcbiAgICAgKiAgICAgZnVuY3Rpb24gKG1vZGVsLCBuZXh0KSB7XG4gICAgICogICAgICAgICAvLyBgbW9kZWxgIGlzIHRoZSBpbnN0YW50aWF0ZWQgbW9kZWwgb2JqZWN0LlxuICAgICAqICAgICAgICAgLy8gSWYgdGhlcmUgd2FzIGFuIGVycm9yLCB0aGlzIGZ1bmN0aW9uIHdvdWxkIGJlIHNraXBwZWQuXG4gICAgICogICAgIH1cbiAgICAgKiBdLCBjYWxsYmFjayk7XG4gICAgICpcbiAgICAgKiAvLyBlczIwMTcgZXhhbXBsZSwgdGhvdWdoIGBhc3luY2lmeWAgaXMgbm90IG5lZWRlZCBpZiB5b3VyIEpTIGVudmlyb25tZW50XG4gICAgICogLy8gc3VwcG9ydHMgYXN5bmMgZnVuY3Rpb25zIG91dCBvZiB0aGUgYm94XG4gICAgICogdmFyIHEgPSBhc3luYy5xdWV1ZShhc3luYy5hc3luY2lmeShhc3luYyBmdW5jdGlvbihmaWxlKSB7XG4gICAgICogICAgIHZhciBpbnRlcm1lZGlhdGVTdGVwID0gYXdhaXQgcHJvY2Vzc0ZpbGUoZmlsZSk7XG4gICAgICogICAgIHJldHVybiBhd2FpdCBzb21lUHJvbWlzZShpbnRlcm1lZGlhdGVTdGVwKVxuICAgICAqIH0pKTtcbiAgICAgKlxuICAgICAqIHEucHVzaChmaWxlcyk7XG4gICAgICovXG4gICAgZnVuY3Rpb24gYXN5bmNpZnkoZnVuYykge1xuICAgICAgICBpZiAoaXNBc3luYyhmdW5jKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICguLi5hcmdzLyosIGNhbGxiYWNrKi8pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IGZ1bmMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZVByb21pc2UocHJvbWlzZSwgY2FsbGJhY2spXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5pdGlhbFBhcmFtcyhmdW5jdGlvbiAoYXJncywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaWYgcmVzdWx0IGlzIFByb21pc2Ugb2JqZWN0XG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIHR5cGVvZiByZXN1bHQudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVQcm9taXNlKHJlc3VsdCwgY2FsbGJhY2spXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZVByb21pc2UocHJvbWlzZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbih2YWx1ZSA9PiB7XG4gICAgICAgICAgICBpbnZva2VDYWxsYmFjayhjYWxsYmFjaywgbnVsbCwgdmFsdWUpO1xuICAgICAgICB9LCBlcnIgPT4ge1xuICAgICAgICAgICAgaW52b2tlQ2FsbGJhY2soY2FsbGJhY2ssIGVyciAmJiBlcnIubWVzc2FnZSA/IGVyciA6IG5ldyBFcnJvcihlcnIpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW52b2tlQ2FsbGJhY2soY2FsbGJhY2ssIGVycm9yLCB2YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIHZhbHVlKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBzZXRJbW1lZGlhdGUkMShlID0+IHsgdGhyb3cgZSB9LCBlcnIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNBc3luYyhmbikge1xuICAgICAgICByZXR1cm4gZm5bU3ltYm9sLnRvU3RyaW5nVGFnXSA9PT0gJ0FzeW5jRnVuY3Rpb24nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQXN5bmNHZW5lcmF0b3IoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZuW1N5bWJvbC50b1N0cmluZ1RhZ10gPT09ICdBc3luY0dlbmVyYXRvcic7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNBc3luY0l0ZXJhYmxlKG9iaikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9ialtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPT09ICdmdW5jdGlvbic7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gd3JhcEFzeW5jKGFzeW5jRm4pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhc3luY0ZuICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ2V4cGVjdGVkIGEgZnVuY3Rpb24nKVxuICAgICAgICByZXR1cm4gaXNBc3luYyhhc3luY0ZuKSA/IGFzeW5jaWZ5KGFzeW5jRm4pIDogYXN5bmNGbjtcbiAgICB9XG5cbiAgICAvLyBjb25kaXRpb25hbGx5IHByb21pc2lmeSBhIGZ1bmN0aW9uLlxuICAgIC8vIG9ubHkgcmV0dXJuIGEgcHJvbWlzZSBpZiBhIGNhbGxiYWNrIGlzIG9taXR0ZWRcbiAgICBmdW5jdGlvbiBhd2FpdGlmeSAoYXN5bmNGbiwgYXJpdHkgPSBhc3luY0ZuLmxlbmd0aCkge1xuICAgICAgICBpZiAoIWFyaXR5KSB0aHJvdyBuZXcgRXJyb3IoJ2FyaXR5IGlzIHVuZGVmaW5lZCcpXG4gICAgICAgIGZ1bmN0aW9uIGF3YWl0YWJsZSAoLi4uYXJncykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmdzW2FyaXR5IC0gMV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXN5bmNGbi5hcHBseSh0aGlzLCBhcmdzKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIGFyZ3NbYXJpdHkgLSAxXSA9IChlcnIsIC4uLmNiQXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShjYkFyZ3MubGVuZ3RoID4gMSA/IGNiQXJncyA6IGNiQXJnc1swXSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBhc3luY0ZuLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhd2FpdGFibGVcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhcHBseUVhY2ggKGVhY2hmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gYXBwbHlFYWNoKGZucywgLi4uY2FsbEFyZ3MpIHtcbiAgICAgICAgICAgIGNvbnN0IGdvID0gYXdhaXRpZnkoZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHJldHVybiBlYWNoZm4oZm5zLCAoZm4sIGNiKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHdyYXBBc3luYyhmbikuYXBwbHkodGhhdCwgY2FsbEFyZ3MuY29uY2F0KGNiKSk7XG4gICAgICAgICAgICAgICAgfSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZ287XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2FzeW5jTWFwKGVhY2hmbiwgYXJyLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICB2YXIgY291bnRlciA9IDA7XG4gICAgICAgIHZhciBfaXRlcmF0ZWUgPSB3cmFwQXN5bmMoaXRlcmF0ZWUpO1xuXG4gICAgICAgIHJldHVybiBlYWNoZm4oYXJyLCAodmFsdWUsIF8sIGl0ZXJDYikgPT4ge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gY291bnRlcisrO1xuICAgICAgICAgICAgX2l0ZXJhdGVlKHZhbHVlLCAoZXJyLCB2KSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzdWx0c1tpbmRleF0gPSB2O1xuICAgICAgICAgICAgICAgIGl0ZXJDYihlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGVyciA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdHMpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0FycmF5TGlrZSh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdmFsdWUgJiZcbiAgICAgICAgICAgIHR5cGVvZiB2YWx1ZS5sZW5ndGggPT09ICdudW1iZXInICYmXG4gICAgICAgICAgICB2YWx1ZS5sZW5ndGggPj0gMCAmJlxuICAgICAgICAgICAgdmFsdWUubGVuZ3RoICUgMSA9PT0gMDtcbiAgICB9XG5cbiAgICAvLyBBIHRlbXBvcmFyeSB2YWx1ZSB1c2VkIHRvIGlkZW50aWZ5IGlmIHRoZSBsb29wIHNob3VsZCBiZSBicm9rZW4uXG4gICAgLy8gU2VlICMxMDY0LCAjMTI5M1xuICAgIGNvbnN0IGJyZWFrTG9vcCA9IHt9O1xuXG4gICAgZnVuY3Rpb24gb25jZShmbikge1xuICAgICAgICBmdW5jdGlvbiB3cmFwcGVyICguLi5hcmdzKSB7XG4gICAgICAgICAgICBpZiAoZm4gPT09IG51bGwpIHJldHVybjtcbiAgICAgICAgICAgIHZhciBjYWxsRm4gPSBmbjtcbiAgICAgICAgICAgIGZuID0gbnVsbDtcbiAgICAgICAgICAgIGNhbGxGbi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBPYmplY3QuYXNzaWduKHdyYXBwZXIsIGZuKTtcbiAgICAgICAgcmV0dXJuIHdyYXBwZXJcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRJdGVyYXRvciAoY29sbCkge1xuICAgICAgICByZXR1cm4gY29sbFtTeW1ib2wuaXRlcmF0b3JdICYmIGNvbGxbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUFycmF5SXRlcmF0b3IoY29sbCkge1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB2YXIgbGVuID0gY29sbC5sZW5ndGg7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICAgICAgcmV0dXJuICsraSA8IGxlbiA/IHt2YWx1ZTogY29sbFtpXSwga2V5OiBpfSA6IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVFUzIwMTVJdGVyYXRvcihpdGVyYXRvcikge1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgICAgaWYgKGl0ZW0uZG9uZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIHJldHVybiB7dmFsdWU6IGl0ZW0udmFsdWUsIGtleTogaX07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVPYmplY3RJdGVyYXRvcihvYmopIHtcbiAgICAgICAgdmFyIG9rZXlzID0gb2JqID8gT2JqZWN0LmtleXMob2JqKSA6IFtdO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB2YXIgbGVuID0gb2tleXMubGVuZ3RoO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBva2V5c1srK2ldO1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ19fcHJvdG9fXycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGkgPCBsZW4gPyB7dmFsdWU6IG9ialtrZXldLCBrZXl9IDogbnVsbDtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVJdGVyYXRvcihjb2xsKSB7XG4gICAgICAgIGlmIChpc0FycmF5TGlrZShjb2xsKSkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUFycmF5SXRlcmF0b3IoY29sbCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaXRlcmF0b3IgPSBnZXRJdGVyYXRvcihjb2xsKTtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yID8gY3JlYXRlRVMyMDE1SXRlcmF0b3IoaXRlcmF0b3IpIDogY3JlYXRlT2JqZWN0SXRlcmF0b3IoY29sbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25seU9uY2UoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgICAgICBpZiAoZm4gPT09IG51bGwpIHRocm93IG5ldyBFcnJvcihcIkNhbGxiYWNrIHdhcyBhbHJlYWR5IGNhbGxlZC5cIik7XG4gICAgICAgICAgICB2YXIgY2FsbEZuID0gZm47XG4gICAgICAgICAgICBmbiA9IG51bGw7XG4gICAgICAgICAgICBjYWxsRm4uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gZm9yIGFzeW5jIGdlbmVyYXRvcnNcbiAgICBmdW5jdGlvbiBhc3luY0VhY2hPZkxpbWl0KGdlbmVyYXRvciwgbGltaXQsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgZG9uZSA9IGZhbHNlO1xuICAgICAgICBsZXQgY2FuY2VsZWQgPSBmYWxzZTtcbiAgICAgICAgbGV0IGF3YWl0aW5nID0gZmFsc2U7XG4gICAgICAgIGxldCBydW5uaW5nID0gMDtcbiAgICAgICAgbGV0IGlkeCA9IDA7XG5cbiAgICAgICAgZnVuY3Rpb24gcmVwbGVuaXNoKCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygncmVwbGVuaXNoJylcbiAgICAgICAgICAgIGlmIChydW5uaW5nID49IGxpbWl0IHx8IGF3YWl0aW5nIHx8IGRvbmUpIHJldHVyblxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygncmVwbGVuaXNoIGF3YWl0aW5nJylcbiAgICAgICAgICAgIGF3YWl0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIGdlbmVyYXRvci5uZXh0KCkudGhlbigoe3ZhbHVlLCBkb25lOiBpdGVyRG9uZX0pID0+IHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdnb3QgdmFsdWUnLCB2YWx1ZSlcbiAgICAgICAgICAgICAgICBpZiAoY2FuY2VsZWQgfHwgZG9uZSkgcmV0dXJuXG4gICAgICAgICAgICAgICAgYXdhaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAoaXRlckRvbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChydW5uaW5nIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2RvbmUgbmV4dENiJylcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcnVubmluZysrO1xuICAgICAgICAgICAgICAgIGl0ZXJhdGVlKHZhbHVlLCBpZHgsIGl0ZXJhdGVlQ2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIGlkeCsrO1xuICAgICAgICAgICAgICAgIHJlcGxlbmlzaCgpO1xuICAgICAgICAgICAgfSkuY2F0Y2goaGFuZGxlRXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXRlcmF0ZWVDYWxsYmFjayhlcnIsIHJlc3VsdCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnaXRlcmF0ZWVDYWxsYmFjaycpXG4gICAgICAgICAgICBydW5uaW5nIC09IDE7XG4gICAgICAgICAgICBpZiAoY2FuY2VsZWQpIHJldHVyblxuICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIGhhbmRsZUVycm9yKGVycilcblxuICAgICAgICAgICAgaWYgKGVyciA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBkb25lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYW5jZWxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IGJyZWFrTG9vcCB8fCAoZG9uZSAmJiBydW5uaW5nIDw9IDApKSB7XG4gICAgICAgICAgICAgICAgZG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnZG9uZSBpdGVyQ2InKVxuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcGxlbmlzaCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlRXJyb3IoZXJyKSB7XG4gICAgICAgICAgICBpZiAoY2FuY2VsZWQpIHJldHVyblxuICAgICAgICAgICAgYXdhaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcGxlbmlzaCgpO1xuICAgIH1cblxuICAgIHZhciBlYWNoT2ZMaW1pdCA9IChsaW1pdCkgPT4ge1xuICAgICAgICByZXR1cm4gKG9iaiwgaXRlcmF0ZWUsIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2spO1xuICAgICAgICAgICAgaWYgKGxpbWl0IDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignY29uY3VycmVuY3kgbGltaXQgY2Fubm90IGJlIGxlc3MgdGhhbiAxJylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghb2JqKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzQXN5bmNHZW5lcmF0b3Iob2JqKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhc3luY0VhY2hPZkxpbWl0KG9iaiwgbGltaXQsIGl0ZXJhdGVlLCBjYWxsYmFjaylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc0FzeW5jSXRlcmFibGUob2JqKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhc3luY0VhY2hPZkxpbWl0KG9ialtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKSwgbGltaXQsIGl0ZXJhdGVlLCBjYWxsYmFjaylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBuZXh0RWxlbSA9IGNyZWF0ZUl0ZXJhdG9yKG9iaik7XG4gICAgICAgICAgICB2YXIgZG9uZSA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGNhbmNlbGVkID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgcnVubmluZyA9IDA7XG4gICAgICAgICAgICB2YXIgbG9vcGluZyA9IGZhbHNlO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBpdGVyYXRlZUNhbGxiYWNrKGVyciwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FuY2VsZWQpIHJldHVyblxuICAgICAgICAgICAgICAgIHJ1bm5pbmcgLT0gMTtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChlcnIgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBjYW5jZWxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHZhbHVlID09PSBicmVha0xvb3AgfHwgKGRvbmUgJiYgcnVubmluZyA8PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICBkb25lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmICghbG9vcGluZykge1xuICAgICAgICAgICAgICAgICAgICByZXBsZW5pc2goKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlcGxlbmlzaCAoKSB7XG4gICAgICAgICAgICAgICAgbG9vcGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHJ1bm5pbmcgPCBsaW1pdCAmJiAhZG9uZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZWxlbSA9IG5leHRFbGVtKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChydW5uaW5nIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBydW5uaW5nICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGl0ZXJhdGVlKGVsZW0udmFsdWUsIGVsZW0ua2V5LCBvbmx5T25jZShpdGVyYXRlZUNhbGxiYWNrKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxvb3BpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVwbGVuaXNoKCk7XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBzYW1lIGFzIFtgZWFjaE9mYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmVhY2hPZn0gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhXG4gICAgICogdGltZS5cbiAgICAgKlxuICAgICAqIEBuYW1lIGVhY2hPZkxpbWl0XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMuZWFjaE9mXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZWFjaE9mfVxuICAgICAqIEBhbGlhcyBmb3JFYWNoT2ZMaW1pdFxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxBc3luY0l0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxpbWl0IC0gVGhlIG1heGltdW0gbnVtYmVyIG9mIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoXG4gICAgICogaXRlbSBpbiBgY29sbGAuIFRoZSBga2V5YCBpcyB0aGUgaXRlbSdzIGtleSwgb3IgaW5kZXggaW4gdGhlIGNhc2Ugb2YgYW5cbiAgICAgKiBhcnJheS5cbiAgICAgKiBJbnZva2VkIHdpdGggKGl0ZW0sIGtleSwgY2FsbGJhY2spLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbFxuICAgICAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gSW52b2tlZCB3aXRoIChlcnIpLlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UsIGlmIGEgY2FsbGJhY2sgaXMgb21pdHRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVhY2hPZkxpbWl0JDEoY29sbCwgbGltaXQsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gZWFjaE9mTGltaXQobGltaXQpKGNvbGwsIHdyYXBBc3luYyhpdGVyYXRlZSksIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICB2YXIgZWFjaE9mTGltaXQkMiA9IGF3YWl0aWZ5KGVhY2hPZkxpbWl0JDEsIDQpO1xuXG4gICAgLy8gZWFjaE9mIGltcGxlbWVudGF0aW9uIG9wdGltaXplZCBmb3IgYXJyYXktbGlrZXNcbiAgICBmdW5jdGlvbiBlYWNoT2ZBcnJheUxpa2UoY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb25jZShjYWxsYmFjayk7XG4gICAgICAgIHZhciBpbmRleCA9IDAsXG4gICAgICAgICAgICBjb21wbGV0ZWQgPSAwLFxuICAgICAgICAgICAge2xlbmd0aH0gPSBjb2xsLFxuICAgICAgICAgICAgY2FuY2VsZWQgPSBmYWxzZTtcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpdGVyYXRvckNhbGxiYWNrKGVyciwgdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChlcnIgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgY2FuY2VsZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNhbmNlbGVkID09PSB0cnVlKSByZXR1cm5cbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgoKytjb21wbGV0ZWQgPT09IGxlbmd0aCkgfHwgdmFsdWUgPT09IGJyZWFrTG9vcCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yICg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICBpdGVyYXRlZShjb2xsW2luZGV4XSwgaW5kZXgsIG9ubHlPbmNlKGl0ZXJhdG9yQ2FsbGJhY2spKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGEgZ2VuZXJpYyB2ZXJzaW9uIG9mIGVhY2hPZiB3aGljaCBjYW4gaGFuZGxlIGFycmF5LCBvYmplY3QsIGFuZCBpdGVyYXRvciBjYXNlcy5cbiAgICBmdW5jdGlvbiBlYWNoT2ZHZW5lcmljIChjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGVhY2hPZkxpbWl0JDIoY29sbCwgSW5maW5pdHksIGl0ZXJhdGVlLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTGlrZSBbYGVhY2hgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZWFjaH0sIGV4Y2VwdCB0aGF0IGl0IHBhc3NlcyB0aGUga2V5IChvciBpbmRleCkgYXMgdGhlIHNlY29uZCBhcmd1bWVudFxuICAgICAqIHRvIHRoZSBpdGVyYXRlZS5cbiAgICAgKlxuICAgICAqIEBuYW1lIGVhY2hPZlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBhbGlhcyBmb3JFYWNoT2ZcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgICAqIEBzZWUgW2FzeW5jLmVhY2hde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5lYWNofVxuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2hcbiAgICAgKiBpdGVtIGluIGBjb2xsYC5cbiAgICAgKiBUaGUgYGtleWAgaXMgdGhlIGl0ZW0ncyBrZXksIG9yIGluZGV4IGluIHRoZSBjYXNlIG9mIGFuIGFycmF5LlxuICAgICAqIEludm9rZWQgd2l0aCAoaXRlbSwga2V5LCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsXG4gICAgICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBJbnZva2VkIHdpdGggKGVycikuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgYSBjYWxsYmFjayBpcyBvbWl0dGVkXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIC8vIGRldi5qc29uIGlzIGEgZmlsZSBjb250YWluaW5nIGEgdmFsaWQganNvbiBvYmplY3QgY29uZmlnIGZvciBkZXYgZW52aXJvbm1lbnRcbiAgICAgKiAvLyBkZXYuanNvbiBpcyBhIGZpbGUgY29udGFpbmluZyBhIHZhbGlkIGpzb24gb2JqZWN0IGNvbmZpZyBmb3IgdGVzdCBlbnZpcm9ubWVudFxuICAgICAqIC8vIHByb2QuanNvbiBpcyBhIGZpbGUgY29udGFpbmluZyBhIHZhbGlkIGpzb24gb2JqZWN0IGNvbmZpZyBmb3IgcHJvZCBlbnZpcm9ubWVudFxuICAgICAqIC8vIGludmFsaWQuanNvbiBpcyBhIGZpbGUgd2l0aCBhIG1hbGZvcm1lZCBqc29uIG9iamVjdFxuICAgICAqXG4gICAgICogbGV0IGNvbmZpZ3MgPSB7fTsgLy9nbG9iYWwgdmFyaWFibGVcbiAgICAgKiBsZXQgdmFsaWRDb25maWdGaWxlTWFwID0ge2RldjogJ2Rldi5qc29uJywgdGVzdDogJ3Rlc3QuanNvbicsIHByb2Q6ICdwcm9kLmpzb24nfTtcbiAgICAgKiBsZXQgaW52YWxpZENvbmZpZ0ZpbGVNYXAgPSB7ZGV2OiAnZGV2Lmpzb24nLCB0ZXN0OiAndGVzdC5qc29uJywgaW52YWxpZDogJ2ludmFsaWQuanNvbid9O1xuICAgICAqXG4gICAgICogLy8gYXN5bmNocm9ub3VzIGZ1bmN0aW9uIHRoYXQgcmVhZHMgYSBqc29uIGZpbGUgYW5kIHBhcnNlcyB0aGUgY29udGVudHMgYXMganNvbiBvYmplY3RcbiAgICAgKiBmdW5jdGlvbiBwYXJzZUZpbGUoZmlsZSwga2V5LCBjYWxsYmFjaykge1xuICAgICAqICAgICBmcy5yZWFkRmlsZShmaWxlLCBcInV0ZjhcIiwgZnVuY3Rpb24oZXJyLCBkYXRhKSB7XG4gICAgICogICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsYmFjayhlcnIpO1xuICAgICAqICAgICAgICAgdHJ5IHtcbiAgICAgKiAgICAgICAgICAgICBjb25maWdzW2tleV0gPSBKU09OLnBhcnNlKGRhdGEpO1xuICAgICAqICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAqICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlKTtcbiAgICAgKiAgICAgICAgIH1cbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICogICAgIH0pO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIGNhbGxiYWNrc1xuICAgICAqIGFzeW5jLmZvckVhY2hPZih2YWxpZENvbmZpZ0ZpbGVNYXAsIHBhcnNlRmlsZSwgZnVuY3Rpb24gKGVycikge1xuICAgICAqICAgICBpZiAoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICogICAgIH0gZWxzZSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhjb25maWdzKTtcbiAgICAgKiAgICAgICAgIC8vIGNvbmZpZ3MgaXMgbm93IGEgbWFwIG9mIEpTT04gZGF0YSwgZS5nLlxuICAgICAqICAgICAgICAgLy8geyBkZXY6IC8vcGFyc2VkIGRldi5qc29uLCB0ZXN0OiAvL3BhcnNlZCB0ZXN0Lmpzb24sIHByb2Q6IC8vcGFyc2VkIHByb2QuanNvbn1cbiAgICAgKiAgICAgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy9FcnJvciBoYW5kaW5nXG4gICAgICogYXN5bmMuZm9yRWFjaE9mKGludmFsaWRDb25maWdGaWxlTWFwLCBwYXJzZUZpbGUsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgKiAgICAgaWYgKGVycikge1xuICAgICAqICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAqICAgICAgICAgLy8gSlNPTiBwYXJzZSBlcnJvciBleGNlcHRpb25cbiAgICAgKiAgICAgfSBlbHNlIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGNvbmZpZ3MpO1xuICAgICAqICAgICB9XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBQcm9taXNlc1xuICAgICAqIGFzeW5jLmZvckVhY2hPZih2YWxpZENvbmZpZ0ZpbGVNYXAsIHBhcnNlRmlsZSlcbiAgICAgKiAudGhlbiggKCkgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhjb25maWdzKTtcbiAgICAgKiAgICAgLy8gY29uZmlncyBpcyBub3cgYSBtYXAgb2YgSlNPTiBkYXRhLCBlLmcuXG4gICAgICogICAgIC8vIHsgZGV2OiAvL3BhcnNlZCBkZXYuanNvbiwgdGVzdDogLy9wYXJzZWQgdGVzdC5qc29uLCBwcm9kOiAvL3BhcnNlZCBwcm9kLmpzb259XG4gICAgICogfSkuY2F0Y2goIGVyciA9PiB7XG4gICAgICogICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vRXJyb3IgaGFuZGluZ1xuICAgICAqIGFzeW5jLmZvckVhY2hPZihpbnZhbGlkQ29uZmlnRmlsZU1hcCwgcGFyc2VGaWxlKVxuICAgICAqIC50aGVuKCAoKSA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKGNvbmZpZ3MpO1xuICAgICAqIH0pLmNhdGNoKCBlcnIgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICogICAgIC8vIEpTT04gcGFyc2UgZXJyb3IgZXhjZXB0aW9uXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBhc3luYy9hd2FpdFxuICAgICAqIGFzeW5jICgpID0+IHtcbiAgICAgKiAgICAgdHJ5IHtcbiAgICAgKiAgICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBhc3luYy5mb3JFYWNoT2YodmFsaWRDb25maWdGaWxlTWFwLCBwYXJzZUZpbGUpO1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2coY29uZmlncyk7XG4gICAgICogICAgICAgICAvLyBjb25maWdzIGlzIG5vdyBhIG1hcCBvZiBKU09OIGRhdGEsIGUuZy5cbiAgICAgKiAgICAgICAgIC8vIHsgZGV2OiAvL3BhcnNlZCBkZXYuanNvbiwgdGVzdDogLy9wYXJzZWQgdGVzdC5qc29uLCBwcm9kOiAvL3BhcnNlZCBwcm9kLmpzb259XG4gICAgICogICAgIH1cbiAgICAgKiAgICAgY2F0Y2ggKGVycikge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKlxuICAgICAqIC8vRXJyb3IgaGFuZGluZ1xuICAgICAqIGFzeW5jICgpID0+IHtcbiAgICAgKiAgICAgdHJ5IHtcbiAgICAgKiAgICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBhc3luYy5mb3JFYWNoT2YoaW52YWxpZENvbmZpZ0ZpbGVNYXAsIHBhcnNlRmlsZSk7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhjb25maWdzKTtcbiAgICAgKiAgICAgfVxuICAgICAqICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICAgICAgLy8gSlNPTiBwYXJzZSBlcnJvciBleGNlcHRpb25cbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVhY2hPZihjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGVhY2hPZkltcGxlbWVudGF0aW9uID0gaXNBcnJheUxpa2UoY29sbCkgPyBlYWNoT2ZBcnJheUxpa2UgOiBlYWNoT2ZHZW5lcmljO1xuICAgICAgICByZXR1cm4gZWFjaE9mSW1wbGVtZW50YXRpb24oY29sbCwgd3JhcEFzeW5jKGl0ZXJhdGVlKSwgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIHZhciBlYWNoT2YkMSA9IGF3YWl0aWZ5KGVhY2hPZiwgMyk7XG5cbiAgICAvKipcbiAgICAgKiBQcm9kdWNlcyBhIG5ldyBjb2xsZWN0aW9uIG9mIHZhbHVlcyBieSBtYXBwaW5nIGVhY2ggdmFsdWUgaW4gYGNvbGxgIHRocm91Z2hcbiAgICAgKiB0aGUgYGl0ZXJhdGVlYCBmdW5jdGlvbi4gVGhlIGBpdGVyYXRlZWAgaXMgY2FsbGVkIHdpdGggYW4gaXRlbSBmcm9tIGBjb2xsYFxuICAgICAqIGFuZCBhIGNhbGxiYWNrIGZvciB3aGVuIGl0IGhhcyBmaW5pc2hlZCBwcm9jZXNzaW5nLiBFYWNoIG9mIHRoZXNlIGNhbGxiYWNrc1xuICAgICAqIHRha2VzIDIgYXJndW1lbnRzOiBhbiBgZXJyb3JgLCBhbmQgdGhlIHRyYW5zZm9ybWVkIGl0ZW0gZnJvbSBgY29sbGAuIElmXG4gICAgICogYGl0ZXJhdGVlYCBwYXNzZXMgYW4gZXJyb3IgdG8gaXRzIGNhbGxiYWNrLCB0aGUgbWFpbiBgY2FsbGJhY2tgIChmb3IgdGhlXG4gICAgICogYG1hcGAgZnVuY3Rpb24pIGlzIGltbWVkaWF0ZWx5IGNhbGxlZCB3aXRoIHRoZSBlcnJvci5cbiAgICAgKlxuICAgICAqIE5vdGUsIHRoYXQgc2luY2UgdGhpcyBmdW5jdGlvbiBhcHBsaWVzIHRoZSBgaXRlcmF0ZWVgIHRvIGVhY2ggaXRlbSBpblxuICAgICAqIHBhcmFsbGVsLCB0aGVyZSBpcyBubyBndWFyYW50ZWUgdGhhdCB0aGUgYGl0ZXJhdGVlYCBmdW5jdGlvbnMgd2lsbCBjb21wbGV0ZVxuICAgICAqIGluIG9yZGVyLiBIb3dldmVyLCB0aGUgcmVzdWx0cyBhcnJheSB3aWxsIGJlIGluIHRoZSBzYW1lIG9yZGVyIGFzIHRoZVxuICAgICAqIG9yaWdpbmFsIGBjb2xsYC5cbiAgICAgKlxuICAgICAqIElmIGBtYXBgIGlzIHBhc3NlZCBhbiBPYmplY3QsIHRoZSByZXN1bHRzIHdpbGwgYmUgYW4gQXJyYXkuICBUaGUgcmVzdWx0c1xuICAgICAqIHdpbGwgcm91Z2hseSBiZSBpbiB0aGUgb3JkZXIgb2YgdGhlIG9yaWdpbmFsIE9iamVjdHMnIGtleXMgKGJ1dCB0aGlzIGNhblxuICAgICAqIHZhcnkgYWNyb3NzIEphdmFTY3JpcHQgZW5naW5lcykuXG4gICAgICpcbiAgICAgKiBAbmFtZSBtYXBcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW5cbiAgICAgKiBgY29sbGAuXG4gICAgICogVGhlIGl0ZXJhdGVlIHNob3VsZCBjb21wbGV0ZSB3aXRoIHRoZSB0cmFuc2Zvcm1lZCBpdGVtLlxuICAgICAqIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbCBgaXRlcmF0ZWVgXG4gICAgICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0cyBpcyBhbiBBcnJheSBvZiB0aGVcbiAgICAgKiB0cmFuc2Zvcm1lZCBpdGVtcyBmcm9tIHRoZSBgY29sbGAuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwYXNzZWRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogLy8gZmlsZTEudHh0IGlzIGEgZmlsZSB0aGF0IGlzIDEwMDAgYnl0ZXMgaW4gc2l6ZVxuICAgICAqIC8vIGZpbGUyLnR4dCBpcyBhIGZpbGUgdGhhdCBpcyAyMDAwIGJ5dGVzIGluIHNpemVcbiAgICAgKiAvLyBmaWxlMy50eHQgaXMgYSBmaWxlIHRoYXQgaXMgMzAwMCBieXRlcyBpbiBzaXplXG4gICAgICogLy8gZmlsZTQudHh0IGRvZXMgbm90IGV4aXN0XG4gICAgICpcbiAgICAgKiBjb25zdCBmaWxlTGlzdCA9IFsnZmlsZTEudHh0JywnZmlsZTIudHh0JywnZmlsZTMudHh0J107XG4gICAgICogY29uc3Qgd2l0aE1pc3NpbmdGaWxlTGlzdCA9IFsnZmlsZTEudHh0JywnZmlsZTIudHh0JywnZmlsZTQudHh0J107XG4gICAgICpcbiAgICAgKiAvLyBhc3luY2hyb25vdXMgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBmaWxlIHNpemUgaW4gYnl0ZXNcbiAgICAgKiBmdW5jdGlvbiBnZXRGaWxlU2l6ZUluQnl0ZXMoZmlsZSwgY2FsbGJhY2spIHtcbiAgICAgKiAgICAgZnMuc3RhdChmaWxlLCBmdW5jdGlvbihlcnIsIHN0YXQpIHtcbiAgICAgKiAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgKiAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgKiAgICAgICAgIH1cbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKG51bGwsIHN0YXQuc2l6ZSk7XG4gICAgICogICAgIH0pO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIGNhbGxiYWNrc1xuICAgICAqIGFzeW5jLm1hcChmaWxlTGlzdCwgZ2V0RmlsZVNpemVJbkJ5dGVzLCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAgICAgKiAgICAgaWYgKGVycikge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgfSBlbHNlIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAgICAgLy8gcmVzdWx0cyBpcyBub3cgYW4gYXJyYXkgb2YgdGhlIGZpbGUgc2l6ZSBpbiBieXRlcyBmb3IgZWFjaCBmaWxlLCBlLmcuXG4gICAgICogICAgICAgICAvLyBbIDEwMDAsIDIwMDAsIDMwMDBdXG4gICAgICogICAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIEVycm9yIEhhbmRsaW5nXG4gICAgICogYXN5bmMubWFwKHdpdGhNaXNzaW5nRmlsZUxpc3QsIGdldEZpbGVTaXplSW5CeXRlcywgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gICAgICogICAgIGlmIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgICAgICAvLyBbIEVycm9yOiBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkgXVxuICAgICAqICAgICB9IGVsc2Uge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0cyk7XG4gICAgICogICAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIFByb21pc2VzXG4gICAgICogYXN5bmMubWFwKGZpbGVMaXN0LCBnZXRGaWxlU2l6ZUluQnl0ZXMpXG4gICAgICogLnRoZW4oIHJlc3VsdHMgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhyZXN1bHRzKTtcbiAgICAgKiAgICAgLy8gcmVzdWx0cyBpcyBub3cgYW4gYXJyYXkgb2YgdGhlIGZpbGUgc2l6ZSBpbiBieXRlcyBmb3IgZWFjaCBmaWxlLCBlLmcuXG4gICAgICogICAgIC8vIFsgMTAwMCwgMjAwMCwgMzAwMF1cbiAgICAgKiB9KS5jYXRjaCggZXJyID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIEVycm9yIEhhbmRsaW5nXG4gICAgICogYXN5bmMubWFwKHdpdGhNaXNzaW5nRmlsZUxpc3QsIGdldEZpbGVTaXplSW5CeXRlcylcbiAgICAgKiAudGhlbiggcmVzdWx0cyA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqIH0pLmNhdGNoKCBlcnIgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICAvLyBbIEVycm9yOiBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkgXVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gVXNpbmcgYXN5bmMvYXdhaXRcbiAgICAgKiBhc3luYyAoKSA9PiB7XG4gICAgICogICAgIHRyeSB7XG4gICAgICogICAgICAgICBsZXQgcmVzdWx0cyA9IGF3YWl0IGFzeW5jLm1hcChmaWxlTGlzdCwgZ2V0RmlsZVNpemVJbkJ5dGVzKTtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAgICAgLy8gcmVzdWx0cyBpcyBub3cgYW4gYXJyYXkgb2YgdGhlIGZpbGUgc2l6ZSBpbiBieXRlcyBmb3IgZWFjaCBmaWxlLCBlLmcuXG4gICAgICogICAgICAgICAvLyBbIDEwMDAsIDIwMDAsIDMwMDBdXG4gICAgICogICAgIH1cbiAgICAgKiAgICAgY2F0Y2ggKGVycikge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKlxuICAgICAqIC8vIEVycm9yIEhhbmRsaW5nXG4gICAgICogYXN5bmMgKCkgPT4ge1xuICAgICAqICAgICB0cnkge1xuICAgICAqICAgICAgICAgbGV0IHJlc3VsdHMgPSBhd2FpdCBhc3luYy5tYXAod2l0aE1pc3NpbmdGaWxlTGlzdCwgZ2V0RmlsZVNpemVJbkJ5dGVzKTtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICB9XG4gICAgICogICAgIGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgICAgICAvLyBbIEVycm9yOiBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkgXVxuICAgICAqICAgICB9XG4gICAgICogfVxuICAgICAqXG4gICAgICovXG4gICAgZnVuY3Rpb24gbWFwIChjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIF9hc3luY01hcChlYWNoT2YkMSwgY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKVxuICAgIH1cbiAgICB2YXIgbWFwJDEgPSBhd2FpdGlmeShtYXAsIDMpO1xuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgcHJvdmlkZWQgYXJndW1lbnRzIHRvIGVhY2ggZnVuY3Rpb24gaW4gdGhlIGFycmF5LCBjYWxsaW5nXG4gICAgICogYGNhbGxiYWNrYCBhZnRlciBhbGwgZnVuY3Rpb25zIGhhdmUgY29tcGxldGVkLiBJZiB5b3Ugb25seSBwcm92aWRlIHRoZSBmaXJzdFxuICAgICAqIGFyZ3VtZW50LCBgZm5zYCwgdGhlbiBpdCB3aWxsIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIGxldHMgeW91IHBhc3MgaW4gdGhlXG4gICAgICogYXJndW1lbnRzIGFzIGlmIGl0IHdlcmUgYSBzaW5nbGUgZnVuY3Rpb24gY2FsbC4gSWYgbW9yZSBhcmd1bWVudHMgYXJlXG4gICAgICogcHJvdmlkZWQsIGBjYWxsYmFja2AgaXMgcmVxdWlyZWQgd2hpbGUgYGFyZ3NgIGlzIHN0aWxsIG9wdGlvbmFsLiBUaGUgcmVzdWx0c1xuICAgICAqIGZvciBlYWNoIG9mIHRoZSBhcHBsaWVkIGFzeW5jIGZ1bmN0aW9ucyBhcmUgcGFzc2VkIHRvIHRoZSBmaW5hbCBjYWxsYmFja1xuICAgICAqIGFzIGFuIGFycmF5LlxuICAgICAqXG4gICAgICogQG5hbWUgYXBwbHlFYWNoXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IGZucyAtIEEgY29sbGVjdGlvbiBvZiB7QGxpbmsgQXN5bmNGdW5jdGlvbn1zXG4gICAgICogdG8gYWxsIGNhbGwgd2l0aCB0aGUgc2FtZSBhcmd1bWVudHNcbiAgICAgKiBAcGFyYW0gey4uLip9IFthcmdzXSAtIGFueSBudW1iZXIgb2Ygc2VwYXJhdGUgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlXG4gICAgICogZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIHRoZSBmaW5hbCBhcmd1bWVudCBzaG91bGQgYmUgdGhlIGNhbGxiYWNrLFxuICAgICAqIGNhbGxlZCB3aGVuIGFsbCBmdW5jdGlvbnMgaGF2ZSBjb21wbGV0ZWQgcHJvY2Vzc2luZy5cbiAgICAgKiBAcmV0dXJucyB7QXN5bmNGdW5jdGlvbn0gLSBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBubyBhcmdzIG90aGVyIHRoYW5cbiAgICAgKiBhbiBvcHRpb25hbCBjYWxsYmFjaywgdGhhdCBpcyB0aGUgcmVzdWx0IG9mIGFwcGx5aW5nIHRoZSBgYXJnc2AgdG8gZWFjaFxuICAgICAqIG9mIHRoZSBmdW5jdGlvbnMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIGNvbnN0IGFwcGxpZWRGbiA9IGFzeW5jLmFwcGx5RWFjaChbZW5hYmxlU2VhcmNoLCB1cGRhdGVTY2hlbWFdLCAnYnVja2V0JylcbiAgICAgKlxuICAgICAqIGFwcGxpZWRGbigoZXJyLCByZXN1bHRzKSA9PiB7XG4gICAgICogICAgIC8vIHJlc3VsdHNbMF0gaXMgdGhlIHJlc3VsdHMgZm9yIGBlbmFibGVTZWFyY2hgXG4gICAgICogICAgIC8vIHJlc3VsdHNbMV0gaXMgdGhlIHJlc3VsdHMgZm9yIGB1cGRhdGVTY2hlbWFgXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBwYXJ0aWFsIGFwcGxpY2F0aW9uIGV4YW1wbGU6XG4gICAgICogYXN5bmMuZWFjaChcbiAgICAgKiAgICAgYnVja2V0cyxcbiAgICAgKiAgICAgYXN5bmMgKGJ1Y2tldCkgPT4gYXN5bmMuYXBwbHlFYWNoKFtlbmFibGVTZWFyY2gsIHVwZGF0ZVNjaGVtYV0sIGJ1Y2tldCkoKSxcbiAgICAgKiAgICAgY2FsbGJhY2tcbiAgICAgKiApO1xuICAgICAqL1xuICAgIHZhciBhcHBseUVhY2gkMSA9IGFwcGx5RWFjaChtYXAkMSk7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2FtZSBhcyBbYGVhY2hPZmBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5lYWNoT2Z9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAgICAgKlxuICAgICAqIEBuYW1lIGVhY2hPZlNlcmllc1xuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBzZWUgW2FzeW5jLmVhY2hPZl17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmVhY2hPZn1cbiAgICAgKiBAYWxpYXMgZm9yRWFjaE9mU2VyaWVzXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluXG4gICAgICogYGNvbGxgLlxuICAgICAqIEludm9rZWQgd2l0aCAoaXRlbSwga2V5LCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsIGBpdGVyYXRlZWBcbiAgICAgKiBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBJbnZva2VkIHdpdGggKGVycikuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgYSBjYWxsYmFjayBpcyBvbWl0dGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gZWFjaE9mU2VyaWVzKGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gZWFjaE9mTGltaXQkMihjb2xsLCAxLCBpdGVyYXRlZSwgY2FsbGJhY2spXG4gICAgfVxuICAgIHZhciBlYWNoT2ZTZXJpZXMkMSA9IGF3YWl0aWZ5KGVhY2hPZlNlcmllcywgMyk7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2FtZSBhcyBbYG1hcGBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAgICAgKlxuICAgICAqIEBuYW1lIG1hcFNlcmllc1xuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBzZWUgW2FzeW5jLm1hcF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLm1hcH1cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW5cbiAgICAgKiBgY29sbGAuXG4gICAgICogVGhlIGl0ZXJhdGVlIHNob3VsZCBjb21wbGV0ZSB3aXRoIHRoZSB0cmFuc2Zvcm1lZCBpdGVtLlxuICAgICAqIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbCBgaXRlcmF0ZWVgXG4gICAgICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0cyBpcyBhbiBhcnJheSBvZiB0aGVcbiAgICAgKiB0cmFuc2Zvcm1lZCBpdGVtcyBmcm9tIHRoZSBgY29sbGAuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwYXNzZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtYXBTZXJpZXMgKGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gX2FzeW5jTWFwKGVhY2hPZlNlcmllcyQxLCBjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spXG4gICAgfVxuICAgIHZhciBtYXBTZXJpZXMkMSA9IGF3YWl0aWZ5KG1hcFNlcmllcywgMyk7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2FtZSBhcyBbYGFwcGx5RWFjaGBde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5hcHBseUVhY2h9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAgICAgKlxuICAgICAqIEBuYW1lIGFwcGx5RWFjaFNlcmllc1xuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gICAgICogQG1ldGhvZFxuICAgICAqIEBzZWUgW2FzeW5jLmFwcGx5RWFjaF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LmFwcGx5RWFjaH1cbiAgICAgKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gICAgICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxBc3luY0l0ZXJhYmxlfE9iamVjdH0gZm5zIC0gQSBjb2xsZWN0aW9uIG9mIHtAbGluayBBc3luY0Z1bmN0aW9ufXMgdG8gYWxsXG4gICAgICogY2FsbCB3aXRoIHRoZSBzYW1lIGFyZ3VtZW50c1xuICAgICAqIEBwYXJhbSB7Li4uKn0gW2FyZ3NdIC0gYW55IG51bWJlciBvZiBzZXBhcmF0ZSBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGVcbiAgICAgKiBmdW5jdGlvbi5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gdGhlIGZpbmFsIGFyZ3VtZW50IHNob3VsZCBiZSB0aGUgY2FsbGJhY2ssXG4gICAgICogY2FsbGVkIHdoZW4gYWxsIGZ1bmN0aW9ucyBoYXZlIGNvbXBsZXRlZCBwcm9jZXNzaW5nLlxuICAgICAqIEByZXR1cm5zIHtBc3luY0Z1bmN0aW9ufSAtIEEgZnVuY3Rpb24sIHRoYXQgd2hlbiBjYWxsZWQsIGlzIHRoZSByZXN1bHQgb2ZcbiAgICAgKiBhcHBsaW5nIHRoZSBgYXJnc2AgdG8gdGhlIGxpc3Qgb2YgZnVuY3Rpb25zLiAgSXQgdGFrZXMgbm8gYXJncywgb3RoZXIgdGhhblxuICAgICAqIGEgY2FsbGJhY2suXG4gICAgICovXG4gICAgdmFyIGFwcGx5RWFjaFNlcmllcyA9IGFwcGx5RWFjaChtYXBTZXJpZXMkMSk7XG5cbiAgICBjb25zdCBQUk9NSVNFX1NZTUJPTCA9IFN5bWJvbCgncHJvbWlzZUNhbGxiYWNrJyk7XG5cbiAgICBmdW5jdGlvbiBwcm9taXNlQ2FsbGJhY2sgKCkge1xuICAgICAgICBsZXQgcmVzb2x2ZSwgcmVqZWN0O1xuICAgICAgICBmdW5jdGlvbiBjYWxsYmFjayAoZXJyLCAuLi5hcmdzKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gcmVqZWN0KGVycilcbiAgICAgICAgICAgIHJlc29sdmUoYXJncy5sZW5ndGggPiAxID8gYXJncyA6IGFyZ3NbMF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbGJhY2tbUFJPTUlTRV9TWU1CT0xdID0gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlID0gcmVzLFxuICAgICAgICAgICAgcmVqZWN0ID0gcmVqO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gY2FsbGJhY2tcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmVzIHRoZSBiZXN0IG9yZGVyIGZvciBydW5uaW5nIHRoZSB7QGxpbmsgQXN5bmNGdW5jdGlvbn1zIGluIGB0YXNrc2AsIGJhc2VkIG9uXG4gICAgICogdGhlaXIgcmVxdWlyZW1lbnRzLiBFYWNoIGZ1bmN0aW9uIGNhbiBvcHRpb25hbGx5IGRlcGVuZCBvbiBvdGhlciBmdW5jdGlvbnNcbiAgICAgKiBiZWluZyBjb21wbGV0ZWQgZmlyc3QsIGFuZCBlYWNoIGZ1bmN0aW9uIGlzIHJ1biBhcyBzb29uIGFzIGl0cyByZXF1aXJlbWVudHNcbiAgICAgKiBhcmUgc2F0aXNmaWVkLlxuICAgICAqXG4gICAgICogSWYgYW55IG9mIHRoZSB7QGxpbmsgQXN5bmNGdW5jdGlvbn1zIHBhc3MgYW4gZXJyb3IgdG8gdGhlaXIgY2FsbGJhY2ssIHRoZSBgYXV0b2Agc2VxdWVuY2VcbiAgICAgKiB3aWxsIHN0b3AuIEZ1cnRoZXIgdGFza3Mgd2lsbCBub3QgZXhlY3V0ZSAoc28gYW55IG90aGVyIGZ1bmN0aW9ucyBkZXBlbmRpbmdcbiAgICAgKiBvbiBpdCB3aWxsIG5vdCBydW4pLCBhbmQgdGhlIG1haW4gYGNhbGxiYWNrYCBpcyBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGVcbiAgICAgKiBlcnJvci5cbiAgICAgKlxuICAgICAqIHtAbGluayBBc3luY0Z1bmN0aW9ufXMgYWxzbyByZWNlaXZlIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSByZXN1bHRzIG9mIGZ1bmN0aW9ucyB3aGljaFxuICAgICAqIGhhdmUgY29tcGxldGVkIHNvIGZhciBhcyB0aGUgZmlyc3QgYXJndW1lbnQsIGlmIHRoZXkgaGF2ZSBkZXBlbmRlbmNpZXMuIElmIGFcbiAgICAgKiB0YXNrIGZ1bmN0aW9uIGhhcyBubyBkZXBlbmRlbmNpZXMsIGl0IHdpbGwgb25seSBiZSBwYXNzZWQgYSBjYWxsYmFjay5cbiAgICAgKlxuICAgICAqIEBuYW1lIGF1dG9cbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRhc2tzIC0gQW4gb2JqZWN0LiBFYWNoIG9mIGl0cyBwcm9wZXJ0aWVzIGlzIGVpdGhlciBhXG4gICAgICogZnVuY3Rpb24gb3IgYW4gYXJyYXkgb2YgcmVxdWlyZW1lbnRzLCB3aXRoIHRoZSB7QGxpbmsgQXN5bmNGdW5jdGlvbn0gaXRzZWxmIHRoZSBsYXN0IGl0ZW1cbiAgICAgKiBpbiB0aGUgYXJyYXkuIFRoZSBvYmplY3QncyBrZXkgb2YgYSBwcm9wZXJ0eSBzZXJ2ZXMgYXMgdGhlIG5hbWUgb2YgdGhlIHRhc2tcbiAgICAgKiBkZWZpbmVkIGJ5IHRoYXQgcHJvcGVydHksIGkuZS4gY2FuIGJlIHVzZWQgd2hlbiBzcGVjaWZ5aW5nIHJlcXVpcmVtZW50cyBmb3JcbiAgICAgKiBvdGhlciB0YXNrcy4gVGhlIGZ1bmN0aW9uIHJlY2VpdmVzIG9uZSBvciB0d28gYXJndW1lbnRzOlxuICAgICAqICogYSBgcmVzdWx0c2Agb2JqZWN0LCBjb250YWluaW5nIHRoZSByZXN1bHRzIG9mIHRoZSBwcmV2aW91c2x5IGV4ZWN1dGVkXG4gICAgICogICBmdW5jdGlvbnMsIG9ubHkgcGFzc2VkIGlmIHRoZSB0YXNrIGhhcyBhbnkgZGVwZW5kZW5jaWVzLFxuICAgICAqICogYSBgY2FsbGJhY2soZXJyLCByZXN1bHQpYCBmdW5jdGlvbiwgd2hpY2ggbXVzdCBiZSBjYWxsZWQgd2hlbiBmaW5pc2hlZCxcbiAgICAgKiAgIHBhc3NpbmcgYW4gYGVycm9yYCAod2hpY2ggY2FuIGJlIGBudWxsYCkgYW5kIHRoZSByZXN1bHQgb2YgdGhlIGZ1bmN0aW9uJ3NcbiAgICAgKiAgIGV4ZWN1dGlvbi5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW2NvbmN1cnJlbmN5PUluZmluaXR5XSAtIEFuIG9wdGlvbmFsIGBpbnRlZ2VyYCBmb3JcbiAgICAgKiBkZXRlcm1pbmluZyB0aGUgbWF4aW11bSBudW1iZXIgb2YgdGFza3MgdGhhdCBjYW4gYmUgcnVuIGluIHBhcmFsbGVsLiBCeVxuICAgICAqIGRlZmF1bHQsIGFzIG1hbnkgYXMgcG9zc2libGUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbFxuICAgICAqIHRoZSB0YXNrcyBoYXZlIGJlZW4gY29tcGxldGVkLiBJdCByZWNlaXZlcyB0aGUgYGVycmAgYXJndW1lbnQgaWYgYW55IGB0YXNrc2BcbiAgICAgKiBwYXNzIGFuIGVycm9yIHRvIHRoZWlyIGNhbGxiYWNrLiBSZXN1bHRzIGFyZSBhbHdheXMgcmV0dXJuZWQ7IGhvd2V2ZXIsIGlmIGFuXG4gICAgICogZXJyb3Igb2NjdXJzLCBubyBmdXJ0aGVyIGB0YXNrc2Agd2lsbCBiZSBwZXJmb3JtZWQsIGFuZCB0aGUgcmVzdWx0cyBvYmplY3RcbiAgICAgKiB3aWxsIG9ubHkgY29udGFpbiBwYXJ0aWFsIHJlc3VsdHMuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBhIGNhbGxiYWNrIGlzIG5vdCBwYXNzZWRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogLy9Vc2luZyBDYWxsYmFja3NcbiAgICAgKiBhc3luYy5hdXRvKHtcbiAgICAgKiAgICAgZ2V0X2RhdGE6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICAvLyBhc3luYyBjb2RlIHRvIGdldCBzb21lIGRhdGFcbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICdkYXRhJywgJ2NvbnZlcnRlZCB0byBhcnJheScpO1xuICAgICAqICAgICB9LFxuICAgICAqICAgICBtYWtlX2ZvbGRlcjogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIC8vIGFzeW5jIGNvZGUgdG8gY3JlYXRlIGEgZGlyZWN0b3J5IHRvIHN0b3JlIGEgZmlsZSBpblxuICAgICAqICAgICAgICAgLy8gdGhpcyBpcyBydW4gYXQgdGhlIHNhbWUgdGltZSBhcyBnZXR0aW5nIHRoZSBkYXRhXG4gICAgICogICAgICAgICBjYWxsYmFjayhudWxsLCAnZm9sZGVyJyk7XG4gICAgICogICAgIH0sXG4gICAgICogICAgIHdyaXRlX2ZpbGU6IFsnZ2V0X2RhdGEnLCAnbWFrZV9mb2xkZXInLCBmdW5jdGlvbihyZXN1bHRzLCBjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgLy8gb25jZSB0aGVyZSBpcyBzb21lIGRhdGEgYW5kIHRoZSBkaXJlY3RvcnkgZXhpc3RzLFxuICAgICAqICAgICAgICAgLy8gd3JpdGUgdGhlIGRhdGEgdG8gYSBmaWxlIGluIHRoZSBkaXJlY3RvcnlcbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICdmaWxlbmFtZScpO1xuICAgICAqICAgICB9XSxcbiAgICAgKiAgICAgZW1haWxfbGluazogWyd3cml0ZV9maWxlJywgZnVuY3Rpb24ocmVzdWx0cywgY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIC8vIG9uY2UgdGhlIGZpbGUgaXMgd3JpdHRlbiBsZXQncyBlbWFpbCBhIGxpbmsgdG8gaXQuLi5cbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKG51bGwsIHsnZmlsZSc6cmVzdWx0cy53cml0ZV9maWxlLCAnZW1haWwnOid1c2VyQGV4YW1wbGUuY29tJ30pO1xuICAgICAqICAgICB9XVxuICAgICAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICAgICAqICAgICBpZiAoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZygnZXJyID0gJywgZXJyKTtcbiAgICAgKiAgICAgfVxuICAgICAqICAgICBjb25zb2xlLmxvZygncmVzdWx0cyA9ICcsIHJlc3VsdHMpO1xuICAgICAqICAgICAvLyByZXN1bHRzID0ge1xuICAgICAqICAgICAvLyAgICAgZ2V0X2RhdGE6IFsnZGF0YScsICdjb252ZXJ0ZWQgdG8gYXJyYXknXVxuICAgICAqICAgICAvLyAgICAgbWFrZV9mb2xkZXI7ICdmb2xkZXInLFxuICAgICAqICAgICAvLyAgICAgd3JpdGVfZmlsZTogJ2ZpbGVuYW1lJ1xuICAgICAqICAgICAvLyAgICAgZW1haWxfbGluazogeyBmaWxlOiAnZmlsZW5hbWUnLCBlbWFpbDogJ3VzZXJAZXhhbXBsZS5jb20nIH1cbiAgICAgKiAgICAgLy8gfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy9Vc2luZyBQcm9taXNlc1xuICAgICAqIGFzeW5jLmF1dG8oe1xuICAgICAqICAgICBnZXRfZGF0YTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKCdpbiBnZXRfZGF0YScpO1xuICAgICAqICAgICAgICAgLy8gYXN5bmMgY29kZSB0byBnZXQgc29tZSBkYXRhXG4gICAgICogICAgICAgICBjYWxsYmFjayhudWxsLCAnZGF0YScsICdjb252ZXJ0ZWQgdG8gYXJyYXknKTtcbiAgICAgKiAgICAgfSxcbiAgICAgKiAgICAgbWFrZV9mb2xkZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZygnaW4gbWFrZV9mb2xkZXInKTtcbiAgICAgKiAgICAgICAgIC8vIGFzeW5jIGNvZGUgdG8gY3JlYXRlIGEgZGlyZWN0b3J5IHRvIHN0b3JlIGEgZmlsZSBpblxuICAgICAqICAgICAgICAgLy8gdGhpcyBpcyBydW4gYXQgdGhlIHNhbWUgdGltZSBhcyBnZXR0aW5nIHRoZSBkYXRhXG4gICAgICogICAgICAgICBjYWxsYmFjayhudWxsLCAnZm9sZGVyJyk7XG4gICAgICogICAgIH0sXG4gICAgICogICAgIHdyaXRlX2ZpbGU6IFsnZ2V0X2RhdGEnLCAnbWFrZV9mb2xkZXInLCBmdW5jdGlvbihyZXN1bHRzLCBjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgLy8gb25jZSB0aGVyZSBpcyBzb21lIGRhdGEgYW5kIHRoZSBkaXJlY3RvcnkgZXhpc3RzLFxuICAgICAqICAgICAgICAgLy8gd3JpdGUgdGhlIGRhdGEgdG8gYSBmaWxlIGluIHRoZSBkaXJlY3RvcnlcbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICdmaWxlbmFtZScpO1xuICAgICAqICAgICB9XSxcbiAgICAgKiAgICAgZW1haWxfbGluazogWyd3cml0ZV9maWxlJywgZnVuY3Rpb24ocmVzdWx0cywgY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIC8vIG9uY2UgdGhlIGZpbGUgaXMgd3JpdHRlbiBsZXQncyBlbWFpbCBhIGxpbmsgdG8gaXQuLi5cbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKG51bGwsIHsnZmlsZSc6cmVzdWx0cy53cml0ZV9maWxlLCAnZW1haWwnOid1c2VyQGV4YW1wbGUuY29tJ30pO1xuICAgICAqICAgICB9XVxuICAgICAqIH0pLnRoZW4ocmVzdWx0cyA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKCdyZXN1bHRzID0gJywgcmVzdWx0cyk7XG4gICAgICogICAgIC8vIHJlc3VsdHMgPSB7XG4gICAgICogICAgIC8vICAgICBnZXRfZGF0YTogWydkYXRhJywgJ2NvbnZlcnRlZCB0byBhcnJheSddXG4gICAgICogICAgIC8vICAgICBtYWtlX2ZvbGRlcjsgJ2ZvbGRlcicsXG4gICAgICogICAgIC8vICAgICB3cml0ZV9maWxlOiAnZmlsZW5hbWUnXG4gICAgICogICAgIC8vICAgICBlbWFpbF9saW5rOiB7IGZpbGU6ICdmaWxlbmFtZScsIGVtYWlsOiAndXNlckBleGFtcGxlLmNvbScgfVxuICAgICAqICAgICAvLyB9XG4gICAgICogfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coJ2VyciA9ICcsIGVycik7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvL1VzaW5nIGFzeW5jL2F3YWl0XG4gICAgICogYXN5bmMgKCkgPT4ge1xuICAgICAqICAgICB0cnkge1xuICAgICAqICAgICAgICAgbGV0IHJlc3VsdHMgPSBhd2FpdCBhc3luYy5hdXRvKHtcbiAgICAgKiAgICAgICAgICAgICBnZXRfZGF0YTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgICAgICAgICAgLy8gYXN5bmMgY29kZSB0byBnZXQgc29tZSBkYXRhXG4gICAgICogICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICdkYXRhJywgJ2NvbnZlcnRlZCB0byBhcnJheScpO1xuICAgICAqICAgICAgICAgICAgIH0sXG4gICAgICogICAgICAgICAgICAgbWFrZV9mb2xkZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICAgICAgICAgIC8vIGFzeW5jIGNvZGUgdG8gY3JlYXRlIGEgZGlyZWN0b3J5IHRvIHN0b3JlIGEgZmlsZSBpblxuICAgICAqICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIHJ1biBhdCB0aGUgc2FtZSB0aW1lIGFzIGdldHRpbmcgdGhlIGRhdGFcbiAgICAgKiAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ2ZvbGRlcicpO1xuICAgICAqICAgICAgICAgICAgIH0sXG4gICAgICogICAgICAgICAgICAgd3JpdGVfZmlsZTogWydnZXRfZGF0YScsICdtYWtlX2ZvbGRlcicsIGZ1bmN0aW9uKHJlc3VsdHMsIGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICAgICAgICAgIC8vIG9uY2UgdGhlcmUgaXMgc29tZSBkYXRhIGFuZCB0aGUgZGlyZWN0b3J5IGV4aXN0cyxcbiAgICAgKiAgICAgICAgICAgICAgICAgLy8gd3JpdGUgdGhlIGRhdGEgdG8gYSBmaWxlIGluIHRoZSBkaXJlY3RvcnlcbiAgICAgKiAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ2ZpbGVuYW1lJyk7XG4gICAgICogICAgICAgICAgICAgfV0sXG4gICAgICogICAgICAgICAgICAgZW1haWxfbGluazogWyd3cml0ZV9maWxlJywgZnVuY3Rpb24ocmVzdWx0cywgY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgICAgICAgICAgLy8gb25jZSB0aGUgZmlsZSBpcyB3cml0dGVuIGxldCdzIGVtYWlsIGEgbGluayB0byBpdC4uLlxuICAgICAqICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7J2ZpbGUnOnJlc3VsdHMud3JpdGVfZmlsZSwgJ2VtYWlsJzondXNlckBleGFtcGxlLmNvbSd9KTtcbiAgICAgKiAgICAgICAgICAgICB9XVxuICAgICAqICAgICAgICAgfSk7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZygncmVzdWx0cyA9ICcsIHJlc3VsdHMpO1xuICAgICAqICAgICAgICAgLy8gcmVzdWx0cyA9IHtcbiAgICAgKiAgICAgICAgIC8vICAgICBnZXRfZGF0YTogWydkYXRhJywgJ2NvbnZlcnRlZCB0byBhcnJheSddXG4gICAgICogICAgICAgICAvLyAgICAgbWFrZV9mb2xkZXI7ICdmb2xkZXInLFxuICAgICAqICAgICAgICAgLy8gICAgIHdyaXRlX2ZpbGU6ICdmaWxlbmFtZSdcbiAgICAgKiAgICAgICAgIC8vICAgICBlbWFpbF9saW5rOiB7IGZpbGU6ICdmaWxlbmFtZScsIGVtYWlsOiAndXNlckBleGFtcGxlLmNvbScgfVxuICAgICAqICAgICAgICAgLy8gfVxuICAgICAqICAgICB9XG4gICAgICogICAgIGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBhdXRvKHRhc2tzLCBjb25jdXJyZW5jeSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25jdXJyZW5jeSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIC8vIGNvbmN1cnJlbmN5IGlzIG9wdGlvbmFsLCBzaGlmdCB0aGUgYXJncy5cbiAgICAgICAgICAgIGNhbGxiYWNrID0gY29uY3VycmVuY3k7XG4gICAgICAgICAgICBjb25jdXJyZW5jeSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2sgPSBvbmNlKGNhbGxiYWNrIHx8IHByb21pc2VDYWxsYmFjaygpKTtcbiAgICAgICAgdmFyIG51bVRhc2tzID0gT2JqZWN0LmtleXModGFza3MpLmxlbmd0aDtcbiAgICAgICAgaWYgKCFudW1UYXNrcykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5ID0gbnVtVGFza3M7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVzdWx0cyA9IHt9O1xuICAgICAgICB2YXIgcnVubmluZ1Rhc2tzID0gMDtcbiAgICAgICAgdmFyIGNhbmNlbGVkID0gZmFsc2U7XG4gICAgICAgIHZhciBoYXNFcnJvciA9IGZhbHNlO1xuXG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgICAgIHZhciByZWFkeVRhc2tzID0gW107XG5cbiAgICAgICAgLy8gZm9yIGN5Y2xlIGRldGVjdGlvbjpcbiAgICAgICAgdmFyIHJlYWR5VG9DaGVjayA9IFtdOyAvLyB0YXNrcyB0aGF0IGhhdmUgYmVlbiBpZGVudGlmaWVkIGFzIHJlYWNoYWJsZVxuICAgICAgICAvLyB3aXRob3V0IHRoZSBwb3NzaWJpbGl0eSBvZiByZXR1cm5pbmcgdG8gYW4gYW5jZXN0b3IgdGFza1xuICAgICAgICB2YXIgdW5jaGVja2VkRGVwZW5kZW5jaWVzID0ge307XG5cbiAgICAgICAgT2JqZWN0LmtleXModGFza3MpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gdGFza3Nba2V5XTtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh0YXNrKSkge1xuICAgICAgICAgICAgICAgIC8vIG5vIGRlcGVuZGVuY2llc1xuICAgICAgICAgICAgICAgIGVucXVldWVUYXNrKGtleSwgW3Rhc2tdKTtcbiAgICAgICAgICAgICAgICByZWFkeVRvQ2hlY2sucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGRlcGVuZGVuY2llcyA9IHRhc2suc2xpY2UoMCwgdGFzay5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIHZhciByZW1haW5pbmdEZXBlbmRlbmNpZXMgPSBkZXBlbmRlbmNpZXMubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKHJlbWFpbmluZ0RlcGVuZGVuY2llcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGVucXVldWVUYXNrKGtleSwgdGFzayk7XG4gICAgICAgICAgICAgICAgcmVhZHlUb0NoZWNrLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB1bmNoZWNrZWREZXBlbmRlbmNpZXNba2V5XSA9IHJlbWFpbmluZ0RlcGVuZGVuY2llcztcblxuICAgICAgICAgICAgZGVwZW5kZW5jaWVzLmZvckVhY2goZGVwZW5kZW5jeU5hbWUgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdGFza3NbZGVwZW5kZW5jeU5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignYXN5bmMuYXV0byB0YXNrIGAnICsga2V5ICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdgIGhhcyBhIG5vbi1leGlzdGVudCBkZXBlbmRlbmN5IGAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY3lOYW1lICsgJ2AgaW4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbmNpZXMuam9pbignLCAnKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkZExpc3RlbmVyKGRlcGVuZGVuY3lOYW1lLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlbWFpbmluZ0RlcGVuZGVuY2llcy0tO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVtYWluaW5nRGVwZW5kZW5jaWVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbnF1ZXVlVGFzayhrZXksIHRhc2spO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2hlY2tGb3JEZWFkbG9ja3MoKTtcbiAgICAgICAgcHJvY2Vzc1F1ZXVlKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gZW5xdWV1ZVRhc2soa2V5LCB0YXNrKSB7XG4gICAgICAgICAgICByZWFkeVRhc2tzLnB1c2goKCkgPT4gcnVuVGFzayhrZXksIHRhc2spKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHByb2Nlc3NRdWV1ZSgpIHtcbiAgICAgICAgICAgIGlmIChjYW5jZWxlZCkgcmV0dXJuXG4gICAgICAgICAgICBpZiAocmVhZHlUYXNrcy5sZW5ndGggPT09IDAgJiYgcnVubmluZ1Rhc2tzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUocmVhZHlUYXNrcy5sZW5ndGggJiYgcnVubmluZ1Rhc2tzIDwgY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgICAgICB2YXIgcnVuID0gcmVhZHlUYXNrcy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIHJ1bigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGRMaXN0ZW5lcih0YXNrTmFtZSwgZm4pIHtcbiAgICAgICAgICAgIHZhciB0YXNrTGlzdGVuZXJzID0gbGlzdGVuZXJzW3Rhc2tOYW1lXTtcbiAgICAgICAgICAgIGlmICghdGFza0xpc3RlbmVycykge1xuICAgICAgICAgICAgICAgIHRhc2tMaXN0ZW5lcnMgPSBsaXN0ZW5lcnNbdGFza05hbWVdID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRhc2tMaXN0ZW5lcnMucHVzaChmbik7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB0YXNrQ29tcGxldGUodGFza05hbWUpIHtcbiAgICAgICAgICAgIHZhciB0YXNrTGlzdGVuZXJzID0gbGlzdGVuZXJzW3Rhc2tOYW1lXSB8fCBbXTtcbiAgICAgICAgICAgIHRhc2tMaXN0ZW5lcnMuZm9yRWFjaChmbiA9PiBmbigpKTtcbiAgICAgICAgICAgIHByb2Nlc3NRdWV1ZSgpO1xuICAgICAgICB9XG5cblxuICAgICAgICBmdW5jdGlvbiBydW5UYXNrKGtleSwgdGFzaykge1xuICAgICAgICAgICAgaWYgKGhhc0Vycm9yKSByZXR1cm47XG5cbiAgICAgICAgICAgIHZhciB0YXNrQ2FsbGJhY2sgPSBvbmx5T25jZSgoZXJyLCAuLi5yZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBydW5uaW5nVGFza3MtLTtcbiAgICAgICAgICAgICAgICBpZiAoZXJyID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBjYW5jZWxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCA8IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgW3Jlc3VsdF0gPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNhZmVSZXN1bHRzID0ge307XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHJlc3VsdHMpLmZvckVhY2gocmtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzYWZlUmVzdWx0c1tya2V5XSA9IHJlc3VsdHNbcmtleV07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzYWZlUmVzdWx0c1trZXldID0gcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICBoYXNFcnJvciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYW5jZWxlZCkgcmV0dXJuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgc2FmZVJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHNba2V5XSA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgdGFza0NvbXBsZXRlKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJ1bm5pbmdUYXNrcysrO1xuICAgICAgICAgICAgdmFyIHRhc2tGbiA9IHdyYXBBc3luYyh0YXNrW3Rhc2subGVuZ3RoIC0gMV0pO1xuICAgICAgICAgICAgaWYgKHRhc2subGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIHRhc2tGbihyZXN1bHRzLCB0YXNrQ2FsbGJhY2spO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0YXNrRm4odGFza0NhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNoZWNrRm9yRGVhZGxvY2tzKCkge1xuICAgICAgICAgICAgLy8gS2FobidzIGFsZ29yaXRobVxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvVG9wb2xvZ2ljYWxfc29ydGluZyNLYWhuLjI3c19hbGdvcml0aG1cbiAgICAgICAgICAgIC8vIGh0dHA6Ly9jb25uYWxsZS5ibG9nc3BvdC5jb20vMjAxMy8xMC90b3BvbG9naWNhbC1zb3J0aW5na2Fobi1hbGdvcml0aG0uaHRtbFxuICAgICAgICAgICAgdmFyIGN1cnJlbnRUYXNrO1xuICAgICAgICAgICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgICAgICAgICAgd2hpbGUgKHJlYWR5VG9DaGVjay5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGFzayA9IHJlYWR5VG9DaGVjay5wb3AoKTtcbiAgICAgICAgICAgICAgICBjb3VudGVyKys7XG4gICAgICAgICAgICAgICAgZ2V0RGVwZW5kZW50cyhjdXJyZW50VGFzaykuZm9yRWFjaChkZXBlbmRlbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoLS11bmNoZWNrZWREZXBlbmRlbmNpZXNbZGVwZW5kZW50XSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZHlUb0NoZWNrLnB1c2goZGVwZW5kZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY291bnRlciAhPT0gbnVtVGFza3MpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICdhc3luYy5hdXRvIGNhbm5vdCBleGVjdXRlIHRhc2tzIGR1ZSB0byBhIHJlY3Vyc2l2ZSBkZXBlbmRlbmN5J1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXREZXBlbmRlbnRzKHRhc2tOYW1lKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgICAgICBPYmplY3Qua2V5cyh0YXNrcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhc2sgPSB0YXNrc1trZXldO1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHRhc2spICYmIHRhc2suaW5kZXhPZih0YXNrTmFtZSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjYWxsYmFja1tQUk9NSVNFX1NZTUJPTF1cbiAgICB9XG5cbiAgICB2YXIgRk5fQVJHUyA9IC9eKD86YXN5bmNcXHMrKT8oPzpmdW5jdGlvbik/XFxzKlxcdypcXHMqXFwoXFxzKihbXildKylcXHMqXFwpKD86XFxzKnspLztcbiAgICB2YXIgQVJST1dfRk5fQVJHUyA9IC9eKD86YXN5bmNcXHMrKT9cXCg/XFxzKihbXik9XSspXFxzKlxcKT8oPzpcXHMqPT4pLztcbiAgICB2YXIgRk5fQVJHX1NQTElUID0gLywvO1xuICAgIHZhciBGTl9BUkcgPSAvKD0uKyk/KFxccyopJC87XG5cbiAgICBmdW5jdGlvbiBzdHJpcENvbW1lbnRzKHN0cmluZykge1xuICAgICAgICBsZXQgc3RyaXBwZWQgPSAnJztcbiAgICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgICAgbGV0IGVuZEJsb2NrQ29tbWVudCA9IHN0cmluZy5pbmRleE9mKCcqLycpO1xuICAgICAgICB3aGlsZSAoaW5kZXggPCBzdHJpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoc3RyaW5nW2luZGV4XSA9PT0gJy8nICYmIHN0cmluZ1tpbmRleCsxXSA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgLy8gaW5saW5lIGNvbW1lbnRcbiAgICAgICAgICAgICAgICBsZXQgZW5kSW5kZXggPSBzdHJpbmcuaW5kZXhPZignXFxuJywgaW5kZXgpO1xuICAgICAgICAgICAgICAgIGluZGV4ID0gKGVuZEluZGV4ID09PSAtMSkgPyBzdHJpbmcubGVuZ3RoIDogZW5kSW5kZXg7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKChlbmRCbG9ja0NvbW1lbnQgIT09IC0xKSAmJiAoc3RyaW5nW2luZGV4XSA9PT0gJy8nKSAmJiAoc3RyaW5nW2luZGV4KzFdID09PSAnKicpKSB7XG4gICAgICAgICAgICAgICAgLy8gYmxvY2sgY29tbWVudFxuICAgICAgICAgICAgICAgIGxldCBlbmRJbmRleCA9IHN0cmluZy5pbmRleE9mKCcqLycsIGluZGV4KTtcbiAgICAgICAgICAgICAgICBpZiAoZW5kSW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gZW5kSW5kZXggKyAyO1xuICAgICAgICAgICAgICAgICAgICBlbmRCbG9ja0NvbW1lbnQgPSBzdHJpbmcuaW5kZXhPZignKi8nLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyaXBwZWQgKz0gc3RyaW5nW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0cmlwcGVkICs9IHN0cmluZ1tpbmRleF07XG4gICAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyaXBwZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VQYXJhbXMoZnVuYykge1xuICAgICAgICBjb25zdCBzcmMgPSBzdHJpcENvbW1lbnRzKGZ1bmMudG9TdHJpbmcoKSk7XG4gICAgICAgIGxldCBtYXRjaCA9IHNyYy5tYXRjaChGTl9BUkdTKTtcbiAgICAgICAgaWYgKCFtYXRjaCkge1xuICAgICAgICAgICAgbWF0Y2ggPSBzcmMubWF0Y2goQVJST1dfRk5fQVJHUyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtYXRjaCkgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcGFyc2UgYXJncyBpbiBhdXRvSW5qZWN0XFxuU291cmNlOlxcbicgKyBzcmMpXG4gICAgICAgIGxldCBbLCBhcmdzXSA9IG1hdGNoO1xuICAgICAgICByZXR1cm4gYXJnc1xuICAgICAgICAgICAgLnJlcGxhY2UoL1xccy9nLCAnJylcbiAgICAgICAgICAgIC5zcGxpdChGTl9BUkdfU1BMSVQpXG4gICAgICAgICAgICAubWFwKChhcmcpID0+IGFyZy5yZXBsYWNlKEZOX0FSRywgJycpLnRyaW0oKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQSBkZXBlbmRlbmN5LWluamVjdGVkIHZlcnNpb24gb2YgdGhlIFthc3luYy5hdXRvXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuYXV0b30gZnVuY3Rpb24uIERlcGVuZGVudFxuICAgICAqIHRhc2tzIGFyZSBzcGVjaWZpZWQgYXMgcGFyYW1ldGVycyB0byB0aGUgZnVuY3Rpb24sIGFmdGVyIHRoZSB1c3VhbCBjYWxsYmFja1xuICAgICAqIHBhcmFtZXRlciwgd2l0aCB0aGUgcGFyYW1ldGVyIG5hbWVzIG1hdGNoaW5nIHRoZSBuYW1lcyBvZiB0aGUgdGFza3MgaXRcbiAgICAgKiBkZXBlbmRzIG9uLiBUaGlzIGNhbiBwcm92aWRlIGV2ZW4gbW9yZSByZWFkYWJsZSB0YXNrIGdyYXBocyB3aGljaCBjYW4gYmVcbiAgICAgKiBlYXNpZXIgdG8gbWFpbnRhaW4uXG4gICAgICpcbiAgICAgKiBJZiBhIGZpbmFsIGNhbGxiYWNrIGlzIHNwZWNpZmllZCwgdGhlIHRhc2sgcmVzdWx0cyBhcmUgc2ltaWxhcmx5IGluamVjdGVkLFxuICAgICAqIHNwZWNpZmllZCBhcyBuYW1lZCBwYXJhbWV0ZXJzIGFmdGVyIHRoZSBpbml0aWFsIGVycm9yIHBhcmFtZXRlci5cbiAgICAgKlxuICAgICAqIFRoZSBhdXRvSW5qZWN0IGZ1bmN0aW9uIGlzIHB1cmVseSBzeW50YWN0aWMgc3VnYXIgYW5kIGl0cyBzZW1hbnRpY3MgYXJlXG4gICAgICogb3RoZXJ3aXNlIGVxdWl2YWxlbnQgdG8gW2FzeW5jLmF1dG9de0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5hdXRvfS5cbiAgICAgKlxuICAgICAqIEBuYW1lIGF1dG9JbmplY3RcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5hdXRvXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuYXV0b31cbiAgICAgKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRhc2tzIC0gQW4gb2JqZWN0LCBlYWNoIG9mIHdob3NlIHByb3BlcnRpZXMgaXMgYW4ge0BsaW5rIEFzeW5jRnVuY3Rpb259IG9mXG4gICAgICogdGhlIGZvcm0gJ2Z1bmMoW2RlcGVuZGVuY2llcy4uLl0sIGNhbGxiYWNrKS4gVGhlIG9iamVjdCdzIGtleSBvZiBhIHByb3BlcnR5XG4gICAgICogc2VydmVzIGFzIHRoZSBuYW1lIG9mIHRoZSB0YXNrIGRlZmluZWQgYnkgdGhhdCBwcm9wZXJ0eSwgaS5lLiBjYW4gYmUgdXNlZFxuICAgICAqIHdoZW4gc3BlY2lmeWluZyByZXF1aXJlbWVudHMgZm9yIG90aGVyIHRhc2tzLlxuICAgICAqICogVGhlIGBjYWxsYmFja2AgcGFyYW1ldGVyIGlzIGEgYGNhbGxiYWNrKGVyciwgcmVzdWx0KWAgd2hpY2ggbXVzdCBiZSBjYWxsZWRcbiAgICAgKiAgIHdoZW4gZmluaXNoZWQsIHBhc3NpbmcgYW4gYGVycm9yYCAod2hpY2ggY2FuIGJlIGBudWxsYCkgYW5kIHRoZSByZXN1bHQgb2ZcbiAgICAgKiAgIHRoZSBmdW5jdGlvbidzIGV4ZWN1dGlvbi4gVGhlIHJlbWFpbmluZyBwYXJhbWV0ZXJzIG5hbWUgb3RoZXIgdGFza3Mgb25cbiAgICAgKiAgIHdoaWNoIHRoZSB0YXNrIGlzIGRlcGVuZGVudCwgYW5kIHRoZSByZXN1bHRzIGZyb20gdGhvc2UgdGFza3MgYXJlIHRoZVxuICAgICAqICAgYXJndW1lbnRzIG9mIHRob3NlIHBhcmFtZXRlcnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbFxuICAgICAqIHRoZSB0YXNrcyBoYXZlIGJlZW4gY29tcGxldGVkLiBJdCByZWNlaXZlcyB0aGUgYGVycmAgYXJndW1lbnQgaWYgYW55IGB0YXNrc2BcbiAgICAgKiBwYXNzIGFuIGVycm9yIHRvIHRoZWlyIGNhbGxiYWNrLCBhbmQgYSBgcmVzdWx0c2Agb2JqZWN0IHdpdGggYW55IGNvbXBsZXRlZFxuICAgICAqIHRhc2sgcmVzdWx0cywgc2ltaWxhciB0byBgYXV0b2AuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgbm8gY2FsbGJhY2sgaXMgcGFzc2VkXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIC8vICBUaGUgZXhhbXBsZSBmcm9tIGBhdXRvYCBjYW4gYmUgcmV3cml0dGVuIGFzIGZvbGxvd3M6XG4gICAgICogYXN5bmMuYXV0b0luamVjdCh7XG4gICAgICogICAgIGdldF9kYXRhOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgLy8gYXN5bmMgY29kZSB0byBnZXQgc29tZSBkYXRhXG4gICAgICogICAgICAgICBjYWxsYmFjayhudWxsLCAnZGF0YScsICdjb252ZXJ0ZWQgdG8gYXJyYXknKTtcbiAgICAgKiAgICAgfSxcbiAgICAgKiAgICAgbWFrZV9mb2xkZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICAvLyBhc3luYyBjb2RlIHRvIGNyZWF0ZSBhIGRpcmVjdG9yeSB0byBzdG9yZSBhIGZpbGUgaW5cbiAgICAgKiAgICAgICAgIC8vIHRoaXMgaXMgcnVuIGF0IHRoZSBzYW1lIHRpbWUgYXMgZ2V0dGluZyB0aGUgZGF0YVxuICAgICAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ2ZvbGRlcicpO1xuICAgICAqICAgICB9LFxuICAgICAqICAgICB3cml0ZV9maWxlOiBmdW5jdGlvbihnZXRfZGF0YSwgbWFrZV9mb2xkZXIsIGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICAvLyBvbmNlIHRoZXJlIGlzIHNvbWUgZGF0YSBhbmQgdGhlIGRpcmVjdG9yeSBleGlzdHMsXG4gICAgICogICAgICAgICAvLyB3cml0ZSB0aGUgZGF0YSB0byBhIGZpbGUgaW4gdGhlIGRpcmVjdG9yeVxuICAgICAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ2ZpbGVuYW1lJyk7XG4gICAgICogICAgIH0sXG4gICAgICogICAgIGVtYWlsX2xpbms6IGZ1bmN0aW9uKHdyaXRlX2ZpbGUsIGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICAvLyBvbmNlIHRoZSBmaWxlIGlzIHdyaXR0ZW4gbGV0J3MgZW1haWwgYSBsaW5rIHRvIGl0Li4uXG4gICAgICogICAgICAgICAvLyB3cml0ZV9maWxlIGNvbnRhaW5zIHRoZSBmaWxlbmFtZSByZXR1cm5lZCBieSB3cml0ZV9maWxlLlxuICAgICAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgeydmaWxlJzp3cml0ZV9maWxlLCAnZW1haWwnOid1c2VyQGV4YW1wbGUuY29tJ30pO1xuICAgICAqICAgICB9XG4gICAgICogfSwgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKCdlcnIgPSAnLCBlcnIpO1xuICAgICAqICAgICBjb25zb2xlLmxvZygnZW1haWxfbGluayA9ICcsIHJlc3VsdHMuZW1haWxfbGluayk7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBJZiB5b3UgYXJlIHVzaW5nIGEgSlMgbWluaWZpZXIgdGhhdCBtYW5nbGVzIHBhcmFtZXRlciBuYW1lcywgYGF1dG9JbmplY3RgXG4gICAgICogLy8gd2lsbCBub3Qgd29yayB3aXRoIHBsYWluIGZ1bmN0aW9ucywgc2luY2UgdGhlIHBhcmFtZXRlciBuYW1lcyB3aWxsIGJlXG4gICAgICogLy8gY29sbGFwc2VkIHRvIGEgc2luZ2xlIGxldHRlciBpZGVudGlmaWVyLiAgVG8gd29yayBhcm91bmQgdGhpcywgeW91IGNhblxuICAgICAqIC8vIGV4cGxpY2l0bHkgc3BlY2lmeSB0aGUgbmFtZXMgb2YgdGhlIHBhcmFtZXRlcnMgeW91ciB0YXNrIGZ1bmN0aW9uIG5lZWRzXG4gICAgICogLy8gaW4gYW4gYXJyYXksIHNpbWlsYXIgdG8gQW5ndWxhci5qcyBkZXBlbmRlbmN5IGluamVjdGlvbi5cbiAgICAgKlxuICAgICAqIC8vIFRoaXMgc3RpbGwgaGFzIGFuIGFkdmFudGFnZSBvdmVyIHBsYWluIGBhdXRvYCwgc2luY2UgdGhlIHJlc3VsdHMgYSB0YXNrXG4gICAgICogLy8gZGVwZW5kcyBvbiBhcmUgc3RpbGwgc3ByZWFkIGludG8gYXJndW1lbnRzLlxuICAgICAqIGFzeW5jLmF1dG9JbmplY3Qoe1xuICAgICAqICAgICAvLy4uLlxuICAgICAqICAgICB3cml0ZV9maWxlOiBbJ2dldF9kYXRhJywgJ21ha2VfZm9sZGVyJywgZnVuY3Rpb24oZ2V0X2RhdGEsIG1ha2VfZm9sZGVyLCBjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ2ZpbGVuYW1lJyk7XG4gICAgICogICAgIH1dLFxuICAgICAqICAgICBlbWFpbF9saW5rOiBbJ3dyaXRlX2ZpbGUnLCBmdW5jdGlvbih3cml0ZV9maWxlLCBjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgeydmaWxlJzp3cml0ZV9maWxlLCAnZW1haWwnOid1c2VyQGV4YW1wbGUuY29tJ30pO1xuICAgICAqICAgICB9XVxuICAgICAqICAgICAvLy4uLlxuICAgICAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICAgICAqICAgICBjb25zb2xlLmxvZygnZXJyID0gJywgZXJyKTtcbiAgICAgKiAgICAgY29uc29sZS5sb2coJ2VtYWlsX2xpbmsgPSAnLCByZXN1bHRzLmVtYWlsX2xpbmspO1xuICAgICAqIH0pO1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGF1dG9JbmplY3QodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBuZXdUYXNrcyA9IHt9O1xuXG4gICAgICAgIE9iamVjdC5rZXlzKHRhc2tzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICB2YXIgdGFza0ZuID0gdGFza3Nba2V5XTtcbiAgICAgICAgICAgIHZhciBwYXJhbXM7XG4gICAgICAgICAgICB2YXIgZm5Jc0FzeW5jID0gaXNBc3luYyh0YXNrRm4pO1xuICAgICAgICAgICAgdmFyIGhhc05vRGVwcyA9XG4gICAgICAgICAgICAgICAgKCFmbklzQXN5bmMgJiYgdGFza0ZuLmxlbmd0aCA9PT0gMSkgfHxcbiAgICAgICAgICAgICAgICAoZm5Jc0FzeW5jICYmIHRhc2tGbi5sZW5ndGggPT09IDApO1xuXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXNrRm4pKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zID0gWy4uLnRhc2tGbl07XG4gICAgICAgICAgICAgICAgdGFza0ZuID0gcGFyYW1zLnBvcCgpO1xuXG4gICAgICAgICAgICAgICAgbmV3VGFza3Nba2V5XSA9IHBhcmFtcy5jb25jYXQocGFyYW1zLmxlbmd0aCA+IDAgPyBuZXdUYXNrIDogdGFza0ZuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaGFzTm9EZXBzKSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gZGVwZW5kZW5jaWVzLCB1c2UgdGhlIGZ1bmN0aW9uIGFzLWlzXG4gICAgICAgICAgICAgICAgbmV3VGFza3Nba2V5XSA9IHRhc2tGbjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zID0gcGFyc2VQYXJhbXModGFza0ZuKTtcbiAgICAgICAgICAgICAgICBpZiAoKHRhc2tGbi5sZW5ndGggPT09IDAgJiYgIWZuSXNBc3luYykgJiYgcGFyYW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJhdXRvSW5qZWN0IHRhc2sgZnVuY3Rpb25zIHJlcXVpcmUgZXhwbGljaXQgcGFyYW1ldGVycy5cIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGNhbGxiYWNrIHBhcmFtXG4gICAgICAgICAgICAgICAgaWYgKCFmbklzQXN5bmMpIHBhcmFtcy5wb3AoKTtcblxuICAgICAgICAgICAgICAgIG5ld1Rhc2tzW2tleV0gPSBwYXJhbXMuY29uY2F0KG5ld1Rhc2spO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBuZXdUYXNrKHJlc3VsdHMsIHRhc2tDYikge1xuICAgICAgICAgICAgICAgIHZhciBuZXdBcmdzID0gcGFyYW1zLm1hcChuYW1lID0+IHJlc3VsdHNbbmFtZV0pO1xuICAgICAgICAgICAgICAgIG5ld0FyZ3MucHVzaCh0YXNrQ2IpO1xuICAgICAgICAgICAgICAgIHdyYXBBc3luYyh0YXNrRm4pKC4uLm5ld0FyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gYXV0byhuZXdUYXNrcywgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIC8vIFNpbXBsZSBkb3VibHkgbGlua2VkIGxpc3QgKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0RvdWJseV9saW5rZWRfbGlzdCkgaW1wbGVtZW50YXRpb25cbiAgICAvLyB1c2VkIGZvciBxdWV1ZXMuIFRoaXMgaW1wbGVtZW50YXRpb24gYXNzdW1lcyB0aGF0IHRoZSBub2RlIHByb3ZpZGVkIGJ5IHRoZSB1c2VyIGNhbiBiZSBtb2RpZmllZFxuICAgIC8vIHRvIGFkanVzdCB0aGUgbmV4dCBhbmQgbGFzdCBwcm9wZXJ0aWVzLiBXZSBpbXBsZW1lbnQgb25seSB0aGUgbWluaW1hbCBmdW5jdGlvbmFsaXR5XG4gICAgLy8gZm9yIHF1ZXVlIHN1cHBvcnQuXG4gICAgY2xhc3MgRExMIHtcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgICB0aGlzLmhlYWQgPSB0aGlzLnRhaWwgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5sZW5ndGggPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVtb3ZlTGluayhub2RlKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5wcmV2KSBub2RlLnByZXYubmV4dCA9IG5vZGUubmV4dDtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5oZWFkID0gbm9kZS5uZXh0O1xuICAgICAgICAgICAgaWYgKG5vZGUubmV4dCkgbm9kZS5uZXh0LnByZXYgPSBub2RlLnByZXY7XG4gICAgICAgICAgICBlbHNlIHRoaXMudGFpbCA9IG5vZGUucHJldjtcblxuICAgICAgICAgICAgbm9kZS5wcmV2ID0gbm9kZS5uZXh0ID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMubGVuZ3RoIC09IDE7XG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVtcHR5ICgpIHtcbiAgICAgICAgICAgIHdoaWxlKHRoaXMuaGVhZCkgdGhpcy5zaGlmdCgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBpbnNlcnRBZnRlcihub2RlLCBuZXdOb2RlKSB7XG4gICAgICAgICAgICBuZXdOb2RlLnByZXYgPSBub2RlO1xuICAgICAgICAgICAgbmV3Tm9kZS5uZXh0ID0gbm9kZS5uZXh0O1xuICAgICAgICAgICAgaWYgKG5vZGUubmV4dCkgbm9kZS5uZXh0LnByZXYgPSBuZXdOb2RlO1xuICAgICAgICAgICAgZWxzZSB0aGlzLnRhaWwgPSBuZXdOb2RlO1xuICAgICAgICAgICAgbm9kZS5uZXh0ID0gbmV3Tm9kZTtcbiAgICAgICAgICAgIHRoaXMubGVuZ3RoICs9IDE7XG4gICAgICAgIH1cblxuICAgICAgICBpbnNlcnRCZWZvcmUobm9kZSwgbmV3Tm9kZSkge1xuICAgICAgICAgICAgbmV3Tm9kZS5wcmV2ID0gbm9kZS5wcmV2O1xuICAgICAgICAgICAgbmV3Tm9kZS5uZXh0ID0gbm9kZTtcbiAgICAgICAgICAgIGlmIChub2RlLnByZXYpIG5vZGUucHJldi5uZXh0ID0gbmV3Tm9kZTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5oZWFkID0gbmV3Tm9kZTtcbiAgICAgICAgICAgIG5vZGUucHJldiA9IG5ld05vZGU7XG4gICAgICAgICAgICB0aGlzLmxlbmd0aCArPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgdW5zaGlmdChub2RlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5oZWFkKSB0aGlzLmluc2VydEJlZm9yZSh0aGlzLmhlYWQsIG5vZGUpO1xuICAgICAgICAgICAgZWxzZSBzZXRJbml0aWFsKHRoaXMsIG5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVzaChub2RlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50YWlsKSB0aGlzLmluc2VydEFmdGVyKHRoaXMudGFpbCwgbm9kZSk7XG4gICAgICAgICAgICBlbHNlIHNldEluaXRpYWwodGhpcywgbm9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICBzaGlmdCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhlYWQgJiYgdGhpcy5yZW1vdmVMaW5rKHRoaXMuaGVhZCk7XG4gICAgICAgIH1cblxuICAgICAgICBwb3AoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50YWlsICYmIHRoaXMucmVtb3ZlTGluayh0aGlzLnRhaWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdG9BcnJheSgpIHtcbiAgICAgICAgICAgIHJldHVybiBbLi4udGhpc11cbiAgICAgICAgfVxuXG4gICAgICAgICpbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgICAgICAgICB2YXIgY3VyID0gdGhpcy5oZWFkO1xuICAgICAgICAgICAgd2hpbGUgKGN1cikge1xuICAgICAgICAgICAgICAgIHlpZWxkIGN1ci5kYXRhO1xuICAgICAgICAgICAgICAgIGN1ciA9IGN1ci5uZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVtb3ZlICh0ZXN0Rm4pIHtcbiAgICAgICAgICAgIHZhciBjdXJyID0gdGhpcy5oZWFkO1xuICAgICAgICAgICAgd2hpbGUoY3Vycikge1xuICAgICAgICAgICAgICAgIHZhciB7bmV4dH0gPSBjdXJyO1xuICAgICAgICAgICAgICAgIGlmICh0ZXN0Rm4oY3VycikpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVMaW5rKGN1cnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJyID0gbmV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0SW5pdGlhbChkbGwsIG5vZGUpIHtcbiAgICAgICAgZGxsLmxlbmd0aCA9IDE7XG4gICAgICAgIGRsbC5oZWFkID0gZGxsLnRhaWwgPSBub2RlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHF1ZXVlKHdvcmtlciwgY29uY3VycmVuY3ksIHBheWxvYWQpIHtcbiAgICAgICAgaWYgKGNvbmN1cnJlbmN5ID09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKGNvbmN1cnJlbmN5ID09PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQ29uY3VycmVuY3kgbXVzdCBub3QgYmUgemVybycpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIF93b3JrZXIgPSB3cmFwQXN5bmMod29ya2VyKTtcbiAgICAgICAgdmFyIG51bVJ1bm5pbmcgPSAwO1xuICAgICAgICB2YXIgd29ya2Vyc0xpc3QgPSBbXTtcbiAgICAgICAgY29uc3QgZXZlbnRzID0ge1xuICAgICAgICAgICAgZXJyb3I6IFtdLFxuICAgICAgICAgICAgZHJhaW46IFtdLFxuICAgICAgICAgICAgc2F0dXJhdGVkOiBbXSxcbiAgICAgICAgICAgIHVuc2F0dXJhdGVkOiBbXSxcbiAgICAgICAgICAgIGVtcHR5OiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uIChldmVudCwgaGFuZGxlcikge1xuICAgICAgICAgICAgZXZlbnRzW2V2ZW50XS5wdXNoKGhhbmRsZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25jZSAoZXZlbnQsIGhhbmRsZXIpIHtcbiAgICAgICAgICAgIGNvbnN0IGhhbmRsZUFuZFJlbW92ZSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgb2ZmKGV2ZW50LCBoYW5kbGVBbmRSZW1vdmUpO1xuICAgICAgICAgICAgICAgIGhhbmRsZXIoLi4uYXJncyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZXZlbnRzW2V2ZW50XS5wdXNoKGhhbmRsZUFuZFJlbW92ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvZmYgKGV2ZW50LCBoYW5kbGVyKSB7XG4gICAgICAgICAgICBpZiAoIWV2ZW50KSByZXR1cm4gT2JqZWN0LmtleXMoZXZlbnRzKS5mb3JFYWNoKGV2ID0+IGV2ZW50c1tldl0gPSBbXSlcbiAgICAgICAgICAgIGlmICghaGFuZGxlcikgcmV0dXJuIGV2ZW50c1tldmVudF0gPSBbXVxuICAgICAgICAgICAgZXZlbnRzW2V2ZW50XSA9IGV2ZW50c1tldmVudF0uZmlsdGVyKGV2ID0+IGV2ICE9PSBoYW5kbGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHRyaWdnZXIgKGV2ZW50LCAuLi5hcmdzKSB7XG4gICAgICAgICAgICBldmVudHNbZXZlbnRdLmZvckVhY2goaGFuZGxlciA9PiBoYW5kbGVyKC4uLmFyZ3MpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwcm9jZXNzaW5nU2NoZWR1bGVkID0gZmFsc2U7XG4gICAgICAgIGZ1bmN0aW9uIF9pbnNlcnQoZGF0YSwgaW5zZXJ0QXRGcm9udCwgcmVqZWN0T25FcnJvciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsICYmIHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndGFzayBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHEuc3RhcnRlZCA9IHRydWU7XG5cbiAgICAgICAgICAgIHZhciByZXMsIHJlajtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHByb21pc2VDYWxsYmFjayAoZXJyLCAuLi5hcmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gd2UgZG9uJ3QgY2FyZSBhYm91dCB0aGUgZXJyb3IsIGxldCB0aGUgZ2xvYmFsIGVycm9yIGhhbmRsZXJcbiAgICAgICAgICAgICAgICAvLyBkZWFsIHdpdGggaXRcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gcmVqZWN0T25FcnJvciA/IHJlaihlcnIpIDogcmVzKClcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkgcmV0dXJuIHJlcyhhcmdzWzBdKVxuICAgICAgICAgICAgICAgIHJlcyhhcmdzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGl0ZW0gPSBxLl9jcmVhdGVUYXNrSXRlbShcbiAgICAgICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgICAgIHJlamVjdE9uRXJyb3IgPyBwcm9taXNlQ2FsbGJhY2sgOlxuICAgICAgICAgICAgICAgICAgICAoY2FsbGJhY2sgfHwgcHJvbWlzZUNhbGxiYWNrKVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKGluc2VydEF0RnJvbnQpIHtcbiAgICAgICAgICAgICAgICBxLl90YXNrcy51bnNoaWZ0KGl0ZW0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBxLl90YXNrcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXByb2Nlc3NpbmdTY2hlZHVsZWQpIHtcbiAgICAgICAgICAgICAgICBwcm9jZXNzaW5nU2NoZWR1bGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUkMSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3NpbmdTY2hlZHVsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcS5wcm9jZXNzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChyZWplY3RPbkVycm9yIHx8ICFjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlcyA9IHJlc29sdmU7XG4gICAgICAgICAgICAgICAgICAgIHJlaiA9IHJlamVjdDtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gX2NyZWF0ZUNCKHRhc2tzKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGVyciwgLi4uYXJncykge1xuICAgICAgICAgICAgICAgIG51bVJ1bm5pbmcgLT0gMTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGFza3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0YXNrID0gdGFza3NbaV07XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gd29ya2Vyc0xpc3QuaW5kZXhPZih0YXNrKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JrZXJzTGlzdC5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGluZGV4ID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd29ya2Vyc0xpc3Quc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRhc2suY2FsbGJhY2soZXJyLCAuLi5hcmdzKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyaWdnZXIoJ2Vycm9yJywgZXJyLCB0YXNrLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKG51bVJ1bm5pbmcgPD0gKHEuY29uY3VycmVuY3kgLSBxLmJ1ZmZlcikgKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyaWdnZXIoJ3Vuc2F0dXJhdGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHEuaWRsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyaWdnZXIoJ2RyYWluJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHEucHJvY2VzcygpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIF9tYXliZURyYWluKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChkYXRhLmxlbmd0aCA9PT0gMCAmJiBxLmlkbGUoKSkge1xuICAgICAgICAgICAgICAgIC8vIGNhbGwgZHJhaW4gaW1tZWRpYXRlbHkgaWYgdGhlcmUgYXJlIG5vIHRhc2tzXG4gICAgICAgICAgICAgICAgc2V0SW1tZWRpYXRlJDEoKCkgPT4gdHJpZ2dlcignZHJhaW4nKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXZlbnRNZXRob2QgPSAobmFtZSkgPT4gKGhhbmRsZXIpID0+IHtcbiAgICAgICAgICAgIGlmICghaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG9uY2UobmFtZSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb2ZmKG5hbWUpO1xuICAgICAgICAgICAgb24obmFtZSwgaGFuZGxlcik7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaXNQcm9jZXNzaW5nID0gZmFsc2U7XG4gICAgICAgIHZhciBxID0ge1xuICAgICAgICAgICAgX3Rhc2tzOiBuZXcgRExMKCksXG4gICAgICAgICAgICBfY3JlYXRlVGFza0l0ZW0gKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICpbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgICAgICAgICAgICAgeWllbGQqIHEuX3Rhc2tzW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb25jdXJyZW5jeSxcbiAgICAgICAgICAgIHBheWxvYWQsXG4gICAgICAgICAgICBidWZmZXI6IGNvbmN1cnJlbmN5IC8gNCxcbiAgICAgICAgICAgIHN0YXJ0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgcGF1c2VkOiBmYWxzZSxcbiAgICAgICAgICAgIHB1c2ggKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9tYXliZURyYWluKGRhdGEpKSByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEubWFwKGRhdHVtID0+IF9pbnNlcnQoZGF0dW0sIGZhbHNlLCBmYWxzZSwgY2FsbGJhY2spKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gX2luc2VydChkYXRhLCBmYWxzZSwgZmFsc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwdXNoQXN5bmMgKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9tYXliZURyYWluKGRhdGEpKSByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEubWFwKGRhdHVtID0+IF9pbnNlcnQoZGF0dW0sIGZhbHNlLCB0cnVlLCBjYWxsYmFjaykpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBfaW5zZXJ0KGRhdGEsIGZhbHNlLCB0cnVlLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAga2lsbCAoKSB7XG4gICAgICAgICAgICAgICAgb2ZmKCk7XG4gICAgICAgICAgICAgICAgcS5fdGFza3MuZW1wdHkoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1bnNoaWZ0IChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfbWF5YmVEcmFpbihkYXRhKSkgcmV0dXJuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhLm1hcChkYXR1bSA9PiBfaW5zZXJ0KGRhdHVtLCB0cnVlLCBmYWxzZSwgY2FsbGJhY2spKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gX2luc2VydChkYXRhLCB0cnVlLCBmYWxzZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVuc2hpZnRBc3luYyAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoX21heWJlRHJhaW4oZGF0YSkpIHJldHVyblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5tYXAoZGF0dW0gPT4gX2luc2VydChkYXR1bSwgdHJ1ZSwgdHJ1ZSwgY2FsbGJhY2spKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gX2luc2VydChkYXRhLCB0cnVlLCB0cnVlLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVtb3ZlICh0ZXN0Rm4pIHtcbiAgICAgICAgICAgICAgICBxLl90YXNrcy5yZW1vdmUodGVzdEZuKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9jZXNzICgpIHtcbiAgICAgICAgICAgICAgICAvLyBBdm9pZCB0cnlpbmcgdG8gc3RhcnQgdG9vIG1hbnkgcHJvY2Vzc2luZyBvcGVyYXRpb25zLiBUaGlzIGNhbiBvY2N1clxuICAgICAgICAgICAgICAgIC8vIHdoZW4gY2FsbGJhY2tzIHJlc29sdmUgc3luY2hyb25vdXNseSAoIzEyNjcpLlxuICAgICAgICAgICAgICAgIGlmIChpc1Byb2Nlc3NpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpc1Byb2Nlc3NpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHdoaWxlKCFxLnBhdXNlZCAmJiBudW1SdW5uaW5nIDwgcS5jb25jdXJyZW5jeSAmJiBxLl90YXNrcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFza3MgPSBbXSwgZGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbCA9IHEuX3Rhc2tzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHEucGF5bG9hZCkgbCA9IE1hdGgubWluKGwsIHEucGF5bG9hZCk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbm9kZSA9IHEuX3Rhc2tzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrcy5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgd29ya2Vyc0xpc3QucHVzaChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEucHVzaChub2RlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbnVtUnVubmluZyArPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChxLl90YXNrcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyaWdnZXIoJ2VtcHR5Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAobnVtUnVubmluZyA9PT0gcS5jb25jdXJyZW5jeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcignc2F0dXJhdGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB2YXIgY2IgPSBvbmx5T25jZShfY3JlYXRlQ0IodGFza3MpKTtcbiAgICAgICAgICAgICAgICAgICAgX3dvcmtlcihkYXRhLCBjYik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlzUHJvY2Vzc2luZyA9IGZhbHNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxlbmd0aCAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHEuX3Rhc2tzLmxlbmd0aDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBydW5uaW5nICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVtUnVubmluZztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3b3JrZXJzTGlzdCAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdvcmtlcnNMaXN0O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlkbGUoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHEuX3Rhc2tzLmxlbmd0aCArIG51bVJ1bm5pbmcgPT09IDA7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGF1c2UgKCkge1xuICAgICAgICAgICAgICAgIHEucGF1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXN1bWUgKCkge1xuICAgICAgICAgICAgICAgIGlmIChxLnBhdXNlZCA9PT0gZmFsc2UpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgcS5wYXVzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUkMShxLnByb2Nlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAvLyBkZWZpbmUgdGhlc2UgYXMgZml4ZWQgcHJvcGVydGllcywgc28gcGVvcGxlIGdldCB1c2VmdWwgZXJyb3JzIHdoZW4gdXBkYXRpbmdcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMocSwge1xuICAgICAgICAgICAgc2F0dXJhdGVkOiB7XG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBldmVudE1ldGhvZCgnc2F0dXJhdGVkJylcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1bnNhdHVyYXRlZDoge1xuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZXZlbnRNZXRob2QoJ3Vuc2F0dXJhdGVkJylcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbXB0eToge1xuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZXZlbnRNZXRob2QoJ2VtcHR5JylcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFpbjoge1xuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZXZlbnRNZXRob2QoJ2RyYWluJylcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZXZlbnRNZXRob2QoJ2Vycm9yJylcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgYGNhcmdvYCBvYmplY3Qgd2l0aCB0aGUgc3BlY2lmaWVkIHBheWxvYWQuIFRhc2tzIGFkZGVkIHRvIHRoZVxuICAgICAqIGNhcmdvIHdpbGwgYmUgcHJvY2Vzc2VkIGFsdG9nZXRoZXIgKHVwIHRvIHRoZSBgcGF5bG9hZGAgbGltaXQpLiBJZiB0aGVcbiAgICAgKiBgd29ya2VyYCBpcyBpbiBwcm9ncmVzcywgdGhlIHRhc2sgaXMgcXVldWVkIHVudGlsIGl0IGJlY29tZXMgYXZhaWxhYmxlLiBPbmNlXG4gICAgICogdGhlIGB3b3JrZXJgIGhhcyBjb21wbGV0ZWQgc29tZSB0YXNrcywgZWFjaCBjYWxsYmFjayBvZiB0aG9zZSB0YXNrcyBpc1xuICAgICAqIGNhbGxlZC4gQ2hlY2sgb3V0IFt0aGVzZV0oaHR0cHM6Ly9jYW1vLmdpdGh1YnVzZXJjb250ZW50LmNvbS82YmJkMzZmNGNmNWIzNWEwZjExYTk2ZGNkMmU5NzcxMWZmYzJmYjM3LzY4NzQ3NDcwNzMzYTJmMmY2NjJlNjM2YzZmNzU2NDJlNjc2OTc0Njg3NTYyMmU2MzZmNmQyZjYxNzM3MzY1NzQ3MzJmMzEzNjM3MzYzODM3MzEyZjM2MzgzMTMwMzgyZjYyNjI2MzMwNjM2NjYyMzAyZDM1NjYzMjM5MmQzMTMxNjUzMjJkMzkzNzM0NjYyZDMzMzMzOTM3NjMzNjM0NjQ2MzM4MzUzODJlNjc2OTY2KSBbYW5pbWF0aW9uc10oaHR0cHM6Ly9jYW1vLmdpdGh1YnVzZXJjb250ZW50LmNvbS9mNDgxMGUwMGUxYzVmNWY4YWRkYmUzZTlmNDkwNjRmZDVkMTAyNjk5LzY4NzQ3NDcwNzMzYTJmMmY2NjJlNjM2YzZmNzU2NDJlNjc2OTc0Njg3NTYyMmU2MzZmNmQyZjYxNzM3MzY1NzQ3MzJmMzEzNjM3MzYzODM3MzEyZjM2MzgzMTMwMzEyZjM4MzQ2MzM5MzIzMDM2MzYyZDM1NjYzMjM5MmQzMTMxNjUzMjJkMzgzMTM0NjYyZDM5NjQzMzY0MzAzMjM0MzEzMzYyNjY2NDJlNjc2OTY2KVxuICAgICAqIGZvciBob3cgYGNhcmdvYCBhbmQgYHF1ZXVlYCB3b3JrLlxuICAgICAqXG4gICAgICogV2hpbGUgW2BxdWV1ZWBde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5xdWV1ZX0gcGFzc2VzIG9ubHkgb25lIHRhc2sgdG8gb25lIG9mIGEgZ3JvdXAgb2Ygd29ya2Vyc1xuICAgICAqIGF0IGEgdGltZSwgY2FyZ28gcGFzc2VzIGFuIGFycmF5IG9mIHRhc2tzIHRvIGEgc2luZ2xlIHdvcmtlciwgcmVwZWF0aW5nXG4gICAgICogd2hlbiB0aGUgd29ya2VyIGlzIGZpbmlzaGVkLlxuICAgICAqXG4gICAgICogQG5hbWUgY2FyZ29cbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5xdWV1ZV17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnF1ZXVlfVxuICAgICAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IHdvcmtlciAtIEFuIGFzeW5jaHJvbm91cyBmdW5jdGlvbiBmb3IgcHJvY2Vzc2luZyBhbiBhcnJheVxuICAgICAqIG9mIHF1ZXVlZCB0YXNrcy4gSW52b2tlZCB3aXRoIGAodGFza3MsIGNhbGxiYWNrKWAuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtwYXlsb2FkPUluZmluaXR5XSAtIEFuIG9wdGlvbmFsIGBpbnRlZ2VyYCBmb3IgZGV0ZXJtaW5pbmdcbiAgICAgKiBob3cgbWFueSB0YXNrcyBzaG91bGQgYmUgcHJvY2Vzc2VkIHBlciByb3VuZDsgaWYgb21pdHRlZCwgdGhlIGRlZmF1bHQgaXNcbiAgICAgKiB1bmxpbWl0ZWQuXG4gICAgICogQHJldHVybnMge21vZHVsZTpDb250cm9sRmxvdy5RdWV1ZU9iamVjdH0gQSBjYXJnbyBvYmplY3QgdG8gbWFuYWdlIHRoZSB0YXNrcy4gQ2FsbGJhY2tzIGNhblxuICAgICAqIGF0dGFjaGVkIGFzIGNlcnRhaW4gcHJvcGVydGllcyB0byBsaXN0ZW4gZm9yIHNwZWNpZmljIGV2ZW50cyBkdXJpbmcgdGhlXG4gICAgICogbGlmZWN5Y2xlIG9mIHRoZSBjYXJnbyBhbmQgaW5uZXIgcXVldWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIC8vIGNyZWF0ZSBhIGNhcmdvIG9iamVjdCB3aXRoIHBheWxvYWQgMlxuICAgICAqIHZhciBjYXJnbyA9IGFzeW5jLmNhcmdvKGZ1bmN0aW9uKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAqICAgICBmb3IgKHZhciBpPTA7IGk8dGFza3MubGVuZ3RoOyBpKyspIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKCdoZWxsbyAnICsgdGFza3NbaV0ubmFtZSk7XG4gICAgICogICAgIH1cbiAgICAgKiAgICAgY2FsbGJhY2soKTtcbiAgICAgKiB9LCAyKTtcbiAgICAgKlxuICAgICAqIC8vIGFkZCBzb21lIGl0ZW1zXG4gICAgICogY2FyZ28ucHVzaCh7bmFtZTogJ2Zvbyd9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coJ2ZpbmlzaGVkIHByb2Nlc3NpbmcgZm9vJyk7XG4gICAgICogfSk7XG4gICAgICogY2FyZ28ucHVzaCh7bmFtZTogJ2Jhcid9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coJ2ZpbmlzaGVkIHByb2Nlc3NpbmcgYmFyJyk7XG4gICAgICogfSk7XG4gICAgICogYXdhaXQgY2FyZ28ucHVzaCh7bmFtZTogJ2Jheid9KTtcbiAgICAgKiBjb25zb2xlLmxvZygnZmluaXNoZWQgcHJvY2Vzc2luZyBiYXonKTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjYXJnbyh3b3JrZXIsIHBheWxvYWQpIHtcbiAgICAgICAgcmV0dXJuIHF1ZXVlKHdvcmtlciwgMSwgcGF5bG9hZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGBjYXJnb1F1ZXVlYCBvYmplY3Qgd2l0aCB0aGUgc3BlY2lmaWVkIHBheWxvYWQuIFRhc2tzIGFkZGVkIHRvIHRoZVxuICAgICAqIGNhcmdvUXVldWUgd2lsbCBiZSBwcm9jZXNzZWQgdG9nZXRoZXIgKHVwIHRvIHRoZSBgcGF5bG9hZGAgbGltaXQpIGluIGBjb25jdXJyZW5jeWAgcGFyYWxsZWwgd29ya2Vycy5cbiAgICAgKiBJZiB0aGUgYWxsIGB3b3JrZXJzYCBhcmUgaW4gcHJvZ3Jlc3MsIHRoZSB0YXNrIGlzIHF1ZXVlZCB1bnRpbCBvbmUgYmVjb21lcyBhdmFpbGFibGUuIE9uY2VcbiAgICAgKiBhIGB3b3JrZXJgIGhhcyBjb21wbGV0ZWQgc29tZSB0YXNrcywgZWFjaCBjYWxsYmFjayBvZiB0aG9zZSB0YXNrcyBpc1xuICAgICAqIGNhbGxlZC4gQ2hlY2sgb3V0IFt0aGVzZV0oaHR0cHM6Ly9jYW1vLmdpdGh1YnVzZXJjb250ZW50LmNvbS82YmJkMzZmNGNmNWIzNWEwZjExYTk2ZGNkMmU5NzcxMWZmYzJmYjM3LzY4NzQ3NDcwNzMzYTJmMmY2NjJlNjM2YzZmNzU2NDJlNjc2OTc0Njg3NTYyMmU2MzZmNmQyZjYxNzM3MzY1NzQ3MzJmMzEzNjM3MzYzODM3MzEyZjM2MzgzMTMwMzgyZjYyNjI2MzMwNjM2NjYyMzAyZDM1NjYzMjM5MmQzMTMxNjUzMjJkMzkzNzM0NjYyZDMzMzMzOTM3NjMzNjM0NjQ2MzM4MzUzODJlNjc2OTY2KSBbYW5pbWF0aW9uc10oaHR0cHM6Ly9jYW1vLmdpdGh1YnVzZXJjb250ZW50LmNvbS9mNDgxMGUwMGUxYzVmNWY4YWRkYmUzZTlmNDkwNjRmZDVkMTAyNjk5LzY4NzQ3NDcwNzMzYTJmMmY2NjJlNjM2YzZmNzU2NDJlNjc2OTc0Njg3NTYyMmU2MzZmNmQyZjYxNzM3MzY1NzQ3MzJmMzEzNjM3MzYzODM3MzEyZjM2MzgzMTMwMzEyZjM4MzQ2MzM5MzIzMDM2MzYyZDM1NjYzMjM5MmQzMTMxNjUzMjJkMzgzMTM0NjYyZDM5NjQzMzY0MzAzMjM0MzEzMzYyNjY2NDJlNjc2OTY2KVxuICAgICAqIGZvciBob3cgYGNhcmdvYCBhbmQgYHF1ZXVlYCB3b3JrLlxuICAgICAqXG4gICAgICogV2hpbGUgW2BxdWV1ZWBde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5xdWV1ZX0gcGFzc2VzIG9ubHkgb25lIHRhc2sgdG8gb25lIG9mIGEgZ3JvdXAgb2Ygd29ya2Vyc1xuICAgICAqIGF0IGEgdGltZSwgYW5kIFtgY2FyZ29gXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuY2FyZ299IHBhc3NlcyBhbiBhcnJheSBvZiB0YXNrcyB0byBhIHNpbmdsZSB3b3JrZXIsXG4gICAgICogdGhlIGNhcmdvUXVldWUgcGFzc2VzIGFuIGFycmF5IG9mIHRhc2tzIHRvIG11bHRpcGxlIHBhcmFsbGVsIHdvcmtlcnMuXG4gICAgICpcbiAgICAgKiBAbmFtZSBjYXJnb1F1ZXVlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMucXVldWVde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5xdWV1ZX1cbiAgICAgKiBAc2VlIFthc3luYy5jYXJnb117QGxpbmsgbW9kdWxlOkNvbnRyb2xGTG93LmNhcmdvfVxuICAgICAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IHdvcmtlciAtIEFuIGFzeW5jaHJvbm91cyBmdW5jdGlvbiBmb3IgcHJvY2Vzc2luZyBhbiBhcnJheVxuICAgICAqIG9mIHF1ZXVlZCB0YXNrcy4gSW52b2tlZCB3aXRoIGAodGFza3MsIGNhbGxiYWNrKWAuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtjb25jdXJyZW5jeT0xXSAtIEFuIGBpbnRlZ2VyYCBmb3IgZGV0ZXJtaW5pbmcgaG93IG1hbnlcbiAgICAgKiBgd29ya2VyYCBmdW5jdGlvbnMgc2hvdWxkIGJlIHJ1biBpbiBwYXJhbGxlbC4gIElmIG9taXR0ZWQsIHRoZSBjb25jdXJyZW5jeVxuICAgICAqIGRlZmF1bHRzIHRvIGAxYC4gIElmIHRoZSBjb25jdXJyZW5jeSBpcyBgMGAsIGFuIGVycm9yIGlzIHRocm93bi5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW3BheWxvYWQ9SW5maW5pdHldIC0gQW4gb3B0aW9uYWwgYGludGVnZXJgIGZvciBkZXRlcm1pbmluZ1xuICAgICAqIGhvdyBtYW55IHRhc2tzIHNob3VsZCBiZSBwcm9jZXNzZWQgcGVyIHJvdW5kOyBpZiBvbWl0dGVkLCB0aGUgZGVmYXVsdCBpc1xuICAgICAqIHVubGltaXRlZC5cbiAgICAgKiBAcmV0dXJucyB7bW9kdWxlOkNvbnRyb2xGbG93LlF1ZXVlT2JqZWN0fSBBIGNhcmdvUXVldWUgb2JqZWN0IHRvIG1hbmFnZSB0aGUgdGFza3MuIENhbGxiYWNrcyBjYW5cbiAgICAgKiBhdHRhY2hlZCBhcyBjZXJ0YWluIHByb3BlcnRpZXMgdG8gbGlzdGVuIGZvciBzcGVjaWZpYyBldmVudHMgZHVyaW5nIHRoZVxuICAgICAqIGxpZmVjeWNsZSBvZiB0aGUgY2FyZ29RdWV1ZSBhbmQgaW5uZXIgcXVldWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIC8vIGNyZWF0ZSBhIGNhcmdvUXVldWUgb2JqZWN0IHdpdGggcGF5bG9hZCAyIGFuZCBjb25jdXJyZW5jeSAyXG4gICAgICogdmFyIGNhcmdvUXVldWUgPSBhc3luYy5jYXJnb1F1ZXVlKGZ1bmN0aW9uKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAqICAgICBmb3IgKHZhciBpPTA7IGk8dGFza3MubGVuZ3RoOyBpKyspIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKCdoZWxsbyAnICsgdGFza3NbaV0ubmFtZSk7XG4gICAgICogICAgIH1cbiAgICAgKiAgICAgY2FsbGJhY2soKTtcbiAgICAgKiB9LCAyLCAyKTtcbiAgICAgKlxuICAgICAqIC8vIGFkZCBzb21lIGl0ZW1zXG4gICAgICogY2FyZ29RdWV1ZS5wdXNoKHtuYW1lOiAnZm9vJ30sIGZ1bmN0aW9uKGVycikge1xuICAgICAqICAgICBjb25zb2xlLmxvZygnZmluaXNoZWQgcHJvY2Vzc2luZyBmb28nKTtcbiAgICAgKiB9KTtcbiAgICAgKiBjYXJnb1F1ZXVlLnB1c2goe25hbWU6ICdiYXInfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKCdmaW5pc2hlZCBwcm9jZXNzaW5nIGJhcicpO1xuICAgICAqIH0pO1xuICAgICAqIGNhcmdvUXVldWUucHVzaCh7bmFtZTogJ2Jheid9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coJ2ZpbmlzaGVkIHByb2Nlc3NpbmcgYmF6Jyk7XG4gICAgICogfSk7XG4gICAgICogY2FyZ29RdWV1ZS5wdXNoKHtuYW1lOiAnYm9vJ30sIGZ1bmN0aW9uKGVycikge1xuICAgICAqICAgICBjb25zb2xlLmxvZygnZmluaXNoZWQgcHJvY2Vzc2luZyBib28nKTtcbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjYXJnbyQxKHdvcmtlciwgY29uY3VycmVuY3ksIHBheWxvYWQpIHtcbiAgICAgICAgcmV0dXJuIHF1ZXVlKHdvcmtlciwgY29uY3VycmVuY3ksIHBheWxvYWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlZHVjZXMgYGNvbGxgIGludG8gYSBzaW5nbGUgdmFsdWUgdXNpbmcgYW4gYXN5bmMgYGl0ZXJhdGVlYCB0byByZXR1cm4gZWFjaFxuICAgICAqIHN1Y2Nlc3NpdmUgc3RlcC4gYG1lbW9gIGlzIHRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSByZWR1Y3Rpb24uIFRoaXMgZnVuY3Rpb25cbiAgICAgKiBvbmx5IG9wZXJhdGVzIGluIHNlcmllcy5cbiAgICAgKlxuICAgICAqIEZvciBwZXJmb3JtYW5jZSByZWFzb25zLCBpdCBtYXkgbWFrZSBzZW5zZSB0byBzcGxpdCBhIGNhbGwgdG8gdGhpcyBmdW5jdGlvblxuICAgICAqIGludG8gYSBwYXJhbGxlbCBtYXAsIGFuZCB0aGVuIHVzZSB0aGUgbm9ybWFsIGBBcnJheS5wcm90b3R5cGUucmVkdWNlYCBvbiB0aGVcbiAgICAgKiByZXN1bHRzLiBUaGlzIGZ1bmN0aW9uIGlzIGZvciBzaXR1YXRpb25zIHdoZXJlIGVhY2ggc3RlcCBpbiB0aGUgcmVkdWN0aW9uXG4gICAgICogbmVlZHMgdG8gYmUgYXN5bmM7IGlmIHlvdSBjYW4gZ2V0IHRoZSBkYXRhIGJlZm9yZSByZWR1Y2luZyBpdCwgdGhlbiBpdCdzXG4gICAgICogcHJvYmFibHkgYSBnb29kIGlkZWEgdG8gZG8gc28uXG4gICAgICpcbiAgICAgKiBAbmFtZSByZWR1Y2VcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAYWxpYXMgaW5qZWN0XG4gICAgICogQGFsaWFzIGZvbGRsXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0geyp9IG1lbW8gLSBUaGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWN0aW9uLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIGFwcGxpZWQgdG8gZWFjaCBpdGVtIGluIHRoZVxuICAgICAqIGFycmF5IHRvIHByb2R1Y2UgdGhlIG5leHQgc3RlcCBpbiB0aGUgcmVkdWN0aW9uLlxuICAgICAqIFRoZSBgaXRlcmF0ZWVgIHNob3VsZCBjb21wbGV0ZSB3aXRoIHRoZSBuZXh0IHN0YXRlIG9mIHRoZSByZWR1Y3Rpb24uXG4gICAgICogSWYgdGhlIGl0ZXJhdGVlIGNvbXBsZXRlcyB3aXRoIGFuIGVycm9yLCB0aGUgcmVkdWN0aW9uIGlzIHN0b3BwZWQgYW5kIHRoZVxuICAgICAqIG1haW4gYGNhbGxiYWNrYCBpcyBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGUgZXJyb3IuXG4gICAgICogSW52b2tlZCB3aXRoIChtZW1vLCBpdGVtLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAgICAgKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBSZXN1bHQgaXMgdGhlIHJlZHVjZWQgdmFsdWUuIEludm9rZWQgd2l0aFxuICAgICAqIChlcnIsIHJlc3VsdCkuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgbm8gY2FsbGJhY2sgaXMgcGFzc2VkXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIC8vIGZpbGUxLnR4dCBpcyBhIGZpbGUgdGhhdCBpcyAxMDAwIGJ5dGVzIGluIHNpemVcbiAgICAgKiAvLyBmaWxlMi50eHQgaXMgYSBmaWxlIHRoYXQgaXMgMjAwMCBieXRlcyBpbiBzaXplXG4gICAgICogLy8gZmlsZTMudHh0IGlzIGEgZmlsZSB0aGF0IGlzIDMwMDAgYnl0ZXMgaW4gc2l6ZVxuICAgICAqIC8vIGZpbGU0LnR4dCBkb2VzIG5vdCBleGlzdFxuICAgICAqXG4gICAgICogY29uc3QgZmlsZUxpc3QgPSBbJ2ZpbGUxLnR4dCcsJ2ZpbGUyLnR4dCcsJ2ZpbGUzLnR4dCddO1xuICAgICAqIGNvbnN0IHdpdGhNaXNzaW5nRmlsZUxpc3QgPSBbJ2ZpbGUxLnR4dCcsJ2ZpbGUyLnR4dCcsJ2ZpbGUzLnR4dCcsICdmaWxlNC50eHQnXTtcbiAgICAgKlxuICAgICAqIC8vIGFzeW5jaHJvbm91cyBmdW5jdGlvbiB0aGF0IGNvbXB1dGVzIHRoZSBmaWxlIHNpemUgaW4gYnl0ZXNcbiAgICAgKiAvLyBmaWxlIHNpemUgaXMgYWRkZWQgdG8gdGhlIG1lbW9pemVkIHZhbHVlLCB0aGVuIHJldHVybmVkXG4gICAgICogZnVuY3Rpb24gZ2V0RmlsZVNpemVJbkJ5dGVzKG1lbW8sIGZpbGUsIGNhbGxiYWNrKSB7XG4gICAgICogICAgIGZzLnN0YXQoZmlsZSwgZnVuY3Rpb24oZXJyLCBzdGF0KSB7XG4gICAgICogICAgICAgICBpZiAoZXJyKSB7XG4gICAgICogICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICogICAgICAgICB9XG4gICAgICogICAgICAgICBjYWxsYmFjayhudWxsLCBtZW1vICsgc3RhdC5zaXplKTtcbiAgICAgKiAgICAgfSk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogLy8gVXNpbmcgY2FsbGJhY2tzXG4gICAgICogYXN5bmMucmVkdWNlKGZpbGVMaXN0LCAwLCBnZXRGaWxlU2l6ZUluQnl0ZXMsIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gICAgICogICAgIGlmIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIH0gZWxzZSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAqICAgICAgICAgLy8gNjAwMFxuICAgICAqICAgICAgICAgLy8gd2hpY2ggaXMgdGhlIHN1bSBvZiB0aGUgZmlsZSBzaXplcyBvZiB0aGUgdGhyZWUgZmlsZXNcbiAgICAgKiAgICAgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gRXJyb3IgSGFuZGxpbmdcbiAgICAgKiBhc3luYy5yZWR1Y2Uod2l0aE1pc3NpbmdGaWxlTGlzdCwgMCwgZ2V0RmlsZVNpemVJbkJ5dGVzLCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICAgICAqICAgICBpZiAoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICAgICAgLy8gWyBFcnJvcjogRU5PRU5UOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5IF1cbiAgICAgKiAgICAgfSBlbHNlIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICogICAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIFByb21pc2VzXG4gICAgICogYXN5bmMucmVkdWNlKGZpbGVMaXN0LCAwLCBnZXRGaWxlU2l6ZUluQnl0ZXMpXG4gICAgICogLnRoZW4oIHJlc3VsdCA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICogICAgIC8vIDYwMDBcbiAgICAgKiAgICAgLy8gd2hpY2ggaXMgdGhlIHN1bSBvZiB0aGUgZmlsZSBzaXplcyBvZiB0aGUgdGhyZWUgZmlsZXNcbiAgICAgKiB9KS5jYXRjaCggZXJyID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIEVycm9yIEhhbmRsaW5nXG4gICAgICogYXN5bmMucmVkdWNlKHdpdGhNaXNzaW5nRmlsZUxpc3QsIDAsIGdldEZpbGVTaXplSW5CeXRlcylcbiAgICAgKiAudGhlbiggcmVzdWx0ID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiB9KS5jYXRjaCggZXJyID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgLy8gWyBFcnJvcjogRU5PRU5UOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5IF1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIGFzeW5jL2F3YWl0XG4gICAgICogYXN5bmMgKCkgPT4ge1xuICAgICAqICAgICB0cnkge1xuICAgICAqICAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IGFzeW5jLnJlZHVjZShmaWxlTGlzdCwgMCwgZ2V0RmlsZVNpemVJbkJ5dGVzKTtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICogICAgICAgICAvLyA2MDAwXG4gICAgICogICAgICAgICAvLyB3aGljaCBpcyB0aGUgc3VtIG9mIHRoZSBmaWxlIHNpemVzIG9mIHRoZSB0aHJlZSBmaWxlc1xuICAgICAqICAgICB9XG4gICAgICogICAgIGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiAvLyBFcnJvciBIYW5kbGluZ1xuICAgICAqIGFzeW5jICgpID0+IHtcbiAgICAgKiAgICAgdHJ5IHtcbiAgICAgKiAgICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBhc3luYy5yZWR1Y2Uod2l0aE1pc3NpbmdGaWxlTGlzdCwgMCwgZ2V0RmlsZVNpemVJbkJ5dGVzKTtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICogICAgIH1cbiAgICAgKiAgICAgY2F0Y2ggKGVycikge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgICAgIC8vIFsgRXJyb3I6IEVOT0VOVDogbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeSBdXG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZWR1Y2UoY29sbCwgbWVtbywgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb25jZShjYWxsYmFjayk7XG4gICAgICAgIHZhciBfaXRlcmF0ZWUgPSB3cmFwQXN5bmMoaXRlcmF0ZWUpO1xuICAgICAgICByZXR1cm4gZWFjaE9mU2VyaWVzJDEoY29sbCwgKHgsIGksIGl0ZXJDYikgPT4ge1xuICAgICAgICAgICAgX2l0ZXJhdGVlKG1lbW8sIHgsIChlcnIsIHYpID0+IHtcbiAgICAgICAgICAgICAgICBtZW1vID0gdjtcbiAgICAgICAgICAgICAgICBpdGVyQ2IoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBlcnIgPT4gY2FsbGJhY2soZXJyLCBtZW1vKSk7XG4gICAgfVxuICAgIHZhciByZWR1Y2UkMSA9IGF3YWl0aWZ5KHJlZHVjZSwgNCk7XG5cbiAgICAvKipcbiAgICAgKiBWZXJzaW9uIG9mIHRoZSBjb21wb3NlIGZ1bmN0aW9uIHRoYXQgaXMgbW9yZSBuYXR1cmFsIHRvIHJlYWQuIEVhY2ggZnVuY3Rpb25cbiAgICAgKiBjb25zdW1lcyB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBwcmV2aW91cyBmdW5jdGlvbi4gSXQgaXMgdGhlIGVxdWl2YWxlbnQgb2ZcbiAgICAgKiBbY29tcG9zZV17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LmNvbXBvc2V9IHdpdGggdGhlIGFyZ3VtZW50cyByZXZlcnNlZC5cbiAgICAgKlxuICAgICAqIEVhY2ggZnVuY3Rpb24gaXMgZXhlY3V0ZWQgd2l0aCB0aGUgYHRoaXNgIGJpbmRpbmcgb2YgdGhlIGNvbXBvc2VkIGZ1bmN0aW9uLlxuICAgICAqXG4gICAgICogQG5hbWUgc2VxXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMuY29tcG9zZV17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LmNvbXBvc2V9XG4gICAgICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICAgICAqIEBwYXJhbSB7Li4uQXN5bmNGdW5jdGlvbn0gZnVuY3Rpb25zIC0gdGhlIGFzeW5jaHJvbm91cyBmdW5jdGlvbnMgdG8gY29tcG9zZVxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gYSBmdW5jdGlvbiB0aGF0IGNvbXBvc2VzIHRoZSBgZnVuY3Rpb25zYCBpbiBvcmRlclxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAvLyBSZXF1aXJlcyBsb2Rhc2ggKG9yIHVuZGVyc2NvcmUpLCBleHByZXNzMyBhbmQgZHJlc2VuZGUncyBvcm0yLlxuICAgICAqIC8vIFBhcnQgb2YgYW4gYXBwLCB0aGF0IGZldGNoZXMgY2F0cyBvZiB0aGUgbG9nZ2VkIHVzZXIuXG4gICAgICogLy8gVGhpcyBleGFtcGxlIHVzZXMgYHNlcWAgZnVuY3Rpb24gdG8gYXZvaWQgb3Zlcm5lc3RpbmcgYW5kIGVycm9yXG4gICAgICogLy8gaGFuZGxpbmcgY2x1dHRlci5cbiAgICAgKiBhcHAuZ2V0KCcvY2F0cycsIGZ1bmN0aW9uKHJlcXVlc3QsIHJlc3BvbnNlKSB7XG4gICAgICogICAgIHZhciBVc2VyID0gcmVxdWVzdC5tb2RlbHMuVXNlcjtcbiAgICAgKiAgICAgYXN5bmMuc2VxKFxuICAgICAqICAgICAgICAgVXNlci5nZXQuYmluZChVc2VyKSwgIC8vICdVc2VyLmdldCcgaGFzIHNpZ25hdHVyZSAoaWQsIGNhbGxiYWNrKGVyciwgZGF0YSkpXG4gICAgICogICAgICAgICBmdW5jdGlvbih1c2VyLCBmbikge1xuICAgICAqICAgICAgICAgICAgIHVzZXIuZ2V0Q2F0cyhmbik7ICAgICAgLy8gJ2dldENhdHMnIGhhcyBzaWduYXR1cmUgKGNhbGxiYWNrKGVyciwgZGF0YSkpXG4gICAgICogICAgICAgICB9XG4gICAgICogICAgICkocmVxLnNlc3Npb24udXNlcl9pZCwgZnVuY3Rpb24gKGVyciwgY2F0cykge1xuICAgICAqICAgICAgICAgaWYgKGVycikge1xuICAgICAqICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgKiAgICAgICAgICAgICByZXNwb25zZS5qc29uKHsgc3RhdHVzOiAnZXJyb3InLCBtZXNzYWdlOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgKiAgICAgICAgIH0gZWxzZSB7XG4gICAgICogICAgICAgICAgICAgcmVzcG9uc2UuanNvbih7IHN0YXR1czogJ29rJywgbWVzc2FnZTogJ0NhdHMgZm91bmQnLCBkYXRhOiBjYXRzIH0pO1xuICAgICAqICAgICAgICAgfVxuICAgICAqICAgICB9KTtcbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXEoLi4uZnVuY3Rpb25zKSB7XG4gICAgICAgIHZhciBfZnVuY3Rpb25zID0gZnVuY3Rpb25zLm1hcCh3cmFwQXN5bmMpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgICAgICAgICAgdmFyIGNiID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjYiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgYXJncy5wb3AoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2IgPSBwcm9taXNlQ2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVkdWNlJDEoX2Z1bmN0aW9ucywgYXJncywgKG5ld2FyZ3MsIGZuLCBpdGVyQ2IpID0+IHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBuZXdhcmdzLmNvbmNhdCgoZXJyLCAuLi5uZXh0YXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpdGVyQ2IoZXJyLCBuZXh0YXJncyk7XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIChlcnIsIHJlc3VsdHMpID0+IGNiKGVyciwgLi4ucmVzdWx0cykpO1xuXG4gICAgICAgICAgICByZXR1cm4gY2JbUFJPTUlTRV9TWU1CT0xdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHdoaWNoIGlzIGEgY29tcG9zaXRpb24gb2YgdGhlIHBhc3NlZCBhc3luY2hyb25vdXNcbiAgICAgKiBmdW5jdGlvbnMuIEVhY2ggZnVuY3Rpb24gY29uc3VtZXMgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gdGhhdFxuICAgICAqIGZvbGxvd3MuIENvbXBvc2luZyBmdW5jdGlvbnMgYGYoKWAsIGBnKClgLCBhbmQgYGgoKWAgd291bGQgcHJvZHVjZSB0aGUgcmVzdWx0XG4gICAgICogb2YgYGYoZyhoKCkpKWAsIG9ubHkgdGhpcyB2ZXJzaW9uIHVzZXMgY2FsbGJhY2tzIHRvIG9idGFpbiB0aGUgcmV0dXJuIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIElmIHRoZSBsYXN0IGFyZ3VtZW50IHRvIHRoZSBjb21wb3NlZCBmdW5jdGlvbiBpcyBub3QgYSBmdW5jdGlvbiwgYSBwcm9taXNlXG4gICAgICogaXMgcmV0dXJuZWQgd2hlbiB5b3UgY2FsbCBpdC5cbiAgICAgKlxuICAgICAqIEVhY2ggZnVuY3Rpb24gaXMgZXhlY3V0ZWQgd2l0aCB0aGUgYHRoaXNgIGJpbmRpbmcgb2YgdGhlIGNvbXBvc2VkIGZ1bmN0aW9uLlxuICAgICAqXG4gICAgICogQG5hbWUgY29tcG9zZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gICAgICogQG1ldGhvZFxuICAgICAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAgICAgKiBAcGFyYW0gey4uLkFzeW5jRnVuY3Rpb259IGZ1bmN0aW9ucyAtIHRoZSBhc3luY2hyb25vdXMgZnVuY3Rpb25zIHRvIGNvbXBvc2VcbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IGFuIGFzeW5jaHJvbm91cyBmdW5jdGlvbiB0aGF0IGlzIHRoZSBjb21wb3NlZFxuICAgICAqIGFzeW5jaHJvbm91cyBgZnVuY3Rpb25zYFxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBmdW5jdGlvbiBhZGQxKG4sIGNhbGxiYWNrKSB7XG4gICAgICogICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgbiArIDEpO1xuICAgICAqICAgICB9LCAxMCk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogZnVuY3Rpb24gbXVsMyhuLCBjYWxsYmFjaykge1xuICAgICAqICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKG51bGwsIG4gKiAzKTtcbiAgICAgKiAgICAgfSwgMTApO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIHZhciBhZGQxbXVsMyA9IGFzeW5jLmNvbXBvc2UobXVsMywgYWRkMSk7XG4gICAgICogYWRkMW11bDMoNCwgZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgICogICAgIC8vIHJlc3VsdCBub3cgZXF1YWxzIDE1XG4gICAgICogfSk7XG4gICAgICovXG4gICAgZnVuY3Rpb24gY29tcG9zZSguLi5hcmdzKSB7XG4gICAgICAgIHJldHVybiBzZXEoLi4uYXJncy5yZXZlcnNlKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBzYW1lIGFzIFtgbWFwYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLm1hcH0gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gICAgICpcbiAgICAgKiBAbmFtZSBtYXBMaW1pdFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBzZWUgW2FzeW5jLm1hcF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLm1hcH1cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluXG4gICAgICogYGNvbGxgLlxuICAgICAqIFRoZSBpdGVyYXRlZSBzaG91bGQgY29tcGxldGUgd2l0aCB0aGUgdHJhbnNmb3JtZWQgaXRlbS5cbiAgICAgKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGwgYGl0ZXJhdGVlYFxuICAgICAqIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIFJlc3VsdHMgaXMgYW4gYXJyYXkgb2YgdGhlXG4gICAgICogdHJhbnNmb3JtZWQgaXRlbXMgZnJvbSB0aGUgYGNvbGxgLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0cykuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgbm8gY2FsbGJhY2sgaXMgcGFzc2VkXG4gICAgICovXG4gICAgZnVuY3Rpb24gbWFwTGltaXQgKGNvbGwsIGxpbWl0LCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIF9hc3luY01hcChlYWNoT2ZMaW1pdChsaW1pdCksIGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaylcbiAgICB9XG4gICAgdmFyIG1hcExpbWl0JDEgPSBhd2FpdGlmeShtYXBMaW1pdCwgNCk7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2FtZSBhcyBbYGNvbmNhdGBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5jb25jYXR9IGJ1dCBydW5zIGEgbWF4aW11bSBvZiBgbGltaXRgIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICAgICAqXG4gICAgICogQG5hbWUgY29uY2F0TGltaXRcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5jb25jYXRde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5jb25jYXR9XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAYWxpYXMgZmxhdE1hcExpbWl0XG4gICAgICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxBc3luY0l0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxpbWl0IC0gVGhlIG1heGltdW0gbnVtYmVyIG9mIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAsXG4gICAgICogd2hpY2ggc2hvdWxkIHVzZSBhbiBhcnJheSBhcyBpdHMgcmVzdWx0LiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICAgICAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0cyBpcyBhbiBhcnJheVxuICAgICAqIGNvbnRhaW5pbmcgdGhlIGNvbmNhdGVuYXRlZCByZXN1bHRzIG9mIHRoZSBgaXRlcmF0ZWVgIGZ1bmN0aW9uLiBJbnZva2VkIHdpdGhcbiAgICAgKiAoZXJyLCByZXN1bHRzKS5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UsIGlmIG5vIGNhbGxiYWNrIGlzIHBhc3NlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNvbmNhdExpbWl0KGNvbGwsIGxpbWl0LCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIF9pdGVyYXRlZSA9IHdyYXBBc3luYyhpdGVyYXRlZSk7XG4gICAgICAgIHJldHVybiBtYXBMaW1pdCQxKGNvbGwsIGxpbWl0LCAodmFsLCBpdGVyQ2IpID0+IHtcbiAgICAgICAgICAgIF9pdGVyYXRlZSh2YWwsIChlcnIsIC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gaXRlckNiKGVycik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGl0ZXJDYihlcnIsIGFyZ3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIChlcnIsIG1hcFJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWFwUmVzdWx0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChtYXBSZXN1bHRzW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoLi4ubWFwUmVzdWx0c1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgdmFyIGNvbmNhdExpbWl0JDEgPSBhd2FpdGlmeShjb25jYXRMaW1pdCwgNCk7XG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIGBpdGVyYXRlZWAgdG8gZWFjaCBpdGVtIGluIGBjb2xsYCwgY29uY2F0ZW5hdGluZyB0aGUgcmVzdWx0cy4gUmV0dXJuc1xuICAgICAqIHRoZSBjb25jYXRlbmF0ZWQgbGlzdC4gVGhlIGBpdGVyYXRlZWBzIGFyZSBjYWxsZWQgaW4gcGFyYWxsZWwsIGFuZCB0aGVcbiAgICAgKiByZXN1bHRzIGFyZSBjb25jYXRlbmF0ZWQgYXMgdGhleSByZXR1cm4uIFRoZSByZXN1bHRzIGFycmF5IHdpbGwgYmUgcmV0dXJuZWQgaW5cbiAgICAgKiB0aGUgb3JpZ2luYWwgb3JkZXIgb2YgYGNvbGxgIHBhc3NlZCB0byB0aGUgYGl0ZXJhdGVlYCBmdW5jdGlvbi5cbiAgICAgKlxuICAgICAqIEBuYW1lIGNvbmNhdFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gICAgICogQGFsaWFzIGZsYXRNYXBcbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gYGNvbGxgLFxuICAgICAqIHdoaWNoIHNob3VsZCB1c2UgYW4gYXJyYXkgYXMgaXRzIHJlc3VsdC4gSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAgICAgKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIFJlc3VsdHMgaXMgYW4gYXJyYXlcbiAgICAgKiBjb250YWluaW5nIHRoZSBjb25jYXRlbmF0ZWQgcmVzdWx0cyBvZiB0aGUgYGl0ZXJhdGVlYCBmdW5jdGlvbi4gSW52b2tlZCB3aXRoXG4gICAgICogKGVyciwgcmVzdWx0cykuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwYXNzZWRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogLy8gZGlyMSBpcyBhIGRpcmVjdG9yeSB0aGF0IGNvbnRhaW5zIGZpbGUxLnR4dCwgZmlsZTIudHh0XG4gICAgICogLy8gZGlyMiBpcyBhIGRpcmVjdG9yeSB0aGF0IGNvbnRhaW5zIGZpbGUzLnR4dCwgZmlsZTQudHh0XG4gICAgICogLy8gZGlyMyBpcyBhIGRpcmVjdG9yeSB0aGF0IGNvbnRhaW5zIGZpbGU1LnR4dFxuICAgICAqIC8vIGRpcjQgZG9lcyBub3QgZXhpc3RcbiAgICAgKlxuICAgICAqIGxldCBkaXJlY3RvcnlMaXN0ID0gWydkaXIxJywnZGlyMicsJ2RpcjMnXTtcbiAgICAgKiBsZXQgd2l0aE1pc3NpbmdEaXJlY3RvcnlMaXN0ID0gWydkaXIxJywnZGlyMicsJ2RpcjMnLCAnZGlyNCddO1xuICAgICAqXG4gICAgICogLy8gVXNpbmcgY2FsbGJhY2tzXG4gICAgICogYXN5bmMuY29uY2F0KGRpcmVjdG9yeUxpc3QsIGZzLnJlYWRkaXIsIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICAgICAqICAgIGlmIChlcnIpIHtcbiAgICAgKiAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICB9IGVsc2Uge1xuICAgICAqICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHRzKTtcbiAgICAgKiAgICAgICAgLy8gWyAnZmlsZTEudHh0JywgJ2ZpbGUyLnR4dCcsICdmaWxlMy50eHQnLCAnZmlsZTQudHh0JywgZmlsZTUudHh0IF1cbiAgICAgKiAgICB9XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBFcnJvciBIYW5kbGluZ1xuICAgICAqIGFzeW5jLmNvbmNhdCh3aXRoTWlzc2luZ0RpcmVjdG9yeUxpc3QsIGZzLnJlYWRkaXIsIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICAgICAqICAgIGlmIChlcnIpIHtcbiAgICAgKiAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgICAgLy8gWyBFcnJvcjogRU5PRU5UOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5IF1cbiAgICAgKiAgICAgICAgLy8gc2luY2UgZGlyNCBkb2VzIG5vdCBleGlzdFxuICAgICAqICAgIH0gZWxzZSB7XG4gICAgICogICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIFByb21pc2VzXG4gICAgICogYXN5bmMuY29uY2F0KGRpcmVjdG9yeUxpc3QsIGZzLnJlYWRkaXIpXG4gICAgICogLnRoZW4ocmVzdWx0cyA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAvLyBbICdmaWxlMS50eHQnLCAnZmlsZTIudHh0JywgJ2ZpbGUzLnR4dCcsICdmaWxlNC50eHQnLCBmaWxlNS50eHQgXVxuICAgICAqIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICogICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gRXJyb3IgSGFuZGxpbmdcbiAgICAgKiBhc3luYy5jb25jYXQod2l0aE1pc3NpbmdEaXJlY3RvcnlMaXN0LCBmcy5yZWFkZGlyKVxuICAgICAqIC50aGVuKHJlc3VsdHMgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhyZXN1bHRzKTtcbiAgICAgKiB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICAvLyBbIEVycm9yOiBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkgXVxuICAgICAqICAgICAvLyBzaW5jZSBkaXI0IGRvZXMgbm90IGV4aXN0XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBhc3luYy9hd2FpdFxuICAgICAqIGFzeW5jICgpID0+IHtcbiAgICAgKiAgICAgdHJ5IHtcbiAgICAgKiAgICAgICAgIGxldCByZXN1bHRzID0gYXdhaXQgYXN5bmMuY29uY2F0KGRpcmVjdG9yeUxpc3QsIGZzLnJlYWRkaXIpO1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0cyk7XG4gICAgICogICAgICAgICAvLyBbICdmaWxlMS50eHQnLCAnZmlsZTIudHh0JywgJ2ZpbGUzLnR4dCcsICdmaWxlNC50eHQnLCBmaWxlNS50eHQgXVxuICAgICAqICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiAvLyBFcnJvciBIYW5kbGluZ1xuICAgICAqIGFzeW5jICgpID0+IHtcbiAgICAgKiAgICAgdHJ5IHtcbiAgICAgKiAgICAgICAgIGxldCByZXN1bHRzID0gYXdhaXQgYXN5bmMuY29uY2F0KHdpdGhNaXNzaW5nRGlyZWN0b3J5TGlzdCwgZnMucmVhZGRpcik7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHRzKTtcbiAgICAgKiAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICAgICAgLy8gWyBFcnJvcjogRU5PRU5UOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5IF1cbiAgICAgKiAgICAgICAgIC8vIHNpbmNlIGRpcjQgZG9lcyBub3QgZXhpc3RcbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNvbmNhdChjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGNvbmNhdExpbWl0JDEoY29sbCwgSW5maW5pdHksIGl0ZXJhdGVlLCBjYWxsYmFjaylcbiAgICB9XG4gICAgdmFyIGNvbmNhdCQxID0gYXdhaXRpZnkoY29uY2F0LCAzKTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBzYW1lIGFzIFtgY29uY2F0YF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmNvbmNhdH0gYnV0IHJ1bnMgb25seSBhIHNpbmdsZSBhc3luYyBvcGVyYXRpb24gYXQgYSB0aW1lLlxuICAgICAqXG4gICAgICogQG5hbWUgY29uY2F0U2VyaWVzXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMuY29uY2F0XXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuY29uY2F0fVxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gICAgICogQGFsaWFzIGZsYXRNYXBTZXJpZXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gYGNvbGxgLlxuICAgICAqIFRoZSBpdGVyYXRlZSBzaG91bGQgY29tcGxldGUgd2l0aCBhbiBhcnJheSBhbiBhcnJheSBvZiByZXN1bHRzLlxuICAgICAqIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gICAgICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBSZXN1bHRzIGlzIGFuIGFycmF5XG4gICAgICogY29udGFpbmluZyB0aGUgY29uY2F0ZW5hdGVkIHJlc3VsdHMgb2YgdGhlIGBpdGVyYXRlZWAgZnVuY3Rpb24uIEludm9rZWQgd2l0aFxuICAgICAqIChlcnIsIHJlc3VsdHMpLlxuICAgICAqIEByZXR1cm5zIEEgUHJvbWlzZSwgaWYgbm8gY2FsbGJhY2sgaXMgcGFzc2VkXG4gICAgICovXG4gICAgZnVuY3Rpb24gY29uY2F0U2VyaWVzKGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gY29uY2F0TGltaXQkMShjb2xsLCAxLCBpdGVyYXRlZSwgY2FsbGJhY2spXG4gICAgfVxuICAgIHZhciBjb25jYXRTZXJpZXMkMSA9IGF3YWl0aWZ5KGNvbmNhdFNlcmllcywgMyk7XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aGVuIGNhbGxlZCwgY2FsbHMtYmFjayB3aXRoIHRoZSB2YWx1ZXMgcHJvdmlkZWQuXG4gICAgICogVXNlZnVsIGFzIHRoZSBmaXJzdCBmdW5jdGlvbiBpbiBhIFtgd2F0ZXJmYWxsYF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LndhdGVyZmFsbH0sIG9yIGZvciBwbHVnZ2luZyB2YWx1ZXMgaW4gdG9cbiAgICAgKiBbYGF1dG9gXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuYXV0b30uXG4gICAgICpcbiAgICAgKiBAbmFtZSBjb25zdGFudFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBjYXRlZ29yeSBVdGlsXG4gICAgICogQHBhcmFtIHsuLi4qfSBhcmd1bWVudHMuLi4gLSBBbnkgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBhdXRvbWF0aWNhbGx5IGludm9rZVxuICAgICAqIGNhbGxiYWNrIHdpdGguXG4gICAgICogQHJldHVybnMge0FzeW5jRnVuY3Rpb259IFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdoZW4gaW52b2tlZCwgYXV0b21hdGljYWxseVxuICAgICAqIGludm9rZXMgdGhlIGNhbGxiYWNrIHdpdGggdGhlIHByZXZpb3VzIGdpdmVuIGFyZ3VtZW50cy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgKiAgICAgYXN5bmMuY29uc3RhbnQoNDIpLFxuICAgICAqICAgICBmdW5jdGlvbiAodmFsdWUsIG5leHQpIHtcbiAgICAgKiAgICAgICAgIC8vIHZhbHVlID09PSA0MlxuICAgICAqICAgICB9LFxuICAgICAqICAgICAvLy4uLlxuICAgICAqIF0sIGNhbGxiYWNrKTtcbiAgICAgKlxuICAgICAqIGFzeW5jLndhdGVyZmFsbChbXG4gICAgICogICAgIGFzeW5jLmNvbnN0YW50KGZpbGVuYW1lLCBcInV0ZjhcIiksXG4gICAgICogICAgIGZzLnJlYWRGaWxlLFxuICAgICAqICAgICBmdW5jdGlvbiAoZmlsZURhdGEsIG5leHQpIHtcbiAgICAgKiAgICAgICAgIC8vLi4uXG4gICAgICogICAgIH1cbiAgICAgKiAgICAgLy8uLi5cbiAgICAgKiBdLCBjYWxsYmFjayk7XG4gICAgICpcbiAgICAgKiBhc3luYy5hdXRvKHtcbiAgICAgKiAgICAgaG9zdG5hbWU6IGFzeW5jLmNvbnN0YW50KFwiaHR0cHM6Ly9zZXJ2ZXIubmV0L1wiKSxcbiAgICAgKiAgICAgcG9ydDogZmluZEZyZWVQb3J0LFxuICAgICAqICAgICBsYXVuY2hTZXJ2ZXI6IFtcImhvc3RuYW1lXCIsIFwicG9ydFwiLCBmdW5jdGlvbiAob3B0aW9ucywgY2IpIHtcbiAgICAgKiAgICAgICAgIHN0YXJ0U2VydmVyKG9wdGlvbnMsIGNiKTtcbiAgICAgKiAgICAgfV0sXG4gICAgICogICAgIC8vLi4uXG4gICAgICogfSwgY2FsbGJhY2spO1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNvbnN0YW50KC4uLmFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICguLi5pZ25vcmVkQXJncy8qLCBjYWxsYmFjayovKSB7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBpZ25vcmVkQXJncy5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCAuLi5hcmdzKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfY3JlYXRlVGVzdGVyKGNoZWNrLCBnZXRSZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIChlYWNoZm4sIGFyciwgX2l0ZXJhdGVlLCBjYikgPT4ge1xuICAgICAgICAgICAgdmFyIHRlc3RQYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciB0ZXN0UmVzdWx0O1xuICAgICAgICAgICAgY29uc3QgaXRlcmF0ZWUgPSB3cmFwQXN5bmMoX2l0ZXJhdGVlKTtcbiAgICAgICAgICAgIGVhY2hmbihhcnIsICh2YWx1ZSwgXywgY2FsbGJhY2spID0+IHtcbiAgICAgICAgICAgICAgICBpdGVyYXRlZSh2YWx1ZSwgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIgfHwgZXJyID09PSBmYWxzZSkgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoZWNrKHJlc3VsdCkgJiYgIXRlc3RSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RQYXNzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdFJlc3VsdCA9IGdldFJlc3VsdCh0cnVlLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgYnJlYWtMb29wKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgZXJyID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2IoZXJyKTtcbiAgICAgICAgICAgICAgICBjYihudWxsLCB0ZXN0UGFzc2VkID8gdGVzdFJlc3VsdCA6IGdldFJlc3VsdChmYWxzZSkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZmlyc3QgdmFsdWUgaW4gYGNvbGxgIHRoYXQgcGFzc2VzIGFuIGFzeW5jIHRydXRoIHRlc3QuIFRoZVxuICAgICAqIGBpdGVyYXRlZWAgaXMgYXBwbGllZCBpbiBwYXJhbGxlbCwgbWVhbmluZyB0aGUgZmlyc3QgaXRlcmF0ZWUgdG8gcmV0dXJuXG4gICAgICogYHRydWVgIHdpbGwgZmlyZSB0aGUgZGV0ZWN0IGBjYWxsYmFja2Agd2l0aCB0aGF0IHJlc3VsdC4gVGhhdCBtZWFucyB0aGVcbiAgICAgKiByZXN1bHQgbWlnaHQgbm90IGJlIHRoZSBmaXJzdCBpdGVtIGluIHRoZSBvcmlnaW5hbCBgY29sbGAgKGluIHRlcm1zIG9mIG9yZGVyKVxuICAgICAqIHRoYXQgcGFzc2VzIHRoZSB0ZXN0LlxuXG4gICAgICogSWYgb3JkZXIgd2l0aGluIHRoZSBvcmlnaW5hbCBgY29sbGAgaXMgaW1wb3J0YW50LCB0aGVuIGxvb2sgYXRcbiAgICAgKiBbYGRldGVjdFNlcmllc2Bde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5kZXRlY3RTZXJpZXN9LlxuICAgICAqXG4gICAgICogQG5hbWUgZGV0ZWN0XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGFsaWFzIGZpbmRcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gICAgICogVGhlIGl0ZXJhdGVlIG11c3QgY29tcGxldGUgd2l0aCBhIGJvb2xlYW4gdmFsdWUgYXMgaXRzIHJlc3VsdC5cbiAgICAgKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYXMgc29vbiBhcyBhbnlcbiAgICAgKiBpdGVyYXRlZSByZXR1cm5zIGB0cnVlYCwgb3IgYWZ0ZXIgYWxsIHRoZSBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLlxuICAgICAqIFJlc3VsdCB3aWxsIGJlIHRoZSBmaXJzdCBpdGVtIGluIHRoZSBhcnJheSB0aGF0IHBhc3NlcyB0aGUgdHJ1dGggdGVzdFxuICAgICAqIChpdGVyYXRlZSkgb3IgdGhlIHZhbHVlIGB1bmRlZmluZWRgIGlmIG5vbmUgcGFzc2VkLiBJbnZva2VkIHdpdGhcbiAgICAgKiAoZXJyLCByZXN1bHQpLlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UsIGlmIGEgY2FsbGJhY2sgaXMgb21pdHRlZFxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAvLyBkaXIxIGlzIGEgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgZmlsZTEudHh0LCBmaWxlMi50eHRcbiAgICAgKiAvLyBkaXIyIGlzIGEgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgZmlsZTMudHh0LCBmaWxlNC50eHRcbiAgICAgKiAvLyBkaXIzIGlzIGEgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgZmlsZTUudHh0XG4gICAgICpcbiAgICAgKiAvLyBhc3luY2hyb25vdXMgZnVuY3Rpb24gdGhhdCBjaGVja3MgaWYgYSBmaWxlIGV4aXN0c1xuICAgICAqIGZ1bmN0aW9uIGZpbGVFeGlzdHMoZmlsZSwgY2FsbGJhY2spIHtcbiAgICAgKiAgICBmcy5hY2Nlc3MoZmlsZSwgZnMuY29uc3RhbnRzLkZfT0ssIChlcnIpID0+IHtcbiAgICAgKiAgICAgICAgY2FsbGJhY2sobnVsbCwgIWVycik7XG4gICAgICogICAgfSk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogYXN5bmMuZGV0ZWN0KFsnZmlsZTMudHh0JywnZmlsZTIudHh0JywnZGlyMS9maWxlMS50eHQnXSwgZmlsZUV4aXN0cyxcbiAgICAgKiAgICBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICAgICAqICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAqICAgICAgICAvLyBkaXIxL2ZpbGUxLnR4dFxuICAgICAqICAgICAgICAvLyByZXN1bHQgbm93IGVxdWFscyB0aGUgZmlyc3QgZmlsZSBpbiB0aGUgbGlzdCB0aGF0IGV4aXN0c1xuICAgICAqICAgIH1cbiAgICAgKik7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBQcm9taXNlc1xuICAgICAqIGFzeW5jLmRldGVjdChbJ2ZpbGUzLnR4dCcsJ2ZpbGUyLnR4dCcsJ2RpcjEvZmlsZTEudHh0J10sIGZpbGVFeGlzdHMpXG4gICAgICogLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgLy8gZGlyMS9maWxlMS50eHRcbiAgICAgKiAgICAgLy8gcmVzdWx0IG5vdyBlcXVhbHMgdGhlIGZpcnN0IGZpbGUgaW4gdGhlIGxpc3QgdGhhdCBleGlzdHNcbiAgICAgKiB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gVXNpbmcgYXN5bmMvYXdhaXRcbiAgICAgKiBhc3luYyAoKSA9PiB7XG4gICAgICogICAgIHRyeSB7XG4gICAgICogICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgYXN5bmMuZGV0ZWN0KFsnZmlsZTMudHh0JywnZmlsZTIudHh0JywnZGlyMS9maWxlMS50eHQnXSwgZmlsZUV4aXN0cyk7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAqICAgICAgICAgLy8gZGlyMS9maWxlMS50eHRcbiAgICAgKiAgICAgICAgIC8vIHJlc3VsdCBub3cgZXF1YWxzIHRoZSBmaWxlIGluIHRoZSBsaXN0IHRoYXQgZXhpc3RzXG4gICAgICogICAgIH1cbiAgICAgKiAgICAgY2F0Y2ggKGVycikge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRldGVjdChjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIF9jcmVhdGVUZXN0ZXIoYm9vbCA9PiBib29sLCAocmVzLCBpdGVtKSA9PiBpdGVtKShlYWNoT2YkMSwgY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKVxuICAgIH1cbiAgICB2YXIgZGV0ZWN0JDEgPSBhd2FpdGlmeShkZXRlY3QsIDMpO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2BkZXRlY3RgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZGV0ZWN0fSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGFcbiAgICAgKiB0aW1lLlxuICAgICAqXG4gICAgICogQG5hbWUgZGV0ZWN0TGltaXRcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5kZXRlY3Rde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5kZXRlY3R9XG4gICAgICogQGFsaWFzIGZpbmRMaW1pdFxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gICAgICogVGhlIGl0ZXJhdGVlIG11c3QgY29tcGxldGUgd2l0aCBhIGJvb2xlYW4gdmFsdWUgYXMgaXRzIHJlc3VsdC5cbiAgICAgKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYXMgc29vbiBhcyBhbnlcbiAgICAgKiBpdGVyYXRlZSByZXR1cm5zIGB0cnVlYCwgb3IgYWZ0ZXIgYWxsIHRoZSBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLlxuICAgICAqIFJlc3VsdCB3aWxsIGJlIHRoZSBmaXJzdCBpdGVtIGluIHRoZSBhcnJheSB0aGF0IHBhc3NlcyB0aGUgdHJ1dGggdGVzdFxuICAgICAqIChpdGVyYXRlZSkgb3IgdGhlIHZhbHVlIGB1bmRlZmluZWRgIGlmIG5vbmUgcGFzc2VkLiBJbnZva2VkIHdpdGhcbiAgICAgKiAoZXJyLCByZXN1bHQpLlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UsIGlmIGEgY2FsbGJhY2sgaXMgb21pdHRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRldGVjdExpbWl0KGNvbGwsIGxpbWl0LCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIF9jcmVhdGVUZXN0ZXIoYm9vbCA9PiBib29sLCAocmVzLCBpdGVtKSA9PiBpdGVtKShlYWNoT2ZMaW1pdChsaW1pdCksIGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaylcbiAgICB9XG4gICAgdmFyIGRldGVjdExpbWl0JDEgPSBhd2FpdGlmeShkZXRlY3RMaW1pdCwgNCk7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2FtZSBhcyBbYGRldGVjdGBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5kZXRlY3R9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAgICAgKlxuICAgICAqIEBuYW1lIGRldGVjdFNlcmllc1xuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBzZWUgW2FzeW5jLmRldGVjdF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmRldGVjdH1cbiAgICAgKiBAYWxpYXMgZmluZFNlcmllc1xuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIHRydXRoIHRlc3QgdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluIGBjb2xsYC5cbiAgICAgKiBUaGUgaXRlcmF0ZWUgbXVzdCBjb21wbGV0ZSB3aXRoIGEgYm9vbGVhbiB2YWx1ZSBhcyBpdHMgcmVzdWx0LlxuICAgICAqIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhcyBzb29uIGFzIGFueVxuICAgICAqIGl0ZXJhdGVlIHJldHVybnMgYHRydWVgLCBvciBhZnRlciBhbGwgdGhlIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuXG4gICAgICogUmVzdWx0IHdpbGwgYmUgdGhlIGZpcnN0IGl0ZW0gaW4gdGhlIGFycmF5IHRoYXQgcGFzc2VzIHRoZSB0cnV0aCB0ZXN0XG4gICAgICogKGl0ZXJhdGVlKSBvciB0aGUgdmFsdWUgYHVuZGVmaW5lZGAgaWYgbm9uZSBwYXNzZWQuIEludm9rZWQgd2l0aFxuICAgICAqIChlcnIsIHJlc3VsdCkuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgYSBjYWxsYmFjayBpcyBvbWl0dGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gZGV0ZWN0U2VyaWVzKGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gX2NyZWF0ZVRlc3Rlcihib29sID0+IGJvb2wsIChyZXMsIGl0ZW0pID0+IGl0ZW0pKGVhY2hPZkxpbWl0KDEpLCBjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spXG4gICAgfVxuXG4gICAgdmFyIGRldGVjdFNlcmllcyQxID0gYXdhaXRpZnkoZGV0ZWN0U2VyaWVzLCAzKTtcblxuICAgIGZ1bmN0aW9uIGNvbnNvbGVGdW5jKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIChmbiwgLi4uYXJncykgPT4gd3JhcEFzeW5jKGZuKSguLi5hcmdzLCAoZXJyLCAuLi5yZXN1bHRBcmdzKSA9PiB7XG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb25zb2xlW25hbWVdKSB7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdEFyZ3MuZm9yRWFjaCh4ID0+IGNvbnNvbGVbbmFtZV0oeCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2dzIHRoZSByZXN1bHQgb2YgYW4gW2Bhc3luY2AgZnVuY3Rpb25de0BsaW5rIEFzeW5jRnVuY3Rpb259IHRvIHRoZVxuICAgICAqIGBjb25zb2xlYCB1c2luZyBgY29uc29sZS5kaXJgIHRvIGRpc3BsYXkgdGhlIHByb3BlcnRpZXMgb2YgdGhlIHJlc3VsdGluZyBvYmplY3QuXG4gICAgICogT25seSB3b3JrcyBpbiBOb2RlLmpzIG9yIGluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBgY29uc29sZS5kaXJgIGFuZFxuICAgICAqIGBjb25zb2xlLmVycm9yYCAoc3VjaCBhcyBGRiBhbmQgQ2hyb21lKS5cbiAgICAgKiBJZiBtdWx0aXBsZSBhcmd1bWVudHMgYXJlIHJldHVybmVkIGZyb20gdGhlIGFzeW5jIGZ1bmN0aW9uLFxuICAgICAqIGBjb25zb2xlLmRpcmAgaXMgY2FsbGVkIG9uIGVhY2ggYXJndW1lbnQgaW4gb3JkZXIuXG4gICAgICpcbiAgICAgKiBAbmFtZSBkaXJcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpVdGlsc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAY2F0ZWdvcnkgVXRpbFxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gZnVuY3Rpb24gLSBUaGUgZnVuY3Rpb24geW91IHdhbnQgdG8gZXZlbnR1YWxseSBhcHBseVxuICAgICAqIGFsbCBhcmd1bWVudHMgdG8uXG4gICAgICogQHBhcmFtIHsuLi4qfSBhcmd1bWVudHMuLi4gLSBBbnkgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBhcHBseSB0byB0aGUgZnVuY3Rpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIC8vIGluIGEgbW9kdWxlXG4gICAgICogdmFyIGhlbGxvID0gZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAgICAgKiAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtoZWxsbzogbmFtZX0pO1xuICAgICAqICAgICB9LCAxMDAwKTtcbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogLy8gaW4gdGhlIG5vZGUgcmVwbFxuICAgICAqIG5vZGU+IGFzeW5jLmRpcihoZWxsbywgJ3dvcmxkJyk7XG4gICAgICoge2hlbGxvOiAnd29ybGQnfVxuICAgICAqL1xuICAgIHZhciBkaXIgPSBjb25zb2xlRnVuYygnZGlyJyk7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgcG9zdC1jaGVjayB2ZXJzaW9uIG9mIFtgd2hpbHN0YF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LndoaWxzdH0uIFRvIHJlZmxlY3QgdGhlIGRpZmZlcmVuY2UgaW5cbiAgICAgKiB0aGUgb3JkZXIgb2Ygb3BlcmF0aW9ucywgdGhlIGFyZ3VtZW50cyBgdGVzdGAgYW5kIGBpdGVyYXRlZWAgYXJlIHN3aXRjaGVkLlxuICAgICAqXG4gICAgICogYGRvV2hpbHN0YCBpcyB0byBgd2hpbHN0YCBhcyBgZG8gd2hpbGVgIGlzIHRvIGB3aGlsZWAgaW4gcGxhaW4gSmF2YVNjcmlwdC5cbiAgICAgKlxuICAgICAqIEBuYW1lIGRvV2hpbHN0XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMud2hpbHN0XXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cud2hpbHN0fVxuICAgICAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiB3aGljaCBpcyBjYWxsZWQgZWFjaCB0aW1lIGB0ZXN0YFxuICAgICAqIHBhc3Nlcy4gSW52b2tlZCB3aXRoIChjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSB0ZXN0IC0gYXN5bmNocm9ub3VzIHRydXRoIHRlc3QgdG8gcGVyZm9ybSBhZnRlciBlYWNoXG4gICAgICogZXhlY3V0aW9uIG9mIGBpdGVyYXRlZWAuIEludm9rZWQgd2l0aCAoLi4uYXJncywgY2FsbGJhY2spLCB3aGVyZSBgLi4uYXJnc2AgYXJlIHRoZVxuICAgICAqIG5vbi1lcnJvciBhcmdzIGZyb20gdGhlIHByZXZpb3VzIGNhbGxiYWNrIG9mIGBpdGVyYXRlZWAuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIHRoZSB0ZXN0XG4gICAgICogZnVuY3Rpb24gaGFzIGZhaWxlZCBhbmQgcmVwZWF0ZWQgZXhlY3V0aW9uIG9mIGBpdGVyYXRlZWAgaGFzIHN0b3BwZWQuXG4gICAgICogYGNhbGxiYWNrYCB3aWxsIGJlIHBhc3NlZCBhbiBlcnJvciBhbmQgYW55IGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIGZpbmFsXG4gICAgICogYGl0ZXJhdGVlYCdzIGNhbGxiYWNrLiBJbnZva2VkIHdpdGggKGVyciwgW3Jlc3VsdHNdKTtcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwYXNzZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkb1doaWxzdChpdGVyYXRlZSwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvbmx5T25jZShjYWxsYmFjayk7XG4gICAgICAgIHZhciBfZm4gPSB3cmFwQXN5bmMoaXRlcmF0ZWUpO1xuICAgICAgICB2YXIgX3Rlc3QgPSB3cmFwQXN5bmModGVzdCk7XG4gICAgICAgIHZhciByZXN1bHRzO1xuXG4gICAgICAgIGZ1bmN0aW9uIG5leHQoZXJyLCAuLi5hcmdzKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIGlmIChlcnIgPT09IGZhbHNlKSByZXR1cm47XG4gICAgICAgICAgICByZXN1bHRzID0gYXJncztcbiAgICAgICAgICAgIF90ZXN0KC4uLmFyZ3MsIGNoZWNrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNoZWNrKGVyciwgdHJ1dGgpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgaWYgKGVyciA9PT0gZmFsc2UpIHJldHVybjtcbiAgICAgICAgICAgIGlmICghdHJ1dGgpIHJldHVybiBjYWxsYmFjayhudWxsLCAuLi5yZXN1bHRzKTtcbiAgICAgICAgICAgIF9mbihuZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGVjayhudWxsLCB0cnVlKTtcbiAgICB9XG5cbiAgICB2YXIgZG9XaGlsc3QkMSA9IGF3YWl0aWZ5KGRvV2hpbHN0LCAzKTtcblxuICAgIC8qKlxuICAgICAqIExpa2UgWydkb1doaWxzdCdde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5kb1doaWxzdH0sIGV4Y2VwdCB0aGUgYHRlc3RgIGlzIGludmVydGVkLiBOb3RlIHRoZVxuICAgICAqIGFyZ3VtZW50IG9yZGVyaW5nIGRpZmZlcnMgZnJvbSBgdW50aWxgLlxuICAgICAqXG4gICAgICogQG5hbWUgZG9VbnRpbFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gICAgICogQG1ldGhvZFxuICAgICAqIEBzZWUgW2FzeW5jLmRvV2hpbHN0XXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuZG9XaGlsc3R9XG4gICAgICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyBmdW5jdGlvbiB3aGljaCBpcyBjYWxsZWQgZWFjaCB0aW1lXG4gICAgICogYHRlc3RgIGZhaWxzLiBJbnZva2VkIHdpdGggKGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IHRlc3QgLSBhc3luY2hyb25vdXMgdHJ1dGggdGVzdCB0byBwZXJmb3JtIGFmdGVyIGVhY2hcbiAgICAgKiBleGVjdXRpb24gb2YgYGl0ZXJhdGVlYC4gSW52b2tlZCB3aXRoICguLi5hcmdzLCBjYWxsYmFjayksIHdoZXJlIGAuLi5hcmdzYCBhcmUgdGhlXG4gICAgICogbm9uLWVycm9yIGFyZ3MgZnJvbSB0aGUgcHJldmlvdXMgY2FsbGJhY2sgb2YgYGl0ZXJhdGVlYFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciB0aGUgdGVzdFxuICAgICAqIGZ1bmN0aW9uIGhhcyBwYXNzZWQgYW5kIHJlcGVhdGVkIGV4ZWN1dGlvbiBvZiBgaXRlcmF0ZWVgIGhhcyBzdG9wcGVkLiBgY2FsbGJhY2tgXG4gICAgICogd2lsbCBiZSBwYXNzZWQgYW4gZXJyb3IgYW5kIGFueSBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBmaW5hbCBgaXRlcmF0ZWVgJ3NcbiAgICAgKiBjYWxsYmFjay4gSW52b2tlZCB3aXRoIChlcnIsIFtyZXN1bHRzXSk7XG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgbm8gY2FsbGJhY2sgaXMgcGFzc2VkXG4gICAgICovXG4gICAgZnVuY3Rpb24gZG9VbnRpbChpdGVyYXRlZSwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgX3Rlc3QgPSB3cmFwQXN5bmModGVzdCk7XG4gICAgICAgIHJldHVybiBkb1doaWxzdCQxKGl0ZXJhdGVlLCAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2IgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgX3Rlc3QoLi4uYXJncywgKGVyciwgdHJ1dGgpID0+IGNiIChlcnIsICF0cnV0aCkpO1xuICAgICAgICB9LCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX3dpdGhvdXRJbmRleChpdGVyYXRlZSkge1xuICAgICAgICByZXR1cm4gKHZhbHVlLCBpbmRleCwgY2FsbGJhY2spID0+IGl0ZXJhdGVlKHZhbHVlLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZnVuY3Rpb24gYGl0ZXJhdGVlYCB0byBlYWNoIGl0ZW0gaW4gYGNvbGxgLCBpbiBwYXJhbGxlbC5cbiAgICAgKiBUaGUgYGl0ZXJhdGVlYCBpcyBjYWxsZWQgd2l0aCBhbiBpdGVtIGZyb20gdGhlIGxpc3QsIGFuZCBhIGNhbGxiYWNrIGZvciB3aGVuXG4gICAgICogaXQgaGFzIGZpbmlzaGVkLiBJZiB0aGUgYGl0ZXJhdGVlYCBwYXNzZXMgYW4gZXJyb3IgdG8gaXRzIGBjYWxsYmFja2AsIHRoZVxuICAgICAqIG1haW4gYGNhbGxiYWNrYCAoZm9yIHRoZSBgZWFjaGAgZnVuY3Rpb24pIGlzIGltbWVkaWF0ZWx5IGNhbGxlZCB3aXRoIHRoZVxuICAgICAqIGVycm9yLlxuICAgICAqXG4gICAgICogTm90ZSwgdGhhdCBzaW5jZSB0aGlzIGZ1bmN0aW9uIGFwcGxpZXMgYGl0ZXJhdGVlYCB0byBlYWNoIGl0ZW0gaW4gcGFyYWxsZWwsXG4gICAgICogdGhlcmUgaXMgbm8gZ3VhcmFudGVlIHRoYXQgdGhlIGl0ZXJhdGVlIGZ1bmN0aW9ucyB3aWxsIGNvbXBsZXRlIGluIG9yZGVyLlxuICAgICAqXG4gICAgICogQG5hbWUgZWFjaFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBhbGlhcyBmb3JFYWNoXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgZnVuY3Rpb24gdG8gYXBwbHkgdG9cbiAgICAgKiBlYWNoIGl0ZW0gaW4gYGNvbGxgLiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAgICAgKiBUaGUgYXJyYXkgaW5kZXggaXMgbm90IHBhc3NlZCB0byB0aGUgaXRlcmF0ZWUuXG4gICAgICogSWYgeW91IG5lZWQgdGhlIGluZGV4LCB1c2UgYGVhY2hPZmAuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsXG4gICAgICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBJbnZva2VkIHdpdGggKGVycikuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgYSBjYWxsYmFjayBpcyBvbWl0dGVkXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIC8vIGRpcjEgaXMgYSBkaXJlY3RvcnkgdGhhdCBjb250YWlucyBmaWxlMS50eHQsIGZpbGUyLnR4dFxuICAgICAqIC8vIGRpcjIgaXMgYSBkaXJlY3RvcnkgdGhhdCBjb250YWlucyBmaWxlMy50eHQsIGZpbGU0LnR4dFxuICAgICAqIC8vIGRpcjMgaXMgYSBkaXJlY3RvcnkgdGhhdCBjb250YWlucyBmaWxlNS50eHRcbiAgICAgKiAvLyBkaXI0IGRvZXMgbm90IGV4aXN0XG4gICAgICpcbiAgICAgKiBjb25zdCBmaWxlTGlzdCA9IFsgJ2RpcjEvZmlsZTIudHh0JywgJ2RpcjIvZmlsZTMudHh0JywgJ2Rpci9maWxlNS50eHQnXTtcbiAgICAgKiBjb25zdCB3aXRoTWlzc2luZ0ZpbGVMaXN0ID0gWydkaXIxL2ZpbGUxLnR4dCcsICdkaXI0L2ZpbGUyLnR4dCddO1xuICAgICAqXG4gICAgICogLy8gYXN5bmNocm9ub3VzIGZ1bmN0aW9uIHRoYXQgZGVsZXRlcyBhIGZpbGVcbiAgICAgKiBjb25zdCBkZWxldGVGaWxlID0gZnVuY3Rpb24oZmlsZSwgY2FsbGJhY2spIHtcbiAgICAgKiAgICAgZnMudW5saW5rKGZpbGUsIGNhbGxiYWNrKTtcbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogLy8gVXNpbmcgY2FsbGJhY2tzXG4gICAgICogYXN5bmMuZWFjaChmaWxlTGlzdCwgZGVsZXRlRmlsZSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICogICAgIGlmKCBlcnIgKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICB9IGVsc2Uge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2coJ0FsbCBmaWxlcyBoYXZlIGJlZW4gZGVsZXRlZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgKiAgICAgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gRXJyb3IgSGFuZGxpbmdcbiAgICAgKiBhc3luYy5lYWNoKHdpdGhNaXNzaW5nRmlsZUxpc3QsIGRlbGV0ZUZpbGUsIGZ1bmN0aW9uKGVycil7XG4gICAgICogICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIC8vIFsgRXJyb3I6IEVOT0VOVDogbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeSBdXG4gICAgICogICAgIC8vIHNpbmNlIGRpcjQvZmlsZTIudHh0IGRvZXMgbm90IGV4aXN0XG4gICAgICogICAgIC8vIGRpcjEvZmlsZTEudHh0IGNvdWxkIGhhdmUgYmVlbiBkZWxldGVkXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBQcm9taXNlc1xuICAgICAqIGFzeW5jLmVhY2goZmlsZUxpc3QsIGRlbGV0ZUZpbGUpXG4gICAgICogLnRoZW4oICgpID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coJ0FsbCBmaWxlcyBoYXZlIGJlZW4gZGVsZXRlZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgKiB9KS5jYXRjaCggZXJyID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIEVycm9yIEhhbmRsaW5nXG4gICAgICogYXN5bmMuZWFjaChmaWxlTGlzdCwgZGVsZXRlRmlsZSlcbiAgICAgKiAudGhlbiggKCkgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZygnQWxsIGZpbGVzIGhhdmUgYmVlbiBkZWxldGVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAqIH0pLmNhdGNoKCBlcnIgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICAvLyBbIEVycm9yOiBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkgXVxuICAgICAqICAgICAvLyBzaW5jZSBkaXI0L2ZpbGUyLnR4dCBkb2VzIG5vdCBleGlzdFxuICAgICAqICAgICAvLyBkaXIxL2ZpbGUxLnR4dCBjb3VsZCBoYXZlIGJlZW4gZGVsZXRlZFxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gVXNpbmcgYXN5bmMvYXdhaXRcbiAgICAgKiBhc3luYyAoKSA9PiB7XG4gICAgICogICAgIHRyeSB7XG4gICAgICogICAgICAgICBhd2FpdCBhc3luYy5lYWNoKGZpbGVzLCBkZWxldGVGaWxlKTtcbiAgICAgKiAgICAgfVxuICAgICAqICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICB9XG4gICAgICogfVxuICAgICAqXG4gICAgICogLy8gRXJyb3IgSGFuZGxpbmdcbiAgICAgKiBhc3luYyAoKSA9PiB7XG4gICAgICogICAgIHRyeSB7XG4gICAgICogICAgICAgICBhd2FpdCBhc3luYy5lYWNoKHdpdGhNaXNzaW5nRmlsZUxpc3QsIGRlbGV0ZUZpbGUpO1xuICAgICAqICAgICB9XG4gICAgICogICAgIGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgICAgICAvLyBbIEVycm9yOiBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkgXVxuICAgICAqICAgICAgICAgLy8gc2luY2UgZGlyNC9maWxlMi50eHQgZG9lcyBub3QgZXhpc3RcbiAgICAgKiAgICAgICAgIC8vIGRpcjEvZmlsZTEudHh0IGNvdWxkIGhhdmUgYmVlbiBkZWxldGVkXG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBlYWNoTGltaXQoY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBlYWNoT2YkMShjb2xsLCBfd2l0aG91dEluZGV4KHdyYXBBc3luYyhpdGVyYXRlZSkpLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgdmFyIGVhY2ggPSBhd2FpdGlmeShlYWNoTGltaXQsIDMpO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2BlYWNoYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmVhY2h9IGJ1dCBydW5zIGEgbWF4aW11bSBvZiBgbGltaXRgIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICAgICAqXG4gICAgICogQG5hbWUgZWFjaExpbWl0XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMuZWFjaF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmVhY2h9XG4gICAgICogQGFsaWFzIGZvckVhY2hMaW1pdFxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxBc3luY0l0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxpbWl0IC0gVGhlIG1heGltdW0gbnVtYmVyIG9mIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW5cbiAgICAgKiBgY29sbGAuXG4gICAgICogVGhlIGFycmF5IGluZGV4IGlzIG5vdCBwYXNzZWQgdG8gdGhlIGl0ZXJhdGVlLlxuICAgICAqIElmIHlvdSBuZWVkIHRoZSBpbmRleCwgdXNlIGBlYWNoT2ZMaW1pdGAuXG4gICAgICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsXG4gICAgICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBJbnZva2VkIHdpdGggKGVycikuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgYSBjYWxsYmFjayBpcyBvbWl0dGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gZWFjaExpbWl0JDEoY29sbCwgbGltaXQsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gZWFjaE9mTGltaXQobGltaXQpKGNvbGwsIF93aXRob3V0SW5kZXgod3JhcEFzeW5jKGl0ZXJhdGVlKSksIGNhbGxiYWNrKTtcbiAgICB9XG4gICAgdmFyIGVhY2hMaW1pdCQyID0gYXdhaXRpZnkoZWFjaExpbWl0JDEsIDQpO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2BlYWNoYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmVhY2h9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAgICAgKlxuICAgICAqIE5vdGUsIHRoYXQgdW5saWtlIFtgZWFjaGBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5lYWNofSwgdGhpcyBmdW5jdGlvbiBhcHBsaWVzIGl0ZXJhdGVlIHRvIGVhY2ggaXRlbVxuICAgICAqIGluIHNlcmllcyBhbmQgdGhlcmVmb3JlIHRoZSBpdGVyYXRlZSBmdW5jdGlvbnMgd2lsbCBjb21wbGV0ZSBpbiBvcmRlci5cblxuICAgICAqIEBuYW1lIGVhY2hTZXJpZXNcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5lYWNoXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZWFjaH1cbiAgICAgKiBAYWxpYXMgZm9yRWFjaFNlcmllc1xuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxBc3luY0l0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEFuIGFzeW5jIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2hcbiAgICAgKiBpdGVtIGluIGBjb2xsYC5cbiAgICAgKiBUaGUgYXJyYXkgaW5kZXggaXMgbm90IHBhc3NlZCB0byB0aGUgaXRlcmF0ZWUuXG4gICAgICogSWYgeW91IG5lZWQgdGhlIGluZGV4LCB1c2UgYGVhY2hPZlNlcmllc2AuXG4gICAgICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsXG4gICAgICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBJbnZva2VkIHdpdGggKGVycikuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgYSBjYWxsYmFjayBpcyBvbWl0dGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gZWFjaFNlcmllcyhjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGVhY2hMaW1pdCQyKGNvbGwsIDEsIGl0ZXJhdGVlLCBjYWxsYmFjaylcbiAgICB9XG4gICAgdmFyIGVhY2hTZXJpZXMkMSA9IGF3YWl0aWZ5KGVhY2hTZXJpZXMsIDMpO1xuXG4gICAgLyoqXG4gICAgICogV3JhcCBhbiBhc3luYyBmdW5jdGlvbiBhbmQgZW5zdXJlIGl0IGNhbGxzIGl0cyBjYWxsYmFjayBvbiBhIGxhdGVyIHRpY2sgb2ZcbiAgICAgKiB0aGUgZXZlbnQgbG9vcC4gIElmIHRoZSBmdW5jdGlvbiBhbHJlYWR5IGNhbGxzIGl0cyBjYWxsYmFjayBvbiBhIG5leHQgdGljayxcbiAgICAgKiBubyBleHRyYSBkZWZlcnJhbCBpcyBhZGRlZC4gVGhpcyBpcyB1c2VmdWwgZm9yIHByZXZlbnRpbmcgc3RhY2sgb3ZlcmZsb3dzXG4gICAgICogKGBSYW5nZUVycm9yOiBNYXhpbXVtIGNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZGApIGFuZCBnZW5lcmFsbHkga2VlcGluZ1xuICAgICAqIFtaYWxnb10oaHR0cDovL2Jsb2cuaXpzLm1lL3Bvc3QvNTkxNDI3NDIxNDMvZGVzaWduaW5nLWFwaXMtZm9yLWFzeW5jaHJvbnkpXG4gICAgICogY29udGFpbmVkLiBFUzIwMTcgYGFzeW5jYCBmdW5jdGlvbnMgYXJlIHJldHVybmVkIGFzLWlzIC0tIHRoZXkgYXJlIGltbXVuZVxuICAgICAqIHRvIFphbGdvJ3MgY29ycnVwdGluZyBpbmZsdWVuY2VzLCBhcyB0aGV5IGFsd2F5cyByZXNvbHZlIG9uIGEgbGF0ZXIgdGljay5cbiAgICAgKlxuICAgICAqIEBuYW1lIGVuc3VyZUFzeW5jXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6VXRpbHNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGNhdGVnb3J5IFV0aWxcbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGZuIC0gYW4gYXN5bmMgZnVuY3Rpb24sIG9uZSB0aGF0IGV4cGVjdHMgYSBub2RlLXN0eWxlXG4gICAgICogY2FsbGJhY2sgYXMgaXRzIGxhc3QgYXJndW1lbnQuXG4gICAgICogQHJldHVybnMge0FzeW5jRnVuY3Rpb259IFJldHVybnMgYSB3cmFwcGVkIGZ1bmN0aW9uIHdpdGggdGhlIGV4YWN0IHNhbWUgY2FsbFxuICAgICAqIHNpZ25hdHVyZSBhcyB0aGUgZnVuY3Rpb24gcGFzc2VkIGluLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBmdW5jdGlvbiBzb21ldGltZXNBc3luYyhhcmcsIGNhbGxiYWNrKSB7XG4gICAgICogICAgIGlmIChjYWNoZVthcmddKSB7XG4gICAgICogICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgY2FjaGVbYXJnXSk7IC8vIHRoaXMgd291bGQgYmUgc3luY2hyb25vdXMhIVxuICAgICAqICAgICB9IGVsc2Uge1xuICAgICAqICAgICAgICAgZG9Tb21lSU8oYXJnLCBjYWxsYmFjayk7IC8vIHRoaXMgSU8gd291bGQgYmUgYXN5bmNocm9ub3VzXG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiAvLyB0aGlzIGhhcyBhIHJpc2sgb2Ygc3RhY2sgb3ZlcmZsb3dzIGlmIG1hbnkgcmVzdWx0cyBhcmUgY2FjaGVkIGluIGEgcm93XG4gICAgICogYXN5bmMubWFwU2VyaWVzKGFyZ3MsIHNvbWV0aW1lc0FzeW5jLCBkb25lKTtcbiAgICAgKlxuICAgICAqIC8vIHRoaXMgd2lsbCBkZWZlciBzb21ldGltZXNBc3luYydzIGNhbGxiYWNrIGlmIG5lY2Vzc2FyeSxcbiAgICAgKiAvLyBwcmV2ZW50aW5nIHN0YWNrIG92ZXJmbG93c1xuICAgICAqIGFzeW5jLm1hcFNlcmllcyhhcmdzLCBhc3luYy5lbnN1cmVBc3luYyhzb21ldGltZXNBc3luYyksIGRvbmUpO1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVuc3VyZUFzeW5jKGZuKSB7XG4gICAgICAgIGlmIChpc0FzeW5jKGZuKSkgcmV0dXJuIGZuO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKC4uLmFyZ3MvKiwgY2FsbGJhY2sqLykge1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIHZhciBzeW5jID0gdHJ1ZTtcbiAgICAgICAgICAgIGFyZ3MucHVzaCgoLi4uaW5uZXJBcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHN5bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0SW1tZWRpYXRlJDEoKCkgPT4gY2FsbGJhY2soLi4uaW5uZXJBcmdzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soLi4uaW5uZXJBcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgc3luYyA9IGZhbHNlO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYHRydWVgIGlmIGV2ZXJ5IGVsZW1lbnQgaW4gYGNvbGxgIHNhdGlzZmllcyBhbiBhc3luYyB0ZXN0LiBJZiBhbnlcbiAgICAgKiBpdGVyYXRlZSBjYWxsIHJldHVybnMgYGZhbHNlYCwgdGhlIG1haW4gYGNhbGxiYWNrYCBpcyBpbW1lZGlhdGVseSBjYWxsZWQuXG4gICAgICpcbiAgICAgKiBAbmFtZSBldmVyeVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBhbGlhcyBhbGxcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbVxuICAgICAqIGluIHRoZSBjb2xsZWN0aW9uIGluIHBhcmFsbGVsLlxuICAgICAqIFRoZSBpdGVyYXRlZSBtdXN0IGNvbXBsZXRlIHdpdGggYSBib29sZWFuIHJlc3VsdCB2YWx1ZS5cbiAgICAgKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICAgICAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuIFJlc3VsdCB3aWxsIGJlIGVpdGhlciBgdHJ1ZWAgb3IgYGZhbHNlYFxuICAgICAqIGRlcGVuZGluZyBvbiB0aGUgdmFsdWVzIG9mIHRoZSBhc3luYyB0ZXN0cy4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdCkuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgbm8gY2FsbGJhY2sgcHJvdmlkZWRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogLy8gZGlyMSBpcyBhIGRpcmVjdG9yeSB0aGF0IGNvbnRhaW5zIGZpbGUxLnR4dCwgZmlsZTIudHh0XG4gICAgICogLy8gZGlyMiBpcyBhIGRpcmVjdG9yeSB0aGF0IGNvbnRhaW5zIGZpbGUzLnR4dCwgZmlsZTQudHh0XG4gICAgICogLy8gZGlyMyBpcyBhIGRpcmVjdG9yeSB0aGF0IGNvbnRhaW5zIGZpbGU1LnR4dFxuICAgICAqIC8vIGRpcjQgZG9lcyBub3QgZXhpc3RcbiAgICAgKlxuICAgICAqIGNvbnN0IGZpbGVMaXN0ID0gWydkaXIxL2ZpbGUxLnR4dCcsJ2RpcjIvZmlsZTMudHh0JywnZGlyMy9maWxlNS50eHQnXTtcbiAgICAgKiBjb25zdCB3aXRoTWlzc2luZ0ZpbGVMaXN0ID0gWydmaWxlMS50eHQnLCdmaWxlMi50eHQnLCdmaWxlNC50eHQnXTtcbiAgICAgKlxuICAgICAqIC8vIGFzeW5jaHJvbm91cyBmdW5jdGlvbiB0aGF0IGNoZWNrcyBpZiBhIGZpbGUgZXhpc3RzXG4gICAgICogZnVuY3Rpb24gZmlsZUV4aXN0cyhmaWxlLCBjYWxsYmFjaykge1xuICAgICAqICAgIGZzLmFjY2VzcyhmaWxlLCBmcy5jb25zdGFudHMuRl9PSywgKGVycikgPT4ge1xuICAgICAqICAgICAgICBjYWxsYmFjayhudWxsLCAhZXJyKTtcbiAgICAgKiAgICB9KTtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBjYWxsYmFja3NcbiAgICAgKiBhc3luYy5ldmVyeShmaWxlTGlzdCwgZmlsZUV4aXN0cywgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgLy8gdHJ1ZVxuICAgICAqICAgICAvLyByZXN1bHQgaXMgdHJ1ZSBzaW5jZSBldmVyeSBmaWxlIGV4aXN0c1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogYXN5bmMuZXZlcnkod2l0aE1pc3NpbmdGaWxlTGlzdCwgZmlsZUV4aXN0cywgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgLy8gZmFsc2VcbiAgICAgKiAgICAgLy8gcmVzdWx0IGlzIGZhbHNlIHNpbmNlIE5PVCBldmVyeSBmaWxlIGV4aXN0c1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gVXNpbmcgUHJvbWlzZXNcbiAgICAgKiBhc3luYy5ldmVyeShmaWxlTGlzdCwgZmlsZUV4aXN0cylcbiAgICAgKiAudGhlbiggcmVzdWx0ID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgLy8gdHJ1ZVxuICAgICAqICAgICAvLyByZXN1bHQgaXMgdHJ1ZSBzaW5jZSBldmVyeSBmaWxlIGV4aXN0c1xuICAgICAqIH0pLmNhdGNoKCBlcnIgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogYXN5bmMuZXZlcnkod2l0aE1pc3NpbmdGaWxlTGlzdCwgZmlsZUV4aXN0cylcbiAgICAgKiAudGhlbiggcmVzdWx0ID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgLy8gZmFsc2VcbiAgICAgKiAgICAgLy8gcmVzdWx0IGlzIGZhbHNlIHNpbmNlIE5PVCBldmVyeSBmaWxlIGV4aXN0c1xuICAgICAqIH0pLmNhdGNoKCBlcnIgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gVXNpbmcgYXN5bmMvYXdhaXRcbiAgICAgKiBhc3luYyAoKSA9PiB7XG4gICAgICogICAgIHRyeSB7XG4gICAgICogICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgYXN5bmMuZXZlcnkoZmlsZUxpc3QsIGZpbGVFeGlzdHMpO1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgICAgIC8vIHRydWVcbiAgICAgKiAgICAgICAgIC8vIHJlc3VsdCBpcyB0cnVlIHNpbmNlIGV2ZXJ5IGZpbGUgZXhpc3RzXG4gICAgICogICAgIH1cbiAgICAgKiAgICAgY2F0Y2ggKGVycikge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKlxuICAgICAqIGFzeW5jICgpID0+IHtcbiAgICAgKiAgICAgdHJ5IHtcbiAgICAgKiAgICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBhc3luYy5ldmVyeSh3aXRoTWlzc2luZ0ZpbGVMaXN0LCBmaWxlRXhpc3RzKTtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICogICAgICAgICAvLyBmYWxzZVxuICAgICAqICAgICAgICAgLy8gcmVzdWx0IGlzIGZhbHNlIHNpbmNlIE5PVCBldmVyeSBmaWxlIGV4aXN0c1xuICAgICAqICAgICB9XG4gICAgICogICAgIGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBldmVyeShjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIF9jcmVhdGVUZXN0ZXIoYm9vbCA9PiAhYm9vbCwgcmVzID0+ICFyZXMpKGVhY2hPZiQxLCBjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spXG4gICAgfVxuICAgIHZhciBldmVyeSQxID0gYXdhaXRpZnkoZXZlcnksIDMpO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2BldmVyeWBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5ldmVyeX0gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gICAgICpcbiAgICAgKiBAbmFtZSBldmVyeUxpbWl0XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMuZXZlcnlde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5ldmVyeX1cbiAgICAgKiBAYWxpYXMgYWxsTGltaXRcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgdHJ1dGggdGVzdCB0byBhcHBseSB0byBlYWNoIGl0ZW1cbiAgICAgKiBpbiB0aGUgY29sbGVjdGlvbiBpbiBwYXJhbGxlbC5cbiAgICAgKiBUaGUgaXRlcmF0ZWUgbXVzdCBjb21wbGV0ZSB3aXRoIGEgYm9vbGVhbiByZXN1bHQgdmFsdWUuXG4gICAgICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAgICAgKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBSZXN1bHQgd2lsbCBiZSBlaXRoZXIgYHRydWVgIG9yIGBmYWxzZWBcbiAgICAgKiBkZXBlbmRpbmcgb24gdGhlIHZhbHVlcyBvZiB0aGUgYXN5bmMgdGVzdHMuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHQpLlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UsIGlmIG5vIGNhbGxiYWNrIHByb3ZpZGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gZXZlcnlMaW1pdChjb2xsLCBsaW1pdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfY3JlYXRlVGVzdGVyKGJvb2wgPT4gIWJvb2wsIHJlcyA9PiAhcmVzKShlYWNoT2ZMaW1pdChsaW1pdCksIGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaylcbiAgICB9XG4gICAgdmFyIGV2ZXJ5TGltaXQkMSA9IGF3YWl0aWZ5KGV2ZXJ5TGltaXQsIDQpO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2BldmVyeWBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5ldmVyeX0gYnV0IHJ1bnMgb25seSBhIHNpbmdsZSBhc3luYyBvcGVyYXRpb24gYXQgYSB0aW1lLlxuICAgICAqXG4gICAgICogQG5hbWUgZXZlcnlTZXJpZXNcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5ldmVyeV17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmV2ZXJ5fVxuICAgICAqIEBhbGlhcyBhbGxTZXJpZXNcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbVxuICAgICAqIGluIHRoZSBjb2xsZWN0aW9uIGluIHNlcmllcy5cbiAgICAgKiBUaGUgaXRlcmF0ZWUgbXVzdCBjb21wbGV0ZSB3aXRoIGEgYm9vbGVhbiByZXN1bHQgdmFsdWUuXG4gICAgICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAgICAgKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBSZXN1bHQgd2lsbCBiZSBlaXRoZXIgYHRydWVgIG9yIGBmYWxzZWBcbiAgICAgKiBkZXBlbmRpbmcgb24gdGhlIHZhbHVlcyBvZiB0aGUgYXN5bmMgdGVzdHMuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHQpLlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UsIGlmIG5vIGNhbGxiYWNrIHByb3ZpZGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gZXZlcnlTZXJpZXMoY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfY3JlYXRlVGVzdGVyKGJvb2wgPT4gIWJvb2wsIHJlcyA9PiAhcmVzKShlYWNoT2ZTZXJpZXMkMSwgY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKVxuICAgIH1cbiAgICB2YXIgZXZlcnlTZXJpZXMkMSA9IGF3YWl0aWZ5KGV2ZXJ5U2VyaWVzLCAzKTtcblxuICAgIGZ1bmN0aW9uIGZpbHRlckFycmF5KGVhY2hmbiwgYXJyLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHRydXRoVmFsdWVzID0gbmV3IEFycmF5KGFyci5sZW5ndGgpO1xuICAgICAgICBlYWNoZm4oYXJyLCAoeCwgaW5kZXgsIGl0ZXJDYikgPT4ge1xuICAgICAgICAgICAgaXRlcmF0ZWUoeCwgKGVyciwgdikgPT4ge1xuICAgICAgICAgICAgICAgIHRydXRoVmFsdWVzW2luZGV4XSA9ICEhdjtcbiAgICAgICAgICAgICAgICBpdGVyQ2IoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBlcnIgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAodHJ1dGhWYWx1ZXNbaV0pIHJlc3VsdHMucHVzaChhcnJbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckdlbmVyaWMoZWFjaGZuLCBjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgZWFjaGZuKGNvbGwsICh4LCBpbmRleCwgaXRlckNiKSA9PiB7XG4gICAgICAgICAgICBpdGVyYXRlZSh4LCAoZXJyLCB2KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIGl0ZXJDYihlcnIpO1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7aW5kZXgsIHZhbHVlOiB4fSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGl0ZXJDYihlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGVyciA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHNcbiAgICAgICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYS5pbmRleCAtIGIuaW5kZXgpXG4gICAgICAgICAgICAgICAgLm1hcCh2ID0+IHYudmFsdWUpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2ZpbHRlcihlYWNoZm4sIGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgZmlsdGVyID0gaXNBcnJheUxpa2UoY29sbCkgPyBmaWx0ZXJBcnJheSA6IGZpbHRlckdlbmVyaWM7XG4gICAgICAgIHJldHVybiBmaWx0ZXIoZWFjaGZuLCBjb2xsLCB3cmFwQXN5bmMoaXRlcmF0ZWUpLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIG5ldyBhcnJheSBvZiBhbGwgdGhlIHZhbHVlcyBpbiBgY29sbGAgd2hpY2ggcGFzcyBhbiBhc3luYyB0cnV0aFxuICAgICAqIHRlc3QuIFRoaXMgb3BlcmF0aW9uIGlzIHBlcmZvcm1lZCBpbiBwYXJhbGxlbCwgYnV0IHRoZSByZXN1bHRzIGFycmF5IHdpbGwgYmVcbiAgICAgKiBpbiB0aGUgc2FtZSBvcmRlciBhcyB0aGUgb3JpZ2luYWwuXG4gICAgICpcbiAgICAgKiBAbmFtZSBmaWx0ZXJcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAYWxpYXMgc2VsZWN0XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgdHJ1dGggdGVzdCB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gYGNvbGxgLlxuICAgICAqIFRoZSBgaXRlcmF0ZWVgIGlzIHBhc3NlZCBhIGBjYWxsYmFjayhlcnIsIHRydXRoVmFsdWUpYCwgd2hpY2ggbXVzdCBiZSBjYWxsZWRcbiAgICAgKiB3aXRoIGEgYm9vbGVhbiBhcmd1bWVudCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gICAgICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdHMpLlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UsIGlmIG5vIGNhbGxiYWNrIHByb3ZpZGVkXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIC8vIGRpcjEgaXMgYSBkaXJlY3RvcnkgdGhhdCBjb250YWlucyBmaWxlMS50eHQsIGZpbGUyLnR4dFxuICAgICAqIC8vIGRpcjIgaXMgYSBkaXJlY3RvcnkgdGhhdCBjb250YWlucyBmaWxlMy50eHQsIGZpbGU0LnR4dFxuICAgICAqIC8vIGRpcjMgaXMgYSBkaXJlY3RvcnkgdGhhdCBjb250YWlucyBmaWxlNS50eHRcbiAgICAgKlxuICAgICAqIGNvbnN0IGZpbGVzID0gWydkaXIxL2ZpbGUxLnR4dCcsJ2RpcjIvZmlsZTMudHh0JywnZGlyMy9maWxlNi50eHQnXTtcbiAgICAgKlxuICAgICAqIC8vIGFzeW5jaHJvbm91cyBmdW5jdGlvbiB0aGF0IGNoZWNrcyBpZiBhIGZpbGUgZXhpc3RzXG4gICAgICogZnVuY3Rpb24gZmlsZUV4aXN0cyhmaWxlLCBjYWxsYmFjaykge1xuICAgICAqICAgIGZzLmFjY2VzcyhmaWxlLCBmcy5jb25zdGFudHMuRl9PSywgKGVycikgPT4ge1xuICAgICAqICAgICAgICBjYWxsYmFjayhudWxsLCAhZXJyKTtcbiAgICAgKiAgICB9KTtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBjYWxsYmFja3NcbiAgICAgKiBhc3luYy5maWx0ZXIoZmlsZXMsIGZpbGVFeGlzdHMsIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICAgICAqICAgIGlmKGVycikge1xuICAgICAqICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgIH0gZWxzZSB7XG4gICAgICogICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAgICAvLyBbICdkaXIxL2ZpbGUxLnR4dCcsICdkaXIyL2ZpbGUzLnR4dCcgXVxuICAgICAqICAgICAgICAvLyByZXN1bHRzIGlzIG5vdyBhbiBhcnJheSBvZiB0aGUgZXhpc3RpbmcgZmlsZXNcbiAgICAgKiAgICB9XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBQcm9taXNlc1xuICAgICAqIGFzeW5jLmZpbHRlcihmaWxlcywgZmlsZUV4aXN0cylcbiAgICAgKiAudGhlbihyZXN1bHRzID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0cyk7XG4gICAgICogICAgIC8vIFsgJ2RpcjEvZmlsZTEudHh0JywgJ2RpcjIvZmlsZTMudHh0JyBdXG4gICAgICogICAgIC8vIHJlc3VsdHMgaXMgbm93IGFuIGFycmF5IG9mIHRoZSBleGlzdGluZyBmaWxlc1xuICAgICAqIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBhc3luYy9hd2FpdFxuICAgICAqIGFzeW5jICgpID0+IHtcbiAgICAgKiAgICAgdHJ5IHtcbiAgICAgKiAgICAgICAgIGxldCByZXN1bHRzID0gYXdhaXQgYXN5bmMuZmlsdGVyKGZpbGVzLCBmaWxlRXhpc3RzKTtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAgICAgLy8gWyAnZGlyMS9maWxlMS50eHQnLCAnZGlyMi9maWxlMy50eHQnIF1cbiAgICAgKiAgICAgICAgIC8vIHJlc3VsdHMgaXMgbm93IGFuIGFycmF5IG9mIHRoZSBleGlzdGluZyBmaWxlc1xuICAgICAqICAgICB9XG4gICAgICogICAgIGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaWx0ZXIgKGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gX2ZpbHRlcihlYWNoT2YkMSwgY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKVxuICAgIH1cbiAgICB2YXIgZmlsdGVyJDEgPSBhd2FpdGlmeShmaWx0ZXIsIDMpO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2BmaWx0ZXJgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZmlsdGVyfSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGFcbiAgICAgKiB0aW1lLlxuICAgICAqXG4gICAgICogQG5hbWUgZmlsdGVyTGltaXRcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5maWx0ZXJde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5maWx0ZXJ9XG4gICAgICogQGFsaWFzIHNlbGVjdExpbWl0XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbGltaXQgLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIHRydXRoIHRlc3QgdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluIGBjb2xsYC5cbiAgICAgKiBUaGUgYGl0ZXJhdGVlYCBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyLCB0cnV0aFZhbHVlKWAsIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gICAgICogd2l0aCBhIGJvb2xlYW4gYXJndW1lbnQgb25jZSBpdCBoYXMgY29tcGxldGVkLiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICAgICAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBwcm92aWRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbHRlckxpbWl0IChjb2xsLCBsaW1pdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfZmlsdGVyKGVhY2hPZkxpbWl0KGxpbWl0KSwgY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKVxuICAgIH1cbiAgICB2YXIgZmlsdGVyTGltaXQkMSA9IGF3YWl0aWZ5KGZpbHRlckxpbWl0LCA0KTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBzYW1lIGFzIFtgZmlsdGVyYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmZpbHRlcn0gYnV0IHJ1bnMgb25seSBhIHNpbmdsZSBhc3luYyBvcGVyYXRpb24gYXQgYSB0aW1lLlxuICAgICAqXG4gICAgICogQG5hbWUgZmlsdGVyU2VyaWVzXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMuZmlsdGVyXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZmlsdGVyfVxuICAgICAqIEBhbGlhcyBzZWxlY3RTZXJpZXNcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gICAgICogVGhlIGBpdGVyYXRlZWAgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgdHJ1dGhWYWx1ZSlgLCB3aGljaCBtdXN0IGJlIGNhbGxlZFxuICAgICAqIHdpdGggYSBib29sZWFuIGFyZ3VtZW50IG9uY2UgaXQgaGFzIGNvbXBsZXRlZC4gSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAgICAgKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0cylcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBwcm92aWRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbHRlclNlcmllcyAoY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfZmlsdGVyKGVhY2hPZlNlcmllcyQxLCBjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spXG4gICAgfVxuICAgIHZhciBmaWx0ZXJTZXJpZXMkMSA9IGF3YWl0aWZ5KGZpbHRlclNlcmllcywgMyk7XG5cbiAgICAvKipcbiAgICAgKiBDYWxscyB0aGUgYXN5bmNocm9ub3VzIGZ1bmN0aW9uIGBmbmAgd2l0aCBhIGNhbGxiYWNrIHBhcmFtZXRlciB0aGF0IGFsbG93cyBpdFxuICAgICAqIHRvIGNhbGwgaXRzZWxmIGFnYWluLCBpbiBzZXJpZXMsIGluZGVmaW5pdGVseS5cblxuICAgICAqIElmIGFuIGVycm9yIGlzIHBhc3NlZCB0byB0aGUgY2FsbGJhY2sgdGhlbiBgZXJyYmFja2AgaXMgY2FsbGVkIHdpdGggdGhlXG4gICAgICogZXJyb3IsIGFuZCBleGVjdXRpb24gc3RvcHMsIG90aGVyd2lzZSBpdCB3aWxsIG5ldmVyIGJlIGNhbGxlZC5cbiAgICAgKlxuICAgICAqIEBuYW1lIGZvcmV2ZXJcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBmbiAtIGFuIGFzeW5jIGZ1bmN0aW9uIHRvIGNhbGwgcmVwZWF0ZWRseS5cbiAgICAgKiBJbnZva2VkIHdpdGggKG5leHQpLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtlcnJiYWNrXSAtIHdoZW4gYGZuYCBwYXNzZXMgYW4gZXJyb3IgdG8gaXQncyBjYWxsYmFjayxcbiAgICAgKiB0aGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkLCBhbmQgZXhlY3V0aW9uIHN0b3BzLiBJbnZva2VkIHdpdGggKGVycikuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgaWYgYW4gZXJyb3Igb2NjdXJzIGFuZCBhbiBlcnJiYWNrXG4gICAgICogaXMgbm90IHBhc3NlZFxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBhc3luYy5mb3JldmVyKFxuICAgICAqICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICogICAgICAgICAvLyBuZXh0IGlzIHN1aXRhYmxlIGZvciBwYXNzaW5nIHRvIHRoaW5ncyB0aGF0IG5lZWQgYSBjYWxsYmFjayhlcnIgWywgd2hhdGV2ZXJdKTtcbiAgICAgKiAgICAgICAgIC8vIGl0IHdpbGwgcmVzdWx0IGluIHRoaXMgZnVuY3Rpb24gYmVpbmcgY2FsbGVkIGFnYWluLlxuICAgICAqICAgICB9LFxuICAgICAqICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgKiAgICAgICAgIC8vIGlmIG5leHQgaXMgY2FsbGVkIHdpdGggYSB2YWx1ZSBpbiBpdHMgZmlyc3QgcGFyYW1ldGVyLCBpdCB3aWxsIGFwcGVhclxuICAgICAqICAgICAgICAgLy8gaW4gaGVyZSBhcyAnZXJyJywgYW5kIGV4ZWN1dGlvbiB3aWxsIHN0b3AuXG4gICAgICogICAgIH1cbiAgICAgKiApO1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZvcmV2ZXIoZm4sIGVycmJhY2spIHtcbiAgICAgICAgdmFyIGRvbmUgPSBvbmx5T25jZShlcnJiYWNrKTtcbiAgICAgICAgdmFyIHRhc2sgPSB3cmFwQXN5bmMoZW5zdXJlQXN5bmMoZm4pKTtcblxuICAgICAgICBmdW5jdGlvbiBuZXh0KGVycikge1xuICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIGRvbmUoZXJyKTtcbiAgICAgICAgICAgIGlmIChlcnIgPT09IGZhbHNlKSByZXR1cm47XG4gICAgICAgICAgICB0YXNrKG5leHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgfVxuICAgIHZhciBmb3JldmVyJDEgPSBhd2FpdGlmeShmb3JldmVyLCAyKTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBzYW1lIGFzIFtgZ3JvdXBCeWBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5ncm91cEJ5fSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAgICAgKlxuICAgICAqIEBuYW1lIGdyb3VwQnlMaW1pdFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBzZWUgW2FzeW5jLmdyb3VwQnlde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5ncm91cEJ5fVxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxBc3luY0l0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxpbWl0IC0gVGhlIG1heGltdW0gbnVtYmVyIG9mIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW5cbiAgICAgKiBgY29sbGAuXG4gICAgICogVGhlIGl0ZXJhdGVlIHNob3VsZCBjb21wbGV0ZSB3aXRoIGEgYGtleWAgdG8gZ3JvdXAgdGhlIHZhbHVlIHVuZGVyLlxuICAgICAqIEludm9rZWQgd2l0aCAodmFsdWUsIGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGwgYGl0ZXJhdGVlYFxuICAgICAqIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIFJlc3VsdCBpcyBhbiBgT2JqZWN0YCB3aG9zZXNcbiAgICAgKiBwcm9wZXJ0aWVzIGFyZSBhcnJheXMgb2YgdmFsdWVzIHdoaWNoIHJldHVybmVkIHRoZSBjb3JyZXNwb25kaW5nIGtleS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwYXNzZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBncm91cEJ5TGltaXQoY29sbCwgbGltaXQsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgX2l0ZXJhdGVlID0gd3JhcEFzeW5jKGl0ZXJhdGVlKTtcbiAgICAgICAgcmV0dXJuIG1hcExpbWl0JDEoY29sbCwgbGltaXQsICh2YWwsIGl0ZXJDYikgPT4ge1xuICAgICAgICAgICAgX2l0ZXJhdGVlKHZhbCwgKGVyciwga2V5KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIGl0ZXJDYihlcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVyQ2IoZXJyLCB7a2V5LCB2YWx9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCAoZXJyLCBtYXBSZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICAgICAgICAvLyBmcm9tIE1ETiwgaGFuZGxlIG9iamVjdCBoYXZpbmcgYW4gYGhhc093blByb3BlcnR5YCBwcm9wXG4gICAgICAgICAgICB2YXIge2hhc093blByb3BlcnR5fSA9IE9iamVjdC5wcm90b3R5cGU7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWFwUmVzdWx0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChtYXBSZXN1bHRzW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB7a2V5fSA9IG1hcFJlc3VsdHNbaV07XG4gICAgICAgICAgICAgICAgICAgIHZhciB7dmFsfSA9IG1hcFJlc3VsdHNbaV07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwocmVzdWx0LCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRba2V5XS5wdXNoKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRba2V5XSA9IFt2YWxdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB2YXIgZ3JvdXBCeUxpbWl0JDEgPSBhd2FpdGlmeShncm91cEJ5TGltaXQsIDQpO1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIG5ldyBvYmplY3QsIHdoZXJlIGVhY2ggdmFsdWUgY29ycmVzcG9uZHMgdG8gYW4gYXJyYXkgb2YgaXRlbXMsIGZyb21cbiAgICAgKiBgY29sbGAsIHRoYXQgcmV0dXJuZWQgdGhlIGNvcnJlc3BvbmRpbmcga2V5LiBUaGF0IGlzLCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0XG4gICAgICogY29ycmVzcG9uZCB0byB0aGUgdmFsdWVzIHBhc3NlZCB0byB0aGUgYGl0ZXJhdGVlYCBjYWxsYmFjay5cbiAgICAgKlxuICAgICAqIE5vdGU6IFNpbmNlIHRoaXMgZnVuY3Rpb24gYXBwbGllcyB0aGUgYGl0ZXJhdGVlYCB0byBlYWNoIGl0ZW0gaW4gcGFyYWxsZWwsXG4gICAgICogdGhlcmUgaXMgbm8gZ3VhcmFudGVlIHRoYXQgdGhlIGBpdGVyYXRlZWAgZnVuY3Rpb25zIHdpbGwgY29tcGxldGUgaW4gb3JkZXIuXG4gICAgICogSG93ZXZlciwgdGhlIHZhbHVlcyBmb3IgZWFjaCBrZXkgaW4gdGhlIGByZXN1bHRgIHdpbGwgYmUgaW4gdGhlIHNhbWUgb3JkZXIgYXNcbiAgICAgKiB0aGUgb3JpZ2luYWwgYGNvbGxgLiBGb3IgT2JqZWN0cywgdGhlIHZhbHVlcyB3aWxsIHJvdWdobHkgYmUgaW4gdGhlIG9yZGVyIG9mXG4gICAgICogdGhlIG9yaWdpbmFsIE9iamVjdHMnIGtleXMgKGJ1dCB0aGlzIGNhbiB2YXJ5IGFjcm9zcyBKYXZhU2NyaXB0IGVuZ2luZXMpLlxuICAgICAqXG4gICAgICogQG5hbWUgZ3JvdXBCeVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxBc3luY0l0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEFuIGFzeW5jIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpblxuICAgICAqIGBjb2xsYC5cbiAgICAgKiBUaGUgaXRlcmF0ZWUgc2hvdWxkIGNvbXBsZXRlIHdpdGggYSBga2V5YCB0byBncm91cCB0aGUgdmFsdWUgdW5kZXIuXG4gICAgICogSW52b2tlZCB3aXRoICh2YWx1ZSwgY2FsbGJhY2spLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbCBgaXRlcmF0ZWVgXG4gICAgICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0IGlzIGFuIGBPYmplY3RgIHdob3Nlc1xuICAgICAqIHByb3BlcnRpZXMgYXJlIGFycmF5cyBvZiB2YWx1ZXMgd2hpY2ggcmV0dXJuZWQgdGhlIGNvcnJlc3BvbmRpbmcga2V5LlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UsIGlmIG5vIGNhbGxiYWNrIGlzIHBhc3NlZFxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAvLyBkaXIxIGlzIGEgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgZmlsZTEudHh0LCBmaWxlMi50eHRcbiAgICAgKiAvLyBkaXIyIGlzIGEgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgZmlsZTMudHh0LCBmaWxlNC50eHRcbiAgICAgKiAvLyBkaXIzIGlzIGEgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgZmlsZTUudHh0XG4gICAgICogLy8gZGlyNCBkb2VzIG5vdCBleGlzdFxuICAgICAqXG4gICAgICogY29uc3QgZmlsZXMgPSBbJ2RpcjEvZmlsZTEudHh0JywnZGlyMicsJ2RpcjQnXVxuICAgICAqXG4gICAgICogLy8gYXN5bmNocm9ub3VzIGZ1bmN0aW9uIHRoYXQgZGV0ZWN0cyBmaWxlIHR5cGUgYXMgbm9uZSwgZmlsZSwgb3IgZGlyZWN0b3J5XG4gICAgICogZnVuY3Rpb24gZGV0ZWN0RmlsZShmaWxlLCBjYWxsYmFjaykge1xuICAgICAqICAgICBmcy5zdGF0KGZpbGUsIGZ1bmN0aW9uKGVyciwgc3RhdCkge1xuICAgICAqICAgICAgICAgaWYgKGVycikge1xuICAgICAqICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCAnbm9uZScpO1xuICAgICAqICAgICAgICAgfVxuICAgICAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgc3RhdC5pc0RpcmVjdG9yeSgpID8gJ2RpcmVjdG9yeScgOiAnZmlsZScpO1xuICAgICAqICAgICB9KTtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiAvL1VzaW5nIGNhbGxiYWNrc1xuICAgICAqIGFzeW5jLmdyb3VwQnkoZmlsZXMsIGRldGVjdEZpbGUsIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gICAgICogICAgIGlmKGVycikge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgfSBlbHNlIHtcbiAgICAgKlx0ICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICogICAgICAgICAvLyB7XG4gICAgICogICAgICAgICAvLyAgICAgZmlsZTogWyAnZGlyMS9maWxlMS50eHQnIF0sXG4gICAgICogICAgICAgICAvLyAgICAgbm9uZTogWyAnZGlyNCcgXSxcbiAgICAgKiAgICAgICAgIC8vICAgICBkaXJlY3Rvcnk6IFsgJ2RpcjInXVxuICAgICAqICAgICAgICAgLy8gfVxuICAgICAqICAgICAgICAgLy8gcmVzdWx0IGlzIG9iamVjdCBjb250YWluaW5nIHRoZSBmaWxlcyBncm91cGVkIGJ5IHR5cGVcbiAgICAgKiAgICAgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gVXNpbmcgUHJvbWlzZXNcbiAgICAgKiBhc3luYy5ncm91cEJ5KGZpbGVzLCBkZXRlY3RGaWxlKVxuICAgICAqIC50aGVuKCByZXN1bHQgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAqICAgICAvLyB7XG4gICAgICogICAgIC8vICAgICBmaWxlOiBbICdkaXIxL2ZpbGUxLnR4dCcgXSxcbiAgICAgKiAgICAgLy8gICAgIG5vbmU6IFsgJ2RpcjQnIF0sXG4gICAgICogICAgIC8vICAgICBkaXJlY3Rvcnk6IFsgJ2RpcjInXVxuICAgICAqICAgICAvLyB9XG4gICAgICogICAgIC8vIHJlc3VsdCBpcyBvYmplY3QgY29udGFpbmluZyB0aGUgZmlsZXMgZ3JvdXBlZCBieSB0eXBlXG4gICAgICogfSkuY2F0Y2goIGVyciA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBhc3luYy9hd2FpdFxuICAgICAqIGFzeW5jICgpID0+IHtcbiAgICAgKiAgICAgdHJ5IHtcbiAgICAgKiAgICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBhc3luYy5ncm91cEJ5KGZpbGVzLCBkZXRlY3RGaWxlKTtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICogICAgICAgICAvLyB7XG4gICAgICogICAgICAgICAvLyAgICAgZmlsZTogWyAnZGlyMS9maWxlMS50eHQnIF0sXG4gICAgICogICAgICAgICAvLyAgICAgbm9uZTogWyAnZGlyNCcgXSxcbiAgICAgKiAgICAgICAgIC8vICAgICBkaXJlY3Rvcnk6IFsgJ2RpcjInXVxuICAgICAqICAgICAgICAgLy8gfVxuICAgICAqICAgICAgICAgLy8gcmVzdWx0IGlzIG9iamVjdCBjb250YWluaW5nIHRoZSBmaWxlcyBncm91cGVkIGJ5IHR5cGVcbiAgICAgKiAgICAgfVxuICAgICAqICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICB9XG4gICAgICogfVxuICAgICAqXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ3JvdXBCeSAoY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBncm91cEJ5TGltaXQkMShjb2xsLCBJbmZpbml0eSwgaXRlcmF0ZWUsIGNhbGxiYWNrKVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBzYW1lIGFzIFtgZ3JvdXBCeWBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5ncm91cEJ5fSBidXQgcnVucyBvbmx5IGEgc2luZ2xlIGFzeW5jIG9wZXJhdGlvbiBhdCBhIHRpbWUuXG4gICAgICpcbiAgICAgKiBAbmFtZSBncm91cEJ5U2VyaWVzXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMuZ3JvdXBCeV17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmdyb3VwQnl9XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluXG4gICAgICogYGNvbGxgLlxuICAgICAqIFRoZSBpdGVyYXRlZSBzaG91bGQgY29tcGxldGUgd2l0aCBhIGBrZXlgIHRvIGdyb3VwIHRoZSB2YWx1ZSB1bmRlci5cbiAgICAgKiBJbnZva2VkIHdpdGggKHZhbHVlLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsIGBpdGVyYXRlZWBcbiAgICAgKiBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBSZXN1bHQgaXMgYW4gYE9iamVjdGAgd2hvc2VcbiAgICAgKiBwcm9wZXJ0aWVzIGFyZSBhcnJheXMgb2YgdmFsdWVzIHdoaWNoIHJldHVybmVkIHRoZSBjb3JyZXNwb25kaW5nIGtleS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwYXNzZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBncm91cEJ5U2VyaWVzIChjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGdyb3VwQnlMaW1pdCQxKGNvbGwsIDEsIGl0ZXJhdGVlLCBjYWxsYmFjaylcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2dzIHRoZSByZXN1bHQgb2YgYW4gYGFzeW5jYCBmdW5jdGlvbiB0byB0aGUgYGNvbnNvbGVgLiBPbmx5IHdvcmtzIGluXG4gICAgICogTm9kZS5qcyBvciBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgYGNvbnNvbGUubG9nYCBhbmQgYGNvbnNvbGUuZXJyb3JgIChzdWNoXG4gICAgICogYXMgRkYgYW5kIENocm9tZSkuIElmIG11bHRpcGxlIGFyZ3VtZW50cyBhcmUgcmV0dXJuZWQgZnJvbSB0aGUgYXN5bmNcbiAgICAgKiBmdW5jdGlvbiwgYGNvbnNvbGUubG9nYCBpcyBjYWxsZWQgb24gZWFjaCBhcmd1bWVudCBpbiBvcmRlci5cbiAgICAgKlxuICAgICAqIEBuYW1lIGxvZ1xuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBjYXRlZ29yeSBVdGlsXG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBmdW5jdGlvbiAtIFRoZSBmdW5jdGlvbiB5b3Ugd2FudCB0byBldmVudHVhbGx5IGFwcGx5XG4gICAgICogYWxsIGFyZ3VtZW50cyB0by5cbiAgICAgKiBAcGFyYW0gey4uLip9IGFyZ3VtZW50cy4uLiAtIEFueSBudW1iZXIgb2YgYXJndW1lbnRzIHRvIGFwcGx5IHRvIHRoZSBmdW5jdGlvbi5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogLy8gaW4gYSBtb2R1bGVcbiAgICAgKiB2YXIgaGVsbG8gPSBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICAgICAqICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ2hlbGxvICcgKyBuYW1lKTtcbiAgICAgKiAgICAgfSwgMTAwMCk7XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIC8vIGluIHRoZSBub2RlIHJlcGxcbiAgICAgKiBub2RlPiBhc3luYy5sb2coaGVsbG8sICd3b3JsZCcpO1xuICAgICAqICdoZWxsbyB3b3JsZCdcbiAgICAgKi9cbiAgICB2YXIgbG9nID0gY29uc29sZUZ1bmMoJ2xvZycpO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2BtYXBWYWx1ZXNgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMubWFwVmFsdWVzfSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGFcbiAgICAgKiB0aW1lLlxuICAgICAqXG4gICAgICogQG5hbWUgbWFwVmFsdWVzTGltaXRcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5tYXBWYWx1ZXNde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXBWYWx1ZXN9XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbGltaXQgLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCB2YWx1ZSBhbmQga2V5XG4gICAgICogaW4gYGNvbGxgLlxuICAgICAqIFRoZSBpdGVyYXRlZSBzaG91bGQgY29tcGxldGUgd2l0aCB0aGUgdHJhbnNmb3JtZWQgdmFsdWUgYXMgaXRzIHJlc3VsdC5cbiAgICAgKiBJbnZva2VkIHdpdGggKHZhbHVlLCBrZXksIGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGwgYGl0ZXJhdGVlYFxuICAgICAqIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIGByZXN1bHRgIGlzIGEgbmV3IG9iamVjdCBjb25zaXN0aW5nXG4gICAgICogb2YgZWFjaCBrZXkgZnJvbSBgb2JqYCwgd2l0aCBlYWNoIHRyYW5zZm9ybWVkIHZhbHVlIG9uIHRoZSByaWdodC1oYW5kIHNpZGUuXG4gICAgICogSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdCkuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgbm8gY2FsbGJhY2sgaXMgcGFzc2VkXG4gICAgICovXG4gICAgZnVuY3Rpb24gbWFwVmFsdWVzTGltaXQob2JqLCBsaW1pdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb25jZShjYWxsYmFjayk7XG4gICAgICAgIHZhciBuZXdPYmogPSB7fTtcbiAgICAgICAgdmFyIF9pdGVyYXRlZSA9IHdyYXBBc3luYyhpdGVyYXRlZSk7XG4gICAgICAgIHJldHVybiBlYWNoT2ZMaW1pdChsaW1pdCkob2JqLCAodmFsLCBrZXksIG5leHQpID0+IHtcbiAgICAgICAgICAgIF9pdGVyYXRlZSh2YWwsIGtleSwgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIG5leHQoZXJyKTtcbiAgICAgICAgICAgICAgICBuZXdPYmpba2V5XSA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICBuZXh0KGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZXJyID0+IGNhbGxiYWNrKGVyciwgbmV3T2JqKSk7XG4gICAgfVxuXG4gICAgdmFyIG1hcFZhbHVlc0xpbWl0JDEgPSBhd2FpdGlmeShtYXBWYWx1ZXNMaW1pdCwgNCk7XG5cbiAgICAvKipcbiAgICAgKiBBIHJlbGF0aXZlIG9mIFtgbWFwYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLm1hcH0sIGRlc2lnbmVkIGZvciB1c2Ugd2l0aCBvYmplY3RzLlxuICAgICAqXG4gICAgICogUHJvZHVjZXMgYSBuZXcgT2JqZWN0IGJ5IG1hcHBpbmcgZWFjaCB2YWx1ZSBvZiBgb2JqYCB0aHJvdWdoIHRoZSBgaXRlcmF0ZWVgXG4gICAgICogZnVuY3Rpb24uIFRoZSBgaXRlcmF0ZWVgIGlzIGNhbGxlZCBlYWNoIGB2YWx1ZWAgYW5kIGBrZXlgIGZyb20gYG9iamAgYW5kIGFcbiAgICAgKiBjYWxsYmFjayBmb3Igd2hlbiBpdCBoYXMgZmluaXNoZWQgcHJvY2Vzc2luZy4gRWFjaCBvZiB0aGVzZSBjYWxsYmFja3MgdGFrZXNcbiAgICAgKiB0d28gYXJndW1lbnRzOiBhbiBgZXJyb3JgLCBhbmQgdGhlIHRyYW5zZm9ybWVkIGl0ZW0gZnJvbSBgb2JqYC4gSWYgYGl0ZXJhdGVlYFxuICAgICAqIHBhc3NlcyBhbiBlcnJvciB0byBpdHMgY2FsbGJhY2ssIHRoZSBtYWluIGBjYWxsYmFja2AgKGZvciB0aGUgYG1hcFZhbHVlc2BcbiAgICAgKiBmdW5jdGlvbikgaXMgaW1tZWRpYXRlbHkgY2FsbGVkIHdpdGggdGhlIGVycm9yLlxuICAgICAqXG4gICAgICogTm90ZSwgdGhlIG9yZGVyIG9mIHRoZSBrZXlzIGluIHRoZSByZXN1bHQgaXMgbm90IGd1YXJhbnRlZWQuICBUaGUga2V5cyB3aWxsXG4gICAgICogYmUgcm91Z2hseSBpbiB0aGUgb3JkZXIgdGhleSBjb21wbGV0ZSwgKGJ1dCB0aGlzIGlzIHZlcnkgZW5naW5lLXNwZWNpZmljKVxuICAgICAqXG4gICAgICogQG5hbWUgbWFwVmFsdWVzXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIHZhbHVlIGFuZCBrZXlcbiAgICAgKiBpbiBgY29sbGAuXG4gICAgICogVGhlIGl0ZXJhdGVlIHNob3VsZCBjb21wbGV0ZSB3aXRoIHRoZSB0cmFuc2Zvcm1lZCB2YWx1ZSBhcyBpdHMgcmVzdWx0LlxuICAgICAqIEludm9rZWQgd2l0aCAodmFsdWUsIGtleSwgY2FsbGJhY2spLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbCBgaXRlcmF0ZWVgXG4gICAgICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gYHJlc3VsdGAgaXMgYSBuZXcgb2JqZWN0IGNvbnNpc3RpbmdcbiAgICAgKiBvZiBlYWNoIGtleSBmcm9tIGBvYmpgLCB3aXRoIGVhY2ggdHJhbnNmb3JtZWQgdmFsdWUgb24gdGhlIHJpZ2h0LWhhbmQgc2lkZS5cbiAgICAgKiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwYXNzZWRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogLy8gZmlsZTEudHh0IGlzIGEgZmlsZSB0aGF0IGlzIDEwMDAgYnl0ZXMgaW4gc2l6ZVxuICAgICAqIC8vIGZpbGUyLnR4dCBpcyBhIGZpbGUgdGhhdCBpcyAyMDAwIGJ5dGVzIGluIHNpemVcbiAgICAgKiAvLyBmaWxlMy50eHQgaXMgYSBmaWxlIHRoYXQgaXMgMzAwMCBieXRlcyBpbiBzaXplXG4gICAgICogLy8gZmlsZTQudHh0IGRvZXMgbm90IGV4aXN0XG4gICAgICpcbiAgICAgKiBjb25zdCBmaWxlTWFwID0ge1xuICAgICAqICAgICBmMTogJ2ZpbGUxLnR4dCcsXG4gICAgICogICAgIGYyOiAnZmlsZTIudHh0JyxcbiAgICAgKiAgICAgZjM6ICdmaWxlMy50eHQnXG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIGNvbnN0IHdpdGhNaXNzaW5nRmlsZU1hcCA9IHtcbiAgICAgKiAgICAgZjE6ICdmaWxlMS50eHQnLFxuICAgICAqICAgICBmMjogJ2ZpbGUyLnR4dCcsXG4gICAgICogICAgIGYzOiAnZmlsZTQudHh0J1xuICAgICAqIH07XG4gICAgICpcbiAgICAgKiAvLyBhc3luY2hyb25vdXMgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBmaWxlIHNpemUgaW4gYnl0ZXNcbiAgICAgKiBmdW5jdGlvbiBnZXRGaWxlU2l6ZUluQnl0ZXMoZmlsZSwga2V5LCBjYWxsYmFjaykge1xuICAgICAqICAgICBmcy5zdGF0KGZpbGUsIGZ1bmN0aW9uKGVyciwgc3RhdCkge1xuICAgICAqICAgICAgICAgaWYgKGVycikge1xuICAgICAqICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAqICAgICAgICAgfVxuICAgICAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgc3RhdC5zaXplKTtcbiAgICAgKiAgICAgfSk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogLy8gVXNpbmcgY2FsbGJhY2tzXG4gICAgICogYXN5bmMubWFwVmFsdWVzKGZpbGVNYXAsIGdldEZpbGVTaXplSW5CeXRlcywgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAgKiAgICAgaWYgKGVycikge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgfSBlbHNlIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICogICAgICAgICAvLyByZXN1bHQgaXMgbm93IGEgbWFwIG9mIGZpbGUgc2l6ZSBpbiBieXRlcyBmb3IgZWFjaCBmaWxlLCBlLmcuXG4gICAgICogICAgICAgICAvLyB7XG4gICAgICogICAgICAgICAvLyAgICAgZjE6IDEwMDAsXG4gICAgICogICAgICAgICAvLyAgICAgZjI6IDIwMDAsXG4gICAgICogICAgICAgICAvLyAgICAgZjM6IDMwMDBcbiAgICAgKiAgICAgICAgIC8vIH1cbiAgICAgKiAgICAgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gRXJyb3IgaGFuZGxpbmdcbiAgICAgKiBhc3luYy5tYXBWYWx1ZXMod2l0aE1pc3NpbmdGaWxlTWFwLCBnZXRGaWxlU2l6ZUluQnl0ZXMsIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gICAgICogICAgIGlmIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgICAgICAvLyBbIEVycm9yOiBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkgXVxuICAgICAqICAgICB9IGVsc2Uge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gVXNpbmcgUHJvbWlzZXNcbiAgICAgKiBhc3luYy5tYXBWYWx1ZXMoZmlsZU1hcCwgZ2V0RmlsZVNpemVJbkJ5dGVzKVxuICAgICAqIC50aGVuKCByZXN1bHQgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAqICAgICAvLyByZXN1bHQgaXMgbm93IGEgbWFwIG9mIGZpbGUgc2l6ZSBpbiBieXRlcyBmb3IgZWFjaCBmaWxlLCBlLmcuXG4gICAgICogICAgIC8vIHtcbiAgICAgKiAgICAgLy8gICAgIGYxOiAxMDAwLFxuICAgICAqICAgICAvLyAgICAgZjI6IDIwMDAsXG4gICAgICogICAgIC8vICAgICBmMzogMzAwMFxuICAgICAqICAgICAvLyB9XG4gICAgICogfSkuY2F0Y2ggKGVyciA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBFcnJvciBIYW5kbGluZ1xuICAgICAqIGFzeW5jLm1hcFZhbHVlcyh3aXRoTWlzc2luZ0ZpbGVNYXAsIGdldEZpbGVTaXplSW5CeXRlcylcbiAgICAgKiAudGhlbiggcmVzdWx0ID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiB9KS5jYXRjaCAoZXJyID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgLy8gWyBFcnJvcjogRU5PRU5UOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5IF1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIGFzeW5jL2F3YWl0XG4gICAgICogYXN5bmMgKCkgPT4ge1xuICAgICAqICAgICB0cnkge1xuICAgICAqICAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IGFzeW5jLm1hcFZhbHVlcyhmaWxlTWFwLCBnZXRGaWxlU2l6ZUluQnl0ZXMpO1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgICAgIC8vIHJlc3VsdCBpcyBub3cgYSBtYXAgb2YgZmlsZSBzaXplIGluIGJ5dGVzIGZvciBlYWNoIGZpbGUsIGUuZy5cbiAgICAgKiAgICAgICAgIC8vIHtcbiAgICAgKiAgICAgICAgIC8vICAgICBmMTogMTAwMCxcbiAgICAgKiAgICAgICAgIC8vICAgICBmMjogMjAwMCxcbiAgICAgKiAgICAgICAgIC8vICAgICBmMzogMzAwMFxuICAgICAqICAgICAgICAgLy8gfVxuICAgICAqICAgICB9XG4gICAgICogICAgIGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiAvLyBFcnJvciBIYW5kbGluZ1xuICAgICAqIGFzeW5jICgpID0+IHtcbiAgICAgKiAgICAgdHJ5IHtcbiAgICAgKiAgICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBhc3luYy5tYXBWYWx1ZXMod2l0aE1pc3NpbmdGaWxlTWFwLCBnZXRGaWxlU2l6ZUluQnl0ZXMpO1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgfVxuICAgICAqICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICAgICAgLy8gWyBFcnJvcjogRU5PRU5UOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5IF1cbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1hcFZhbHVlcyhvYmosIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gbWFwVmFsdWVzTGltaXQkMShvYmosIEluZmluaXR5LCBpdGVyYXRlZSwgY2FsbGJhY2spXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2BtYXBWYWx1ZXNgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMubWFwVmFsdWVzfSBidXQgcnVucyBvbmx5IGEgc2luZ2xlIGFzeW5jIG9wZXJhdGlvbiBhdCBhIHRpbWUuXG4gICAgICpcbiAgICAgKiBAbmFtZSBtYXBWYWx1ZXNTZXJpZXNcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5tYXBWYWx1ZXNde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXBWYWx1ZXN9XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIHZhbHVlIGFuZCBrZXlcbiAgICAgKiBpbiBgY29sbGAuXG4gICAgICogVGhlIGl0ZXJhdGVlIHNob3VsZCBjb21wbGV0ZSB3aXRoIHRoZSB0cmFuc2Zvcm1lZCB2YWx1ZSBhcyBpdHMgcmVzdWx0LlxuICAgICAqIEludm9rZWQgd2l0aCAodmFsdWUsIGtleSwgY2FsbGJhY2spLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbCBgaXRlcmF0ZWVgXG4gICAgICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gYHJlc3VsdGAgaXMgYSBuZXcgb2JqZWN0IGNvbnNpc3RpbmdcbiAgICAgKiBvZiBlYWNoIGtleSBmcm9tIGBvYmpgLCB3aXRoIGVhY2ggdHJhbnNmb3JtZWQgdmFsdWUgb24gdGhlIHJpZ2h0LWhhbmQgc2lkZS5cbiAgICAgKiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwYXNzZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtYXBWYWx1ZXNTZXJpZXMob2JqLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIG1hcFZhbHVlc0xpbWl0JDEob2JqLCAxLCBpdGVyYXRlZSwgY2FsbGJhY2spXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FjaGVzIHRoZSByZXN1bHRzIG9mIGFuIGFzeW5jIGZ1bmN0aW9uLiBXaGVuIGNyZWF0aW5nIGEgaGFzaCB0byBzdG9yZVxuICAgICAqIGZ1bmN0aW9uIHJlc3VsdHMgYWdhaW5zdCwgdGhlIGNhbGxiYWNrIGlzIG9taXR0ZWQgZnJvbSB0aGUgaGFzaCBhbmQgYW5cbiAgICAgKiBvcHRpb25hbCBoYXNoIGZ1bmN0aW9uIGNhbiBiZSB1c2VkLlxuICAgICAqXG4gICAgICogKipOb3RlOiBpZiB0aGUgYXN5bmMgZnVuY3Rpb24gZXJycywgdGhlIHJlc3VsdCB3aWxsIG5vdCBiZSBjYWNoZWQgYW5kXG4gICAgICogc3Vic2VxdWVudCBjYWxscyB3aWxsIGNhbGwgdGhlIHdyYXBwZWQgZnVuY3Rpb24uKipcbiAgICAgKlxuICAgICAqIElmIG5vIGhhc2ggZnVuY3Rpb24gaXMgc3BlY2lmaWVkLCB0aGUgZmlyc3QgYXJndW1lbnQgaXMgdXNlZCBhcyBhIGhhc2gga2V5LFxuICAgICAqIHdoaWNoIG1heSB3b3JrIHJlYXNvbmFibHkgaWYgaXQgaXMgYSBzdHJpbmcgb3IgYSBkYXRhIHR5cGUgdGhhdCBjb252ZXJ0cyB0byBhXG4gICAgICogZGlzdGluY3Qgc3RyaW5nLiBOb3RlIHRoYXQgb2JqZWN0cyBhbmQgYXJyYXlzIHdpbGwgbm90IGJlaGF2ZSByZWFzb25hYmx5LlxuICAgICAqIE5laXRoZXIgd2lsbCBjYXNlcyB3aGVyZSB0aGUgb3RoZXIgYXJndW1lbnRzIGFyZSBzaWduaWZpY2FudC4gSW4gc3VjaCBjYXNlcyxcbiAgICAgKiBzcGVjaWZ5IHlvdXIgb3duIGhhc2ggZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBUaGUgY2FjaGUgb2YgcmVzdWx0cyBpcyBleHBvc2VkIGFzIHRoZSBgbWVtb2AgcHJvcGVydHkgb2YgdGhlIGZ1bmN0aW9uXG4gICAgICogcmV0dXJuZWQgYnkgYG1lbW9pemVgLlxuICAgICAqXG4gICAgICogQG5hbWUgbWVtb2l6ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBjYXRlZ29yeSBVdGlsXG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBmbiAtIFRoZSBhc3luYyBmdW5jdGlvbiB0byBwcm94eSBhbmQgY2FjaGUgcmVzdWx0cyBmcm9tLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGhhc2hlciAtIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIGZvciBnZW5lcmF0aW5nIGEgY3VzdG9tIGhhc2hcbiAgICAgKiBmb3Igc3RvcmluZyByZXN1bHRzLiBJdCBoYXMgYWxsIHRoZSBhcmd1bWVudHMgYXBwbGllZCB0byBpdCBhcGFydCBmcm9tIHRoZVxuICAgICAqIGNhbGxiYWNrLCBhbmQgbXVzdCBiZSBzeW5jaHJvbm91cy5cbiAgICAgKiBAcmV0dXJucyB7QXN5bmNGdW5jdGlvbn0gYSBtZW1vaXplZCB2ZXJzaW9uIG9mIGBmbmBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIHNsb3dfZm4gPSBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICAgICAqICAgICAvLyBkbyBzb21ldGhpbmdcbiAgICAgKiAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgKiB9O1xuICAgICAqIHZhciBmbiA9IGFzeW5jLm1lbW9pemUoc2xvd19mbik7XG4gICAgICpcbiAgICAgKiAvLyBmbiBjYW4gbm93IGJlIHVzZWQgYXMgaWYgaXQgd2VyZSBzbG93X2ZuXG4gICAgICogZm4oJ3NvbWUgbmFtZScsIGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAvLyBjYWxsYmFja1xuICAgICAqIH0pO1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lbW9pemUoZm4sIGhhc2hlciA9IHYgPT4gdikge1xuICAgICAgICB2YXIgbWVtbyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIHZhciBxdWV1ZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICB2YXIgX2ZuID0gd3JhcEFzeW5jKGZuKTtcbiAgICAgICAgdmFyIG1lbW9pemVkID0gaW5pdGlhbFBhcmFtcygoYXJncywgY2FsbGJhY2spID0+IHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBoYXNoZXIoLi4uYXJncyk7XG4gICAgICAgICAgICBpZiAoa2V5IGluIG1lbW8pIHtcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUkMSgoKSA9PiBjYWxsYmFjayhudWxsLCAuLi5tZW1vW2tleV0pKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5IGluIHF1ZXVlcykge1xuICAgICAgICAgICAgICAgIHF1ZXVlc1trZXldLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBxdWV1ZXNba2V5XSA9IFtjYWxsYmFja107XG4gICAgICAgICAgICAgICAgX2ZuKC4uLmFyZ3MsIChlcnIsIC4uLnJlc3VsdEFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gIzE0NjUgZG9uJ3QgbWVtb2l6ZSBpZiBhbiBlcnJvciBvY2N1cnJlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVtb1trZXldID0gcmVzdWx0QXJncztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgcSA9IHF1ZXVlc1trZXldO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcXVldWVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gcS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHFbaV0oZXJyLCAuLi5yZXN1bHRBcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgbWVtb2l6ZWQubWVtbyA9IG1lbW87XG4gICAgICAgIG1lbW9pemVkLnVubWVtb2l6ZWQgPSBmbjtcbiAgICAgICAgcmV0dXJuIG1lbW9pemVkO1xuICAgIH1cblxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBmaWxlICovXG5cbiAgICAvKipcbiAgICAgKiBDYWxscyBgY2FsbGJhY2tgIG9uIGEgbGF0ZXIgbG9vcCBhcm91bmQgdGhlIGV2ZW50IGxvb3AuIEluIE5vZGUuanMgdGhpcyBqdXN0XG4gICAgICogY2FsbHMgYHByb2Nlc3MubmV4dFRpY2tgLiAgSW4gdGhlIGJyb3dzZXIgaXQgd2lsbCB1c2UgYHNldEltbWVkaWF0ZWAgaWZcbiAgICAgKiBhdmFpbGFibGUsIG90aGVyd2lzZSBgc2V0VGltZW91dChjYWxsYmFjaywgMClgLCB3aGljaCBtZWFucyBvdGhlciBoaWdoZXJcbiAgICAgKiBwcmlvcml0eSBldmVudHMgbWF5IHByZWNlZGUgdGhlIGV4ZWN1dGlvbiBvZiBgY2FsbGJhY2tgLlxuICAgICAqXG4gICAgICogVGhpcyBpcyB1c2VkIGludGVybmFsbHkgZm9yIGJyb3dzZXItY29tcGF0aWJpbGl0eSBwdXJwb3Nlcy5cbiAgICAgKlxuICAgICAqIEBuYW1lIG5leHRUaWNrXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6VXRpbHNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMuc2V0SW1tZWRpYXRlXXtAbGluayBtb2R1bGU6VXRpbHMuc2V0SW1tZWRpYXRlfVxuICAgICAqIEBjYXRlZ29yeSBVdGlsXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCBvbiBhIGxhdGVyIGxvb3AgYXJvdW5kXG4gICAgICogdGhlIGV2ZW50IGxvb3AuIEludm9rZWQgd2l0aCAoYXJncy4uLikuXG4gICAgICogQHBhcmFtIHsuLi4qfSBhcmdzLi4uIC0gYW55IG51bWJlciBvZiBhZGRpdGlvbmFsIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZVxuICAgICAqIGNhbGxiYWNrIG9uIHRoZSBuZXh0IHRpY2suXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjYWxsX29yZGVyID0gW107XG4gICAgICogYXN5bmMubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICogICAgIGNhbGxfb3JkZXIucHVzaCgndHdvJyk7XG4gICAgICogICAgIC8vIGNhbGxfb3JkZXIgbm93IGVxdWFscyBbJ29uZScsJ3R3byddXG4gICAgICogfSk7XG4gICAgICogY2FsbF9vcmRlci5wdXNoKCdvbmUnKTtcbiAgICAgKlxuICAgICAqIGFzeW5jLnNldEltbWVkaWF0ZShmdW5jdGlvbiAoYSwgYiwgYykge1xuICAgICAqICAgICAvLyBhLCBiLCBhbmQgYyBlcXVhbCAxLCAyLCBhbmQgM1xuICAgICAqIH0sIDEsIDIsIDMpO1xuICAgICAqL1xuICAgIHZhciBfZGVmZXIkMTtcblxuICAgIGlmIChoYXNOZXh0VGljaykge1xuICAgICAgICBfZGVmZXIkMSA9IHByb2Nlc3MubmV4dFRpY2s7XG4gICAgfSBlbHNlIGlmIChoYXNTZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgX2RlZmVyJDEgPSBzZXRJbW1lZGlhdGU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgX2RlZmVyJDEgPSBmYWxsYmFjaztcbiAgICB9XG5cbiAgICB2YXIgbmV4dFRpY2sgPSB3cmFwKF9kZWZlciQxKTtcblxuICAgIHZhciBwYXJhbGxlbCA9IGF3YWl0aWZ5KChlYWNoZm4sIHRhc2tzLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IGlzQXJyYXlMaWtlKHRhc2tzKSA/IFtdIDoge307XG5cbiAgICAgICAgZWFjaGZuKHRhc2tzLCAodGFzaywga2V5LCB0YXNrQ2IpID0+IHtcbiAgICAgICAgICAgIHdyYXBBc3luYyh0YXNrKSgoZXJyLCAuLi5yZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCA8IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgW3Jlc3VsdF0gPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHNba2V5XSA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICB0YXNrQ2IoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBlcnIgPT4gY2FsbGJhY2soZXJyLCByZXN1bHRzKSk7XG4gICAgfSwgMyk7XG5cbiAgICAvKipcbiAgICAgKiBSdW4gdGhlIGB0YXNrc2AgY29sbGVjdGlvbiBvZiBmdW5jdGlvbnMgaW4gcGFyYWxsZWwsIHdpdGhvdXQgd2FpdGluZyB1bnRpbFxuICAgICAqIHRoZSBwcmV2aW91cyBmdW5jdGlvbiBoYXMgY29tcGxldGVkLiBJZiBhbnkgb2YgdGhlIGZ1bmN0aW9ucyBwYXNzIGFuIGVycm9yIHRvXG4gICAgICogaXRzIGNhbGxiYWNrLCB0aGUgbWFpbiBgY2FsbGJhY2tgIGlzIGltbWVkaWF0ZWx5IGNhbGxlZCB3aXRoIHRoZSB2YWx1ZSBvZiB0aGVcbiAgICAgKiBlcnJvci4gT25jZSB0aGUgYHRhc2tzYCBoYXZlIGNvbXBsZXRlZCwgdGhlIHJlc3VsdHMgYXJlIHBhc3NlZCB0byB0aGUgZmluYWxcbiAgICAgKiBgY2FsbGJhY2tgIGFzIGFuIGFycmF5LlxuICAgICAqXG4gICAgICogKipOb3RlOioqIGBwYXJhbGxlbGAgaXMgYWJvdXQga2lja2luZy1vZmYgSS9PIHRhc2tzIGluIHBhcmFsbGVsLCBub3QgYWJvdXRcbiAgICAgKiBwYXJhbGxlbCBleGVjdXRpb24gb2YgY29kZS4gIElmIHlvdXIgdGFza3MgZG8gbm90IHVzZSBhbnkgdGltZXJzIG9yIHBlcmZvcm1cbiAgICAgKiBhbnkgSS9PLCB0aGV5IHdpbGwgYWN0dWFsbHkgYmUgZXhlY3V0ZWQgaW4gc2VyaWVzLiAgQW55IHN5bmNocm9ub3VzIHNldHVwXG4gICAgICogc2VjdGlvbnMgZm9yIGVhY2ggdGFzayB3aWxsIGhhcHBlbiBvbmUgYWZ0ZXIgdGhlIG90aGVyLiAgSmF2YVNjcmlwdCByZW1haW5zXG4gICAgICogc2luZ2xlLXRocmVhZGVkLlxuICAgICAqXG4gICAgICogKipIaW50OioqIFVzZSBbYHJlZmxlY3RgXXtAbGluayBtb2R1bGU6VXRpbHMucmVmbGVjdH0gdG8gY29udGludWUgdGhlXG4gICAgICogZXhlY3V0aW9uIG9mIG90aGVyIHRhc2tzIHdoZW4gYSB0YXNrIGZhaWxzLlxuICAgICAqXG4gICAgICogSXQgaXMgYWxzbyBwb3NzaWJsZSB0byB1c2UgYW4gb2JqZWN0IGluc3RlYWQgb2YgYW4gYXJyYXkuIEVhY2ggcHJvcGVydHkgd2lsbFxuICAgICAqIGJlIHJ1biBhcyBhIGZ1bmN0aW9uIGFuZCB0aGUgcmVzdWx0cyB3aWxsIGJlIHBhc3NlZCB0byB0aGUgZmluYWwgYGNhbGxiYWNrYFxuICAgICAqIGFzIGFuIG9iamVjdCBpbnN0ZWFkIG9mIGFuIGFycmF5LiBUaGlzIGNhbiBiZSBhIG1vcmUgcmVhZGFibGUgd2F5IG9mIGhhbmRsaW5nXG4gICAgICogcmVzdWx0cyBmcm9tIHtAbGluayBhc3luYy5wYXJhbGxlbH0uXG4gICAgICpcbiAgICAgKiBAbmFtZSBwYXJhbGxlbFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gICAgICogQG1ldGhvZFxuICAgICAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSB0YXNrcyAtIEEgY29sbGVjdGlvbiBvZlxuICAgICAqIFthc3luYyBmdW5jdGlvbnNde0BsaW5rIEFzeW5jRnVuY3Rpb259IHRvIHJ1bi5cbiAgICAgKiBFYWNoIGFzeW5jIGZ1bmN0aW9uIGNhbiBjb21wbGV0ZSB3aXRoIGFueSBudW1iZXIgb2Ygb3B0aW9uYWwgYHJlc3VsdGAgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBbiBvcHRpb25hbCBjYWxsYmFjayB0byBydW4gb25jZSBhbGwgdGhlXG4gICAgICogZnVuY3Rpb25zIGhhdmUgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gVGhpcyBmdW5jdGlvbiBnZXRzIGEgcmVzdWx0cyBhcnJheVxuICAgICAqIChvciBvYmplY3QpIGNvbnRhaW5pbmcgYWxsIHRoZSByZXN1bHQgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgdGFzayBjYWxsYmFja3MuXG4gICAgICogSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdHMpLlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UsIGlmIGEgY2FsbGJhY2sgaXMgbm90IHBhc3NlZFxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIC8vVXNpbmcgQ2FsbGJhY2tzXG4gICAgICogYXN5bmMucGFyYWxsZWwoW1xuICAgICAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAnb25lJyk7XG4gICAgICogICAgICAgICB9LCAyMDApO1xuICAgICAqICAgICB9LFxuICAgICAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAndHdvJyk7XG4gICAgICogICAgICAgICB9LCAxMDApO1xuICAgICAqICAgICB9XG4gICAgICogXSwgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAvLyByZXN1bHRzIGlzIGVxdWFsIHRvIFsnb25lJywndHdvJ10gZXZlbiB0aG91Z2hcbiAgICAgKiAgICAgLy8gdGhlIHNlY29uZCBmdW5jdGlvbiBoYWQgYSBzaG9ydGVyIHRpbWVvdXQuXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBhbiBleGFtcGxlIHVzaW5nIGFuIG9iamVjdCBpbnN0ZWFkIG9mIGFuIGFycmF5XG4gICAgICogYXN5bmMucGFyYWxsZWwoe1xuICAgICAqICAgICBvbmU6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIDEpO1xuICAgICAqICAgICAgICAgfSwgMjAwKTtcbiAgICAgKiAgICAgfSxcbiAgICAgKiAgICAgdHdvOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAyKTtcbiAgICAgKiAgICAgICAgIH0sIDEwMCk7XG4gICAgICogICAgIH1cbiAgICAgKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0cyk7XG4gICAgICogICAgIC8vIHJlc3VsdHMgaXMgZXF1YWwgdG86IHsgb25lOiAxLCB0d286IDIgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy9Vc2luZyBQcm9taXNlc1xuICAgICAqIGFzeW5jLnBhcmFsbGVsKFtcbiAgICAgKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ29uZScpO1xuICAgICAqICAgICAgICAgfSwgMjAwKTtcbiAgICAgKiAgICAgfSxcbiAgICAgKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ3R3bycpO1xuICAgICAqICAgICAgICAgfSwgMTAwKTtcbiAgICAgKiAgICAgfVxuICAgICAqIF0pLnRoZW4ocmVzdWx0cyA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAvLyByZXN1bHRzIGlzIGVxdWFsIHRvIFsnb25lJywndHdvJ10gZXZlbiB0aG91Z2hcbiAgICAgKiAgICAgLy8gdGhlIHNlY29uZCBmdW5jdGlvbiBoYWQgYSBzaG9ydGVyIHRpbWVvdXQuXG4gICAgICogfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIGFuIGV4YW1wbGUgdXNpbmcgYW4gb2JqZWN0IGluc3RlYWQgb2YgYW4gYXJyYXlcbiAgICAgKiBhc3luYy5wYXJhbGxlbCh7XG4gICAgICogICAgIG9uZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgMSk7XG4gICAgICogICAgICAgICB9LCAyMDApO1xuICAgICAqICAgICB9LFxuICAgICAqICAgICB0d286IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIDIpO1xuICAgICAqICAgICAgICAgfSwgMTAwKTtcbiAgICAgKiAgICAgfVxuICAgICAqIH0pLnRoZW4ocmVzdWx0cyA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAvLyByZXN1bHRzIGlzIGVxdWFsIHRvOiB7IG9uZTogMSwgdHdvOiAyIH1cbiAgICAgKiB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy9Vc2luZyBhc3luYy9hd2FpdFxuICAgICAqIGFzeW5jICgpID0+IHtcbiAgICAgKiAgICAgdHJ5IHtcbiAgICAgKiAgICAgICAgIGxldCByZXN1bHRzID0gYXdhaXQgYXN5bmMucGFyYWxsZWwoW1xuICAgICAqICAgICAgICAgICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICogICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAnb25lJyk7XG4gICAgICogICAgICAgICAgICAgICAgIH0sIDIwMCk7XG4gICAgICogICAgICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ3R3bycpO1xuICAgICAqICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAqICAgICAgICAgICAgIH1cbiAgICAgKiAgICAgICAgIF0pO1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0cyk7XG4gICAgICogICAgICAgICAvLyByZXN1bHRzIGlzIGVxdWFsIHRvIFsnb25lJywndHdvJ10gZXZlbiB0aG91Z2hcbiAgICAgKiAgICAgICAgIC8vIHRoZSBzZWNvbmQgZnVuY3Rpb24gaGFkIGEgc2hvcnRlciB0aW1lb3V0LlxuICAgICAqICAgICB9XG4gICAgICogICAgIGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiAvLyBhbiBleGFtcGxlIHVzaW5nIGFuIG9iamVjdCBpbnN0ZWFkIG9mIGFuIGFycmF5XG4gICAgICogYXN5bmMgKCkgPT4ge1xuICAgICAqICAgICB0cnkge1xuICAgICAqICAgICAgICAgbGV0IHJlc3VsdHMgPSBhd2FpdCBhc3luYy5wYXJhbGxlbCh7XG4gICAgICogICAgICAgICAgICAgb25lOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgMSk7XG4gICAgICogICAgICAgICAgICAgICAgIH0sIDIwMCk7XG4gICAgICogICAgICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgICAgIHR3bzogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIDIpO1xuICAgICAqICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAqICAgICAgICAgICAgfVxuICAgICAqICAgICAgICAgfSk7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHRzKTtcbiAgICAgKiAgICAgICAgIC8vIHJlc3VsdHMgaXMgZXF1YWwgdG86IHsgb25lOiAxLCB0d286IDIgfVxuICAgICAqICAgICB9XG4gICAgICogICAgIGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBwYXJhbGxlbCQxKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gcGFyYWxsZWwoZWFjaE9mJDEsIHRhc2tzLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2BwYXJhbGxlbGBde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5wYXJhbGxlbH0gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhXG4gICAgICogdGltZS5cbiAgICAgKlxuICAgICAqIEBuYW1lIHBhcmFsbGVsTGltaXRcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5wYXJhbGxlbF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnBhcmFsbGVsfVxuICAgICAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSB0YXNrcyAtIEEgY29sbGVjdGlvbiBvZlxuICAgICAqIFthc3luYyBmdW5jdGlvbnNde0BsaW5rIEFzeW5jRnVuY3Rpb259IHRvIHJ1bi5cbiAgICAgKiBFYWNoIGFzeW5jIGZ1bmN0aW9uIGNhbiBjb21wbGV0ZSB3aXRoIGFueSBudW1iZXIgb2Ygb3B0aW9uYWwgYHJlc3VsdGAgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQW4gb3B0aW9uYWwgY2FsbGJhY2sgdG8gcnVuIG9uY2UgYWxsIHRoZVxuICAgICAqIGZ1bmN0aW9ucyBoYXZlIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuIFRoaXMgZnVuY3Rpb24gZ2V0cyBhIHJlc3VsdHMgYXJyYXlcbiAgICAgKiAob3Igb2JqZWN0KSBjb250YWluaW5nIGFsbCB0aGUgcmVzdWx0IGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIHRhc2sgY2FsbGJhY2tzLlxuICAgICAqIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBhIGNhbGxiYWNrIGlzIG5vdCBwYXNzZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBwYXJhbGxlbExpbWl0KHRhc2tzLCBsaW1pdCwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHBhcmFsbGVsKGVhY2hPZkxpbWl0KGxpbWl0KSwgdGFza3MsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBIHF1ZXVlIG9mIHRhc2tzIGZvciB0aGUgd29ya2VyIGZ1bmN0aW9uIHRvIGNvbXBsZXRlLlxuICAgICAqIEB0eXBlZGVmIHtJdGVyYWJsZX0gUXVldWVPYmplY3RcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gICAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gbGVuZ3RoIC0gYSBmdW5jdGlvbiByZXR1cm5pbmcgdGhlIG51bWJlciBvZiBpdGVtc1xuICAgICAqIHdhaXRpbmcgdG8gYmUgcHJvY2Vzc2VkLiBJbnZva2Ugd2l0aCBgcXVldWUubGVuZ3RoKClgLlxuICAgICAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gc3RhcnRlZCAtIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgb3Igbm90IGFueVxuICAgICAqIGl0ZW1zIGhhdmUgYmVlbiBwdXNoZWQgYW5kIHByb2Nlc3NlZCBieSB0aGUgcXVldWUuXG4gICAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gcnVubmluZyAtIGEgZnVuY3Rpb24gcmV0dXJuaW5nIHRoZSBudW1iZXIgb2YgaXRlbXNcbiAgICAgKiBjdXJyZW50bHkgYmVpbmcgcHJvY2Vzc2VkLiBJbnZva2Ugd2l0aCBgcXVldWUucnVubmluZygpYC5cbiAgICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSB3b3JrZXJzTGlzdCAtIGEgZnVuY3Rpb24gcmV0dXJuaW5nIHRoZSBhcnJheSBvZiBpdGVtc1xuICAgICAqIGN1cnJlbnRseSBiZWluZyBwcm9jZXNzZWQuIEludm9rZSB3aXRoIGBxdWV1ZS53b3JrZXJzTGlzdCgpYC5cbiAgICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBpZGxlIC0gYSBmdW5jdGlvbiByZXR1cm5pbmcgZmFsc2UgaWYgdGhlcmUgYXJlIGl0ZW1zXG4gICAgICogd2FpdGluZyBvciBiZWluZyBwcm9jZXNzZWQsIG9yIHRydWUgaWYgbm90LiBJbnZva2Ugd2l0aCBgcXVldWUuaWRsZSgpYC5cbiAgICAgKiBAcHJvcGVydHkge251bWJlcn0gY29uY3VycmVuY3kgLSBhbiBpbnRlZ2VyIGZvciBkZXRlcm1pbmluZyBob3cgbWFueSBgd29ya2VyYFxuICAgICAqIGZ1bmN0aW9ucyBzaG91bGQgYmUgcnVuIGluIHBhcmFsbGVsLiBUaGlzIHByb3BlcnR5IGNhbiBiZSBjaGFuZ2VkIGFmdGVyIGFcbiAgICAgKiBgcXVldWVgIGlzIGNyZWF0ZWQgdG8gYWx0ZXIgdGhlIGNvbmN1cnJlbmN5IG9uLXRoZS1mbHkuXG4gICAgICogQHByb3BlcnR5IHtudW1iZXJ9IHBheWxvYWQgLSBhbiBpbnRlZ2VyIHRoYXQgc3BlY2lmaWVzIGhvdyBtYW55IGl0ZW1zIGFyZVxuICAgICAqIHBhc3NlZCB0byB0aGUgd29ya2VyIGZ1bmN0aW9uIGF0IGEgdGltZS4gb25seSBhcHBsaWVzIGlmIHRoaXMgaXMgYVxuICAgICAqIFtjYXJnb117QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LmNhcmdvfSBvYmplY3RcbiAgICAgKiBAcHJvcGVydHkge0FzeW5jRnVuY3Rpb259IHB1c2ggLSBhZGQgYSBuZXcgdGFzayB0byB0aGUgYHF1ZXVlYC4gQ2FsbHMgYGNhbGxiYWNrYFxuICAgICAqIG9uY2UgdGhlIGB3b3JrZXJgIGhhcyBmaW5pc2hlZCBwcm9jZXNzaW5nIHRoZSB0YXNrLiBJbnN0ZWFkIG9mIGEgc2luZ2xlIHRhc2ssXG4gICAgICogYSBgdGFza3NgIGFycmF5IGNhbiBiZSBzdWJtaXR0ZWQuIFRoZSByZXNwZWN0aXZlIGNhbGxiYWNrIGlzIHVzZWQgZm9yIGV2ZXJ5XG4gICAgICogdGFzayBpbiB0aGUgbGlzdC4gSW52b2tlIHdpdGggYHF1ZXVlLnB1c2godGFzaywgW2NhbGxiYWNrXSlgLFxuICAgICAqIEBwcm9wZXJ0eSB7QXN5bmNGdW5jdGlvbn0gdW5zaGlmdCAtIGFkZCBhIG5ldyB0YXNrIHRvIHRoZSBmcm9udCBvZiB0aGUgYHF1ZXVlYC5cbiAgICAgKiBJbnZva2Ugd2l0aCBgcXVldWUudW5zaGlmdCh0YXNrLCBbY2FsbGJhY2tdKWAuXG4gICAgICogQHByb3BlcnR5IHtBc3luY0Z1bmN0aW9ufSBwdXNoQXN5bmMgLSB0aGUgc2FtZSBhcyBgcS5wdXNoYCwgZXhjZXB0IHRoaXMgcmV0dXJuc1xuICAgICAqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgaWYgYW4gZXJyb3Igb2NjdXJzLlxuICAgICAqIEBwcm9wZXJ0eSB7QXN5bmNGdW5jdGlvbn0gdW5zaGlmdEFzeW5jIC0gdGhlIHNhbWUgYXMgYHEudW5zaGlmdGAsIGV4Y2VwdCB0aGlzIHJldHVybnNcbiAgICAgKiBhIHByb21pc2UgdGhhdCByZWplY3RzIGlmIGFuIGVycm9yIG9jY3Vycy5cbiAgICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSByZW1vdmUgLSByZW1vdmUgaXRlbXMgZnJvbSB0aGUgcXVldWUgdGhhdCBtYXRjaCBhIHRlc3RcbiAgICAgKiBmdW5jdGlvbi4gIFRoZSB0ZXN0IGZ1bmN0aW9uIHdpbGwgYmUgcGFzc2VkIGFuIG9iamVjdCB3aXRoIGEgYGRhdGFgIHByb3BlcnR5LFxuICAgICAqIGFuZCBhIGBwcmlvcml0eWAgcHJvcGVydHksIGlmIHRoaXMgaXMgYVxuICAgICAqIFtwcmlvcml0eVF1ZXVlXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cucHJpb3JpdHlRdWV1ZX0gb2JqZWN0LlxuICAgICAqIEludm9rZWQgd2l0aCBgcXVldWUucmVtb3ZlKHRlc3RGbilgLCB3aGVyZSBgdGVzdEZuYCBpcyBvZiB0aGUgZm9ybVxuICAgICAqIGBmdW5jdGlvbiAoe2RhdGEsIHByaW9yaXR5fSkge31gIGFuZCByZXR1cm5zIGEgQm9vbGVhbi5cbiAgICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBzYXR1cmF0ZWQgLSBhIGZ1bmN0aW9uIHRoYXQgc2V0cyBhIGNhbGxiYWNrIHRoYXQgaXNcbiAgICAgKiBjYWxsZWQgd2hlbiB0aGUgbnVtYmVyIG9mIHJ1bm5pbmcgd29ya2VycyBoaXRzIHRoZSBgY29uY3VycmVuY3lgIGxpbWl0LCBhbmRcbiAgICAgKiBmdXJ0aGVyIHRhc2tzIHdpbGwgYmUgcXVldWVkLiAgSWYgdGhlIGNhbGxiYWNrIGlzIG9taXR0ZWQsIGBxLnNhdHVyYXRlZCgpYFxuICAgICAqIHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgbmV4dCBvY2N1cnJlbmNlLlxuICAgICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHVuc2F0dXJhdGVkIC0gYSBmdW5jdGlvbiB0aGF0IHNldHMgYSBjYWxsYmFjayB0aGF0IGlzXG4gICAgICogY2FsbGVkIHdoZW4gdGhlIG51bWJlciBvZiBydW5uaW5nIHdvcmtlcnMgaXMgbGVzcyB0aGFuIHRoZSBgY29uY3VycmVuY3lgICZcbiAgICAgKiBgYnVmZmVyYCBsaW1pdHMsIGFuZCBmdXJ0aGVyIHRhc2tzIHdpbGwgbm90IGJlIHF1ZXVlZC4gSWYgdGhlIGNhbGxiYWNrIGlzXG4gICAgICogb21pdHRlZCwgYHEudW5zYXR1cmF0ZWQoKWAgcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSBuZXh0IG9jY3VycmVuY2UuXG4gICAgICogQHByb3BlcnR5IHtudW1iZXJ9IGJ1ZmZlciAtIEEgbWluaW11bSB0aHJlc2hvbGQgYnVmZmVyIGluIG9yZGVyIHRvIHNheSB0aGF0XG4gICAgICogdGhlIGBxdWV1ZWAgaXMgYHVuc2F0dXJhdGVkYC5cbiAgICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBlbXB0eSAtIGEgZnVuY3Rpb24gdGhhdCBzZXRzIGEgY2FsbGJhY2sgdGhhdCBpcyBjYWxsZWRcbiAgICAgKiB3aGVuIHRoZSBsYXN0IGl0ZW0gZnJvbSB0aGUgYHF1ZXVlYCBpcyBnaXZlbiB0byBhIGB3b3JrZXJgLiBJZiB0aGUgY2FsbGJhY2tcbiAgICAgKiBpcyBvbWl0dGVkLCBgcS5lbXB0eSgpYCByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIG5leHQgb2NjdXJyZW5jZS5cbiAgICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBkcmFpbiAtIGEgZnVuY3Rpb24gdGhhdCBzZXRzIGEgY2FsbGJhY2sgdGhhdCBpcyBjYWxsZWRcbiAgICAgKiB3aGVuIHRoZSBsYXN0IGl0ZW0gZnJvbSB0aGUgYHF1ZXVlYCBoYXMgcmV0dXJuZWQgZnJvbSB0aGUgYHdvcmtlcmAuIElmIHRoZVxuICAgICAqIGNhbGxiYWNrIGlzIG9taXR0ZWQsIGBxLmRyYWluKClgIHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgbmV4dCBvY2N1cnJlbmNlLlxuICAgICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGVycm9yIC0gYSBmdW5jdGlvbiB0aGF0IHNldHMgYSBjYWxsYmFjayB0aGF0IGlzIGNhbGxlZFxuICAgICAqIHdoZW4gYSB0YXNrIGVycm9ycy4gSGFzIHRoZSBzaWduYXR1cmUgYGZ1bmN0aW9uKGVycm9yLCB0YXNrKWAuIElmIHRoZVxuICAgICAqIGNhbGxiYWNrIGlzIG9taXR0ZWQsIGBlcnJvcigpYCByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgb24gdGhlIG5leHRcbiAgICAgKiBlcnJvci5cbiAgICAgKiBAcHJvcGVydHkge2Jvb2xlYW59IHBhdXNlZCAtIGEgYm9vbGVhbiBmb3IgZGV0ZXJtaW5pbmcgd2hldGhlciB0aGUgcXVldWUgaXNcbiAgICAgKiBpbiBhIHBhdXNlZCBzdGF0ZS5cbiAgICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBwYXVzZSAtIGEgZnVuY3Rpb24gdGhhdCBwYXVzZXMgdGhlIHByb2Nlc3Npbmcgb2YgdGFza3NcbiAgICAgKiB1bnRpbCBgcmVzdW1lKClgIGlzIGNhbGxlZC4gSW52b2tlIHdpdGggYHF1ZXVlLnBhdXNlKClgLlxuICAgICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHJlc3VtZSAtIGEgZnVuY3Rpb24gdGhhdCByZXN1bWVzIHRoZSBwcm9jZXNzaW5nIG9mXG4gICAgICogcXVldWVkIHRhc2tzIHdoZW4gdGhlIHF1ZXVlIGlzIHBhdXNlZC4gSW52b2tlIHdpdGggYHF1ZXVlLnJlc3VtZSgpYC5cbiAgICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBraWxsIC0gYSBmdW5jdGlvbiB0aGF0IHJlbW92ZXMgdGhlIGBkcmFpbmAgY2FsbGJhY2sgYW5kXG4gICAgICogZW1wdGllcyByZW1haW5pbmcgdGFza3MgZnJvbSB0aGUgcXVldWUgZm9yY2luZyBpdCB0byBnbyBpZGxlLiBObyBtb3JlIHRhc2tzXG4gICAgICogc2hvdWxkIGJlIHB1c2hlZCB0byB0aGUgcXVldWUgYWZ0ZXIgY2FsbGluZyB0aGlzIGZ1bmN0aW9uLiBJbnZva2Ugd2l0aCBgcXVldWUua2lsbCgpYC5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogY29uc3QgcSA9IGFzeW5jLnF1ZXVlKHdvcmtlciwgMilcbiAgICAgKiBxLnB1c2goaXRlbTEpXG4gICAgICogcS5wdXNoKGl0ZW0yKVxuICAgICAqIHEucHVzaChpdGVtMylcbiAgICAgKiAvLyBxdWV1ZXMgYXJlIGl0ZXJhYmxlLCBzcHJlYWQgaW50byBhbiBhcnJheSB0byBpbnNwZWN0XG4gICAgICogY29uc3QgaXRlbXMgPSBbLi4ucV0gLy8gW2l0ZW0xLCBpdGVtMiwgaXRlbTNdXG4gICAgICogLy8gb3IgdXNlIGZvciBvZlxuICAgICAqIGZvciAobGV0IGl0ZW0gb2YgcSkge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhpdGVtKVxuICAgICAqIH1cbiAgICAgKlxuICAgICAqIHEuZHJhaW4oKCkgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZygnYWxsIGRvbmUnKVxuICAgICAqIH0pXG4gICAgICogLy8gb3JcbiAgICAgKiBhd2FpdCBxLmRyYWluKClcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBgcXVldWVgIG9iamVjdCB3aXRoIHRoZSBzcGVjaWZpZWQgYGNvbmN1cnJlbmN5YC4gVGFza3MgYWRkZWQgdG8gdGhlXG4gICAgICogYHF1ZXVlYCBhcmUgcHJvY2Vzc2VkIGluIHBhcmFsbGVsICh1cCB0byB0aGUgYGNvbmN1cnJlbmN5YCBsaW1pdCkuIElmIGFsbFxuICAgICAqIGB3b3JrZXJgcyBhcmUgaW4gcHJvZ3Jlc3MsIHRoZSB0YXNrIGlzIHF1ZXVlZCB1bnRpbCBvbmUgYmVjb21lcyBhdmFpbGFibGUuXG4gICAgICogT25jZSBhIGB3b3JrZXJgIGNvbXBsZXRlcyBhIGB0YXNrYCwgdGhhdCBgdGFza2AncyBjYWxsYmFjayBpcyBjYWxsZWQuXG4gICAgICpcbiAgICAgKiBAbmFtZSBxdWV1ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gICAgICogQG1ldGhvZFxuICAgICAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IHdvcmtlciAtIEFuIGFzeW5jIGZ1bmN0aW9uIGZvciBwcm9jZXNzaW5nIGEgcXVldWVkIHRhc2suXG4gICAgICogSWYgeW91IHdhbnQgdG8gaGFuZGxlIGVycm9ycyBmcm9tIGFuIGluZGl2aWR1YWwgdGFzaywgcGFzcyBhIGNhbGxiYWNrIHRvXG4gICAgICogYHEucHVzaCgpYC4gSW52b2tlZCB3aXRoICh0YXNrLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtjb25jdXJyZW5jeT0xXSAtIEFuIGBpbnRlZ2VyYCBmb3IgZGV0ZXJtaW5pbmcgaG93IG1hbnlcbiAgICAgKiBgd29ya2VyYCBmdW5jdGlvbnMgc2hvdWxkIGJlIHJ1biBpbiBwYXJhbGxlbC4gIElmIG9taXR0ZWQsIHRoZSBjb25jdXJyZW5jeVxuICAgICAqIGRlZmF1bHRzIHRvIGAxYC4gIElmIHRoZSBjb25jdXJyZW5jeSBpcyBgMGAsIGFuIGVycm9yIGlzIHRocm93bi5cbiAgICAgKiBAcmV0dXJucyB7bW9kdWxlOkNvbnRyb2xGbG93LlF1ZXVlT2JqZWN0fSBBIHF1ZXVlIG9iamVjdCB0byBtYW5hZ2UgdGhlIHRhc2tzLiBDYWxsYmFja3MgY2FuIGJlXG4gICAgICogYXR0YWNoZWQgYXMgY2VydGFpbiBwcm9wZXJ0aWVzIHRvIGxpc3RlbiBmb3Igc3BlY2lmaWMgZXZlbnRzIGR1cmluZyB0aGVcbiAgICAgKiBsaWZlY3ljbGUgb2YgdGhlIHF1ZXVlLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAvLyBjcmVhdGUgYSBxdWV1ZSBvYmplY3Qgd2l0aCBjb25jdXJyZW5jeSAyXG4gICAgICogdmFyIHEgPSBhc3luYy5xdWV1ZShmdW5jdGlvbih0YXNrLCBjYWxsYmFjaykge1xuICAgICAqICAgICBjb25zb2xlLmxvZygnaGVsbG8gJyArIHRhc2submFtZSk7XG4gICAgICogICAgIGNhbGxiYWNrKCk7XG4gICAgICogfSwgMik7XG4gICAgICpcbiAgICAgKiAvLyBhc3NpZ24gYSBjYWxsYmFja1xuICAgICAqIHEuZHJhaW4oZnVuY3Rpb24oKSB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKCdhbGwgaXRlbXMgaGF2ZSBiZWVuIHByb2Nlc3NlZCcpO1xuICAgICAqIH0pO1xuICAgICAqIC8vIG9yIGF3YWl0IHRoZSBlbmRcbiAgICAgKiBhd2FpdCBxLmRyYWluKClcbiAgICAgKlxuICAgICAqIC8vIGFzc2lnbiBhbiBlcnJvciBjYWxsYmFja1xuICAgICAqIHEuZXJyb3IoZnVuY3Rpb24oZXJyLCB0YXNrKSB7XG4gICAgICogICAgIGNvbnNvbGUuZXJyb3IoJ3Rhc2sgZXhwZXJpZW5jZWQgYW4gZXJyb3InKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIGFkZCBzb21lIGl0ZW1zIHRvIHRoZSBxdWV1ZVxuICAgICAqIHEucHVzaCh7bmFtZTogJ2Zvbyd9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coJ2ZpbmlzaGVkIHByb2Nlc3NpbmcgZm9vJyk7XG4gICAgICogfSk7XG4gICAgICogLy8gY2FsbGJhY2sgaXMgb3B0aW9uYWxcbiAgICAgKiBxLnB1c2goe25hbWU6ICdiYXInfSk7XG4gICAgICpcbiAgICAgKiAvLyBhZGQgc29tZSBpdGVtcyB0byB0aGUgcXVldWUgKGJhdGNoLXdpc2UpXG4gICAgICogcS5wdXNoKFt7bmFtZTogJ2Jheid9LHtuYW1lOiAnYmF5J30se25hbWU6ICdiYXgnfV0sIGZ1bmN0aW9uKGVycikge1xuICAgICAqICAgICBjb25zb2xlLmxvZygnZmluaXNoZWQgcHJvY2Vzc2luZyBpdGVtJyk7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBhZGQgc29tZSBpdGVtcyB0byB0aGUgZnJvbnQgb2YgdGhlIHF1ZXVlXG4gICAgICogcS51bnNoaWZ0KHtuYW1lOiAnYmFyJ30sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coJ2ZpbmlzaGVkIHByb2Nlc3NpbmcgYmFyJyk7XG4gICAgICogfSk7XG4gICAgICovXG4gICAgZnVuY3Rpb24gcXVldWUkMSAod29ya2VyLCBjb25jdXJyZW5jeSkge1xuICAgICAgICB2YXIgX3dvcmtlciA9IHdyYXBBc3luYyh3b3JrZXIpO1xuICAgICAgICByZXR1cm4gcXVldWUoKGl0ZW1zLCBjYikgPT4ge1xuICAgICAgICAgICAgX3dvcmtlcihpdGVtc1swXSwgY2IpO1xuICAgICAgICB9LCBjb25jdXJyZW5jeSwgMSk7XG4gICAgfVxuXG4gICAgLy8gQmluYXJ5IG1pbi1oZWFwIGltcGxlbWVudGF0aW9uIHVzZWQgZm9yIHByaW9yaXR5IHF1ZXVlLlxuICAgIC8vIEltcGxlbWVudGF0aW9uIGlzIHN0YWJsZSwgaS5lLiBwdXNoIHRpbWUgaXMgY29uc2lkZXJlZCBmb3IgZXF1YWwgcHJpb3JpdGllc1xuICAgIGNsYXNzIEhlYXAge1xuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgIHRoaXMuaGVhcCA9IFtdO1xuICAgICAgICAgICAgdGhpcy5wdXNoQ291bnQgPSBOdW1iZXIuTUlOX1NBRkVfSU5URUdFUjtcbiAgICAgICAgfVxuXG4gICAgICAgIGdldCBsZW5ndGgoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oZWFwLmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIGVtcHR5ICgpIHtcbiAgICAgICAgICAgIHRoaXMuaGVhcCA9IFtdO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBwZXJjVXAoaW5kZXgpIHtcbiAgICAgICAgICAgIGxldCBwO1xuXG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPiAwICYmIHNtYWxsZXIodGhpcy5oZWFwW2luZGV4XSwgdGhpcy5oZWFwW3A9cGFyZW50KGluZGV4KV0pKSB7XG4gICAgICAgICAgICAgICAgbGV0IHQgPSB0aGlzLmhlYXBbaW5kZXhdO1xuICAgICAgICAgICAgICAgIHRoaXMuaGVhcFtpbmRleF0gPSB0aGlzLmhlYXBbcF07XG4gICAgICAgICAgICAgICAgdGhpcy5oZWFwW3BdID0gdDtcblxuICAgICAgICAgICAgICAgIGluZGV4ID0gcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHBlcmNEb3duKGluZGV4KSB7XG4gICAgICAgICAgICBsZXQgbDtcblxuICAgICAgICAgICAgd2hpbGUgKChsPWxlZnRDaGkoaW5kZXgpKSA8IHRoaXMuaGVhcC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAobCsxIDwgdGhpcy5oZWFwLmxlbmd0aCAmJiBzbWFsbGVyKHRoaXMuaGVhcFtsKzFdLCB0aGlzLmhlYXBbbF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGwgPSBsKzE7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHNtYWxsZXIodGhpcy5oZWFwW2luZGV4XSwgdGhpcy5oZWFwW2xdKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBsZXQgdCA9IHRoaXMuaGVhcFtpbmRleF07XG4gICAgICAgICAgICAgICAgdGhpcy5oZWFwW2luZGV4XSA9IHRoaXMuaGVhcFtsXTtcbiAgICAgICAgICAgICAgICB0aGlzLmhlYXBbbF0gPSB0O1xuXG4gICAgICAgICAgICAgICAgaW5kZXggPSBsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHVzaChub2RlKSB7XG4gICAgICAgICAgICBub2RlLnB1c2hDb3VudCA9ICsrdGhpcy5wdXNoQ291bnQ7XG4gICAgICAgICAgICB0aGlzLmhlYXAucHVzaChub2RlKTtcbiAgICAgICAgICAgIHRoaXMucGVyY1VwKHRoaXMuaGVhcC5sZW5ndGgtMSk7XG4gICAgICAgIH1cblxuICAgICAgICB1bnNoaWZ0KG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhlYXAucHVzaChub2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNoaWZ0KCkge1xuICAgICAgICAgICAgbGV0IFt0b3BdID0gdGhpcy5oZWFwO1xuXG4gICAgICAgICAgICB0aGlzLmhlYXBbMF0gPSB0aGlzLmhlYXBbdGhpcy5oZWFwLmxlbmd0aC0xXTtcbiAgICAgICAgICAgIHRoaXMuaGVhcC5wb3AoKTtcbiAgICAgICAgICAgIHRoaXMucGVyY0Rvd24oMCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0b3A7XG4gICAgICAgIH1cblxuICAgICAgICB0b0FycmF5KCkge1xuICAgICAgICAgICAgcmV0dXJuIFsuLi50aGlzXTtcbiAgICAgICAgfVxuXG4gICAgICAgICpbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaGVhcC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHlpZWxkIHRoaXMuaGVhcFtpXS5kYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVtb3ZlICh0ZXN0Rm4pIHtcbiAgICAgICAgICAgIGxldCBqID0gMDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5oZWFwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0ZXN0Rm4odGhpcy5oZWFwW2ldKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhlYXBbal0gPSB0aGlzLmhlYXBbaV07XG4gICAgICAgICAgICAgICAgICAgIGorKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuaGVhcC5zcGxpY2Uoaik7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBwYXJlbnQodGhpcy5oZWFwLmxlbmd0aC0xKTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBlcmNEb3duKGkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxlZnRDaGkoaSkge1xuICAgICAgICByZXR1cm4gKGk8PDEpKzE7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyZW50KGkpIHtcbiAgICAgICAgcmV0dXJuICgoaSsxKT4+MSktMTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzbWFsbGVyKHgsIHkpIHtcbiAgICAgICAgaWYgKHgucHJpb3JpdHkgIT09IHkucHJpb3JpdHkpIHtcbiAgICAgICAgICAgIHJldHVybiB4LnByaW9yaXR5IDwgeS5wcmlvcml0eTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB4LnB1c2hDb3VudCA8IHkucHVzaENvdW50O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2FzeW5jLnF1ZXVlXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cucXVldWV9IG9ubHkgdGFza3MgYXJlIGFzc2lnbmVkIGEgcHJpb3JpdHkgYW5kXG4gICAgICogY29tcGxldGVkIGluIGFzY2VuZGluZyBwcmlvcml0eSBvcmRlci5cbiAgICAgKlxuICAgICAqIEBuYW1lIHByaW9yaXR5UXVldWVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5xdWV1ZV17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnF1ZXVlfVxuICAgICAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IHdvcmtlciAtIEFuIGFzeW5jIGZ1bmN0aW9uIGZvciBwcm9jZXNzaW5nIGEgcXVldWVkIHRhc2suXG4gICAgICogSWYgeW91IHdhbnQgdG8gaGFuZGxlIGVycm9ycyBmcm9tIGFuIGluZGl2aWR1YWwgdGFzaywgcGFzcyBhIGNhbGxiYWNrIHRvXG4gICAgICogYHEucHVzaCgpYC5cbiAgICAgKiBJbnZva2VkIHdpdGggKHRhc2ssIGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gY29uY3VycmVuY3kgLSBBbiBgaW50ZWdlcmAgZm9yIGRldGVybWluaW5nIGhvdyBtYW55IGB3b3JrZXJgXG4gICAgICogZnVuY3Rpb25zIHNob3VsZCBiZSBydW4gaW4gcGFyYWxsZWwuICBJZiBvbWl0dGVkLCB0aGUgY29uY3VycmVuY3kgZGVmYXVsdHMgdG9cbiAgICAgKiBgMWAuICBJZiB0aGUgY29uY3VycmVuY3kgaXMgYDBgLCBhbiBlcnJvciBpcyB0aHJvd24uXG4gICAgICogQHJldHVybnMge21vZHVsZTpDb250cm9sRmxvdy5RdWV1ZU9iamVjdH0gQSBwcmlvcml0eVF1ZXVlIG9iamVjdCB0byBtYW5hZ2UgdGhlIHRhc2tzLiBUaGVyZSBhcmUgdGhyZWVcbiAgICAgKiBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBxdWV1ZWAgYW5kIGBwcmlvcml0eVF1ZXVlYCBvYmplY3RzOlxuICAgICAqICogYHB1c2godGFzaywgcHJpb3JpdHksIFtjYWxsYmFja10pYCAtIGBwcmlvcml0eWAgc2hvdWxkIGJlIGEgbnVtYmVyLiBJZiBhblxuICAgICAqICAgYXJyYXkgb2YgYHRhc2tzYCBpcyBnaXZlbiwgYWxsIHRhc2tzIHdpbGwgYmUgYXNzaWduZWQgdGhlIHNhbWUgcHJpb3JpdHkuXG4gICAgICogKiBgcHVzaEFzeW5jKHRhc2ssIHByaW9yaXR5LCBbY2FsbGJhY2tdKWAgLSB0aGUgc2FtZSBhcyBgcHJpb3JpdHlRdWV1ZS5wdXNoYCxcbiAgICAgKiAgIGV4Y2VwdCB0aGlzIHJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVqZWN0cyBpZiBhbiBlcnJvciBvY2N1cnMuXG4gICAgICogKiBUaGUgYHVuc2hpZnRgIGFuZCBgdW5zaGlmdEFzeW5jYCBtZXRob2RzIHdlcmUgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBwcmlvcml0eVF1ZXVlKHdvcmtlciwgY29uY3VycmVuY3kpIHtcbiAgICAgICAgLy8gU3RhcnQgd2l0aCBhIG5vcm1hbCBxdWV1ZVxuICAgICAgICB2YXIgcSA9IHF1ZXVlJDEod29ya2VyLCBjb25jdXJyZW5jeSk7XG5cbiAgICAgICAgdmFyIHtcbiAgICAgICAgICAgIHB1c2gsXG4gICAgICAgICAgICBwdXNoQXN5bmNcbiAgICAgICAgfSA9IHE7XG5cbiAgICAgICAgcS5fdGFza3MgPSBuZXcgSGVhcCgpO1xuICAgICAgICBxLl9jcmVhdGVUYXNrSXRlbSA9ICh7ZGF0YSwgcHJpb3JpdHl9LCBjYWxsYmFjaykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgICAgIHByaW9yaXR5LFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZURhdGFJdGVtcyh0YXNrcywgcHJpb3JpdHkpIHtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh0YXNrcykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge2RhdGE6IHRhc2tzLCBwcmlvcml0eX07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGFza3MubWFwKGRhdGEgPT4geyByZXR1cm4ge2RhdGEsIHByaW9yaXR5fTsgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPdmVycmlkZSBwdXNoIHRvIGFjY2VwdCBzZWNvbmQgcGFyYW1ldGVyIHJlcHJlc2VudGluZyBwcmlvcml0eVxuICAgICAgICBxLnB1c2ggPSBmdW5jdGlvbihkYXRhLCBwcmlvcml0eSA9IDAsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gcHVzaChjcmVhdGVEYXRhSXRlbXMoZGF0YSwgcHJpb3JpdHkpLCBjYWxsYmFjayk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcS5wdXNoQXN5bmMgPSBmdW5jdGlvbihkYXRhLCBwcmlvcml0eSA9IDAsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gcHVzaEFzeW5jKGNyZWF0ZURhdGFJdGVtcyhkYXRhLCBwcmlvcml0eSksIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZW1vdmUgdW5zaGlmdCBmdW5jdGlvbnNcbiAgICAgICAgZGVsZXRlIHEudW5zaGlmdDtcbiAgICAgICAgZGVsZXRlIHEudW5zaGlmdEFzeW5jO1xuXG4gICAgICAgIHJldHVybiBxO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJ1bnMgdGhlIGB0YXNrc2AgYXJyYXkgb2YgZnVuY3Rpb25zIGluIHBhcmFsbGVsLCB3aXRob3V0IHdhaXRpbmcgdW50aWwgdGhlXG4gICAgICogcHJldmlvdXMgZnVuY3Rpb24gaGFzIGNvbXBsZXRlZC4gT25jZSBhbnkgb2YgdGhlIGB0YXNrc2AgY29tcGxldGUgb3IgcGFzcyBhblxuICAgICAqIGVycm9yIHRvIGl0cyBjYWxsYmFjaywgdGhlIG1haW4gYGNhbGxiYWNrYCBpcyBpbW1lZGlhdGVseSBjYWxsZWQuIEl0J3NcbiAgICAgKiBlcXVpdmFsZW50IHRvIGBQcm9taXNlLnJhY2UoKWAuXG4gICAgICpcbiAgICAgKiBAbmFtZSByYWNlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IHRhc2tzIC0gQW4gYXJyYXkgY29udGFpbmluZyBbYXN5bmMgZnVuY3Rpb25zXXtAbGluayBBc3luY0Z1bmN0aW9ufVxuICAgICAqIHRvIHJ1bi4gRWFjaCBmdW5jdGlvbiBjYW4gY29tcGxldGUgd2l0aCBhbiBvcHRpb25hbCBgcmVzdWx0YCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIEEgY2FsbGJhY2sgdG8gcnVuIG9uY2UgYW55IG9mIHRoZSBmdW5jdGlvbnMgaGF2ZVxuICAgICAqIGNvbXBsZXRlZC4gVGhpcyBmdW5jdGlvbiBnZXRzIGFuIGVycm9yIG9yIHJlc3VsdCBmcm9tIHRoZSBmaXJzdCBmdW5jdGlvbiB0aGF0XG4gICAgICogY29tcGxldGVkLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBhIGNhbGxiYWNrIGlzIG9taXR0ZWRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogYXN5bmMucmFjZShbXG4gICAgICogICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICdvbmUnKTtcbiAgICAgKiAgICAgICAgIH0sIDIwMCk7XG4gICAgICogICAgIH0sXG4gICAgICogICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICd0d28nKTtcbiAgICAgKiAgICAgICAgIH0sIDEwMCk7XG4gICAgICogICAgIH1cbiAgICAgKiBdLFxuICAgICAqIC8vIG1haW4gY2FsbGJhY2tcbiAgICAgKiBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICAgICAqICAgICAvLyB0aGUgcmVzdWx0IHdpbGwgYmUgZXF1YWwgdG8gJ3R3bycgYXMgaXQgZmluaXNoZXMgZWFybGllclxuICAgICAqIH0pO1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJhY2UodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb25jZShjYWxsYmFjayk7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh0YXNrcykpIHJldHVybiBjYWxsYmFjayhuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmd1bWVudCB0byByYWNlIG11c3QgYmUgYW4gYXJyYXkgb2YgZnVuY3Rpb25zJykpO1xuICAgICAgICBpZiAoIXRhc2tzLmxlbmd0aCkgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGFza3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICB3cmFwQXN5bmModGFza3NbaV0pKGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciByYWNlJDEgPSBhd2FpdGlmeShyYWNlLCAyKTtcblxuICAgIC8qKlxuICAgICAqIFNhbWUgYXMgW2ByZWR1Y2VgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMucmVkdWNlfSwgb25seSBvcGVyYXRlcyBvbiBgYXJyYXlgIGluIHJldmVyc2Ugb3JkZXIuXG4gICAgICpcbiAgICAgKiBAbmFtZSByZWR1Y2VSaWdodFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBzZWUgW2FzeW5jLnJlZHVjZV17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLnJlZHVjZX1cbiAgICAgKiBAYWxpYXMgZm9sZHJcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0geyp9IG1lbW8gLSBUaGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWN0aW9uLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIGFwcGxpZWQgdG8gZWFjaCBpdGVtIGluIHRoZVxuICAgICAqIGFycmF5IHRvIHByb2R1Y2UgdGhlIG5leHQgc3RlcCBpbiB0aGUgcmVkdWN0aW9uLlxuICAgICAqIFRoZSBgaXRlcmF0ZWVgIHNob3VsZCBjb21wbGV0ZSB3aXRoIHRoZSBuZXh0IHN0YXRlIG9mIHRoZSByZWR1Y3Rpb24uXG4gICAgICogSWYgdGhlIGl0ZXJhdGVlIGNvbXBsZXRlcyB3aXRoIGFuIGVycm9yLCB0aGUgcmVkdWN0aW9uIGlzIHN0b3BwZWQgYW5kIHRoZVxuICAgICAqIG1haW4gYGNhbGxiYWNrYCBpcyBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGUgZXJyb3IuXG4gICAgICogSW52b2tlZCB3aXRoIChtZW1vLCBpdGVtLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAgICAgKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBSZXN1bHQgaXMgdGhlIHJlZHVjZWQgdmFsdWUuIEludm9rZWQgd2l0aFxuICAgICAqIChlcnIsIHJlc3VsdCkuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgbm8gY2FsbGJhY2sgaXMgcGFzc2VkXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVkdWNlUmlnaHQgKGFycmF5LCBtZW1vLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJldmVyc2VkID0gWy4uLmFycmF5XS5yZXZlcnNlKCk7XG4gICAgICAgIHJldHVybiByZWR1Y2UkMShyZXZlcnNlZCwgbWVtbywgaXRlcmF0ZWUsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXcmFwcyB0aGUgYXN5bmMgZnVuY3Rpb24gaW4gYW5vdGhlciBmdW5jdGlvbiB0aGF0IGFsd2F5cyBjb21wbGV0ZXMgd2l0aCBhXG4gICAgICogcmVzdWx0IG9iamVjdCwgZXZlbiB3aGVuIGl0IGVycm9ycy5cbiAgICAgKlxuICAgICAqIFRoZSByZXN1bHQgb2JqZWN0IGhhcyBlaXRoZXIgdGhlIHByb3BlcnR5IGBlcnJvcmAgb3IgYHZhbHVlYC5cbiAgICAgKlxuICAgICAqIEBuYW1lIHJlZmxlY3RcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpVdGlsc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAY2F0ZWdvcnkgVXRpbFxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gZm4gLSBUaGUgYXN5bmMgZnVuY3Rpb24geW91IHdhbnQgdG8gd3JhcFxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gLSBBIGZ1bmN0aW9uIHRoYXQgYWx3YXlzIHBhc3NlcyBudWxsIHRvIGl0J3MgY2FsbGJhY2sgYXNcbiAgICAgKiB0aGUgZXJyb3IuIFRoZSBzZWNvbmQgYXJndW1lbnQgdG8gdGhlIGNhbGxiYWNrIHdpbGwgYmUgYW4gYG9iamVjdGAgd2l0aFxuICAgICAqIGVpdGhlciBhbiBgZXJyb3JgIG9yIGEgYHZhbHVlYCBwcm9wZXJ0eS5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogYXN5bmMucGFyYWxsZWwoW1xuICAgICAqICAgICBhc3luYy5yZWZsZWN0KGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICAvLyBkbyBzb21lIHN0dWZmIC4uLlxuICAgICAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ29uZScpO1xuICAgICAqICAgICB9KSxcbiAgICAgKiAgICAgYXN5bmMucmVmbGVjdChmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgLy8gZG8gc29tZSBtb3JlIHN0dWZmIGJ1dCBlcnJvciAuLi5cbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKCdiYWQgc3R1ZmYgaGFwcGVuZWQnKTtcbiAgICAgKiAgICAgfSksXG4gICAgICogICAgIGFzeW5jLnJlZmxlY3QoZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIC8vIGRvIHNvbWUgbW9yZSBzdHVmZiAuLi5cbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICd0d28nKTtcbiAgICAgKiAgICAgfSlcbiAgICAgKiBdLFxuICAgICAqIC8vIG9wdGlvbmFsIGNhbGxiYWNrXG4gICAgICogZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gICAgICogICAgIC8vIHZhbHVlc1xuICAgICAqICAgICAvLyByZXN1bHRzWzBdLnZhbHVlID0gJ29uZSdcbiAgICAgKiAgICAgLy8gcmVzdWx0c1sxXS5lcnJvciA9ICdiYWQgc3R1ZmYgaGFwcGVuZWQnXG4gICAgICogICAgIC8vIHJlc3VsdHNbMl0udmFsdWUgPSAndHdvJ1xuICAgICAqIH0pO1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlZmxlY3QoZm4pIHtcbiAgICAgICAgdmFyIF9mbiA9IHdyYXBBc3luYyhmbik7XG4gICAgICAgIHJldHVybiBpbml0aWFsUGFyYW1zKGZ1bmN0aW9uIHJlZmxlY3RPbihhcmdzLCByZWZsZWN0Q2FsbGJhY2spIHtcbiAgICAgICAgICAgIGFyZ3MucHVzaCgoZXJyb3IsIC4uLmNiQXJncykgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZXRWYWwgPSB7fTtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0VmFsLmVycm9yID0gZXJyb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYkFyZ3MubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGNiQXJncztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNiQXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgW3ZhbHVlXSA9IGNiQXJncztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXRWYWwudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVmbGVjdENhbGxiYWNrKG51bGwsIHJldFZhbCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIF9mbi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQSBoZWxwZXIgZnVuY3Rpb24gdGhhdCB3cmFwcyBhbiBhcnJheSBvciBhbiBvYmplY3Qgb2YgZnVuY3Rpb25zIHdpdGggYHJlZmxlY3RgLlxuICAgICAqXG4gICAgICogQG5hbWUgcmVmbGVjdEFsbFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBzZWUgW2FzeW5jLnJlZmxlY3Rde0BsaW5rIG1vZHVsZTpVdGlscy5yZWZsZWN0fVxuICAgICAqIEBjYXRlZ29yeSBVdGlsXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8SXRlcmFibGV9IHRhc2tzIC0gVGhlIGNvbGxlY3Rpb24gb2ZcbiAgICAgKiBbYXN5bmMgZnVuY3Rpb25zXXtAbGluayBBc3luY0Z1bmN0aW9ufSB0byB3cmFwIGluIGBhc3luYy5yZWZsZWN0YC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYW4gYXJyYXkgb2YgYXN5bmMgZnVuY3Rpb25zLCBlYWNoIHdyYXBwZWQgaW5cbiAgICAgKiBgYXN5bmMucmVmbGVjdGBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogbGV0IHRhc2tzID0gW1xuICAgICAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAnb25lJyk7XG4gICAgICogICAgICAgICB9LCAyMDApO1xuICAgICAqICAgICB9LFxuICAgICAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgLy8gZG8gc29tZSBtb3JlIHN0dWZmIGJ1dCBlcnJvciAuLi5cbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcignYmFkIHN0dWZmIGhhcHBlbmVkJykpO1xuICAgICAqICAgICB9LFxuICAgICAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAndHdvJyk7XG4gICAgICogICAgICAgICB9LCAxMDApO1xuICAgICAqICAgICB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIGFzeW5jLnBhcmFsbGVsKGFzeW5jLnJlZmxlY3RBbGwodGFza3MpLFxuICAgICAqIC8vIG9wdGlvbmFsIGNhbGxiYWNrXG4gICAgICogZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gICAgICogICAgIC8vIHZhbHVlc1xuICAgICAqICAgICAvLyByZXN1bHRzWzBdLnZhbHVlID0gJ29uZSdcbiAgICAgKiAgICAgLy8gcmVzdWx0c1sxXS5lcnJvciA9IEVycm9yKCdiYWQgc3R1ZmYgaGFwcGVuZWQnKVxuICAgICAqICAgICAvLyByZXN1bHRzWzJdLnZhbHVlID0gJ3R3bydcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIGFuIGV4YW1wbGUgdXNpbmcgYW4gb2JqZWN0IGluc3RlYWQgb2YgYW4gYXJyYXlcbiAgICAgKiBsZXQgdGFza3MgPSB7XG4gICAgICogICAgIG9uZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ29uZScpO1xuICAgICAqICAgICAgICAgfSwgMjAwKTtcbiAgICAgKiAgICAgfSxcbiAgICAgKiAgICAgdHdvOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgY2FsbGJhY2soJ3R3bycpO1xuICAgICAqICAgICB9LFxuICAgICAqICAgICB0aHJlZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ3RocmVlJyk7XG4gICAgICogICAgICAgICB9LCAxMDApO1xuICAgICAqICAgICB9XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIGFzeW5jLnBhcmFsbGVsKGFzeW5jLnJlZmxlY3RBbGwodGFza3MpLFxuICAgICAqIC8vIG9wdGlvbmFsIGNhbGxiYWNrXG4gICAgICogZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gICAgICogICAgIC8vIHZhbHVlc1xuICAgICAqICAgICAvLyByZXN1bHRzLm9uZS52YWx1ZSA9ICdvbmUnXG4gICAgICogICAgIC8vIHJlc3VsdHMudHdvLmVycm9yID0gJ3R3bydcbiAgICAgKiAgICAgLy8gcmVzdWx0cy50aHJlZS52YWx1ZSA9ICd0aHJlZSdcbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZWZsZWN0QWxsKHRhc2tzKSB7XG4gICAgICAgIHZhciByZXN1bHRzO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXNrcykpIHtcbiAgICAgICAgICAgIHJlc3VsdHMgPSB0YXNrcy5tYXAocmVmbGVjdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHRzID0ge307XG4gICAgICAgICAgICBPYmplY3Qua2V5cyh0YXNrcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc3VsdHNba2V5XSA9IHJlZmxlY3QuY2FsbCh0aGlzLCB0YXNrc1trZXldKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlamVjdChlYWNoZm4sIGFyciwgX2l0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBpdGVyYXRlZSA9IHdyYXBBc3luYyhfaXRlcmF0ZWUpO1xuICAgICAgICByZXR1cm4gX2ZpbHRlcihlYWNoZm4sIGFyciwgKHZhbHVlLCBjYikgPT4ge1xuICAgICAgICAgICAgaXRlcmF0ZWUodmFsdWUsIChlcnIsIHYpID0+IHtcbiAgICAgICAgICAgICAgICBjYihlcnIsICF2KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG9wcG9zaXRlIG9mIFtgZmlsdGVyYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmZpbHRlcn0uIFJlbW92ZXMgdmFsdWVzIHRoYXQgcGFzcyBhbiBgYXN5bmNgIHRydXRoIHRlc3QuXG4gICAgICpcbiAgICAgKiBAbmFtZSByZWplY3RcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5maWx0ZXJde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5maWx0ZXJ9XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEFuIGFzeW5jIHRydXRoIHRlc3QgdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluXG4gICAgICogYGNvbGxgLlxuICAgICAqIFRoZSBzaG91bGQgY29tcGxldGUgd2l0aCBhIGJvb2xlYW4gdmFsdWUgYXMgaXRzIGByZXN1bHRgLlxuICAgICAqIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gICAgICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdHMpLlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UsIGlmIG5vIGNhbGxiYWNrIGlzIHBhc3NlZFxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAvLyBkaXIxIGlzIGEgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgZmlsZTEudHh0LCBmaWxlMi50eHRcbiAgICAgKiAvLyBkaXIyIGlzIGEgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgZmlsZTMudHh0LCBmaWxlNC50eHRcbiAgICAgKiAvLyBkaXIzIGlzIGEgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgZmlsZTUudHh0XG4gICAgICpcbiAgICAgKiBjb25zdCBmaWxlTGlzdCA9IFsnZGlyMS9maWxlMS50eHQnLCdkaXIyL2ZpbGUzLnR4dCcsJ2RpcjMvZmlsZTYudHh0J107XG4gICAgICpcbiAgICAgKiAvLyBhc3luY2hyb25vdXMgZnVuY3Rpb24gdGhhdCBjaGVja3MgaWYgYSBmaWxlIGV4aXN0c1xuICAgICAqIGZ1bmN0aW9uIGZpbGVFeGlzdHMoZmlsZSwgY2FsbGJhY2spIHtcbiAgICAgKiAgICBmcy5hY2Nlc3MoZmlsZSwgZnMuY29uc3RhbnRzLkZfT0ssIChlcnIpID0+IHtcbiAgICAgKiAgICAgICAgY2FsbGJhY2sobnVsbCwgIWVycik7XG4gICAgICogICAgfSk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogLy8gVXNpbmcgY2FsbGJhY2tzXG4gICAgICogYXN5bmMucmVqZWN0KGZpbGVMaXN0LCBmaWxlRXhpc3RzLCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAgICAgKiAgICAvLyBbICdkaXIzL2ZpbGU2LnR4dCcgXVxuICAgICAqICAgIC8vIHJlc3VsdHMgbm93IGVxdWFscyBhbiBhcnJheSBvZiB0aGUgbm9uLWV4aXN0aW5nIGZpbGVzXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBQcm9taXNlc1xuICAgICAqIGFzeW5jLnJlamVjdChmaWxlTGlzdCwgZmlsZUV4aXN0cylcbiAgICAgKiAudGhlbiggcmVzdWx0cyA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAvLyBbICdkaXIzL2ZpbGU2LnR4dCcgXVxuICAgICAqICAgICAvLyByZXN1bHRzIG5vdyBlcXVhbHMgYW4gYXJyYXkgb2YgdGhlIG5vbi1leGlzdGluZyBmaWxlc1xuICAgICAqIH0pLmNhdGNoKCBlcnIgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gVXNpbmcgYXN5bmMvYXdhaXRcbiAgICAgKiBhc3luYyAoKSA9PiB7XG4gICAgICogICAgIHRyeSB7XG4gICAgICogICAgICAgICBsZXQgcmVzdWx0cyA9IGF3YWl0IGFzeW5jLnJlamVjdChmaWxlTGlzdCwgZmlsZUV4aXN0cyk7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHRzKTtcbiAgICAgKiAgICAgICAgIC8vIFsgJ2RpcjMvZmlsZTYudHh0JyBdXG4gICAgICogICAgICAgICAvLyByZXN1bHRzIG5vdyBlcXVhbHMgYW4gYXJyYXkgb2YgdGhlIG5vbi1leGlzdGluZyBmaWxlc1xuICAgICAqICAgICB9XG4gICAgICogICAgIGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZWplY3QkMSAoY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiByZWplY3QoZWFjaE9mJDEsIGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaylcbiAgICB9XG4gICAgdmFyIHJlamVjdCQyID0gYXdhaXRpZnkocmVqZWN0JDEsIDMpO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2ByZWplY3RgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMucmVqZWN0fSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGFcbiAgICAgKiB0aW1lLlxuICAgICAqXG4gICAgICogQG5hbWUgcmVqZWN0TGltaXRcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5yZWplY3Rde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5yZWplY3R9XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbGltaXQgLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpblxuICAgICAqIGBjb2xsYC5cbiAgICAgKiBUaGUgc2hvdWxkIGNvbXBsZXRlIHdpdGggYSBib29sZWFuIHZhbHVlIGFzIGl0cyBgcmVzdWx0YC5cbiAgICAgKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICAgICAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwYXNzZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZWplY3RMaW1pdCAoY29sbCwgbGltaXQsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gcmVqZWN0KGVhY2hPZkxpbWl0KGxpbWl0KSwgY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKVxuICAgIH1cbiAgICB2YXIgcmVqZWN0TGltaXQkMSA9IGF3YWl0aWZ5KHJlamVjdExpbWl0LCA0KTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBzYW1lIGFzIFtgcmVqZWN0YF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLnJlamVjdH0gYnV0IHJ1bnMgb25seSBhIHNpbmdsZSBhc3luYyBvcGVyYXRpb24gYXQgYSB0aW1lLlxuICAgICAqXG4gICAgICogQG5hbWUgcmVqZWN0U2VyaWVzXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMucmVqZWN0XXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMucmVqZWN0fVxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxBc3luY0l0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpblxuICAgICAqIGBjb2xsYC5cbiAgICAgKiBUaGUgc2hvdWxkIGNvbXBsZXRlIHdpdGggYSBib29sZWFuIHZhbHVlIGFzIGl0cyBgcmVzdWx0YC5cbiAgICAgKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICAgICAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwYXNzZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZWplY3RTZXJpZXMgKGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gcmVqZWN0KGVhY2hPZlNlcmllcyQxLCBjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spXG4gICAgfVxuICAgIHZhciByZWplY3RTZXJpZXMkMSA9IGF3YWl0aWZ5KHJlamVjdFNlcmllcywgMyk7XG5cbiAgICBmdW5jdGlvbiBjb25zdGFudCQxKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRlbXB0cyB0byBnZXQgYSBzdWNjZXNzZnVsIHJlc3BvbnNlIGZyb20gYHRhc2tgIG5vIG1vcmUgdGhhbiBgdGltZXNgIHRpbWVzXG4gICAgICogYmVmb3JlIHJldHVybmluZyBhbiBlcnJvci4gSWYgdGhlIHRhc2sgaXMgc3VjY2Vzc2Z1bCwgdGhlIGBjYWxsYmFja2Agd2lsbCBiZVxuICAgICAqIHBhc3NlZCB0aGUgcmVzdWx0IG9mIHRoZSBzdWNjZXNzZnVsIHRhc2suIElmIGFsbCBhdHRlbXB0cyBmYWlsLCB0aGUgY2FsbGJhY2tcbiAgICAgKiB3aWxsIGJlIHBhc3NlZCB0aGUgZXJyb3IgYW5kIHJlc3VsdCAoaWYgYW55KSBvZiB0aGUgZmluYWwgYXR0ZW1wdC5cbiAgICAgKlxuICAgICAqIEBuYW1lIHJldHJ5XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICAgICAqIEBzZWUgW2FzeW5jLnJldHJ5YWJsZV17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnJldHJ5YWJsZX1cbiAgICAgKiBAcGFyYW0ge09iamVjdHxudW1iZXJ9IFtvcHRzID0ge3RpbWVzOiA1LCBpbnRlcnZhbDogMH18IDVdIC0gQ2FuIGJlIGVpdGhlciBhblxuICAgICAqIG9iamVjdCB3aXRoIGB0aW1lc2AgYW5kIGBpbnRlcnZhbGAgb3IgYSBudW1iZXIuXG4gICAgICogKiBgdGltZXNgIC0gVGhlIG51bWJlciBvZiBhdHRlbXB0cyB0byBtYWtlIGJlZm9yZSBnaXZpbmcgdXAuICBUaGUgZGVmYXVsdFxuICAgICAqICAgaXMgYDVgLlxuICAgICAqICogYGludGVydmFsYCAtIFRoZSB0aW1lIHRvIHdhaXQgYmV0d2VlbiByZXRyaWVzLCBpbiBtaWxsaXNlY29uZHMuICBUaGVcbiAgICAgKiAgIGRlZmF1bHQgaXMgYDBgLiBUaGUgaW50ZXJ2YWwgbWF5IGFsc28gYmUgc3BlY2lmaWVkIGFzIGEgZnVuY3Rpb24gb2YgdGhlXG4gICAgICogICByZXRyeSBjb3VudCAoc2VlIGV4YW1wbGUpLlxuICAgICAqICogYGVycm9yRmlsdGVyYCAtIEFuIG9wdGlvbmFsIHN5bmNocm9ub3VzIGZ1bmN0aW9uIHRoYXQgaXMgaW52b2tlZCBvblxuICAgICAqICAgZXJyb25lb3VzIHJlc3VsdC4gSWYgaXQgcmV0dXJucyBgdHJ1ZWAgdGhlIHJldHJ5IGF0dGVtcHRzIHdpbGwgY29udGludWU7XG4gICAgICogICBpZiB0aGUgZnVuY3Rpb24gcmV0dXJucyBgZmFsc2VgIHRoZSByZXRyeSBmbG93IGlzIGFib3J0ZWQgd2l0aCB0aGUgY3VycmVudFxuICAgICAqICAgYXR0ZW1wdCdzIGVycm9yIGFuZCByZXN1bHQgYmVpbmcgcmV0dXJuZWQgdG8gdGhlIGZpbmFsIGNhbGxiYWNrLlxuICAgICAqICAgSW52b2tlZCB3aXRoIChlcnIpLlxuICAgICAqICogSWYgYG9wdHNgIGlzIGEgbnVtYmVyLCB0aGUgbnVtYmVyIHNwZWNpZmllcyB0aGUgbnVtYmVyIG9mIHRpbWVzIHRvIHJldHJ5LFxuICAgICAqICAgd2l0aCB0aGUgZGVmYXVsdCBpbnRlcnZhbCBvZiBgMGAuXG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSB0YXNrIC0gQW4gYXN5bmMgZnVuY3Rpb24gdG8gcmV0cnkuXG4gICAgICogSW52b2tlZCB3aXRoIChjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIHRoZVxuICAgICAqIHRhc2sgaGFzIHN1Y2NlZWRlZCwgb3IgYWZ0ZXIgdGhlIGZpbmFsIGZhaWxlZCBhdHRlbXB0LiBJdCByZWNlaXZlcyB0aGUgYGVycmBcbiAgICAgKiBhbmQgYHJlc3VsdGAgYXJndW1lbnRzIG9mIHRoZSBsYXN0IGF0dGVtcHQgYXQgY29tcGxldGluZyB0aGUgYHRhc2tgLiBJbnZva2VkXG4gICAgICogd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlIGlmIG5vIGNhbGxiYWNrIHByb3ZpZGVkXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogLy8gVGhlIGByZXRyeWAgZnVuY3Rpb24gY2FuIGJlIHVzZWQgYXMgYSBzdGFuZC1hbG9uZSBjb250cm9sIGZsb3cgYnkgcGFzc2luZ1xuICAgICAqIC8vIGEgY2FsbGJhY2ssIGFzIHNob3duIGJlbG93OlxuICAgICAqXG4gICAgICogLy8gdHJ5IGNhbGxpbmcgYXBpTWV0aG9kIDMgdGltZXNcbiAgICAgKiBhc3luYy5yZXRyeSgzLCBhcGlNZXRob2QsIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gICAgICogICAgIC8vIGRvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIHRyeSBjYWxsaW5nIGFwaU1ldGhvZCAzIHRpbWVzLCB3YWl0aW5nIDIwMCBtcyBiZXR3ZWVuIGVhY2ggcmV0cnlcbiAgICAgKiBhc3luYy5yZXRyeSh7dGltZXM6IDMsIGludGVydmFsOiAyMDB9LCBhcGlNZXRob2QsIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gICAgICogICAgIC8vIGRvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIHRyeSBjYWxsaW5nIGFwaU1ldGhvZCAxMCB0aW1lcyB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmZcbiAgICAgKiAvLyAoaS5lLiBpbnRlcnZhbHMgb2YgMTAwLCAyMDAsIDQwMCwgODAwLCAxNjAwLCAuLi4gbWlsbGlzZWNvbmRzKVxuICAgICAqIGFzeW5jLnJldHJ5KHtcbiAgICAgKiAgIHRpbWVzOiAxMCxcbiAgICAgKiAgIGludGVydmFsOiBmdW5jdGlvbihyZXRyeUNvdW50KSB7XG4gICAgICogICAgIHJldHVybiA1MCAqIE1hdGgucG93KDIsIHJldHJ5Q291bnQpO1xuICAgICAqICAgfVxuICAgICAqIH0sIGFwaU1ldGhvZCwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAgKiAgICAgLy8gZG8gc29tZXRoaW5nIHdpdGggdGhlIHJlc3VsdFxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gdHJ5IGNhbGxpbmcgYXBpTWV0aG9kIHRoZSBkZWZhdWx0IDUgdGltZXMgbm8gZGVsYXkgYmV0d2VlbiBlYWNoIHJldHJ5XG4gICAgICogYXN5bmMucmV0cnkoYXBpTWV0aG9kLCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICAgICAqICAgICAvLyBkbyBzb21ldGhpbmcgd2l0aCB0aGUgcmVzdWx0XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyB0cnkgY2FsbGluZyBhcGlNZXRob2Qgb25seSB3aGVuIGVycm9yIGNvbmRpdGlvbiBzYXRpc2ZpZXMsIGFsbCBvdGhlclxuICAgICAqIC8vIGVycm9ycyB3aWxsIGFib3J0IHRoZSByZXRyeSBjb250cm9sIGZsb3cgYW5kIHJldHVybiB0byBmaW5hbCBjYWxsYmFja1xuICAgICAqIGFzeW5jLnJldHJ5KHtcbiAgICAgKiAgIGVycm9yRmlsdGVyOiBmdW5jdGlvbihlcnIpIHtcbiAgICAgKiAgICAgcmV0dXJuIGVyci5tZXNzYWdlID09PSAnVGVtcG9yYXJ5IGVycm9yJzsgLy8gb25seSByZXRyeSBvbiBhIHNwZWNpZmljIGVycm9yXG4gICAgICogICB9XG4gICAgICogfSwgYXBpTWV0aG9kLCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICAgICAqICAgICAvLyBkbyBzb21ldGhpbmcgd2l0aCB0aGUgcmVzdWx0XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyB0byByZXRyeSBpbmRpdmlkdWFsIG1ldGhvZHMgdGhhdCBhcmUgbm90IGFzIHJlbGlhYmxlIHdpdGhpbiBvdGhlclxuICAgICAqIC8vIGNvbnRyb2wgZmxvdyBmdW5jdGlvbnMsIHVzZSB0aGUgYHJldHJ5YWJsZWAgd3JhcHBlcjpcbiAgICAgKiBhc3luYy5hdXRvKHtcbiAgICAgKiAgICAgdXNlcnM6IGFwaS5nZXRVc2Vycy5iaW5kKGFwaSksXG4gICAgICogICAgIHBheW1lbnRzOiBhc3luYy5yZXRyeWFibGUoMywgYXBpLmdldFBheW1lbnRzLmJpbmQoYXBpKSlcbiAgICAgKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAgICAgKiAgICAgLy8gZG8gc29tZXRoaW5nIHdpdGggdGhlIHJlc3VsdHNcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqL1xuICAgIGNvbnN0IERFRkFVTFRfVElNRVMgPSA1O1xuICAgIGNvbnN0IERFRkFVTFRfSU5URVJWQUwgPSAwO1xuXG4gICAgZnVuY3Rpb24gcmV0cnkob3B0cywgdGFzaywgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICB0aW1lczogREVGQVVMVF9USU1FUyxcbiAgICAgICAgICAgIGludGVydmFsRnVuYzogY29uc3RhbnQkMShERUZBVUxUX0lOVEVSVkFMKVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMyAmJiB0eXBlb2Ygb3B0cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB0YXNrIHx8IHByb21pc2VDYWxsYmFjaygpO1xuICAgICAgICAgICAgdGFzayA9IG9wdHM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYXJzZVRpbWVzKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBwcm9taXNlQ2FsbGJhY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgdGFzayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBhcmd1bWVudHMgZm9yIGFzeW5jLnJldHJ5XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIF90YXNrID0gd3JhcEFzeW5jKHRhc2spO1xuXG4gICAgICAgIHZhciBhdHRlbXB0ID0gMTtcbiAgICAgICAgZnVuY3Rpb24gcmV0cnlBdHRlbXB0KCkge1xuICAgICAgICAgICAgX3Rhc2soKGVyciwgLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIgPT09IGZhbHNlKSByZXR1cm5cbiAgICAgICAgICAgICAgICBpZiAoZXJyICYmIGF0dGVtcHQrKyA8IG9wdGlvbnMudGltZXMgJiZcbiAgICAgICAgICAgICAgICAgICAgKHR5cGVvZiBvcHRpb25zLmVycm9yRmlsdGVyICE9ICdmdW5jdGlvbicgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3JGaWx0ZXIoZXJyKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChyZXRyeUF0dGVtcHQsIG9wdGlvbnMuaW50ZXJ2YWxGdW5jKGF0dGVtcHQgLSAxKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCAuLi5hcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHJ5QXR0ZW1wdCgpO1xuICAgICAgICByZXR1cm4gY2FsbGJhY2tbUFJPTUlTRV9TWU1CT0xdXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VUaW1lcyhhY2MsIHQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgYWNjLnRpbWVzID0gK3QudGltZXMgfHwgREVGQVVMVF9USU1FUztcblxuICAgICAgICAgICAgYWNjLmludGVydmFsRnVuYyA9IHR5cGVvZiB0LmludGVydmFsID09PSAnZnVuY3Rpb24nID9cbiAgICAgICAgICAgICAgICB0LmludGVydmFsIDpcbiAgICAgICAgICAgICAgICBjb25zdGFudCQxKCt0LmludGVydmFsIHx8IERFRkFVTFRfSU5URVJWQUwpO1xuXG4gICAgICAgICAgICBhY2MuZXJyb3JGaWx0ZXIgPSB0LmVycm9yRmlsdGVyO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0ID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGFjYy50aW1lcyA9ICt0IHx8IERFRkFVTFRfVElNRVM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGFyZ3VtZW50cyBmb3IgYXN5bmMucmV0cnlcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBIGNsb3NlIHJlbGF0aXZlIG9mIFtgcmV0cnlgXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cucmV0cnl9LiAgVGhpcyBtZXRob2RcbiAgICAgKiB3cmFwcyBhIHRhc2sgYW5kIG1ha2VzIGl0IHJldHJ5YWJsZSwgcmF0aGVyIHRoYW4gaW1tZWRpYXRlbHkgY2FsbGluZyBpdFxuICAgICAqIHdpdGggcmV0cmllcy5cbiAgICAgKlxuICAgICAqIEBuYW1lIHJldHJ5YWJsZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gICAgICogQG1ldGhvZFxuICAgICAqIEBzZWUgW2FzeW5jLnJldHJ5XXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cucmV0cnl9XG4gICAgICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fG51bWJlcn0gW29wdHMgPSB7dGltZXM6IDUsIGludGVydmFsOiAwfXwgNV0gLSBvcHRpb25hbFxuICAgICAqIG9wdGlvbnMsIGV4YWN0bHkgdGhlIHNhbWUgYXMgZnJvbSBgcmV0cnlgLCBleGNlcHQgZm9yIGEgYG9wdHMuYXJpdHlgIHRoYXRcbiAgICAgKiBpcyB0aGUgYXJpdHkgb2YgdGhlIGB0YXNrYCBmdW5jdGlvbiwgZGVmYXVsdGluZyB0byBgdGFzay5sZW5ndGhgXG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSB0YXNrIC0gdGhlIGFzeW5jaHJvbm91cyBmdW5jdGlvbiB0byB3cmFwLlxuICAgICAqIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBwYXNzZWQgYW55IGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIHJldHVybmVkIHdyYXBwZXIuXG4gICAgICogSW52b2tlZCB3aXRoICguLi5hcmdzLCBjYWxsYmFjaykuXG4gICAgICogQHJldHVybnMge0FzeW5jRnVuY3Rpb259IFRoZSB3cmFwcGVkIGZ1bmN0aW9uLCB3aGljaCB3aGVuIGludm9rZWQsIHdpbGxcbiAgICAgKiByZXRyeSBvbiBhbiBlcnJvciwgYmFzZWQgb24gdGhlIHBhcmFtZXRlcnMgc3BlY2lmaWVkIGluIGBvcHRzYC5cbiAgICAgKiBUaGlzIGZ1bmN0aW9uIHdpbGwgYWNjZXB0IHRoZSBzYW1lIHBhcmFtZXRlcnMgYXMgYHRhc2tgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBhc3luYy5hdXRvKHtcbiAgICAgKiAgICAgZGVwMTogYXN5bmMucmV0cnlhYmxlKDMsIGdldEZyb21GbGFreVNlcnZpY2UpLFxuICAgICAqICAgICBwcm9jZXNzOiBbXCJkZXAxXCIsIGFzeW5jLnJldHJ5YWJsZSgzLCBmdW5jdGlvbiAocmVzdWx0cywgY2IpIHtcbiAgICAgKiAgICAgICAgIG1heWJlUHJvY2Vzc0RhdGEocmVzdWx0cy5kZXAxLCBjYik7XG4gICAgICogICAgIH0pXVxuICAgICAqIH0sIGNhbGxiYWNrKTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXRyeWFibGUgKG9wdHMsIHRhc2spIHtcbiAgICAgICAgaWYgKCF0YXNrKSB7XG4gICAgICAgICAgICB0YXNrID0gb3B0cztcbiAgICAgICAgICAgIG9wdHMgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGxldCBhcml0eSA9IChvcHRzICYmIG9wdHMuYXJpdHkpIHx8IHRhc2subGVuZ3RoO1xuICAgICAgICBpZiAoaXNBc3luYyh0YXNrKSkge1xuICAgICAgICAgICAgYXJpdHkgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgX3Rhc2sgPSB3cmFwQXN5bmModGFzayk7XG4gICAgICAgIHJldHVybiBpbml0aWFsUGFyYW1zKChhcmdzLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgYXJpdHkgLSAxIHx8IGNhbGxiYWNrID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gcHJvbWlzZUNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmdW5jdGlvbiB0YXNrRm4oY2IpIHtcbiAgICAgICAgICAgICAgICBfdGFzayguLi5hcmdzLCBjYik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvcHRzKSByZXRyeShvcHRzLCB0YXNrRm4sIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGVsc2UgcmV0cnkodGFza0ZuLCBjYWxsYmFjayk7XG5cbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFja1tQUk9NSVNFX1NZTUJPTF1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUnVuIHRoZSBmdW5jdGlvbnMgaW4gdGhlIGB0YXNrc2AgY29sbGVjdGlvbiBpbiBzZXJpZXMsIGVhY2ggb25lIHJ1bm5pbmcgb25jZVxuICAgICAqIHRoZSBwcmV2aW91cyBmdW5jdGlvbiBoYXMgY29tcGxldGVkLiBJZiBhbnkgZnVuY3Rpb25zIGluIHRoZSBzZXJpZXMgcGFzcyBhblxuICAgICAqIGVycm9yIHRvIGl0cyBjYWxsYmFjaywgbm8gbW9yZSBmdW5jdGlvbnMgYXJlIHJ1biwgYW5kIGBjYWxsYmFja2AgaXNcbiAgICAgKiBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGUgdmFsdWUgb2YgdGhlIGVycm9yLiBPdGhlcndpc2UsIGBjYWxsYmFja2BcbiAgICAgKiByZWNlaXZlcyBhbiBhcnJheSBvZiByZXN1bHRzIHdoZW4gYHRhc2tzYCBoYXZlIGNvbXBsZXRlZC5cbiAgICAgKlxuICAgICAqIEl0IGlzIGFsc28gcG9zc2libGUgdG8gdXNlIGFuIG9iamVjdCBpbnN0ZWFkIG9mIGFuIGFycmF5LiBFYWNoIHByb3BlcnR5IHdpbGxcbiAgICAgKiBiZSBydW4gYXMgYSBmdW5jdGlvbiwgYW5kIHRoZSByZXN1bHRzIHdpbGwgYmUgcGFzc2VkIHRvIHRoZSBmaW5hbCBgY2FsbGJhY2tgXG4gICAgICogYXMgYW4gb2JqZWN0IGluc3RlYWQgb2YgYW4gYXJyYXkuIFRoaXMgY2FuIGJlIGEgbW9yZSByZWFkYWJsZSB3YXkgb2YgaGFuZGxpbmdcbiAgICAgKiAgcmVzdWx0cyBmcm9tIHtAbGluayBhc3luYy5zZXJpZXN9LlxuICAgICAqXG4gICAgICogKipOb3RlKiogdGhhdCB3aGlsZSBtYW55IGltcGxlbWVudGF0aW9ucyBwcmVzZXJ2ZSB0aGUgb3JkZXIgb2Ygb2JqZWN0XG4gICAgICogcHJvcGVydGllcywgdGhlIFtFQ01BU2NyaXB0IExhbmd1YWdlIFNwZWNpZmljYXRpb25dKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi81LjEvI3NlYy04LjYpXG4gICAgICogZXhwbGljaXRseSBzdGF0ZXMgdGhhdFxuICAgICAqXG4gICAgICogPiBUaGUgbWVjaGFuaWNzIGFuZCBvcmRlciBvZiBlbnVtZXJhdGluZyB0aGUgcHJvcGVydGllcyBpcyBub3Qgc3BlY2lmaWVkLlxuICAgICAqXG4gICAgICogU28gaWYgeW91IHJlbHkgb24gdGhlIG9yZGVyIGluIHdoaWNoIHlvdXIgc2VyaWVzIG9mIGZ1bmN0aW9ucyBhcmUgZXhlY3V0ZWQsXG4gICAgICogYW5kIHdhbnQgdGhpcyB0byB3b3JrIG9uIGFsbCBwbGF0Zm9ybXMsIGNvbnNpZGVyIHVzaW5nIGFuIGFycmF5LlxuICAgICAqXG4gICAgICogQG5hbWUgc2VyaWVzXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IHRhc2tzIC0gQSBjb2xsZWN0aW9uIGNvbnRhaW5pbmdcbiAgICAgKiBbYXN5bmMgZnVuY3Rpb25zXXtAbGluayBBc3luY0Z1bmN0aW9ufSB0byBydW4gaW4gc2VyaWVzLlxuICAgICAqIEVhY2ggZnVuY3Rpb24gY2FuIGNvbXBsZXRlIHdpdGggYW55IG51bWJlciBvZiBvcHRpb25hbCBgcmVzdWx0YCB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHRvIHJ1biBvbmNlIGFsbCB0aGVcbiAgICAgKiBmdW5jdGlvbnMgaGF2ZSBjb21wbGV0ZWQuIFRoaXMgZnVuY3Rpb24gZ2V0cyBhIHJlc3VsdHMgYXJyYXkgKG9yIG9iamVjdClcbiAgICAgKiBjb250YWluaW5nIGFsbCB0aGUgcmVzdWx0IGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIGB0YXNrYCBjYWxsYmFja3MuIEludm9rZWRcbiAgICAgKiB3aXRoIChlcnIsIHJlc3VsdCkuXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwYXNzZWRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogLy9Vc2luZyBDYWxsYmFja3NcbiAgICAgKiBhc3luYy5zZXJpZXMoW1xuICAgICAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgKiAgICAgICAgICAgICAvLyBkbyBzb21lIGFzeW5jIHRhc2tcbiAgICAgKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAnb25lJyk7XG4gICAgICogICAgICAgICB9LCAyMDApO1xuICAgICAqICAgICB9LFxuICAgICAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgKiAgICAgICAgICAgICAvLyB0aGVuIGRvIGFub3RoZXIgYXN5bmMgdGFza1xuICAgICAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICd0d28nKTtcbiAgICAgKiAgICAgICAgIH0sIDEwMCk7XG4gICAgICogICAgIH1cbiAgICAgKiBdLCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0cyk7XG4gICAgICogICAgIC8vIHJlc3VsdHMgaXMgZXF1YWwgdG8gWydvbmUnLCd0d28nXVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gYW4gZXhhbXBsZSB1c2luZyBvYmplY3RzIGluc3RlYWQgb2YgYXJyYXlzXG4gICAgICogYXN5bmMuc2VyaWVzKHtcbiAgICAgKiAgICAgb25lOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgKiAgICAgICAgICAgICAvLyBkbyBzb21lIGFzeW5jIHRhc2tcbiAgICAgKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAxKTtcbiAgICAgKiAgICAgICAgIH0sIDIwMCk7XG4gICAgICogICAgIH0sXG4gICAgICogICAgIHR3bzogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICogICAgICAgICAgICAgLy8gdGhlbiBkbyBhbm90aGVyIGFzeW5jIHRhc2tcbiAgICAgKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAyKTtcbiAgICAgKiAgICAgICAgIH0sIDEwMCk7XG4gICAgICogICAgIH1cbiAgICAgKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0cyk7XG4gICAgICogICAgIC8vIHJlc3VsdHMgaXMgZXF1YWwgdG86IHsgb25lOiAxLCB0d286IDIgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy9Vc2luZyBQcm9taXNlc1xuICAgICAqIGFzeW5jLnNlcmllcyhbXG4gICAgICogICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICdvbmUnKTtcbiAgICAgKiAgICAgICAgIH0sIDIwMCk7XG4gICAgICogICAgIH0sXG4gICAgICogICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICd0d28nKTtcbiAgICAgKiAgICAgICAgIH0sIDEwMCk7XG4gICAgICogICAgIH1cbiAgICAgKiBdKS50aGVuKHJlc3VsdHMgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhyZXN1bHRzKTtcbiAgICAgKiAgICAgLy8gcmVzdWx0cyBpcyBlcXVhbCB0byBbJ29uZScsJ3R3byddXG4gICAgICogfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIGFuIGV4YW1wbGUgdXNpbmcgYW4gb2JqZWN0IGluc3RlYWQgb2YgYW4gYXJyYXlcbiAgICAgKiBhc3luYy5zZXJpZXMoe1xuICAgICAqICAgICBvbmU6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgICAgICAgIC8vIGRvIHNvbWUgYXN5bmMgdGFza1xuICAgICAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIDEpO1xuICAgICAqICAgICAgICAgfSwgMjAwKTtcbiAgICAgKiAgICAgfSxcbiAgICAgKiAgICAgdHdvOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgKiAgICAgICAgICAgICAvLyB0aGVuIGRvIGFub3RoZXIgYXN5bmMgdGFza1xuICAgICAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIDIpO1xuICAgICAqICAgICAgICAgfSwgMTAwKTtcbiAgICAgKiAgICAgfVxuICAgICAqIH0pLnRoZW4ocmVzdWx0cyA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAvLyByZXN1bHRzIGlzIGVxdWFsIHRvOiB7IG9uZTogMSwgdHdvOiAyIH1cbiAgICAgKiB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy9Vc2luZyBhc3luYy9hd2FpdFxuICAgICAqIGFzeW5jICgpID0+IHtcbiAgICAgKiAgICAgdHJ5IHtcbiAgICAgKiAgICAgICAgIGxldCByZXN1bHRzID0gYXdhaXQgYXN5bmMuc2VyaWVzKFtcbiAgICAgKiAgICAgICAgICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgICAgICAgICAgICAgICAgLy8gZG8gc29tZSBhc3luYyB0YXNrXG4gICAgICogICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAnb25lJyk7XG4gICAgICogICAgICAgICAgICAgICAgIH0sIDIwMCk7XG4gICAgICogICAgICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgICAgICAgICAgICAgICAgLy8gdGhlbiBkbyBhbm90aGVyIGFzeW5jIHRhc2tcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICd0d28nKTtcbiAgICAgKiAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgKiAgICAgICAgICAgICB9XG4gICAgICogICAgICAgICBdKTtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAgICAgLy8gcmVzdWx0cyBpcyBlcXVhbCB0byBbJ29uZScsJ3R3byddXG4gICAgICogICAgIH1cbiAgICAgKiAgICAgY2F0Y2ggKGVycikge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKlxuICAgICAqIC8vIGFuIGV4YW1wbGUgdXNpbmcgYW4gb2JqZWN0IGluc3RlYWQgb2YgYW4gYXJyYXlcbiAgICAgKiBhc3luYyAoKSA9PiB7XG4gICAgICogICAgIHRyeSB7XG4gICAgICogICAgICAgICBsZXQgcmVzdWx0cyA9IGF3YWl0IGFzeW5jLnBhcmFsbGVsKHtcbiAgICAgKiAgICAgICAgICAgICBvbmU6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICogICAgICAgICAgICAgICAgICAgICAvLyBkbyBzb21lIGFzeW5jIHRhc2tcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIDEpO1xuICAgICAqICAgICAgICAgICAgICAgICB9LCAyMDApO1xuICAgICAqICAgICAgICAgICAgIH0sXG4gICAgICogICAgICAgICAgICB0d286IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICogICAgICAgICAgICAgICAgICAgICAvLyB0aGVuIGRvIGFub3RoZXIgYXN5bmMgdGFza1xuICAgICAqICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgMik7XG4gICAgICogICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICogICAgICAgICAgICB9XG4gICAgICogICAgICAgICB9KTtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAgICAgLy8gcmVzdWx0cyBpcyBlcXVhbCB0bzogeyBvbmU6IDEsIHR3bzogMiB9XG4gICAgICogICAgIH1cbiAgICAgKiAgICAgY2F0Y2ggKGVycikge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNlcmllcyh0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHBhcmFsbGVsKGVhY2hPZlNlcmllcyQxLCB0YXNrcywgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYHRydWVgIGlmIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluIHRoZSBgY29sbGAgc2F0aXNmaWVzIGFuIGFzeW5jIHRlc3QuXG4gICAgICogSWYgYW55IGl0ZXJhdGVlIGNhbGwgcmV0dXJucyBgdHJ1ZWAsIHRoZSBtYWluIGBjYWxsYmFja2AgaXMgaW1tZWRpYXRlbHlcbiAgICAgKiBjYWxsZWQuXG4gICAgICpcbiAgICAgKiBAbmFtZSBzb21lXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGFsaWFzIGFueVxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxBc3luY0l0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEFuIGFzeW5jIHRydXRoIHRlc3QgdG8gYXBwbHkgdG8gZWFjaCBpdGVtXG4gICAgICogaW4gdGhlIGNvbGxlY3Rpb25zIGluIHBhcmFsbGVsLlxuICAgICAqIFRoZSBpdGVyYXRlZSBzaG91bGQgY29tcGxldGUgd2l0aCBhIGJvb2xlYW4gYHJlc3VsdGAgdmFsdWUuXG4gICAgICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFzIHNvb24gYXMgYW55XG4gICAgICogaXRlcmF0ZWUgcmV0dXJucyBgdHJ1ZWAsIG9yIGFmdGVyIGFsbCB0aGUgaXRlcmF0ZWUgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuXG4gICAgICogUmVzdWx0IHdpbGwgYmUgZWl0aGVyIGB0cnVlYCBvciBgZmFsc2VgIGRlcGVuZGluZyBvbiB0aGUgdmFsdWVzIG9mIHRoZSBhc3luY1xuICAgICAqIHRlc3RzLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBwcm92aWRlZFxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAvLyBkaXIxIGlzIGEgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgZmlsZTEudHh0LCBmaWxlMi50eHRcbiAgICAgKiAvLyBkaXIyIGlzIGEgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgZmlsZTMudHh0LCBmaWxlNC50eHRcbiAgICAgKiAvLyBkaXIzIGlzIGEgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgZmlsZTUudHh0XG4gICAgICogLy8gZGlyNCBkb2VzIG5vdCBleGlzdFxuICAgICAqXG4gICAgICogLy8gYXN5bmNocm9ub3VzIGZ1bmN0aW9uIHRoYXQgY2hlY2tzIGlmIGEgZmlsZSBleGlzdHNcbiAgICAgKiBmdW5jdGlvbiBmaWxlRXhpc3RzKGZpbGUsIGNhbGxiYWNrKSB7XG4gICAgICogICAgZnMuYWNjZXNzKGZpbGUsIGZzLmNvbnN0YW50cy5GX09LLCAoZXJyKSA9PiB7XG4gICAgICogICAgICAgIGNhbGxiYWNrKG51bGwsICFlcnIpO1xuICAgICAqICAgIH0pO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIGNhbGxiYWNrc1xuICAgICAqIGFzeW5jLnNvbWUoWydkaXIxL21pc3NpbmcudHh0JywnZGlyMi9taXNzaW5nLnR4dCcsJ2RpcjMvZmlsZTUudHh0J10sIGZpbGVFeGlzdHMsXG4gICAgICogICAgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAgKiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgICAgLy8gdHJ1ZVxuICAgICAqICAgICAgICAvLyByZXN1bHQgaXMgdHJ1ZSBzaW5jZSBzb21lIGZpbGUgaW4gdGhlIGxpc3QgZXhpc3RzXG4gICAgICogICAgfVxuICAgICAqKTtcbiAgICAgKlxuICAgICAqIGFzeW5jLnNvbWUoWydkaXIxL21pc3NpbmcudHh0JywnZGlyMi9taXNzaW5nLnR4dCcsJ2RpcjQvbWlzc2luZy50eHQnXSwgZmlsZUV4aXN0cyxcbiAgICAgKiAgICBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICAgICAqICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAqICAgICAgICAvLyBmYWxzZVxuICAgICAqICAgICAgICAvLyByZXN1bHQgaXMgZmFsc2Ugc2luY2Ugbm9uZSBvZiB0aGUgZmlsZXMgZXhpc3RzXG4gICAgICogICAgfVxuICAgICAqKTtcbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIFByb21pc2VzXG4gICAgICogYXN5bmMuc29tZShbJ2RpcjEvbWlzc2luZy50eHQnLCdkaXIyL21pc3NpbmcudHh0JywnZGlyMy9maWxlNS50eHQnXSwgZmlsZUV4aXN0cylcbiAgICAgKiAudGhlbiggcmVzdWx0ID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgLy8gdHJ1ZVxuICAgICAqICAgICAvLyByZXN1bHQgaXMgdHJ1ZSBzaW5jZSBzb21lIGZpbGUgaW4gdGhlIGxpc3QgZXhpc3RzXG4gICAgICogfSkuY2F0Y2goIGVyciA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBhc3luYy5zb21lKFsnZGlyMS9taXNzaW5nLnR4dCcsJ2RpcjIvbWlzc2luZy50eHQnLCdkaXI0L21pc3NpbmcudHh0J10sIGZpbGVFeGlzdHMpXG4gICAgICogLnRoZW4oIHJlc3VsdCA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICogICAgIC8vIGZhbHNlXG4gICAgICogICAgIC8vIHJlc3VsdCBpcyBmYWxzZSBzaW5jZSBub25lIG9mIHRoZSBmaWxlcyBleGlzdHNcbiAgICAgKiB9KS5jYXRjaCggZXJyID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIGFzeW5jL2F3YWl0XG4gICAgICogYXN5bmMgKCkgPT4ge1xuICAgICAqICAgICB0cnkge1xuICAgICAqICAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IGFzeW5jLnNvbWUoWydkaXIxL21pc3NpbmcudHh0JywnZGlyMi9taXNzaW5nLnR4dCcsJ2RpcjMvZmlsZTUudHh0J10sIGZpbGVFeGlzdHMpO1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgICAgIC8vIHRydWVcbiAgICAgKiAgICAgICAgIC8vIHJlc3VsdCBpcyB0cnVlIHNpbmNlIHNvbWUgZmlsZSBpbiB0aGUgbGlzdCBleGlzdHNcbiAgICAgKiAgICAgfVxuICAgICAqICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICB9XG4gICAgICogfVxuICAgICAqXG4gICAgICogYXN5bmMgKCkgPT4ge1xuICAgICAqICAgICB0cnkge1xuICAgICAqICAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IGFzeW5jLnNvbWUoWydkaXIxL21pc3NpbmcudHh0JywnZGlyMi9taXNzaW5nLnR4dCcsJ2RpcjQvbWlzc2luZy50eHQnXSwgZmlsZUV4aXN0cyk7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAqICAgICAgICAgLy8gZmFsc2VcbiAgICAgKiAgICAgICAgIC8vIHJlc3VsdCBpcyBmYWxzZSBzaW5jZSBub25lIG9mIHRoZSBmaWxlcyBleGlzdHNcbiAgICAgKiAgICAgfVxuICAgICAqICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICB9XG4gICAgICogfVxuICAgICAqXG4gICAgICovXG4gICAgZnVuY3Rpb24gc29tZShjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIF9jcmVhdGVUZXN0ZXIoQm9vbGVhbiwgcmVzID0+IHJlcykoZWFjaE9mJDEsIGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaylcbiAgICB9XG4gICAgdmFyIHNvbWUkMSA9IGF3YWl0aWZ5KHNvbWUsIDMpO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2Bzb21lYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLnNvbWV9IGJ1dCBydW5zIGEgbWF4aW11bSBvZiBgbGltaXRgIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICAgICAqXG4gICAgICogQG5hbWUgc29tZUxpbWl0XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMuc29tZV17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLnNvbWV9XG4gICAgICogQGFsaWFzIGFueUxpbWl0XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbGltaXQgLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEFuIGFzeW5jIHRydXRoIHRlc3QgdG8gYXBwbHkgdG8gZWFjaCBpdGVtXG4gICAgICogaW4gdGhlIGNvbGxlY3Rpb25zIGluIHBhcmFsbGVsLlxuICAgICAqIFRoZSBpdGVyYXRlZSBzaG91bGQgY29tcGxldGUgd2l0aCBhIGJvb2xlYW4gYHJlc3VsdGAgdmFsdWUuXG4gICAgICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFzIHNvb24gYXMgYW55XG4gICAgICogaXRlcmF0ZWUgcmV0dXJucyBgdHJ1ZWAsIG9yIGFmdGVyIGFsbCB0aGUgaXRlcmF0ZWUgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuXG4gICAgICogUmVzdWx0IHdpbGwgYmUgZWl0aGVyIGB0cnVlYCBvciBgZmFsc2VgIGRlcGVuZGluZyBvbiB0aGUgdmFsdWVzIG9mIHRoZSBhc3luY1xuICAgICAqIHRlc3RzLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBwcm92aWRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNvbWVMaW1pdChjb2xsLCBsaW1pdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfY3JlYXRlVGVzdGVyKEJvb2xlYW4sIHJlcyA9PiByZXMpKGVhY2hPZkxpbWl0KGxpbWl0KSwgY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKVxuICAgIH1cbiAgICB2YXIgc29tZUxpbWl0JDEgPSBhd2FpdGlmeShzb21lTGltaXQsIDQpO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW2Bzb21lYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLnNvbWV9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAgICAgKlxuICAgICAqIEBuYW1lIHNvbWVTZXJpZXNcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy5zb21lXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuc29tZX1cbiAgICAgKiBAYWxpYXMgYW55U2VyaWVzXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgdHJ1dGggdGVzdCB0byBhcHBseSB0byBlYWNoIGl0ZW1cbiAgICAgKiBpbiB0aGUgY29sbGVjdGlvbnMgaW4gc2VyaWVzLlxuICAgICAqIFRoZSBpdGVyYXRlZSBzaG91bGQgY29tcGxldGUgd2l0aCBhIGJvb2xlYW4gYHJlc3VsdGAgdmFsdWUuXG4gICAgICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFzIHNvb24gYXMgYW55XG4gICAgICogaXRlcmF0ZWUgcmV0dXJucyBgdHJ1ZWAsIG9yIGFmdGVyIGFsbCB0aGUgaXRlcmF0ZWUgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuXG4gICAgICogUmVzdWx0IHdpbGwgYmUgZWl0aGVyIGB0cnVlYCBvciBgZmFsc2VgIGRlcGVuZGluZyBvbiB0aGUgdmFsdWVzIG9mIHRoZSBhc3luY1xuICAgICAqIHRlc3RzLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBwcm92aWRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNvbWVTZXJpZXMoY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfY3JlYXRlVGVzdGVyKEJvb2xlYW4sIHJlcyA9PiByZXMpKGVhY2hPZlNlcmllcyQxLCBjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spXG4gICAgfVxuICAgIHZhciBzb21lU2VyaWVzJDEgPSBhd2FpdGlmeShzb21lU2VyaWVzLCAzKTtcblxuICAgIC8qKlxuICAgICAqIFNvcnRzIGEgbGlzdCBieSB0aGUgcmVzdWx0cyBvZiBydW5uaW5nIGVhY2ggYGNvbGxgIHZhbHVlIHRocm91Z2ggYW4gYXN5bmNcbiAgICAgKiBgaXRlcmF0ZWVgLlxuICAgICAqXG4gICAgICogQG5hbWUgc29ydEJ5XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfEFzeW5jSXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluXG4gICAgICogYGNvbGxgLlxuICAgICAqIFRoZSBpdGVyYXRlZSBzaG91bGQgY29tcGxldGUgd2l0aCBhIHZhbHVlIHRvIHVzZSBhcyB0aGUgc29ydCBjcml0ZXJpYSBhc1xuICAgICAqIGl0cyBgcmVzdWx0YC5cbiAgICAgKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAgICAgKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIFJlc3VsdHMgaXMgdGhlIGl0ZW1zXG4gICAgICogZnJvbSB0aGUgb3JpZ2luYWwgYGNvbGxgIHNvcnRlZCBieSB0aGUgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBgaXRlcmF0ZWVgXG4gICAgICogY2FsbHMuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBwYXNzZWRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogLy8gYmlnZmlsZS50eHQgaXMgYSBmaWxlIHRoYXQgaXMgMjUxMTAwIGJ5dGVzIGluIHNpemVcbiAgICAgKiAvLyBtZWRpdW1maWxlLnR4dCBpcyBhIGZpbGUgdGhhdCBpcyAxMTAwMCBieXRlcyBpbiBzaXplXG4gICAgICogLy8gc21hbGxmaWxlLnR4dCBpcyBhIGZpbGUgdGhhdCBpcyAxMjEgYnl0ZXMgaW4gc2l6ZVxuICAgICAqXG4gICAgICogLy8gYXN5bmNocm9ub3VzIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgZmlsZSBzaXplIGluIGJ5dGVzXG4gICAgICogZnVuY3Rpb24gZ2V0RmlsZVNpemVJbkJ5dGVzKGZpbGUsIGNhbGxiYWNrKSB7XG4gICAgICogICAgIGZzLnN0YXQoZmlsZSwgZnVuY3Rpb24oZXJyLCBzdGF0KSB7XG4gICAgICogICAgICAgICBpZiAoZXJyKSB7XG4gICAgICogICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICogICAgICAgICB9XG4gICAgICogICAgICAgICBjYWxsYmFjayhudWxsLCBzdGF0LnNpemUpO1xuICAgICAqICAgICB9KTtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBjYWxsYmFja3NcbiAgICAgKiBhc3luYy5zb3J0QnkoWydtZWRpdW1maWxlLnR4dCcsJ3NtYWxsZmlsZS50eHQnLCdiaWdmaWxlLnR4dCddLCBnZXRGaWxlU2l6ZUluQnl0ZXMsXG4gICAgICogICAgIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICAgICAqICAgICAgICAgaWYgKGVycikge1xuICAgICAqICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgICAgICB9IGVsc2Uge1xuICAgICAqICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAgICAgICAgIC8vIHJlc3VsdHMgaXMgbm93IHRoZSBvcmlnaW5hbCBhcnJheSBvZiBmaWxlcyBzb3J0ZWQgYnlcbiAgICAgKiAgICAgICAgICAgICAvLyBmaWxlIHNpemUgKGFzY2VuZGluZyBieSBkZWZhdWx0KSwgZS5nLlxuICAgICAqICAgICAgICAgICAgIC8vIFsgJ3NtYWxsZmlsZS50eHQnLCAnbWVkaXVtZmlsZS50eHQnLCAnYmlnZmlsZS50eHQnXVxuICAgICAqICAgICAgICAgfVxuICAgICAqICAgICB9XG4gICAgICogKTtcbiAgICAgKlxuICAgICAqIC8vIEJ5IG1vZGlmeWluZyB0aGUgY2FsbGJhY2sgcGFyYW1ldGVyIHRoZVxuICAgICAqIC8vIHNvcnRpbmcgb3JkZXIgY2FuIGJlIGluZmx1ZW5jZWQ6XG4gICAgICpcbiAgICAgKiAvLyBhc2NlbmRpbmcgb3JkZXJcbiAgICAgKiBhc3luYy5zb3J0QnkoWydtZWRpdW1maWxlLnR4dCcsJ3NtYWxsZmlsZS50eHQnLCdiaWdmaWxlLnR4dCddLCBmdW5jdGlvbihmaWxlLCBjYWxsYmFjaykge1xuICAgICAqICAgICBnZXRGaWxlU2l6ZUluQnl0ZXMoZmlsZSwgZnVuY3Rpb24oZ2V0RmlsZVNpemVFcnIsIGZpbGVTaXplKSB7XG4gICAgICogICAgICAgICBpZiAoZ2V0RmlsZVNpemVFcnIpIHJldHVybiBjYWxsYmFjayhnZXRGaWxlU2l6ZUVycik7XG4gICAgICogICAgICAgICBjYWxsYmFjayhudWxsLCBmaWxlU2l6ZSk7XG4gICAgICogICAgIH0pO1xuICAgICAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICAgICAqICAgICAgICAgaWYgKGVycikge1xuICAgICAqICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgICAgICB9IGVsc2Uge1xuICAgICAqICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAgICAgICAgIC8vIHJlc3VsdHMgaXMgbm93IHRoZSBvcmlnaW5hbCBhcnJheSBvZiBmaWxlcyBzb3J0ZWQgYnlcbiAgICAgKiAgICAgICAgICAgICAvLyBmaWxlIHNpemUgKGFzY2VuZGluZyBieSBkZWZhdWx0KSwgZS5nLlxuICAgICAqICAgICAgICAgICAgIC8vIFsgJ3NtYWxsZmlsZS50eHQnLCAnbWVkaXVtZmlsZS50eHQnLCAnYmlnZmlsZS50eHQnXVxuICAgICAqICAgICAgICAgfVxuICAgICAqICAgICB9XG4gICAgICogKTtcbiAgICAgKlxuICAgICAqIC8vIGRlc2NlbmRpbmcgb3JkZXJcbiAgICAgKiBhc3luYy5zb3J0QnkoWydiaWdmaWxlLnR4dCcsJ21lZGl1bWZpbGUudHh0Jywnc21hbGxmaWxlLnR4dCddLCBmdW5jdGlvbihmaWxlLCBjYWxsYmFjaykge1xuICAgICAqICAgICBnZXRGaWxlU2l6ZUluQnl0ZXMoZmlsZSwgZnVuY3Rpb24oZ2V0RmlsZVNpemVFcnIsIGZpbGVTaXplKSB7XG4gICAgICogICAgICAgICBpZiAoZ2V0RmlsZVNpemVFcnIpIHtcbiAgICAgKiAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZ2V0RmlsZVNpemVFcnIpO1xuICAgICAqICAgICAgICAgfVxuICAgICAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgZmlsZVNpemUgKiAtMSk7XG4gICAgICogICAgIH0pO1xuICAgICAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICAgICAqICAgICAgICAgaWYgKGVycikge1xuICAgICAqICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgICAgICB9IGVsc2Uge1xuICAgICAqICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAgICAgICAgIC8vIHJlc3VsdHMgaXMgbm93IHRoZSBvcmlnaW5hbCBhcnJheSBvZiBmaWxlcyBzb3J0ZWQgYnlcbiAgICAgKiAgICAgICAgICAgICAvLyBmaWxlIHNpemUgKGFzY2VuZGluZyBieSBkZWZhdWx0KSwgZS5nLlxuICAgICAqICAgICAgICAgICAgIC8vIFsgJ2JpZ2ZpbGUudHh0JywgJ21lZGl1bWZpbGUudHh0JywgJ3NtYWxsZmlsZS50eHQnXVxuICAgICAqICAgICAgICAgfVxuICAgICAqICAgICB9XG4gICAgICogKTtcbiAgICAgKlxuICAgICAqIC8vIEVycm9yIGhhbmRsaW5nXG4gICAgICogYXN5bmMuc29ydEJ5KFsnbWVkaXVtZmlsZS50eHQnLCdzbWFsbGZpbGUudHh0JywnbWlzc2luZ2ZpbGUudHh0J10sIGdldEZpbGVTaXplSW5CeXRlcyxcbiAgICAgKiAgICAgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gICAgICogICAgICAgICBpZiAoZXJyKSB7XG4gICAgICogICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgKiAgICAgICAgICAgICAvLyBbIEVycm9yOiBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkgXVxuICAgICAqICAgICAgICAgfSBlbHNlIHtcbiAgICAgKiAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHRzKTtcbiAgICAgKiAgICAgICAgIH1cbiAgICAgKiAgICAgfVxuICAgICAqICk7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBQcm9taXNlc1xuICAgICAqIGFzeW5jLnNvcnRCeShbJ21lZGl1bWZpbGUudHh0Jywnc21hbGxmaWxlLnR4dCcsJ2JpZ2ZpbGUudHh0J10sIGdldEZpbGVTaXplSW5CeXRlcylcbiAgICAgKiAudGhlbiggcmVzdWx0cyA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICAvLyByZXN1bHRzIGlzIG5vdyB0aGUgb3JpZ2luYWwgYXJyYXkgb2YgZmlsZXMgc29ydGVkIGJ5XG4gICAgICogICAgIC8vIGZpbGUgc2l6ZSAoYXNjZW5kaW5nIGJ5IGRlZmF1bHQpLCBlLmcuXG4gICAgICogICAgIC8vIFsgJ3NtYWxsZmlsZS50eHQnLCAnbWVkaXVtZmlsZS50eHQnLCAnYmlnZmlsZS50eHQnXVxuICAgICAqIH0pLmNhdGNoKCBlcnIgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gRXJyb3IgaGFuZGxpbmdcbiAgICAgKiBhc3luYy5zb3J0QnkoWydtZWRpdW1maWxlLnR4dCcsJ3NtYWxsZmlsZS50eHQnLCdtaXNzaW5nZmlsZS50eHQnXSwgZ2V0RmlsZVNpemVJbkJ5dGVzKVxuICAgICAqIC50aGVuKCByZXN1bHRzID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0cyk7XG4gICAgICogfSkuY2F0Y2goIGVyciA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIC8vIFsgRXJyb3I6IEVOT0VOVDogbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeSBdXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBhc3luYy9hd2FpdFxuICAgICAqIChhc3luYyAoKSA9PiB7XG4gICAgICogICAgIHRyeSB7XG4gICAgICogICAgICAgICBsZXQgcmVzdWx0cyA9IGF3YWl0IGFzeW5jLnNvcnRCeShbJ2JpZ2ZpbGUudHh0JywnbWVkaXVtZmlsZS50eHQnLCdzbWFsbGZpbGUudHh0J10sIGdldEZpbGVTaXplSW5CeXRlcyk7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHRzKTtcbiAgICAgKiAgICAgICAgIC8vIHJlc3VsdHMgaXMgbm93IHRoZSBvcmlnaW5hbCBhcnJheSBvZiBmaWxlcyBzb3J0ZWQgYnlcbiAgICAgKiAgICAgICAgIC8vIGZpbGUgc2l6ZSAoYXNjZW5kaW5nIGJ5IGRlZmF1bHQpLCBlLmcuXG4gICAgICogICAgICAgICAvLyBbICdzbWFsbGZpbGUudHh0JywgJ21lZGl1bWZpbGUudHh0JywgJ2JpZ2ZpbGUudHh0J11cbiAgICAgKiAgICAgfVxuICAgICAqICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICB9XG4gICAgICogfSkoKTtcbiAgICAgKlxuICAgICAqIC8vIEVycm9yIGhhbmRsaW5nXG4gICAgICogYXN5bmMgKCkgPT4ge1xuICAgICAqICAgICB0cnkge1xuICAgICAqICAgICAgICAgbGV0IHJlc3VsdHMgPSBhd2FpdCBhc3luYy5zb3J0QnkoWydtaXNzaW5nZmlsZS50eHQnLCdtZWRpdW1maWxlLnR4dCcsJ3NtYWxsZmlsZS50eHQnXSwgZ2V0RmlsZVNpemVJbkJ5dGVzKTtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgICAqICAgICB9XG4gICAgICogICAgIGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgICAgICAvLyBbIEVycm9yOiBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkgXVxuICAgICAqICAgICB9XG4gICAgICogfVxuICAgICAqXG4gICAgICovXG4gICAgZnVuY3Rpb24gc29ydEJ5IChjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIF9pdGVyYXRlZSA9IHdyYXBBc3luYyhpdGVyYXRlZSk7XG4gICAgICAgIHJldHVybiBtYXAkMShjb2xsLCAoeCwgaXRlckNiKSA9PiB7XG4gICAgICAgICAgICBfaXRlcmF0ZWUoeCwgKGVyciwgY3JpdGVyaWEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gaXRlckNiKGVycik7XG4gICAgICAgICAgICAgICAgaXRlckNiKGVyciwge3ZhbHVlOiB4LCBjcml0ZXJpYX0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIChlcnIsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cy5zb3J0KGNvbXBhcmF0b3IpLm1hcCh2ID0+IHYudmFsdWUpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gY29tcGFyYXRvcihsZWZ0LCByaWdodCkge1xuICAgICAgICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhLCBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICAgICAgICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIHNvcnRCeSQxID0gYXdhaXRpZnkoc29ydEJ5LCAzKTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgYSB0aW1lIGxpbWl0IG9uIGFuIGFzeW5jaHJvbm91cyBmdW5jdGlvbi4gSWYgdGhlIGZ1bmN0aW9uIGRvZXMgbm90IGNhbGxcbiAgICAgKiBpdHMgY2FsbGJhY2sgd2l0aGluIHRoZSBzcGVjaWZpZWQgbWlsbGlzZWNvbmRzLCBpdCB3aWxsIGJlIGNhbGxlZCB3aXRoIGFcbiAgICAgKiB0aW1lb3V0IGVycm9yLiBUaGUgY29kZSBwcm9wZXJ0eSBmb3IgdGhlIGVycm9yIG9iamVjdCB3aWxsIGJlIGAnRVRJTUVET1VUJ2AuXG4gICAgICpcbiAgICAgKiBAbmFtZSB0aW1lb3V0XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6VXRpbHNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGNhdGVnb3J5IFV0aWxcbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGFzeW5jRm4gLSBUaGUgYXN5bmMgZnVuY3Rpb24gdG8gbGltaXQgaW4gdGltZS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWlsbGlzZWNvbmRzIC0gVGhlIHNwZWNpZmllZCB0aW1lIGxpbWl0LlxuICAgICAqIEBwYXJhbSB7Kn0gW2luZm9dIC0gQW55IHZhcmlhYmxlIHlvdSB3YW50IGF0dGFjaGVkIChgc3RyaW5nYCwgYG9iamVjdGAsIGV0YylcbiAgICAgKiB0byB0aW1lb3V0IEVycm9yIGZvciBtb3JlIGluZm9ybWF0aW9uLi5cbiAgICAgKiBAcmV0dXJucyB7QXN5bmNGdW5jdGlvbn0gUmV0dXJucyBhIHdyYXBwZWQgZnVuY3Rpb24gdGhhdCBjYW4gYmUgdXNlZCB3aXRoIGFueVxuICAgICAqIG9mIHRoZSBjb250cm9sIGZsb3cgZnVuY3Rpb25zLlxuICAgICAqIEludm9rZSB0aGlzIGZ1bmN0aW9uIHdpdGggdGhlIHNhbWUgcGFyYW1ldGVycyBhcyB5b3Ugd291bGQgYGFzeW5jRnVuY2AuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIGZ1bmN0aW9uIG15RnVuY3Rpb24oZm9vLCBjYWxsYmFjaykge1xuICAgICAqICAgICBkb0FzeW5jVGFzayhmb28sIGZ1bmN0aW9uKGVyciwgZGF0YSkge1xuICAgICAqICAgICAgICAgLy8gaGFuZGxlIGVycm9yc1xuICAgICAqICAgICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICpcbiAgICAgKiAgICAgICAgIC8vIGRvIHNvbWUgc3R1ZmYgLi4uXG4gICAgICpcbiAgICAgKiAgICAgICAgIC8vIHJldHVybiBwcm9jZXNzZWQgZGF0YVxuICAgICAqICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIGRhdGEpO1xuICAgICAqICAgICB9KTtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiB2YXIgd3JhcHBlZCA9IGFzeW5jLnRpbWVvdXQobXlGdW5jdGlvbiwgMTAwMCk7XG4gICAgICpcbiAgICAgKiAvLyBjYWxsIGB3cmFwcGVkYCBhcyB5b3Ugd291bGQgYG15RnVuY3Rpb25gXG4gICAgICogd3JhcHBlZCh7IGJhcjogJ2JhcicgfSwgZnVuY3Rpb24oZXJyLCBkYXRhKSB7XG4gICAgICogICAgIC8vIGlmIGBteUZ1bmN0aW9uYCB0YWtlcyA8IDEwMDAgbXMgdG8gZXhlY3V0ZSwgYGVycmBcbiAgICAgKiAgICAgLy8gYW5kIGBkYXRhYCB3aWxsIGhhdmUgdGhlaXIgZXhwZWN0ZWQgdmFsdWVzXG4gICAgICpcbiAgICAgKiAgICAgLy8gZWxzZSBgZXJyYCB3aWxsIGJlIGFuIEVycm9yIHdpdGggdGhlIGNvZGUgJ0VUSU1FRE9VVCdcbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0aW1lb3V0KGFzeW5jRm4sIG1pbGxpc2Vjb25kcywgaW5mbykge1xuICAgICAgICB2YXIgZm4gPSB3cmFwQXN5bmMoYXN5bmNGbik7XG5cbiAgICAgICAgcmV0dXJuIGluaXRpYWxQYXJhbXMoKGFyZ3MsIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgICB2YXIgdGltZWRPdXQgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciB0aW1lcjtcblxuICAgICAgICAgICAgZnVuY3Rpb24gdGltZW91dENhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gYXN5bmNGbi5uYW1lIHx8ICdhbm9ueW1vdXMnO1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciAgPSBuZXcgRXJyb3IoJ0NhbGxiYWNrIGZ1bmN0aW9uIFwiJyArIG5hbWUgKyAnXCIgdGltZWQgb3V0LicpO1xuICAgICAgICAgICAgICAgIGVycm9yLmNvZGUgPSAnRVRJTUVET1VUJztcbiAgICAgICAgICAgICAgICBpZiAoaW5mbykge1xuICAgICAgICAgICAgICAgICAgICBlcnJvci5pbmZvID0gaW5mbztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGltZWRPdXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXJncy5wdXNoKCguLi5jYkFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXRpbWVkT3V0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKC4uLmNiQXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIHNldHVwIHRpbWVyIGFuZCBjYWxsIG9yaWdpbmFsIGZ1bmN0aW9uXG4gICAgICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQodGltZW91dENhbGxiYWNrLCBtaWxsaXNlY29uZHMpO1xuICAgICAgICAgICAgZm4oLi4uYXJncyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJhbmdlKHNpemUpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IEFycmF5KHNpemUpO1xuICAgICAgICB3aGlsZSAoc2l6ZS0tKSB7XG4gICAgICAgICAgICByZXN1bHRbc2l6ZV0gPSBzaXplO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW3RpbWVzXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cudGltZXN9IGJ1dCBydW5zIGEgbWF4aW11bSBvZiBgbGltaXRgIGFzeW5jIG9wZXJhdGlvbnMgYXQgYVxuICAgICAqIHRpbWUuXG4gICAgICpcbiAgICAgKiBAbmFtZSB0aW1lc0xpbWl0XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMudGltZXNde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy50aW1lc31cbiAgICAgKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvdW50IC0gVGhlIG51bWJlciBvZiB0aW1lcyB0byBydW4gdGhlIGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gVGhlIGFzeW5jIGZ1bmN0aW9uIHRvIGNhbGwgYG5gIHRpbWVzLlxuICAgICAqIEludm9rZWQgd2l0aCB0aGUgaXRlcmF0aW9uIGluZGV4IGFuZCBhIGNhbGxiYWNrOiAobiwgbmV4dCkuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBzZWUgW2FzeW5jLm1hcF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLm1hcH0uXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgbm8gY2FsbGJhY2sgaXMgcHJvdmlkZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0aW1lc0xpbWl0KGNvdW50LCBsaW1pdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBfaXRlcmF0ZWUgPSB3cmFwQXN5bmMoaXRlcmF0ZWUpO1xuICAgICAgICByZXR1cm4gbWFwTGltaXQkMShyYW5nZShjb3VudCksIGxpbWl0LCBfaXRlcmF0ZWUsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxscyB0aGUgYGl0ZXJhdGVlYCBmdW5jdGlvbiBgbmAgdGltZXMsIGFuZCBhY2N1bXVsYXRlcyByZXN1bHRzIGluIHRoZSBzYW1lXG4gICAgICogbWFubmVyIHlvdSB3b3VsZCB1c2Ugd2l0aCBbbWFwXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMubWFwfS5cbiAgICAgKlxuICAgICAqIEBuYW1lIHRpbWVzXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMubWFwXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMubWFwfVxuICAgICAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbiAtIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcnVuIHRoZSBmdW5jdGlvbi5cbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gVGhlIGFzeW5jIGZ1bmN0aW9uIHRvIGNhbGwgYG5gIHRpbWVzLlxuICAgICAqIEludm9rZWQgd2l0aCB0aGUgaXRlcmF0aW9uIGluZGV4IGFuZCBhIGNhbGxiYWNrOiAobiwgbmV4dCkuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBzZWUge0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9LlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UsIGlmIG5vIGNhbGxiYWNrIGlzIHByb3ZpZGVkXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIC8vIFByZXRlbmQgdGhpcyBpcyBzb21lIGNvbXBsaWNhdGVkIGFzeW5jIGZhY3RvcnlcbiAgICAgKiB2YXIgY3JlYXRlVXNlciA9IGZ1bmN0aW9uKGlkLCBjYWxsYmFjaykge1xuICAgICAqICAgICBjYWxsYmFjayhudWxsLCB7XG4gICAgICogICAgICAgICBpZDogJ3VzZXInICsgaWRcbiAgICAgKiAgICAgfSk7XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIC8vIGdlbmVyYXRlIDUgdXNlcnNcbiAgICAgKiBhc3luYy50aW1lcyg1LCBmdW5jdGlvbihuLCBuZXh0KSB7XG4gICAgICogICAgIGNyZWF0ZVVzZXIobiwgZnVuY3Rpb24oZXJyLCB1c2VyKSB7XG4gICAgICogICAgICAgICBuZXh0KGVyciwgdXNlcik7XG4gICAgICogICAgIH0pO1xuICAgICAqIH0sIGZ1bmN0aW9uKGVyciwgdXNlcnMpIHtcbiAgICAgKiAgICAgLy8gd2Ugc2hvdWxkIG5vdyBoYXZlIDUgdXNlcnNcbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0aW1lcyAobiwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aW1lc0xpbWl0KG4sIEluZmluaXR5LCBpdGVyYXRlZSwgY2FsbGJhY2spXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIHNhbWUgYXMgW3RpbWVzXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cudGltZXN9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAgICAgKlxuICAgICAqIEBuYW1lIHRpbWVzU2VyaWVzXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMudGltZXNde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy50aW1lc31cbiAgICAgKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG4gLSBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIHJ1biB0aGUgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIFRoZSBhc3luYyBmdW5jdGlvbiB0byBjYWxsIGBuYCB0aW1lcy5cbiAgICAgKiBJbnZva2VkIHdpdGggdGhlIGl0ZXJhdGlvbiBpbmRleCBhbmQgYSBjYWxsYmFjazogKG4sIG5leHQpLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gc2VlIHtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMubWFwfS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwcm92aWRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRpbWVzU2VyaWVzIChuLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRpbWVzTGltaXQobiwgMSwgaXRlcmF0ZWUsIGNhbGxiYWNrKVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEEgcmVsYXRpdmUgb2YgYHJlZHVjZWAuICBUYWtlcyBhbiBPYmplY3Qgb3IgQXJyYXksIGFuZCBpdGVyYXRlcyBvdmVyIGVhY2hcbiAgICAgKiBlbGVtZW50IGluIHBhcmFsbGVsLCBlYWNoIHN0ZXAgcG90ZW50aWFsbHkgbXV0YXRpbmcgYW4gYGFjY3VtdWxhdG9yYCB2YWx1ZS5cbiAgICAgKiBUaGUgdHlwZSBvZiB0aGUgYWNjdW11bGF0b3IgZGVmYXVsdHMgdG8gdGhlIHR5cGUgb2YgY29sbGVjdGlvbiBwYXNzZWQgaW4uXG4gICAgICpcbiAgICAgKiBAbmFtZSB0cmFuc2Zvcm1cbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7Kn0gW2FjY3VtdWxhdG9yXSAtIFRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSB0cmFuc2Zvcm0uICBJZiBvbWl0dGVkLFxuICAgICAqIGl0IHdpbGwgZGVmYXVsdCB0byBhbiBlbXB0eSBPYmplY3Qgb3IgQXJyYXksIGRlcGVuZGluZyBvbiB0aGUgdHlwZSBvZiBgY29sbGBcbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiBhcHBsaWVkIHRvIGVhY2ggaXRlbSBpbiB0aGVcbiAgICAgKiBjb2xsZWN0aW9uIHRoYXQgcG90ZW50aWFsbHkgbW9kaWZpZXMgdGhlIGFjY3VtdWxhdG9yLlxuICAgICAqIEludm9rZWQgd2l0aCAoYWNjdW11bGF0b3IsIGl0ZW0sIGtleSwgY2FsbGJhY2spLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gICAgICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC4gUmVzdWx0IGlzIHRoZSB0cmFuc2Zvcm1lZCBhY2N1bXVsYXRvci5cbiAgICAgKiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBwcm92aWRlZFxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAvLyBmaWxlMS50eHQgaXMgYSBmaWxlIHRoYXQgaXMgMTAwMCBieXRlcyBpbiBzaXplXG4gICAgICogLy8gZmlsZTIudHh0IGlzIGEgZmlsZSB0aGF0IGlzIDIwMDAgYnl0ZXMgaW4gc2l6ZVxuICAgICAqIC8vIGZpbGUzLnR4dCBpcyBhIGZpbGUgdGhhdCBpcyAzMDAwIGJ5dGVzIGluIHNpemVcbiAgICAgKlxuICAgICAqIC8vIGhlbHBlciBmdW5jdGlvbiB0aGF0IHJldHVybnMgaHVtYW4tcmVhZGFibGUgc2l6ZSBmb3JtYXQgZnJvbSBieXRlc1xuICAgICAqIGZ1bmN0aW9uIGZvcm1hdEJ5dGVzKGJ5dGVzLCBkZWNpbWFscyA9IDIpIHtcbiAgICAgKiAgIC8vIGltcGxlbWVudGF0aW9uIG5vdCBpbmNsdWRlZCBmb3IgYnJldml0eVxuICAgICAqICAgcmV0dXJuIGh1bWFuUmVhZGJsZUZpbGVzaXplO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIGNvbnN0IGZpbGVMaXN0ID0gWydmaWxlMS50eHQnLCdmaWxlMi50eHQnLCdmaWxlMy50eHQnXTtcbiAgICAgKlxuICAgICAqIC8vIGFzeW5jaHJvbm91cyBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGZpbGUgc2l6ZSwgdHJhbnNmb3JtZWQgdG8gaHVtYW4tcmVhZGFibGUgZm9ybWF0XG4gICAgICogLy8gZS5nLiAxMDI0IGJ5dGVzID0gMUtCLCAxMjM0IGJ5dGVzID0gMS4yMSBLQiwgMTA0ODU3NiBieXRlcyA9IDFNQiwgZXRjLlxuICAgICAqIGZ1bmN0aW9uIHRyYW5zZm9ybUZpbGVTaXplKGFjYywgdmFsdWUsIGtleSwgY2FsbGJhY2spIHtcbiAgICAgKiAgICAgZnMuc3RhdCh2YWx1ZSwgZnVuY3Rpb24oZXJyLCBzdGF0KSB7XG4gICAgICogICAgICAgICBpZiAoZXJyKSB7XG4gICAgICogICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICogICAgICAgICB9XG4gICAgICogICAgICAgICBhY2Nba2V5XSA9IGZvcm1hdEJ5dGVzKHN0YXQuc2l6ZSk7XG4gICAgICogICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgKiAgICAgfSk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogLy8gVXNpbmcgY2FsbGJhY2tzXG4gICAgICogYXN5bmMudHJhbnNmb3JtKGZpbGVMaXN0LCB0cmFuc2Zvcm1GaWxlU2l6ZSwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAgKiAgICAgaWYoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICB9IGVsc2Uge1xuICAgICAqICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgICAgIC8vIFsgJzEwMDAgQnl0ZXMnLCAnMS45NSBLQicsICcyLjkzIEtCJyBdXG4gICAgICogICAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIFByb21pc2VzXG4gICAgICogYXN5bmMudHJhbnNmb3JtKGZpbGVMaXN0LCB0cmFuc2Zvcm1GaWxlU2l6ZSlcbiAgICAgKiAudGhlbihyZXN1bHQgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAqICAgICAvLyBbICcxMDAwIEJ5dGVzJywgJzEuOTUgS0InLCAnMi45MyBLQicgXVxuICAgICAqIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBVc2luZyBhc3luYy9hd2FpdFxuICAgICAqIChhc3luYyAoKSA9PiB7XG4gICAgICogICAgIHRyeSB7XG4gICAgICogICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgYXN5bmMudHJhbnNmb3JtKGZpbGVMaXN0LCB0cmFuc2Zvcm1GaWxlU2l6ZSk7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAqICAgICAgICAgLy8gWyAnMTAwMCBCeXRlcycsICcxLjk1IEtCJywgJzIuOTMgS0InIF1cbiAgICAgKiAgICAgfVxuICAgICAqICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqICAgICB9XG4gICAgICogfSkoKTtcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAvLyBmaWxlMS50eHQgaXMgYSBmaWxlIHRoYXQgaXMgMTAwMCBieXRlcyBpbiBzaXplXG4gICAgICogLy8gZmlsZTIudHh0IGlzIGEgZmlsZSB0aGF0IGlzIDIwMDAgYnl0ZXMgaW4gc2l6ZVxuICAgICAqIC8vIGZpbGUzLnR4dCBpcyBhIGZpbGUgdGhhdCBpcyAzMDAwIGJ5dGVzIGluIHNpemVcbiAgICAgKlxuICAgICAqIC8vIGhlbHBlciBmdW5jdGlvbiB0aGF0IHJldHVybnMgaHVtYW4tcmVhZGFibGUgc2l6ZSBmb3JtYXQgZnJvbSBieXRlc1xuICAgICAqIGZ1bmN0aW9uIGZvcm1hdEJ5dGVzKGJ5dGVzLCBkZWNpbWFscyA9IDIpIHtcbiAgICAgKiAgIC8vIGltcGxlbWVudGF0aW9uIG5vdCBpbmNsdWRlZCBmb3IgYnJldml0eVxuICAgICAqICAgcmV0dXJuIGh1bWFuUmVhZGJsZUZpbGVzaXplO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIGNvbnN0IGZpbGVNYXAgPSB7IGYxOiAnZmlsZTEudHh0JywgZjI6ICdmaWxlMi50eHQnLCBmMzogJ2ZpbGUzLnR4dCcgfTtcbiAgICAgKlxuICAgICAqIC8vIGFzeW5jaHJvbm91cyBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGZpbGUgc2l6ZSwgdHJhbnNmb3JtZWQgdG8gaHVtYW4tcmVhZGFibGUgZm9ybWF0XG4gICAgICogLy8gZS5nLiAxMDI0IGJ5dGVzID0gMUtCLCAxMjM0IGJ5dGVzID0gMS4yMSBLQiwgMTA0ODU3NiBieXRlcyA9IDFNQiwgZXRjLlxuICAgICAqIGZ1bmN0aW9uIHRyYW5zZm9ybUZpbGVTaXplKGFjYywgdmFsdWUsIGtleSwgY2FsbGJhY2spIHtcbiAgICAgKiAgICAgZnMuc3RhdCh2YWx1ZSwgZnVuY3Rpb24oZXJyLCBzdGF0KSB7XG4gICAgICogICAgICAgICBpZiAoZXJyKSB7XG4gICAgICogICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICogICAgICAgICB9XG4gICAgICogICAgICAgICBhY2Nba2V5XSA9IGZvcm1hdEJ5dGVzKHN0YXQuc2l6ZSk7XG4gICAgICogICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgKiAgICAgfSk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogLy8gVXNpbmcgY2FsbGJhY2tzXG4gICAgICogYXN5bmMudHJhbnNmb3JtKGZpbGVNYXAsIHRyYW5zZm9ybUZpbGVTaXplLCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICAgICAqICAgICBpZihlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIH0gZWxzZSB7XG4gICAgICogICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAqICAgICAgICAgLy8geyBmMTogJzEwMDAgQnl0ZXMnLCBmMjogJzEuOTUgS0InLCBmMzogJzIuOTMgS0InIH1cbiAgICAgKiAgICAgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gVXNpbmcgUHJvbWlzZXNcbiAgICAgKiBhc3luYy50cmFuc2Zvcm0oZmlsZU1hcCwgdHJhbnNmb3JtRmlsZVNpemUpXG4gICAgICogLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgKiAgICAgLy8geyBmMTogJzEwMDAgQnl0ZXMnLCBmMjogJzEuOTUgS0InLCBmMzogJzIuOTMgS0InIH1cbiAgICAgKiB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAqICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gVXNpbmcgYXN5bmMvYXdhaXRcbiAgICAgKiBhc3luYyAoKSA9PiB7XG4gICAgICogICAgIHRyeSB7XG4gICAgICogICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgYXN5bmMudHJhbnNmb3JtKGZpbGVNYXAsIHRyYW5zZm9ybUZpbGVTaXplKTtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICogICAgICAgICAvLyB7IGYxOiAnMTAwMCBCeXRlcycsIGYyOiAnMS45NSBLQicsIGYzOiAnMi45MyBLQicgfVxuICAgICAqICAgICB9XG4gICAgICogICAgIGNhdGNoIChlcnIpIHtcbiAgICAgKiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICpcbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0cmFuc2Zvcm0gKGNvbGwsIGFjY3VtdWxhdG9yLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPD0gMyAmJiB0eXBlb2YgYWNjdW11bGF0b3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gaXRlcmF0ZWU7XG4gICAgICAgICAgICBpdGVyYXRlZSA9IGFjY3VtdWxhdG9yO1xuICAgICAgICAgICAgYWNjdW11bGF0b3IgPSBBcnJheS5pc0FycmF5KGNvbGwpID8gW10gOiB7fTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2sgfHwgcHJvbWlzZUNhbGxiYWNrKCkpO1xuICAgICAgICB2YXIgX2l0ZXJhdGVlID0gd3JhcEFzeW5jKGl0ZXJhdGVlKTtcblxuICAgICAgICBlYWNoT2YkMShjb2xsLCAodiwgaywgY2IpID0+IHtcbiAgICAgICAgICAgIF9pdGVyYXRlZShhY2N1bXVsYXRvciwgdiwgaywgY2IpO1xuICAgICAgICB9LCBlcnIgPT4gY2FsbGJhY2soZXJyLCBhY2N1bXVsYXRvcikpO1xuICAgICAgICByZXR1cm4gY2FsbGJhY2tbUFJPTUlTRV9TWU1CT0xdXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSXQgcnVucyBlYWNoIHRhc2sgaW4gc2VyaWVzIGJ1dCBzdG9wcyB3aGVuZXZlciBhbnkgb2YgdGhlIGZ1bmN0aW9ucyB3ZXJlXG4gICAgICogc3VjY2Vzc2Z1bC4gSWYgb25lIG9mIHRoZSB0YXNrcyB3ZXJlIHN1Y2Nlc3NmdWwsIHRoZSBgY2FsbGJhY2tgIHdpbGwgYmVcbiAgICAgKiBwYXNzZWQgdGhlIHJlc3VsdCBvZiB0aGUgc3VjY2Vzc2Z1bCB0YXNrLiBJZiBhbGwgdGFza3MgZmFpbCwgdGhlIGNhbGxiYWNrXG4gICAgICogd2lsbCBiZSBwYXNzZWQgdGhlIGVycm9yIGFuZCByZXN1bHQgKGlmIGFueSkgb2YgdGhlIGZpbmFsIGF0dGVtcHQuXG4gICAgICpcbiAgICAgKiBAbmFtZSB0cnlFYWNoXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICAgICAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8QXN5bmNJdGVyYWJsZXxPYmplY3R9IHRhc2tzIC0gQSBjb2xsZWN0aW9uIGNvbnRhaW5pbmcgZnVuY3Rpb25zIHRvXG4gICAgICogcnVuLCBlYWNoIGZ1bmN0aW9uIGlzIHBhc3NlZCBhIGBjYWxsYmFjayhlcnIsIHJlc3VsdClgIGl0IG11c3QgY2FsbCBvblxuICAgICAqIGNvbXBsZXRpb24gd2l0aCBhbiBlcnJvciBgZXJyYCAod2hpY2ggY2FuIGJlIGBudWxsYCkgYW5kIGFuIG9wdGlvbmFsIGByZXN1bHRgXG4gICAgICogdmFsdWUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIG9uZVxuICAgICAqIG9mIHRoZSB0YXNrcyBoYXMgc3VjY2VlZGVkLCBvciBhbGwgaGF2ZSBmYWlsZWQuIEl0IHJlY2VpdmVzIHRoZSBgZXJyYCBhbmRcbiAgICAgKiBgcmVzdWx0YCBhcmd1bWVudHMgb2YgdGhlIGxhc3QgYXR0ZW1wdCBhdCBjb21wbGV0aW5nIHRoZSBgdGFza2AuIEludm9rZWQgd2l0aFxuICAgICAqIChlcnIsIHJlc3VsdHMpLlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UsIGlmIG5vIGNhbGxiYWNrIGlzIHBhc3NlZFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYXN5bmMudHJ5RWFjaChbXG4gICAgICogICAgIGZ1bmN0aW9uIGdldERhdGFGcm9tRmlyc3RXZWJzaXRlKGNhbGxiYWNrKSB7XG4gICAgICogICAgICAgICAvLyBUcnkgZ2V0dGluZyB0aGUgZGF0YSBmcm9tIHRoZSBmaXJzdCB3ZWJzaXRlXG4gICAgICogICAgICAgICBjYWxsYmFjayhlcnIsIGRhdGEpO1xuICAgICAqICAgICB9LFxuICAgICAqICAgICBmdW5jdGlvbiBnZXREYXRhRnJvbVNlY29uZFdlYnNpdGUoY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIC8vIEZpcnN0IHdlYnNpdGUgZmFpbGVkLFxuICAgICAqICAgICAgICAgLy8gVHJ5IGdldHRpbmcgdGhlIGRhdGEgZnJvbSB0aGUgYmFja3VwIHdlYnNpdGVcbiAgICAgKiAgICAgICAgIGNhbGxiYWNrKGVyciwgZGF0YSk7XG4gICAgICogICAgIH1cbiAgICAgKiBdLFxuICAgICAqIC8vIG9wdGlvbmFsIGNhbGxiYWNrXG4gICAgICogZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gICAgICogICAgIE5vdyBkbyBzb21ldGhpbmcgd2l0aCB0aGUgZGF0YS5cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRyeUVhY2godGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBlcnJvciA9IG51bGw7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIHJldHVybiBlYWNoU2VyaWVzJDEodGFza3MsICh0YXNrLCB0YXNrQ2IpID0+IHtcbiAgICAgICAgICAgIHdyYXBBc3luYyh0YXNrKSgoZXJyLCAuLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVyciA9PT0gZmFsc2UpIHJldHVybiB0YXNrQ2IoZXJyKTtcblxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgW3Jlc3VsdF0gPSBhcmdzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVycm9yID0gZXJyO1xuICAgICAgICAgICAgICAgIHRhc2tDYihlcnIgPyBudWxsIDoge30pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sICgpID0+IGNhbGxiYWNrKGVycm9yLCByZXN1bHQpKTtcbiAgICB9XG5cbiAgICB2YXIgdHJ5RWFjaCQxID0gYXdhaXRpZnkodHJ5RWFjaCk7XG5cbiAgICAvKipcbiAgICAgKiBVbmRvZXMgYSBbbWVtb2l6ZV17QGxpbmsgbW9kdWxlOlV0aWxzLm1lbW9pemV9ZCBmdW5jdGlvbiwgcmV2ZXJ0aW5nIGl0IHRvIHRoZSBvcmlnaW5hbCxcbiAgICAgKiB1bm1lbW9pemVkIGZvcm0uIEhhbmR5IGZvciB0ZXN0aW5nLlxuICAgICAqXG4gICAgICogQG5hbWUgdW5tZW1vaXplXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6VXRpbHNcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHNlZSBbYXN5bmMubWVtb2l6ZV17QGxpbmsgbW9kdWxlOlV0aWxzLm1lbW9pemV9XG4gICAgICogQGNhdGVnb3J5IFV0aWxcbiAgICAgKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGZuIC0gdGhlIG1lbW9pemVkIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge0FzeW5jRnVuY3Rpb259IGEgZnVuY3Rpb24gdGhhdCBjYWxscyB0aGUgb3JpZ2luYWwgdW5tZW1vaXplZCBmdW5jdGlvblxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVubWVtb2l6ZShmbikge1xuICAgICAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIHJldHVybiAoZm4udW5tZW1vaXplZCB8fCBmbikoLi4uYXJncyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVwZWF0ZWRseSBjYWxsIGBpdGVyYXRlZWAsIHdoaWxlIGB0ZXN0YCByZXR1cm5zIGB0cnVlYC4gQ2FsbHMgYGNhbGxiYWNrYCB3aGVuXG4gICAgICogc3RvcHBlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLlxuICAgICAqXG4gICAgICogQG5hbWUgd2hpbHN0XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gdGVzdCAtIGFzeW5jaHJvbm91cyB0cnV0aCB0ZXN0IHRvIHBlcmZvcm0gYmVmb3JlIGVhY2hcbiAgICAgKiBleGVjdXRpb24gb2YgYGl0ZXJhdGVlYC4gSW52b2tlZCB3aXRoICgpLlxuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyBmdW5jdGlvbiB3aGljaCBpcyBjYWxsZWQgZWFjaCB0aW1lXG4gICAgICogYHRlc3RgIHBhc3Nlcy4gSW52b2tlZCB3aXRoIChjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIHRoZSB0ZXN0XG4gICAgICogZnVuY3Rpb24gaGFzIGZhaWxlZCBhbmQgcmVwZWF0ZWQgZXhlY3V0aW9uIG9mIGBpdGVyYXRlZWAgaGFzIHN0b3BwZWQuIGBjYWxsYmFja2BcbiAgICAgKiB3aWxsIGJlIHBhc3NlZCBhbiBlcnJvciBhbmQgYW55IGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIGZpbmFsIGBpdGVyYXRlZWAnc1xuICAgICAqIGNhbGxiYWNrLiBJbnZva2VkIHdpdGggKGVyciwgW3Jlc3VsdHNdKTtcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlLCBpZiBubyBjYWxsYmFjayBpcyBwYXNzZWRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGNvdW50ID0gMDtcbiAgICAgKiBhc3luYy53aGlsc3QoXG4gICAgICogICAgIGZ1bmN0aW9uIHRlc3QoY2IpIHsgY2IobnVsbCwgY291bnQgPCA1KTsgfSxcbiAgICAgKiAgICAgZnVuY3Rpb24gaXRlcihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgY291bnQrKztcbiAgICAgKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgY291bnQpO1xuICAgICAqICAgICAgICAgfSwgMTAwMCk7XG4gICAgICogICAgIH0sXG4gICAgICogICAgIGZ1bmN0aW9uIChlcnIsIG4pIHtcbiAgICAgKiAgICAgICAgIC8vIDUgc2Vjb25kcyBoYXZlIHBhc3NlZCwgbiA9IDVcbiAgICAgKiAgICAgfVxuICAgICAqICk7XG4gICAgICovXG4gICAgZnVuY3Rpb24gd2hpbHN0KHRlc3QsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IG9ubHlPbmNlKGNhbGxiYWNrKTtcbiAgICAgICAgdmFyIF9mbiA9IHdyYXBBc3luYyhpdGVyYXRlZSk7XG4gICAgICAgIHZhciBfdGVzdCA9IHdyYXBBc3luYyh0ZXN0KTtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcblxuICAgICAgICBmdW5jdGlvbiBuZXh0KGVyciwgLi4ucmVzdCkge1xuICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICByZXN1bHRzID0gcmVzdDtcbiAgICAgICAgICAgIGlmIChlcnIgPT09IGZhbHNlKSByZXR1cm47XG4gICAgICAgICAgICBfdGVzdChjaGVjayk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBjaGVjayhlcnIsIHRydXRoKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIGlmIChlcnIgPT09IGZhbHNlKSByZXR1cm47XG4gICAgICAgICAgICBpZiAoIXRydXRoKSByZXR1cm4gY2FsbGJhY2sobnVsbCwgLi4ucmVzdWx0cyk7XG4gICAgICAgICAgICBfZm4obmV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gX3Rlc3QoY2hlY2spO1xuICAgIH1cbiAgICB2YXIgd2hpbHN0JDEgPSBhd2FpdGlmeSh3aGlsc3QsIDMpO1xuXG4gICAgLyoqXG4gICAgICogUmVwZWF0ZWRseSBjYWxsIGBpdGVyYXRlZWAgdW50aWwgYHRlc3RgIHJldHVybnMgYHRydWVgLiBDYWxscyBgY2FsbGJhY2tgIHdoZW5cbiAgICAgKiBzdG9wcGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIGBjYWxsYmFja2Agd2lsbCBiZSBwYXNzZWQgYW4gZXJyb3IgYW5kIGFueVxuICAgICAqIGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIGZpbmFsIGBpdGVyYXRlZWAncyBjYWxsYmFjay5cbiAgICAgKlxuICAgICAqIFRoZSBpbnZlcnNlIG9mIFt3aGlsc3Rde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy53aGlsc3R9LlxuICAgICAqXG4gICAgICogQG5hbWUgdW50aWxcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICAgICAqIEBtZXRob2RcbiAgICAgKiBAc2VlIFthc3luYy53aGlsc3Rde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy53aGlsc3R9XG4gICAgICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICAgICAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gdGVzdCAtIGFzeW5jaHJvbm91cyB0cnV0aCB0ZXN0IHRvIHBlcmZvcm0gYmVmb3JlIGVhY2hcbiAgICAgKiBleGVjdXRpb24gb2YgYGl0ZXJhdGVlYC4gSW52b2tlZCB3aXRoIChjYWxsYmFjaykuXG4gICAgICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEFuIGFzeW5jIGZ1bmN0aW9uIHdoaWNoIGlzIGNhbGxlZCBlYWNoIHRpbWVcbiAgICAgKiBgdGVzdGAgZmFpbHMuIEludm9rZWQgd2l0aCAoY2FsbGJhY2spLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciB0aGUgdGVzdFxuICAgICAqIGZ1bmN0aW9uIGhhcyBwYXNzZWQgYW5kIHJlcGVhdGVkIGV4ZWN1dGlvbiBvZiBgaXRlcmF0ZWVgIGhhcyBzdG9wcGVkLiBgY2FsbGJhY2tgXG4gICAgICogd2lsbCBiZSBwYXNzZWQgYW4gZXJyb3IgYW5kIGFueSBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBmaW5hbCBgaXRlcmF0ZWVgJ3NcbiAgICAgKiBjYWxsYmFjay4gSW52b2tlZCB3aXRoIChlcnIsIFtyZXN1bHRzXSk7XG4gICAgICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSwgaWYgYSBjYWxsYmFjayBpcyBub3QgcGFzc2VkXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IHJlc3VsdHMgPSBbXVxuICAgICAqIGxldCBmaW5pc2hlZCA9IGZhbHNlXG4gICAgICogYXN5bmMudW50aWwoZnVuY3Rpb24gdGVzdChjYikge1xuICAgICAqICAgICBjYihudWxsLCBmaW5pc2hlZClcbiAgICAgKiB9LCBmdW5jdGlvbiBpdGVyKG5leHQpIHtcbiAgICAgKiAgICAgZmV0Y2hQYWdlKHVybCwgKGVyciwgYm9keSkgPT4ge1xuICAgICAqICAgICAgICAgaWYgKGVycikgcmV0dXJuIG5leHQoZXJyKVxuICAgICAqICAgICAgICAgcmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KGJvZHkub2JqZWN0cylcbiAgICAgKiAgICAgICAgIGZpbmlzaGVkID0gISFib2R5Lm5leHRcbiAgICAgKiAgICAgICAgIG5leHQoZXJyKVxuICAgICAqICAgICB9KVxuICAgICAqIH0sIGZ1bmN0aW9uIGRvbmUgKGVycikge1xuICAgICAqICAgICAvLyBhbGwgcGFnZXMgaGF2ZSBiZWVuIGZldGNoZWRcbiAgICAgKiB9KVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVudGlsKHRlc3QsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBfdGVzdCA9IHdyYXBBc3luYyh0ZXN0KTtcbiAgICAgICAgcmV0dXJuIHdoaWxzdCQxKChjYikgPT4gX3Rlc3QoKGVyciwgdHJ1dGgpID0+IGNiIChlcnIsICF0cnV0aCkpLCBpdGVyYXRlZSwgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJ1bnMgdGhlIGB0YXNrc2AgYXJyYXkgb2YgZnVuY3Rpb25zIGluIHNlcmllcywgZWFjaCBwYXNzaW5nIHRoZWlyIHJlc3VsdHMgdG9cbiAgICAgKiB0aGUgbmV4dCBpbiB0aGUgYXJyYXkuIEhvd2V2ZXIsIGlmIGFueSBvZiB0aGUgYHRhc2tzYCBwYXNzIGFuIGVycm9yIHRvIHRoZWlyXG4gICAgICogb3duIGNhbGxiYWNrLCB0aGUgbmV4dCBmdW5jdGlvbiBpcyBub3QgZXhlY3V0ZWQsIGFuZCB0aGUgbWFpbiBgY2FsbGJhY2tgIGlzXG4gICAgICogaW1tZWRpYXRlbHkgY2FsbGVkIHdpdGggdGhlIGVycm9yLlxuICAgICAqXG4gICAgICogQG5hbWUgd2F0ZXJmYWxsXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IHRhc2tzIC0gQW4gYXJyYXkgb2YgW2FzeW5jIGZ1bmN0aW9uc117QGxpbmsgQXN5bmNGdW5jdGlvbn1cbiAgICAgKiB0byBydW4uXG4gICAgICogRWFjaCBmdW5jdGlvbiBzaG91bGQgY29tcGxldGUgd2l0aCBhbnkgbnVtYmVyIG9mIGByZXN1bHRgIHZhbHVlcy5cbiAgICAgKiBUaGUgYHJlc3VsdGAgdmFsdWVzIHdpbGwgYmUgcGFzc2VkIGFzIGFyZ3VtZW50cywgaW4gb3JkZXIsIHRvIHRoZSBuZXh0IHRhc2suXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHRvIHJ1biBvbmNlIGFsbCB0aGVcbiAgICAgKiBmdW5jdGlvbnMgaGF2ZSBjb21wbGV0ZWQuIFRoaXMgd2lsbCBiZSBwYXNzZWQgdGhlIHJlc3VsdHMgb2YgdGhlIGxhc3QgdGFzaydzXG4gICAgICogY2FsbGJhY2suIEludm9rZWQgd2l0aCAoZXJyLCBbcmVzdWx0c10pLlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UsIGlmIGEgY2FsbGJhY2sgaXMgb21pdHRlZFxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBhc3luYy53YXRlcmZhbGwoW1xuICAgICAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ29uZScsICd0d28nKTtcbiAgICAgKiAgICAgfSxcbiAgICAgKiAgICAgZnVuY3Rpb24oYXJnMSwgYXJnMiwgY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIC8vIGFyZzEgbm93IGVxdWFscyAnb25lJyBhbmQgYXJnMiBub3cgZXF1YWxzICd0d28nXG4gICAgICogICAgICAgICBjYWxsYmFjayhudWxsLCAndGhyZWUnKTtcbiAgICAgKiAgICAgfSxcbiAgICAgKiAgICAgZnVuY3Rpb24oYXJnMSwgY2FsbGJhY2spIHtcbiAgICAgKiAgICAgICAgIC8vIGFyZzEgbm93IGVxdWFscyAndGhyZWUnXG4gICAgICogICAgICAgICBjYWxsYmFjayhudWxsLCAnZG9uZScpO1xuICAgICAqICAgICB9XG4gICAgICogXSwgZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgICogICAgIC8vIHJlc3VsdCBub3cgZXF1YWxzICdkb25lJ1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gT3IsIHdpdGggbmFtZWQgZnVuY3Rpb25zOlxuICAgICAqIGFzeW5jLndhdGVyZmFsbChbXG4gICAgICogICAgIG15Rmlyc3RGdW5jdGlvbixcbiAgICAgKiAgICAgbXlTZWNvbmRGdW5jdGlvbixcbiAgICAgKiAgICAgbXlMYXN0RnVuY3Rpb24sXG4gICAgICogXSwgZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgICogICAgIC8vIHJlc3VsdCBub3cgZXF1YWxzICdkb25lJ1xuICAgICAqIH0pO1xuICAgICAqIGZ1bmN0aW9uIG15Rmlyc3RGdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAqICAgICBjYWxsYmFjayhudWxsLCAnb25lJywgJ3R3bycpO1xuICAgICAqIH1cbiAgICAgKiBmdW5jdGlvbiBteVNlY29uZEZ1bmN0aW9uKGFyZzEsIGFyZzIsIGNhbGxiYWNrKSB7XG4gICAgICogICAgIC8vIGFyZzEgbm93IGVxdWFscyAnb25lJyBhbmQgYXJnMiBub3cgZXF1YWxzICd0d28nXG4gICAgICogICAgIGNhbGxiYWNrKG51bGwsICd0aHJlZScpO1xuICAgICAqIH1cbiAgICAgKiBmdW5jdGlvbiBteUxhc3RGdW5jdGlvbihhcmcxLCBjYWxsYmFjaykge1xuICAgICAqICAgICAvLyBhcmcxIG5vdyBlcXVhbHMgJ3RocmVlJ1xuICAgICAqICAgICBjYWxsYmFjayhudWxsLCAnZG9uZScpO1xuICAgICAqIH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB3YXRlcmZhbGwgKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2spO1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodGFza3MpKSByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCB0byB3YXRlcmZhbGwgbXVzdCBiZSBhbiBhcnJheSBvZiBmdW5jdGlvbnMnKSk7XG4gICAgICAgIGlmICghdGFza3MubGVuZ3RoKSByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgdmFyIHRhc2tJbmRleCA9IDA7XG5cbiAgICAgICAgZnVuY3Rpb24gbmV4dFRhc2soYXJncykge1xuICAgICAgICAgICAgdmFyIHRhc2sgPSB3cmFwQXN5bmModGFza3NbdGFza0luZGV4KytdKTtcbiAgICAgICAgICAgIHRhc2soLi4uYXJncywgb25seU9uY2UobmV4dCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbmV4dChlcnIsIC4uLmFyZ3MpIHtcbiAgICAgICAgICAgIGlmIChlcnIgPT09IGZhbHNlKSByZXR1cm5cbiAgICAgICAgICAgIGlmIChlcnIgfHwgdGFza0luZGV4ID09PSB0YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCAuLi5hcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHRUYXNrKGFyZ3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgbmV4dFRhc2soW10pO1xuICAgIH1cblxuICAgIHZhciB3YXRlcmZhbGwkMSA9IGF3YWl0aWZ5KHdhdGVyZmFsbCk7XG5cbiAgICAvKipcbiAgICAgKiBBbiBcImFzeW5jIGZ1bmN0aW9uXCIgaW4gdGhlIGNvbnRleHQgb2YgQXN5bmMgaXMgYW4gYXN5bmNocm9ub3VzIGZ1bmN0aW9uIHdpdGhcbiAgICAgKiBhIHZhcmlhYmxlIG51bWJlciBvZiBwYXJhbWV0ZXJzLCB3aXRoIHRoZSBmaW5hbCBwYXJhbWV0ZXIgYmVpbmcgYSBjYWxsYmFjay5cbiAgICAgKiAoYGZ1bmN0aW9uIChhcmcxLCBhcmcyLCAuLi4sIGNhbGxiYWNrKSB7fWApXG4gICAgICogVGhlIGZpbmFsIGNhbGxiYWNrIGlzIG9mIHRoZSBmb3JtIGBjYWxsYmFjayhlcnIsIHJlc3VsdHMuLi4pYCwgd2hpY2ggbXVzdCBiZVxuICAgICAqIGNhbGxlZCBvbmNlIHRoZSBmdW5jdGlvbiBpcyBjb21wbGV0ZWQuICBUaGUgY2FsbGJhY2sgc2hvdWxkIGJlIGNhbGxlZCB3aXRoIGFcbiAgICAgKiBFcnJvciBhcyBpdHMgZmlyc3QgYXJndW1lbnQgdG8gc2lnbmFsIHRoYXQgYW4gZXJyb3Igb2NjdXJyZWQuXG4gICAgICogT3RoZXJ3aXNlLCBpZiBubyBlcnJvciBvY2N1cnJlZCwgaXQgc2hvdWxkIGJlIGNhbGxlZCB3aXRoIGBudWxsYCBhcyB0aGUgZmlyc3RcbiAgICAgKiBhcmd1bWVudCwgYW5kIGFueSBhZGRpdGlvbmFsIGByZXN1bHRgIGFyZ3VtZW50cyB0aGF0IG1heSBhcHBseSwgdG8gc2lnbmFsXG4gICAgICogc3VjY2Vzc2Z1bCBjb21wbGV0aW9uLlxuICAgICAqIFRoZSBjYWxsYmFjayBtdXN0IGJlIGNhbGxlZCBleGFjdGx5IG9uY2UsIGlkZWFsbHkgb24gYSBsYXRlciB0aWNrIG9mIHRoZVxuICAgICAqIEphdmFTY3JpcHQgZXZlbnQgbG9vcC5cbiAgICAgKlxuICAgICAqIFRoaXMgdHlwZSBvZiBmdW5jdGlvbiBpcyBhbHNvIHJlZmVycmVkIHRvIGFzIGEgXCJOb2RlLXN0eWxlIGFzeW5jIGZ1bmN0aW9uXCIsXG4gICAgICogb3IgYSBcImNvbnRpbnVhdGlvbiBwYXNzaW5nLXN0eWxlIGZ1bmN0aW9uXCIgKENQUykuIE1vc3Qgb2YgdGhlIG1ldGhvZHMgb2YgdGhpc1xuICAgICAqIGxpYnJhcnkgYXJlIHRoZW1zZWx2ZXMgQ1BTL05vZGUtc3R5bGUgYXN5bmMgZnVuY3Rpb25zLCBvciBmdW5jdGlvbnMgdGhhdFxuICAgICAqIHJldHVybiBDUFMvTm9kZS1zdHlsZSBhc3luYyBmdW5jdGlvbnMuXG4gICAgICpcbiAgICAgKiBXaGVyZXZlciB3ZSBhY2NlcHQgYSBOb2RlLXN0eWxlIGFzeW5jIGZ1bmN0aW9uLCB3ZSBhbHNvIGRpcmVjdGx5IGFjY2VwdCBhblxuICAgICAqIFtFUzIwMTcgYGFzeW5jYCBmdW5jdGlvbl17QGxpbmsgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvU3RhdGVtZW50cy9hc3luY19mdW5jdGlvbn0uXG4gICAgICogSW4gdGhpcyBjYXNlLCB0aGUgYGFzeW5jYCBmdW5jdGlvbiB3aWxsIG5vdCBiZSBwYXNzZWQgYSBmaW5hbCBjYWxsYmFja1xuICAgICAqIGFyZ3VtZW50LCBhbmQgYW55IHRocm93biBlcnJvciB3aWxsIGJlIHVzZWQgYXMgdGhlIGBlcnJgIGFyZ3VtZW50IG9mIHRoZVxuICAgICAqIGltcGxpY2l0IGNhbGxiYWNrLCBhbmQgdGhlIHJldHVybiB2YWx1ZSB3aWxsIGJlIHVzZWQgYXMgdGhlIGByZXN1bHRgIHZhbHVlLlxuICAgICAqIChpLmUuIGEgYHJlamVjdGVkYCBvZiB0aGUgcmV0dXJuZWQgUHJvbWlzZSBiZWNvbWVzIHRoZSBgZXJyYCBjYWxsYmFja1xuICAgICAqIGFyZ3VtZW50LCBhbmQgYSBgcmVzb2x2ZWRgIHZhbHVlIGJlY29tZXMgdGhlIGByZXN1bHRgLilcbiAgICAgKlxuICAgICAqIE5vdGUsIGR1ZSB0byBKYXZhU2NyaXB0IGxpbWl0YXRpb25zLCB3ZSBjYW4gb25seSBkZXRlY3QgbmF0aXZlIGBhc3luY2BcbiAgICAgKiBmdW5jdGlvbnMgYW5kIG5vdCB0cmFuc3BpbGllZCBpbXBsZW1lbnRhdGlvbnMuXG4gICAgICogWW91ciBlbnZpcm9ubWVudCBtdXN0IGhhdmUgYGFzeW5jYC9gYXdhaXRgIHN1cHBvcnQgZm9yIHRoaXMgdG8gd29yay5cbiAgICAgKiAoZS5nLiBOb2RlID4gdjcuNiwgb3IgYSByZWNlbnQgdmVyc2lvbiBvZiBhIG1vZGVybiBicm93c2VyKS5cbiAgICAgKiBJZiB5b3UgYXJlIHVzaW5nIGBhc3luY2AgZnVuY3Rpb25zIHRocm91Z2ggYSB0cmFuc3BpbGVyIChlLmcuIEJhYmVsKSwgeW91XG4gICAgICogbXVzdCBzdGlsbCB3cmFwIHRoZSBmdW5jdGlvbiB3aXRoIFthc3luY2lmeV17QGxpbmsgbW9kdWxlOlV0aWxzLmFzeW5jaWZ5fSxcbiAgICAgKiBiZWNhdXNlIHRoZSBgYXN5bmMgZnVuY3Rpb25gIHdpbGwgYmUgY29tcGlsZWQgdG8gYW4gb3JkaW5hcnkgZnVuY3Rpb24gdGhhdFxuICAgICAqIHJldHVybnMgYSBwcm9taXNlLlxuICAgICAqXG4gICAgICogQHR5cGVkZWYge0Z1bmN0aW9ufSBBc3luY0Z1bmN0aW9uXG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuXG4gICAgdmFyIGluZGV4ID0ge1xuICAgICAgICBhcHBseSxcbiAgICAgICAgYXBwbHlFYWNoOiBhcHBseUVhY2gkMSxcbiAgICAgICAgYXBwbHlFYWNoU2VyaWVzLFxuICAgICAgICBhc3luY2lmeSxcbiAgICAgICAgYXV0byxcbiAgICAgICAgYXV0b0luamVjdCxcbiAgICAgICAgY2FyZ28sXG4gICAgICAgIGNhcmdvUXVldWU6IGNhcmdvJDEsXG4gICAgICAgIGNvbXBvc2UsXG4gICAgICAgIGNvbmNhdDogY29uY2F0JDEsXG4gICAgICAgIGNvbmNhdExpbWl0OiBjb25jYXRMaW1pdCQxLFxuICAgICAgICBjb25jYXRTZXJpZXM6IGNvbmNhdFNlcmllcyQxLFxuICAgICAgICBjb25zdGFudCxcbiAgICAgICAgZGV0ZWN0OiBkZXRlY3QkMSxcbiAgICAgICAgZGV0ZWN0TGltaXQ6IGRldGVjdExpbWl0JDEsXG4gICAgICAgIGRldGVjdFNlcmllczogZGV0ZWN0U2VyaWVzJDEsXG4gICAgICAgIGRpcixcbiAgICAgICAgZG9VbnRpbCxcbiAgICAgICAgZG9XaGlsc3Q6IGRvV2hpbHN0JDEsXG4gICAgICAgIGVhY2gsXG4gICAgICAgIGVhY2hMaW1pdDogZWFjaExpbWl0JDIsXG4gICAgICAgIGVhY2hPZjogZWFjaE9mJDEsXG4gICAgICAgIGVhY2hPZkxpbWl0OiBlYWNoT2ZMaW1pdCQyLFxuICAgICAgICBlYWNoT2ZTZXJpZXM6IGVhY2hPZlNlcmllcyQxLFxuICAgICAgICBlYWNoU2VyaWVzOiBlYWNoU2VyaWVzJDEsXG4gICAgICAgIGVuc3VyZUFzeW5jLFxuICAgICAgICBldmVyeTogZXZlcnkkMSxcbiAgICAgICAgZXZlcnlMaW1pdDogZXZlcnlMaW1pdCQxLFxuICAgICAgICBldmVyeVNlcmllczogZXZlcnlTZXJpZXMkMSxcbiAgICAgICAgZmlsdGVyOiBmaWx0ZXIkMSxcbiAgICAgICAgZmlsdGVyTGltaXQ6IGZpbHRlckxpbWl0JDEsXG4gICAgICAgIGZpbHRlclNlcmllczogZmlsdGVyU2VyaWVzJDEsXG4gICAgICAgIGZvcmV2ZXI6IGZvcmV2ZXIkMSxcbiAgICAgICAgZ3JvdXBCeSxcbiAgICAgICAgZ3JvdXBCeUxpbWl0OiBncm91cEJ5TGltaXQkMSxcbiAgICAgICAgZ3JvdXBCeVNlcmllcyxcbiAgICAgICAgbG9nLFxuICAgICAgICBtYXA6IG1hcCQxLFxuICAgICAgICBtYXBMaW1pdDogbWFwTGltaXQkMSxcbiAgICAgICAgbWFwU2VyaWVzOiBtYXBTZXJpZXMkMSxcbiAgICAgICAgbWFwVmFsdWVzLFxuICAgICAgICBtYXBWYWx1ZXNMaW1pdDogbWFwVmFsdWVzTGltaXQkMSxcbiAgICAgICAgbWFwVmFsdWVzU2VyaWVzLFxuICAgICAgICBtZW1vaXplLFxuICAgICAgICBuZXh0VGljayxcbiAgICAgICAgcGFyYWxsZWw6IHBhcmFsbGVsJDEsXG4gICAgICAgIHBhcmFsbGVsTGltaXQsXG4gICAgICAgIHByaW9yaXR5UXVldWUsXG4gICAgICAgIHF1ZXVlOiBxdWV1ZSQxLFxuICAgICAgICByYWNlOiByYWNlJDEsXG4gICAgICAgIHJlZHVjZTogcmVkdWNlJDEsXG4gICAgICAgIHJlZHVjZVJpZ2h0LFxuICAgICAgICByZWZsZWN0LFxuICAgICAgICByZWZsZWN0QWxsLFxuICAgICAgICByZWplY3Q6IHJlamVjdCQyLFxuICAgICAgICByZWplY3RMaW1pdDogcmVqZWN0TGltaXQkMSxcbiAgICAgICAgcmVqZWN0U2VyaWVzOiByZWplY3RTZXJpZXMkMSxcbiAgICAgICAgcmV0cnksXG4gICAgICAgIHJldHJ5YWJsZSxcbiAgICAgICAgc2VxLFxuICAgICAgICBzZXJpZXMsXG4gICAgICAgIHNldEltbWVkaWF0ZTogc2V0SW1tZWRpYXRlJDEsXG4gICAgICAgIHNvbWU6IHNvbWUkMSxcbiAgICAgICAgc29tZUxpbWl0OiBzb21lTGltaXQkMSxcbiAgICAgICAgc29tZVNlcmllczogc29tZVNlcmllcyQxLFxuICAgICAgICBzb3J0Qnk6IHNvcnRCeSQxLFxuICAgICAgICB0aW1lb3V0LFxuICAgICAgICB0aW1lcyxcbiAgICAgICAgdGltZXNMaW1pdCxcbiAgICAgICAgdGltZXNTZXJpZXMsXG4gICAgICAgIHRyYW5zZm9ybSxcbiAgICAgICAgdHJ5RWFjaDogdHJ5RWFjaCQxLFxuICAgICAgICB1bm1lbW9pemUsXG4gICAgICAgIHVudGlsLFxuICAgICAgICB3YXRlcmZhbGw6IHdhdGVyZmFsbCQxLFxuICAgICAgICB3aGlsc3Q6IHdoaWxzdCQxLFxuXG4gICAgICAgIC8vIGFsaWFzZXNcbiAgICAgICAgYWxsOiBldmVyeSQxLFxuICAgICAgICBhbGxMaW1pdDogZXZlcnlMaW1pdCQxLFxuICAgICAgICBhbGxTZXJpZXM6IGV2ZXJ5U2VyaWVzJDEsXG4gICAgICAgIGFueTogc29tZSQxLFxuICAgICAgICBhbnlMaW1pdDogc29tZUxpbWl0JDEsXG4gICAgICAgIGFueVNlcmllczogc29tZVNlcmllcyQxLFxuICAgICAgICBmaW5kOiBkZXRlY3QkMSxcbiAgICAgICAgZmluZExpbWl0OiBkZXRlY3RMaW1pdCQxLFxuICAgICAgICBmaW5kU2VyaWVzOiBkZXRlY3RTZXJpZXMkMSxcbiAgICAgICAgZmxhdE1hcDogY29uY2F0JDEsXG4gICAgICAgIGZsYXRNYXBMaW1pdDogY29uY2F0TGltaXQkMSxcbiAgICAgICAgZmxhdE1hcFNlcmllczogY29uY2F0U2VyaWVzJDEsXG4gICAgICAgIGZvckVhY2g6IGVhY2gsXG4gICAgICAgIGZvckVhY2hTZXJpZXM6IGVhY2hTZXJpZXMkMSxcbiAgICAgICAgZm9yRWFjaExpbWl0OiBlYWNoTGltaXQkMixcbiAgICAgICAgZm9yRWFjaE9mOiBlYWNoT2YkMSxcbiAgICAgICAgZm9yRWFjaE9mU2VyaWVzOiBlYWNoT2ZTZXJpZXMkMSxcbiAgICAgICAgZm9yRWFjaE9mTGltaXQ6IGVhY2hPZkxpbWl0JDIsXG4gICAgICAgIGluamVjdDogcmVkdWNlJDEsXG4gICAgICAgIGZvbGRsOiByZWR1Y2UkMSxcbiAgICAgICAgZm9sZHI6IHJlZHVjZVJpZ2h0LFxuICAgICAgICBzZWxlY3Q6IGZpbHRlciQxLFxuICAgICAgICBzZWxlY3RMaW1pdDogZmlsdGVyTGltaXQkMSxcbiAgICAgICAgc2VsZWN0U2VyaWVzOiBmaWx0ZXJTZXJpZXMkMSxcbiAgICAgICAgd3JhcFN5bmM6IGFzeW5jaWZ5LFxuICAgICAgICBkdXJpbmc6IHdoaWxzdCQxLFxuICAgICAgICBkb0R1cmluZzogZG9XaGlsc3QkMVxuICAgIH07XG5cbiAgICBleHBvcnRzLmRlZmF1bHQgPSBpbmRleDtcbiAgICBleHBvcnRzLmFwcGx5ID0gYXBwbHk7XG4gICAgZXhwb3J0cy5hcHBseUVhY2ggPSBhcHBseUVhY2gkMTtcbiAgICBleHBvcnRzLmFwcGx5RWFjaFNlcmllcyA9IGFwcGx5RWFjaFNlcmllcztcbiAgICBleHBvcnRzLmFzeW5jaWZ5ID0gYXN5bmNpZnk7XG4gICAgZXhwb3J0cy5hdXRvID0gYXV0bztcbiAgICBleHBvcnRzLmF1dG9JbmplY3QgPSBhdXRvSW5qZWN0O1xuICAgIGV4cG9ydHMuY2FyZ28gPSBjYXJnbztcbiAgICBleHBvcnRzLmNhcmdvUXVldWUgPSBjYXJnbyQxO1xuICAgIGV4cG9ydHMuY29tcG9zZSA9IGNvbXBvc2U7XG4gICAgZXhwb3J0cy5jb25jYXQgPSBjb25jYXQkMTtcbiAgICBleHBvcnRzLmNvbmNhdExpbWl0ID0gY29uY2F0TGltaXQkMTtcbiAgICBleHBvcnRzLmNvbmNhdFNlcmllcyA9IGNvbmNhdFNlcmllcyQxO1xuICAgIGV4cG9ydHMuY29uc3RhbnQgPSBjb25zdGFudDtcbiAgICBleHBvcnRzLmRldGVjdCA9IGRldGVjdCQxO1xuICAgIGV4cG9ydHMuZGV0ZWN0TGltaXQgPSBkZXRlY3RMaW1pdCQxO1xuICAgIGV4cG9ydHMuZGV0ZWN0U2VyaWVzID0gZGV0ZWN0U2VyaWVzJDE7XG4gICAgZXhwb3J0cy5kaXIgPSBkaXI7XG4gICAgZXhwb3J0cy5kb1VudGlsID0gZG9VbnRpbDtcbiAgICBleHBvcnRzLmRvV2hpbHN0ID0gZG9XaGlsc3QkMTtcbiAgICBleHBvcnRzLmVhY2ggPSBlYWNoO1xuICAgIGV4cG9ydHMuZWFjaExpbWl0ID0gZWFjaExpbWl0JDI7XG4gICAgZXhwb3J0cy5lYWNoT2YgPSBlYWNoT2YkMTtcbiAgICBleHBvcnRzLmVhY2hPZkxpbWl0ID0gZWFjaE9mTGltaXQkMjtcbiAgICBleHBvcnRzLmVhY2hPZlNlcmllcyA9IGVhY2hPZlNlcmllcyQxO1xuICAgIGV4cG9ydHMuZWFjaFNlcmllcyA9IGVhY2hTZXJpZXMkMTtcbiAgICBleHBvcnRzLmVuc3VyZUFzeW5jID0gZW5zdXJlQXN5bmM7XG4gICAgZXhwb3J0cy5ldmVyeSA9IGV2ZXJ5JDE7XG4gICAgZXhwb3J0cy5ldmVyeUxpbWl0ID0gZXZlcnlMaW1pdCQxO1xuICAgIGV4cG9ydHMuZXZlcnlTZXJpZXMgPSBldmVyeVNlcmllcyQxO1xuICAgIGV4cG9ydHMuZmlsdGVyID0gZmlsdGVyJDE7XG4gICAgZXhwb3J0cy5maWx0ZXJMaW1pdCA9IGZpbHRlckxpbWl0JDE7XG4gICAgZXhwb3J0cy5maWx0ZXJTZXJpZXMgPSBmaWx0ZXJTZXJpZXMkMTtcbiAgICBleHBvcnRzLmZvcmV2ZXIgPSBmb3JldmVyJDE7XG4gICAgZXhwb3J0cy5ncm91cEJ5ID0gZ3JvdXBCeTtcbiAgICBleHBvcnRzLmdyb3VwQnlMaW1pdCA9IGdyb3VwQnlMaW1pdCQxO1xuICAgIGV4cG9ydHMuZ3JvdXBCeVNlcmllcyA9IGdyb3VwQnlTZXJpZXM7XG4gICAgZXhwb3J0cy5sb2cgPSBsb2c7XG4gICAgZXhwb3J0cy5tYXAgPSBtYXAkMTtcbiAgICBleHBvcnRzLm1hcExpbWl0ID0gbWFwTGltaXQkMTtcbiAgICBleHBvcnRzLm1hcFNlcmllcyA9IG1hcFNlcmllcyQxO1xuICAgIGV4cG9ydHMubWFwVmFsdWVzID0gbWFwVmFsdWVzO1xuICAgIGV4cG9ydHMubWFwVmFsdWVzTGltaXQgPSBtYXBWYWx1ZXNMaW1pdCQxO1xuICAgIGV4cG9ydHMubWFwVmFsdWVzU2VyaWVzID0gbWFwVmFsdWVzU2VyaWVzO1xuICAgIGV4cG9ydHMubWVtb2l6ZSA9IG1lbW9pemU7XG4gICAgZXhwb3J0cy5uZXh0VGljayA9IG5leHRUaWNrO1xuICAgIGV4cG9ydHMucGFyYWxsZWwgPSBwYXJhbGxlbCQxO1xuICAgIGV4cG9ydHMucGFyYWxsZWxMaW1pdCA9IHBhcmFsbGVsTGltaXQ7XG4gICAgZXhwb3J0cy5wcmlvcml0eVF1ZXVlID0gcHJpb3JpdHlRdWV1ZTtcbiAgICBleHBvcnRzLnF1ZXVlID0gcXVldWUkMTtcbiAgICBleHBvcnRzLnJhY2UgPSByYWNlJDE7XG4gICAgZXhwb3J0cy5yZWR1Y2UgPSByZWR1Y2UkMTtcbiAgICBleHBvcnRzLnJlZHVjZVJpZ2h0ID0gcmVkdWNlUmlnaHQ7XG4gICAgZXhwb3J0cy5yZWZsZWN0ID0gcmVmbGVjdDtcbiAgICBleHBvcnRzLnJlZmxlY3RBbGwgPSByZWZsZWN0QWxsO1xuICAgIGV4cG9ydHMucmVqZWN0ID0gcmVqZWN0JDI7XG4gICAgZXhwb3J0cy5yZWplY3RMaW1pdCA9IHJlamVjdExpbWl0JDE7XG4gICAgZXhwb3J0cy5yZWplY3RTZXJpZXMgPSByZWplY3RTZXJpZXMkMTtcbiAgICBleHBvcnRzLnJldHJ5ID0gcmV0cnk7XG4gICAgZXhwb3J0cy5yZXRyeWFibGUgPSByZXRyeWFibGU7XG4gICAgZXhwb3J0cy5zZXEgPSBzZXE7XG4gICAgZXhwb3J0cy5zZXJpZXMgPSBzZXJpZXM7XG4gICAgZXhwb3J0cy5zZXRJbW1lZGlhdGUgPSBzZXRJbW1lZGlhdGUkMTtcbiAgICBleHBvcnRzLnNvbWUgPSBzb21lJDE7XG4gICAgZXhwb3J0cy5zb21lTGltaXQgPSBzb21lTGltaXQkMTtcbiAgICBleHBvcnRzLnNvbWVTZXJpZXMgPSBzb21lU2VyaWVzJDE7XG4gICAgZXhwb3J0cy5zb3J0QnkgPSBzb3J0QnkkMTtcbiAgICBleHBvcnRzLnRpbWVvdXQgPSB0aW1lb3V0O1xuICAgIGV4cG9ydHMudGltZXMgPSB0aW1lcztcbiAgICBleHBvcnRzLnRpbWVzTGltaXQgPSB0aW1lc0xpbWl0O1xuICAgIGV4cG9ydHMudGltZXNTZXJpZXMgPSB0aW1lc1NlcmllcztcbiAgICBleHBvcnRzLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcbiAgICBleHBvcnRzLnRyeUVhY2ggPSB0cnlFYWNoJDE7XG4gICAgZXhwb3J0cy51bm1lbW9pemUgPSB1bm1lbW9pemU7XG4gICAgZXhwb3J0cy51bnRpbCA9IHVudGlsO1xuICAgIGV4cG9ydHMud2F0ZXJmYWxsID0gd2F0ZXJmYWxsJDE7XG4gICAgZXhwb3J0cy53aGlsc3QgPSB3aGlsc3QkMTtcbiAgICBleHBvcnRzLmFsbCA9IGV2ZXJ5JDE7XG4gICAgZXhwb3J0cy5hbGxMaW1pdCA9IGV2ZXJ5TGltaXQkMTtcbiAgICBleHBvcnRzLmFsbFNlcmllcyA9IGV2ZXJ5U2VyaWVzJDE7XG4gICAgZXhwb3J0cy5hbnkgPSBzb21lJDE7XG4gICAgZXhwb3J0cy5hbnlMaW1pdCA9IHNvbWVMaW1pdCQxO1xuICAgIGV4cG9ydHMuYW55U2VyaWVzID0gc29tZVNlcmllcyQxO1xuICAgIGV4cG9ydHMuZmluZCA9IGRldGVjdCQxO1xuICAgIGV4cG9ydHMuZmluZExpbWl0ID0gZGV0ZWN0TGltaXQkMTtcbiAgICBleHBvcnRzLmZpbmRTZXJpZXMgPSBkZXRlY3RTZXJpZXMkMTtcbiAgICBleHBvcnRzLmZsYXRNYXAgPSBjb25jYXQkMTtcbiAgICBleHBvcnRzLmZsYXRNYXBMaW1pdCA9IGNvbmNhdExpbWl0JDE7XG4gICAgZXhwb3J0cy5mbGF0TWFwU2VyaWVzID0gY29uY2F0U2VyaWVzJDE7XG4gICAgZXhwb3J0cy5mb3JFYWNoID0gZWFjaDtcbiAgICBleHBvcnRzLmZvckVhY2hTZXJpZXMgPSBlYWNoU2VyaWVzJDE7XG4gICAgZXhwb3J0cy5mb3JFYWNoTGltaXQgPSBlYWNoTGltaXQkMjtcbiAgICBleHBvcnRzLmZvckVhY2hPZiA9IGVhY2hPZiQxO1xuICAgIGV4cG9ydHMuZm9yRWFjaE9mU2VyaWVzID0gZWFjaE9mU2VyaWVzJDE7XG4gICAgZXhwb3J0cy5mb3JFYWNoT2ZMaW1pdCA9IGVhY2hPZkxpbWl0JDI7XG4gICAgZXhwb3J0cy5pbmplY3QgPSByZWR1Y2UkMTtcbiAgICBleHBvcnRzLmZvbGRsID0gcmVkdWNlJDE7XG4gICAgZXhwb3J0cy5mb2xkciA9IHJlZHVjZVJpZ2h0O1xuICAgIGV4cG9ydHMuc2VsZWN0ID0gZmlsdGVyJDE7XG4gICAgZXhwb3J0cy5zZWxlY3RMaW1pdCA9IGZpbHRlckxpbWl0JDE7XG4gICAgZXhwb3J0cy5zZWxlY3RTZXJpZXMgPSBmaWx0ZXJTZXJpZXMkMTtcbiAgICBleHBvcnRzLndyYXBTeW5jID0gYXN5bmNpZnk7XG4gICAgZXhwb3J0cy5kdXJpbmcgPSB3aGlsc3QkMTtcbiAgICBleHBvcnRzLmRvRHVyaW5nID0gZG9XaGlsc3QkMTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKSk7XG4iLCJtb2R1bGUuZXhwb3J0cz1bXG4gIFwiVGhpcyBpcyB3aGF0IEkgaGVhcmQuXCIsXG4gIFwiQXQgb25lIHRpbWUgdGhlIEJ1ZGRoYSB3YXMgc3RheWluZyBpbiB0aGUgSmV0YSBHcm92ZSwgbmVhciB0aGUgY2l0eSBvZiBTcmF2YXN0aS5cIixcbiAgXCJXaXRoIGhpbSB0aGVyZSB3YXMgYSBjb21tdW5pdHkgb2YgMSwyNTAgdmVuZXJhYmxlIG1vbmtzIGFuZCBkZXZvdGVkIGRpc2NpcGxlcy5cIixcbiAgXCJPbmUgZGF5IGJlZm9yZSBkYXduLCB0aGUgQnVkZGhhIGNsb3RoZWQgaGltc2VsZiwgYW5kIGFsb25nIHdpdGggaGlzIGRpc2NpcGxlcyB0b29rIHVwIGhpcyBhbG1zIGJvd2wgYW5kIGVudGVyZWQgdGhlIGNpdHkgdG8gYmVnIGZvciBmb29kIGRvb3IgdG8gZG9vciwgYXMgd2FzIGhpcyBjdXN0b20uXCIsXG4gIFwiQWZ0ZXIgaGUgaGFkIHJldHVybmVkIGFuZCBlYXRlbiwgaGUgcHV0IGF3YXkgaGlzIGJvd2wgYW5kIGNsb2FrLCBiYXRoZWQgaGlzIGZlZXQsIGFuZCB0aGVuIHNhdCB3aXRoIGhpcyBsZWdzIGNyb3NzZWQgYW5kIGJvZHkgdXByaWdodCB1cG9uIHRoZSBzZWF0IGFycmFuZ2VkIGZvciBoaW0uXCIsXG4gIFwiSGUgYmVnYW4gbWluZGZ1bGx5IGZpeGluZyBoaXMgYXR0ZW50aW9uIGluIGZyb250IG9mIGhpbXNlbGYsIHdoaWxlIG1hbnkgbW9ua3MgYXBwcm9hY2hlZCB0aGUgQnVkZGhhLCBhbmQgc2hvd2luZyBncmVhdCByZXZlcmVuY2UsIHNlYXRlZCB0aGVtc2VsdmVzIGFyb3VuZCBoaW0uXCIsXG4gIFwiQWZ0ZXIgYSB0aW1lIGEgbW9zdCB2ZW5lcmFibGUgbW9uayBuYW1lZCBTdWJodXRpLCB3aG8gd2FzIHNpdHRpbmcgaW4gdGhlIGNvbmdyZWdhdGlvbiwgcm9zZSBmcm9tIGhpcyBzZWF0LlwiLFxuICBcIkhlIHVuY292ZXJlZCBoaXMgcmlnaHQgc2hvdWxkZXIsIHBsYWNlZCBoaXMgcmlnaHQga25lZSBvbiB0aGUgZ3JvdW5kLCBhbmQgYXMgaGUgam9pbmVkIGhpcyBwYWxtcyB0b2dldGhlciBoZSByZXNwZWN0ZnVsbHkgYm93ZWQgYW5kIHRoZW4gYWRkcmVzc2VkIHRoZSBCdWRkaGE6XCIsXG4gIFwi4oCcTW9zdCBIb25vcmVkIE9uZSwgSXQgaXMgdHJ1bHkgbWFqZXN0aWMgaG93IG11Y2gga25vd2xlZGdlIGFuZCB3aXNkb20geW91ciBtb25rcyBhbmQgZGlzY2lwbGVzIGhhdmUgYmVlbiBnaXZlbiB0aHJvdWdoIHlvdXIgbW9zdCBpbnNwaXJlZCB0ZWFjaGluZ3MhIEl0IGlzIHJlbWFya2FibGUgdGhhdCB5b3UgbG9vayBhZnRlciBvdXIgd2VsZmFyZSBzbyBzZWxmbGVzc2x5IGFuZCBzbyBjb21wbGV0ZWx5LuKAnVwiLFxuICBcIuKAnE1vc3QgSG9ub3JlZCBPbmUsIEkgaGF2ZSBhIHF1ZXN0aW9uIHRvIGFzayB5b3UuIElmIHNvbnMgYW5kIGRhdWdodGVycyBvZiBnb29kIGZhbWlsaWVzIHdhbnQgdG8gZGV2ZWxvcCB0aGUgaGlnaGVzdCwgbW9zdCBmdWxmaWxsZWQgYW5kIGF3YWtlbmVkIG1pbmQsIGlmIHRoZXkgd2lzaCB0byBhdHRhaW4gdGhlIEhpZ2hlc3QgUGVyZmVjdCBXaXNkb20sIHdoYXQgc2hvdWxkIHRoZXkgZG8gdG8gaGVscCBxdWlldCB0aGVpciBkcmlmdGluZyBtaW5kcyBhbmQgaGVscCBzdWJkdWUgdGhlaXIgY3JhdmluZyB0aG91Z2h0cz/igJ1cIixcbiAgXCJUaGUgQnVkZGhhIHRoZW4gcmVwbGllZDpcIixcbiAgXCLigJxTbyBpdCBpcyBhcyB5b3Ugc2F5LCBTdWJodXRpLiBNb25rcyBhbmQgZGlzY2lwbGVzIGhhdmUgYmVlbiBmYXZvcmVkIHdpdGggdGhlIGhpZ2hlc3QgZmF2b3IgYnkgdGhlIEJ1ZGRoYSwgdGhlIG1vbmtzIGFuZCBkaXNjaXBsZXMgaGF2ZSBiZWVuIGluc3RydWN0ZWQgd2l0aCB0aGUgaGlnaGVzdCBpbnN0cnVjdGlvbiBieSB0aGUgQnVkZGhhLiBUaGUgQnVkZGhhIGlzIGNvbnN0YW50bHkgbWluZGZ1bCBvZiB0aGUgd2VsZmFyZSBvZiBoaXMgZm9sbG93ZXJzLiBMaXN0ZW4gY2FyZWZ1bGx5IHdpdGggeW91ciBmdWxsIGF0dGVudGlvbiwgYW5kIEkgd2lsbCBzcGVhayB0byB5b3VyIHF1ZXN0aW9uLuKAnVwiLFxuICBcIuKAnElmIHNvbnMgYW5kIGRhdWdodGVycyBvZiBnb29kIGZhbWlsaWVzIHdhbnQgdG8gZGV2ZWxvcCB0aGUgaGlnaGVzdCwgbW9zdCBmdWxmaWxsZWQgYW5kIGF3YWtlbmVkIG1pbmQsIGlmIHRoZXkgd2lzaCB0byBhdHRhaW4gdGhlIEhpZ2hlc3QgUGVyZmVjdCBXaXNkb20gYW5kIHF1aWV0IHRoZWlyIGRyaWZ0aW5nIG1pbmRzIHdoaWxlIHN1YmR1aW5nIHRoZWlyIGNyYXZpbmcgdGhvdWdodHMsIHRoZW4gdGhleSBzaG91bGQgZm9sbG93IHdoYXQgSSBhbSBhYm91dCB0byBzYXkgdG8geW91LiBUaG9zZSB3aG8gZm9sbG93IHdoYXQgSSBhbSBhYm91dCB0byBzYXkgaGVyZSB3aWxsIGJlIGFibGUgdG8gc3ViZHVlIHRoZWlyIGRpc2NyaW1pbmF0aXZlIHRob3VnaHRzIGFuZCBjcmF2aW5nIGRlc2lyZXMuIEl0IGlzIHBvc3NpYmxlIHRvIGF0dGFpbiBwZXJmZWN0IHRyYW5xdWlsaXR5IGFuZCBjbGFyaXR5IG9mIG1pbmQgYnkgYWJzb3JiaW5nIGFuZCBkd2VsbGluZyBvbiB0aGUgdGVhY2hpbmdzIEkgYW0gYWJvdXQgdG8gZ2l2ZS7igJ1cIixcbiAgXCJUaGVuIHRoZSBCdWRkaGEgYWRkcmVzc2VkIHRoZSBhc3NlbWJseS5cIixcbiAgXCLigJxBbGwgbGl2aW5nIGJlaW5ncywgd2hldGhlciBib3JuIGZyb20gZWdncywgZnJvbSB0aGUgd29tYiwgZnJvbSBtb2lzdHVyZSwgb3Igc3BvbnRhbmVvdXNseTsgd2hldGhlciB0aGV5IGhhdmUgZm9ybSBvciBkbyBub3QgaGF2ZSBmb3JtOyB3aGV0aGVyIHRoZXkgYXJlIGF3YXJlIG9yIHVuYXdhcmUsIHdoZXRoZXIgdGhleSBhcmUgbm90IGF3YXJlIG9yIG5vdCB1bmF3YXJlLCBhbGwgbGl2aW5nIGJlaW5ncyB3aWxsIGV2ZW50dWFsbHkgYmUgbGVkIGJ5IG1lIHRvIHRoZSBmaW5hbCBOaXJ2YW5hLCB0aGUgZmluYWwgZW5kaW5nIG9mIHRoZSBjeWNsZSBvZiBiaXJ0aCBhbmQgZGVhdGguIEFuZCB3aGVuIHRoaXMgdW5mYXRob21hYmxlLCBpbmZpbml0ZSBudW1iZXIgb2YgbGl2aW5nIGJlaW5ncyBoYXZlIGFsbCBiZWVuIGxpYmVyYXRlZCwgaW4gdHJ1dGggbm90IGV2ZW4gYSBzaW5nbGUgYmVpbmcgaGFzIGFjdHVhbGx5IGJlZW4gbGliZXJhdGVkLuKAnVwiLFxuICBcIuKAnFdoeSBTdWJodXRpPyBCZWNhdXNlIGlmIGEgZGlzY2lwbGUgc3RpbGwgY2xpbmdzIHRvIHRoZSBhcmJpdHJhcnkgaWxsdXNpb25zIG9mIGZvcm0gb3IgcGhlbm9tZW5hIHN1Y2ggYXMgYW4gZWdvLCBhIHBlcnNvbmFsaXR5LCBhIHNlbGYsIGEgc2VwYXJhdGUgcGVyc29uLCBvciBhIHVuaXZlcnNhbCBzZWxmIGV4aXN0aW5nIGV0ZXJuYWxseSwgdGhlbiB0aGF0IHBlcnNvbiBpcyBub3QgYW4gYXV0aGVudGljIGRpc2NpcGxlLuKAnVwiLFxuICBcIuKAnEZ1cnRoZXJtb3JlLCBTdWJodXRpLCBpbiB0aGUgcHJhY3RpY2Ugb2YgY29tcGFzc2lvbiBhbmQgY2hhcml0eSBhIGRpc2NpcGxlIHNob3VsZCBiZSBkZXRhY2hlZC4gVGhhdCBpcyB0byBzYXksIGhlIHNob3VsZCBwcmFjdGljZSBjb21wYXNzaW9uIGFuZCBjaGFyaXR5IHdpdGhvdXQgcmVnYXJkIHRvIGFwcGVhcmFuY2VzLCB3aXRob3V0IHJlZ2FyZCB0byBmb3JtLCB3aXRob3V0IHJlZ2FyZCB0byBzb3VuZCwgc21lbGwsIHRhc3RlLCB0b3VjaCwgb3IgYW55IHF1YWxpdHkgb2YgYW55IGtpbmQuIFN1Ymh1dGksIHRoaXMgaXMgaG93IHRoZSBkaXNjaXBsZSBzaG91bGQgcHJhY3RpY2UgY29tcGFzc2lvbiBhbmQgY2hhcml0eS4gV2h5PyBCZWNhdXNlIHByYWN0aWNpbmcgY29tcGFzc2lvbiBhbmQgY2hhcml0eSB3aXRob3V0IGF0dGFjaG1lbnQgaXMgdGhlIHdheSB0byByZWFjaGluZyB0aGUgSGlnaGVzdCBQZXJmZWN0IFdpc2RvbSwgaXQgaXMgdGhlIHdheSB0byBiZWNvbWluZyBhIGxpdmluZyBCdWRkaGEu4oCdXCIsXG4gIFwi4oCcU3ViaHV0aSwgZG8geW91IHRoaW5rIHRoYXQgeW91IGNhbiBtZWFzdXJlIGFsbCBvZiB0aGUgc3BhY2UgaW4gdGhlIEVhc3Rlcm4gSGVhdmVucz/igJ1cIixcbiAgXCLigJxObywgTW9zdCBIb25vcmVkIE9uZS4gT25lIGNhbm5vdCBwb3NzaWJseSBtZWFzdXJlIGFsbCBvZiB0aGUgc3BhY2UgaW4gdGhlIEVhc3Rlcm4gSGVhdmVucy7igJ1cIixcbiAgXCLigJxTdWJodXRpLCBjYW4gc3BhY2UgaW4gYWxsIHRoZSBXZXN0ZXJuLCBTb3V0aGVybiwgYW5kIE5vcnRoZXJuIEhlYXZlbnMsIGJvdGggYWJvdmUgYW5kIGJlbG93LCBiZSBtZWFzdXJlZD/igJ1cIixcbiAgXCLigJxObywgTW9zdCBIb25vcmVkIE9uZS4gT25lIGNhbm5vdCBwb3NzaWJseSBtZWFzdXJlIGFsbCB0aGUgc3BhY2UgaW4gdGhlIFdlc3Rlcm4sIFNvdXRoZXJuLCBhbmQgTm9ydGhlcm4gSGVhdmVucy7igJ1cIixcbiAgXCLigJxXZWxsLCBTdWJodXRpLCB0aGUgc2FtZSBpcyB0cnVlIG9mIHRoZSBtZXJpdCBvZiB0aGUgZGlzY2lwbGUgd2hvIHByYWN0aWNlcyBjb21wYXNzaW9uIGFuZCBjaGFyaXR5IHdpdGhvdXQgYW55IGF0dGFjaG1lbnQgdG8gYXBwZWFyYW5jZXMsIHdpdGhvdXQgY2hlcmlzaGluZyBhbnkgaWRlYSBvZiBmb3JtLiBJdCBpcyBpbXBvc3NpYmxlIHRvIG1lYXN1cmUgdGhlIG1lcml0IHRoZXkgd2lsbCBhY2NydWUuIFN1Ymh1dGksIG15IGRpc2NpcGxlcyBzaG91bGQgbGV0IHRoZWlyIG1pbmRzIGFic29yYiBhbmQgZHdlbGwgaW4gdGhlIHRlYWNoaW5ncyBJIGhhdmUganVzdCBnaXZlbi7igJ1cIixcbiAgXCLigJxTdWJodXRpLCB3aGF0IGRvIHlvdSB0aGluaz8gQ2FuIHRoZSBCdWRkaGEgYmUgcmVjb2duaXplZCBieSBtZWFucyBvZiBoaXMgYm9kaWx5IGZvcm0/4oCdXCIsXG4gIFwi4oCcTm8sIE1vc3QgSG9ub3JlZCBPbmUsIHRoZSBCdWRkaGEgY2Fubm90IGJlIHJlY29nbml6ZWQgYnkgbWVhbnMgb2YgaGlzIGJvZGlseSBmb3JtLiBXaHk/IEJlY2F1c2Ugd2hlbiB0aGUgQnVkZGhhIHNwZWFrcyBvZiBib2RpbHkgZm9ybSwgaXQgaXMgbm90IGEgcmVhbCBmb3JtLCBidXQgb25seSBhbiBpbGx1c2lvbi7igJ1cIixcbiAgXCJUaGUgQnVkZGhhIHRoZW4gc3Bva2UgdG8gU3ViaHV0aTog4oCcQWxsIHRoYXQgaGFzIGEgZm9ybSBpcyBpbGx1c2l2ZSBhbmQgdW5yZWFsLiBXaGVuIHlvdSBzZWUgdGhhdCBhbGwgZm9ybXMgYXJlIGlsbHVzaXZlIGFuZCB1bnJlYWwsIHRoZW4geW91IHdpbGwgYmVnaW4gdG8gcGVyY2VpdmUgeW91ciB0cnVlIEJ1ZGRoYSBuYXR1cmUu4oCdXCIsXG4gIFwiU3ViaHV0aSByZXNwZWN0ZnVsbHkgYXNrZWQgdGhlIGxvcmQgQnVkZGhhLCDigJxNb3N0IEhvbm9yZWQgT25lISBJbiB0aGUgZnV0dXJlLCBpZiBhIHBlcnNvbiBoZWFycyB0aGlzIHRlYWNoaW5nLCBldmVuIGlmIGl0IGlzIG9ubHkgYSBwaHJhc2Ugb3Igc2VudGVuY2UsIGlzIGl0IHBvc3NpYmxlIGZvciB0aGF0IHBlcnNvbiB0byBoYXZlIGEgdHJ1ZSBmYWl0aCBhbmQga25vd2xlZGdlIG9mIEVubGlnaHRlbm1lbnQgYXdha2VuIGluIHRoZWlyIG1pbmQ/4oCdXCIsXG4gIFwi4oCcV2l0aG91dCBhIGRvdWJ0LCBTdWJodXRpLiBFdmVuIDUwMCB5ZWFycyBhZnRlciB0aGUgRW5saWdodGVubWVudCBvZiB0aGlzIEJ1ZGRoYSB0aGVyZSB3aWxsIGJlIHNvbWUgd2hvIGFyZSB2aXJ0dW91cyBhbmQgd2lzZSwgYW5kIHdoaWxlIHByYWN0aWNpbmcgY29tcGFzc2lvbiBhbmQgY2hhcml0eSwgd2lsbCBiZWxpZXZlIGluIHRoZSB3b3JkcyBhbmQgcGhyYXNlcyBvZiB0aGlzIFN1dHJhIGFuZCB3aWxsIGF3YWtlbiB0aGVpciBtaW5kcyBwdXJlbHkuIEFmdGVyIHRoZXkgY29tZSB0byBoZWFyIHRoZXNlIHRlYWNoaW5ncywgdGhleSB3aWxsIGJlIGluc3BpcmVkIHdpdGggYmVsaWVmLiBUaGlzIGlzIGJlY2F1c2Ugd2hlbiBzb21lIHBlb3BsZSBoZWFyIHRoZXNlIHdvcmRzLCB0aGV5IHdpbGwgaGF2ZSB1bmRlcnN0b29kIGludHVpdGl2ZWx5IHRoYXQgdGhlc2Ugd29yZHMgYXJlIHRoZSB0cnV0aC7igJ1cIixcbiAgXCLigJxCdXQgeW91IG11c3QgYWxzbyByZW1lbWJlciwgU3ViaHV0aSwgdGhhdCBzdWNoIHBlcnNvbnMgaGF2ZSBsb25nIGFnbyBwbGFudGVkIHRoZSBzZWVkcyBvZiBnb29kbmVzcyBhbmQgbWVyaXQgdGhhdCBsZWFkIHRvIHRoaXMgcmVhbGl6YXRpb24uIFRoZXkgaGF2ZSBwbGFudGVkIHRoZSBzZWVkcyBvZiBnb29kIGRlZWRzIGFuZCBjaGFyaXR5IG5vdCBzaW1wbHkgYmVmb3JlIG9uZSBCdWRkaGlzdCB0ZW1wbGUsIG9yIHR3byB0ZW1wbGVzLCBvciBmaXZlLCBidXQgYmVmb3JlIGh1bmRyZWRzIG9mIHRob3VzYW5kcyBvZiBCdWRkaGFzIGFuZCB0ZW1wbGVzLiBTbyB3aGVuIGEgcGVyc29uIHdobyBoZWFycyB0aGUgd29yZHMgYW5kIHBocmFzZXMgb2YgdGhpcyBTdXRyYSBpcyByZWFkeSBmb3IgaXQgdG8gaGFwcGVuLCBhIHB1cmUgZmFpdGggYW5kIGNsYXJpdHkgY2FuIGF3YWtlbiB3aXRoaW4gdGhlaXIgbWluZHMu4oCdXCIsXG4gIFwi4oCcU3ViaHV0aSwgYW55IHBlcnNvbiB3aG8gYXdha2VucyBmYWl0aCB1cG9uIGhlYXJpbmcgdGhlIHdvcmRzIG9yIHBocmFzZXMgb2YgdGhpcyBTdXRyYSB3aWxsIGFjY3VtdWxhdGUgY291bnRsZXNzIGJsZXNzaW5ncyBhbmQgbWVyaXQu4oCdXCIsXG4gIFwi4oCcSG93IGRvIEkga25vdyB0aGlzPyBCZWNhdXNlIHRoaXMgcGVyc29uIG11c3QgaGF2ZSBkaXNjYXJkZWQgYWxsIGFyYml0cmFyeSBub3Rpb25zIG9mIHRoZSBleGlzdGVuY2Ugb2YgYSBwZXJzb25hbCBzZWxmLCBvZiBvdGhlciBwZW9wbGUsIG9yIG9mIGEgdW5pdmVyc2FsIHNlbGYuIE90aGVyd2lzZSB0aGVpciBtaW5kcyB3b3VsZCBzdGlsbCBncmFzcCBhZnRlciBzdWNoIHJlbGF0aXZlIGNvbmNlcHRpb25zLiBGdXJ0aGVybW9yZSwgdGhlc2UgcGVvcGxlIG11c3QgaGF2ZSBhbHJlYWR5IGRpc2NhcmRlZCBhbGwgYXJiaXRyYXJ5IG5vdGlvbnMgb2YgdGhlIG5vbi1leGlzdGVuY2Ugb2YgYSBwZXJzb25hbCBzZWxmLCBvdGhlciBwZW9wbGUsIG9yIGEgdW5pdmVyc2FsIHNlbGYuIE90aGVyd2lzZSwgdGhlaXIgbWluZHMgd291bGQgc3RpbGwgYmUgZ3Jhc3BpbmcgYXQgc3VjaCBub3Rpb25zLiBUaGVyZWZvcmUgYW55b25lIHdobyBzZWVrcyB0b3RhbCBFbmxpZ2h0ZW5tZW50IHNob3VsZCBkaXNjYXJkIG5vdCBvbmx5IGFsbCBjb25jZXB0aW9ucyBvZiB0aGVpciBvd24gc2VsZmhvb2QsIG9mIG90aGVyIHNlbHZlcywgb3Igb2YgYSB1bml2ZXJzYWwgc2VsZiwgYnV0IHRoZXkgc2hvdWxkIGFsc28gZGlzY2FyZCBhbGwgbm90aW9ucyBvZiB0aGUgbm9uLWV4aXN0ZW5jZSBvZiBzdWNoIGNvbmNlcHRzLuKAnVwiLFxuICBcIuKAnFdoZW4gdGhlIEJ1ZGRoYSBleHBsYWlucyB0aGVzZSB0aGluZ3MgdXNpbmcgc3VjaCBjb25jZXB0cyBhbmQgaWRlYXMsIHBlb3BsZSBzaG91bGQgcmVtZW1iZXIgdGhlIHVucmVhbGl0eSBvZiBhbGwgc3VjaCBjb25jZXB0cyBhbmQgaWRlYXMuIFRoZXkgc2hvdWxkIHJlY2FsbCB0aGF0IGluIHRlYWNoaW5nIHNwaXJpdHVhbCB0cnV0aHMgdGhlIEJ1ZGRoYSBhbHdheXMgdXNlcyB0aGVzZSBjb25jZXB0cyBhbmQgaWRlYXMgaW4gdGhlIHdheSB0aGF0IGEgcmFmdCBpcyB1c2VkIHRvIGNyb3NzIGEgcml2ZXIuIE9uY2UgdGhlIHJpdmVyIGhhcyBiZWVuIGNyb3NzZWQgb3ZlciwgdGhlIHJhZnQgaXMgb2Ygbm8gbW9yZSB1c2UsIGFuZCBzaG91bGQgYmUgZGlzY2FyZGVkLiBUaGVzZSBhcmJpdHJhcnkgY29uY2VwdHMgYW5kIGlkZWFzIGFib3V0IHNwaXJpdHVhbCB0aGluZ3MgbmVlZCB0byBiZSBleHBsYWluZWQgdG8gdXMgYXMgd2Ugc2VlayB0byBhdHRhaW4gRW5saWdodGVubWVudC4gSG93ZXZlciwgdWx0aW1hdGVseSB0aGVzZSBhcmJpdHJhcnkgY29uY2VwdGlvbnMgY2FuIGJlIGRpc2NhcmRlZC4gVGhpbmsgU3ViaHV0aSwgaXNu4oCZdCBpdCBldmVuIG1vcmUgb2J2aW91cyB0aGF0IHdlIHNob3VsZCBhbHNvIGdpdmUgdXAgb3VyIGNvbmNlcHRpb25zIG9mIG5vbi1leGlzdGVudCB0aGluZ3M/4oCdXCIsXG4gIFwiVGhlbiBCdWRkaGEgYXNrZWQgU3ViaHV0aSwg4oCcV2hhdCBkbyB5b3UgdGhpbmssIFN1Ymh1dGksIGhhcyB0aGUgQnVkZGhhIGFycml2ZWQgYXQgdGhlIGhpZ2hlc3QsIG1vc3QgZnVsZmlsbGVkLCBtb3N0IGF3YWtlbmVkIGFuZCBlbmxpZ2h0ZW5lZCBtaW5kPyBEb2VzIHRoZSBCdWRkaGEgdGVhY2ggYW55IHRlYWNoaW5nP+KAnVwiLFxuICBcIlN1Ymh1dGkgcmVwbGllZCwg4oCcQXMgZmFyIGFzIEkgaGF2ZSB1bmRlcnN0b29kIHRoZSBsb3JkIEJ1ZGRoYeKAmXMgdGVhY2hpbmdzLCB0aGVyZSBpcyBubyBpbmRlcGVuZGVudGx5IGV4aXN0aW5nIG9iamVjdCBvZiBtaW5kIGNhbGxlZCB0aGUgaGlnaGVzdCwgbW9zdCBmdWxmaWxsZWQsIGF3YWtlbmVkIG9yIGVubGlnaHRlbmVkIG1pbmQuIE5vciBpcyB0aGVyZSBhbnkgaW5kZXBlbmRlbnRseSBleGlzdGluZyB0ZWFjaGluZyB0aGF0IHRoZSBCdWRkaGEgdGVhY2hlcy4gV2h5PyBCZWNhdXNlIHRoZSB0ZWFjaGluZ3MgdGhhdCB0aGUgQnVkZGhhIGhhcyByZWFsaXplZCBhbmQgc3Bva2VuIG9mIGNhbm5vdCBiZSBjb25jZWl2ZWQgb2YgYXMgc2VwYXJhdGUsIGluZGVwZW5kZW50IHRoaW5ncyBhbmQgdGhlcmVmb3JlIGNhbm5vdCBiZSBkZXNjcmliZWQuIFRoZSB0cnV0aCBpbiB0aGVtIGlzIHVuY29udGFpbmFibGUgYW5kIGluZXhwcmVzc2libGUuIEl0IG5laXRoZXIgaXMsIG5vciBpcyBpdCBub3QuIFdoYXQgZG9lcyB0aGlzIG1lYW4/IFdoYXQgdGhpcyBtZWFucyBpcyB0aGF0IEJ1ZGRoYXMgYW5kIGRpc2NpcGxlcyBhcmUgbm90IGVubGlnaHRlbmVkIGJ5IGEgc2V0IG1ldGhvZCBvZiB0ZWFjaGluZ3MsIGJ1dCBieSBhbiBpbnRlcm5hbGx5IGludHVpdGl2ZSBwcm9jZXNzIHdoaWNoIGlzIHNwb250YW5lb3VzIGFuZCBpcyBwYXJ0IG9mIHRoZWlyIG93biBpbm5lciBuYXR1cmUu4oCdXCIsXG4gIFwi4oCcTGV0IG1lIGFzayB5b3UgU3ViaHV0aT8gSWYgYSBwZXJzb24gZmlsbGVkIG92ZXIgdGVuIHRob3VzYW5kIGdhbGF4aWVzIHdpdGggdGhlIHNldmVuIHRyZWFzdXJlcyBmb3IgdGhlIHB1cnBvc2Ugb2YgY29tcGFzc2lvbiwgY2hhcml0eSwgYW5kIGdpdmluZyBhbG1zLCB3b3VsZCB0aGlzIHBlcnNvbiBub3QgZ2FpbiBncmVhdCBtZXJpdCBhbmQgc3ByZWFkIG11Y2ggaGFwcGluZXNzP+KAnVwiLFxuICBcIuKAnFllcywgTW9zdCBIb25vcmVkIE9uZS4gVGhpcyBwZXJzb24gd291bGQgZ2FpbiBncmVhdCBtZXJpdCBhbmQgc3ByZWFkIG11Y2ggaGFwcGluZXNzLCBldmVuIHRob3VnaCwgaW4gdHJ1dGgsIHRoaXMgcGVyc29uIGRvZXMgbm90IGhhdmUgYSBzZXBhcmF0ZSBleGlzdGVuY2UgdG8gd2hpY2ggbWVyaXQgY291bGQgYWNjcnVlLiBXaHk/IEJlY2F1c2UgdGhpcyBwZXJzb27igJlzIG1lcml0IGlzIGNoYXJhY3Rlcml6ZWQgd2l0aCB0aGUgcXVhbGl0eSBvZiBub3QgYmVpbmcgbWVyaXQu4oCdXCIsXG4gIFwiVGhlIEJ1ZGRoYSBjb250aW51ZWQsIOKAnFRoZW4gc3VwcG9zZSBhbm90aGVyIHBlcnNvbiB1bmRlcnN0b29kIG9ubHkgZm91ciBsaW5lcyBvZiB0aGlzIFN1dHJhLCBidXQgbmV2ZXJ0aGVsZXNzIHRvb2sgaXQgdXBvbiB0aGVtc2VsdmVzIHRvIGV4cGxhaW4gdGhlc2UgbGluZXMgdG8gc29tZW9uZSBlbHNlLiBUaGlzIHBlcnNvbuKAmXMgbWVyaXQgd291bGQgYmUgZXZlbiBncmVhdGVyIHRoYW4gdGhlIG90aGVyIHBlcnNvbuKAmXMuIFdoeT8gQmVjYXVzZSBhbGwgQnVkZGhhcyBhbmQgYWxsIHRoZSB0ZWFjaGluZ3MgYW5kIHZhbHVlcyBvZiB0aGUgaGlnaGVzdCwgbW9zdCBmdWxmaWxsZWQsIG1vc3QgYXdha2VuZWQgbWluZHMgYXJpc2UgZnJvbSB0aGUgdGVhY2hpbmdzIGluIHRoaXMgU3V0cmEuIEFuZCB5ZXQsIGV2ZW4gYXMgSSBzcGVhaywgU3ViaHV0aSwgSSBtdXN0IHRha2UgYmFjayBteSB3b3JkcyBhcyBzb29uIGFzIHRoZXkgYXJlIHV0dGVyZWQsIGZvciB0aGVyZSBhcmUgbm8gQnVkZGhhcyBhbmQgdGhlcmUgYXJlIG5vIHRlYWNoaW5ncy7igJ1cIixcbiAgXCJCdWRkaGEgdGhlbiBhc2tlZCwg4oCcV2hhdCBkbyB5b3UgdGhpbmssIFN1Ymh1dGksIGRvZXMgb25lIHdobyBoYXMgZW50ZXJlZCB0aGUgc3RyZWFtIHdoaWNoIGZsb3dzIHRvIEVubGlnaHRlbm1lbnQsIHNheSDigJhJIGhhdmUgZW50ZXJlZCB0aGUgc3RyZWFt4oCZP+KAnVwiLFxuICBcIuKAnE5vLCBCdWRkaGHigJ0sIFN1Ymh1dGkgcmVwbGllZC4g4oCcQSB0cnVlIGRpc2NpcGxlIGVudGVyaW5nIHRoZSBzdHJlYW0gd291bGQgbm90IHRoaW5rIG9mIHRoZW1zZWx2ZXMgYXMgYSBzZXBhcmF0ZSBwZXJzb24gdGhhdCBjb3VsZCBiZSBlbnRlcmluZyBhbnl0aGluZy4gT25seSB0aGF0IGRpc2NpcGxlIHdobyBkb2VzIG5vdCBkaWZmZXJlbnRpYXRlIHRoZW1zZWx2ZXMgZnJvbSBvdGhlcnMsIHdobyBoYXMgbm8gcmVnYXJkIGZvciBuYW1lLCBzaGFwZSwgc291bmQsIG9kb3IsIHRhc3RlLCB0b3VjaCBvciBmb3IgYW55IHF1YWxpdHkgY2FuIHRydWx5IGJlIGNhbGxlZCBhIGRpc2NpcGxlIHdobyBoYXMgZW50ZXJlZCB0aGUgc3RyZWFtLuKAnVwiLFxuICBcIkJ1ZGRoYSBjb250aW51ZWQsIOKAnERvZXMgYSBkaXNjaXBsZSB3aG8gaXMgc3ViamVjdCB0byBvbmx5IG9uZSBtb3JlIHJlYmlydGggc2F5IHRvIGhpbXNlbGYsIOKAmEkgYW0gZW50aXRsZWQgdG8gdGhlIGhvbm9ycyBhbmQgcmV3YXJkcyBvZiBhIE9uY2UtdG8tYmUtcmVib3JuLuKAmT/igJ1cIixcbiAgXCLigJxObywgTG9yZC4g4oCYT25jZS10by1iZS1yZWJvcm7igJkgaXMgb25seSBhIG5hbWUuIFRoZXJlIGlzIG5vIHBhc3NpbmcgYXdheSwgb3IgY29taW5nIGludG8sIGV4aXN0ZW5jZS4gT25seSBvbmUgd2hvIHJlYWxpemVzIHRoaXMgY2FuIHJlYWxseSBiZSBjYWxsZWQgYSBkaXNjaXBsZS7igJ1cIixcbiAgXCLigJxTdWJodXRpLCBkb2VzIGEgdmVuZXJhYmxlIE9uZSB3aG8gd2lsbCBuZXZlciBtb3JlIGJlIHJlYm9ybiBhcyBhIG1vcnRhbCBzYXkgdG8gaGltc2VsZiwg4oCYSSBhbSBlbnRpdGxlZCB0byB0aGUgaG9ub3IgYW5kIHJld2FyZHMgb2YgYSBOb24tcmV0dXJuZXIu4oCZP+KAnVwiLFxuICBcIuKAnE5vLCBQZXJmZWN0bHkgRW5saWdodGVuZWQgT25lLiBBIOKAmE5vbi1yZXR1cm5lcuKAmSBpcyBtZXJlbHkgYSBuYW1lLiBUaGVyZSBpcyBhY3R1YWxseSBubyBvbmUgcmV0dXJuaW5nIGFuZCBubyBvbmUgbm90LXJldHVybmluZy7igJ1cIixcbiAgXCLigJxUZWxsIG1lLCBTdWJodXRpLiBEb2VzIGEgQnVkZGhhIHNheSB0byBoaW1zZWxmLCDigJhJIGhhdmUgb2J0YWluZWQgUGVyZmVjdCBFbmxpZ2h0ZW5tZW50LuKAmT/igJ1cIixcbiAgXCLigJxObywgbG9yZC4gVGhlcmUgaXMgbm8gc3VjaCB0aGluZyBhcyBQZXJmZWN0IEVubGlnaHRlbm1lbnQgdG8gb2J0YWluLiBJZiBhIFBlcmZlY3RseSBFbmxpZ2h0ZW5lZCBCdWRkaGEgd2VyZSB0byBzYXkgdG8gaGltc2VsZiwg4oCYSSBhbSBlbmxpZ2h0ZW5lZOKAmSBoZSB3b3VsZCBiZSBhZG1pdHRpbmcgdGhlcmUgaXMgYW4gaW5kaXZpZHVhbCBwZXJzb24sIGEgc2VwYXJhdGUgc2VsZiBhbmQgcGVyc29uYWxpdHksIGFuZCB3b3VsZCB0aGVyZWZvcmUgbm90IGJlIGEgUGVyZmVjdGx5IEVubGlnaHRlbmVkIEJ1ZGRoYS7igJ1cIixcbiAgXCJTdWJodXRpIHRoZW4gc2FpZCwg4oCcTW9zdCBIb25vcmVkIE9uZSEgWW91IGhhdmUgc2FpZCB0aGF0IEksIFN1Ymh1dGksIGV4Y2VsIGFtb25nc3QgdGh5IGRpc2NpcGxlcyBpbiBrbm93aW5nIHRoZSBibGlzcyBvZiBFbmxpZ2h0ZW5tZW50LCBpbiBiZWluZyBwZXJmZWN0bHkgY29udGVudCBpbiBzZWNsdXNpb24sIGFuZCBpbiBiZWluZyBmcmVlIGZyb20gYWxsIHBhc3Npb25zLiBZZXQgSSBkbyBub3Qgc2F5IHRvIG15c2VsZiB0aGF0IEkgYW0gc28sIGZvciBpZiBJIGV2ZXIgdGhvdWdodCBvZiBteXNlbGYgYXMgc3VjaCB0aGVuIGl0IHdvdWxkIG5vdCBiZSB0cnVlIHRoYXQgSSBlc2NhcGVkIGVnbyBkZWx1c2lvbi4gSSBrbm93IHRoYXQgaW4gdHJ1dGggdGhlcmUgaXMgbm8gU3ViaHV0aSBhbmQgdGhlcmVmb3JlIFN1Ymh1dGkgYWJpZGVzIG5vd2hlcmUsIHRoYXQgaGUgbmVpdGhlciBrbm93cyBub3IgZG9lcyBoZSBub3Qga25vdyBibGlzcywgYW5kIHRoYXQgaGUgaXMgbmVpdGhlciBmcmVlIGZyb20gbm9yIGVuc2xhdmVkIGJ5IGhpcyBwYXNzaW9ucy7igJ1cIixcbiAgXCJUaGUgQnVkZGhhIHRoZW4gY29udGludWVkLCDigJxXaGF0IGRvIHlvdSB0aGluaywgU3ViaHV0aT8gV2hlbiBJIHdhcyBpbiBhIHByZXZpb3VzIGxpZmUsIHdpdGggRGlwYW5rYXJhIEJ1ZGRoYSwgZGlkIEkgcmVjZWl2ZSBhbnkgZGVmaW5pdGUgdGVhY2hpbmcgb3IgYXR0YWluIGFueSBkZWdyZWUgb2Ygc2VsZi1jb250cm9sLCB3aGVyZWJ5IEkgbGF0ZXIgYmVjYW1lIGEgQnVkZGhhP+KAnVwiLFxuICBcIuKAnE5vLCBob25vcmFibGUgb25lLiBXaGVuIHlvdSB3ZXJlIGEgZGlzY2lwbGUgb2YgRGlwYW5rYXJhIEJ1ZGRoYSwgaW4gdHJ1dGgsIHlvdSByZWNlaXZlZCBubyBkZWZpbml0ZSB0ZWFjaGluZywgbm9yIGRpZCB5b3UgYXR0YWluIGFueSBkZWZpbml0ZSBkZWdyZWUgb2Ygc2VsZi1jb250cm9sLuKAnVwiLFxuICBcIuKAnFN1Ymh1dGksIGtub3cgYWxzbyB0aGF0IGlmIGFueSBCdWRkaGEgd291bGQgc2F5LCDigJhJIHdpbGwgY3JlYXRlIGEgcGFyYWRpc2Us4oCZIGhlIHdvdWxkIHNwZWFrIGZhbHNlbHkuIFdoeT8gQmVjYXVzZSBhIHBhcmFkaXNlIGNhbm5vdCBiZSBjcmVhdGVkIG5vciBjYW4gaXQgbm90IGJlIHVuY3JlYXRlZC7igJ1cIixcbiAgXCLigJxBIGRpc2NpcGxlIHNob3VsZCBkZXZlbG9wIGEgbWluZCB3aGljaCBpcyBpbiBubyB3YXkgZGVwZW5kZW50IHVwb24gc2lnaHRzLCBzb3VuZHMsIHNtZWxscywgdGFzdGVzLCBzZW5zb3J5IHNlbnNhdGlvbnMgb3IgYW55IG1lbnRhbCBjb25jZXB0aW9ucy4gQSBkaXNjaXBsZSBzaG91bGQgZGV2ZWxvcCBhIG1pbmQgd2hpY2ggZG9lcyBub3QgcmVseSBvbiBhbnl0aGluZy7igJ1cIixcbiAgXCLigJxUaGVyZWZvcmUsIFN1Ymh1dGksIHRoZSBtaW5kcyBvZiBhbGwgZGlzY2lwbGVzIHNob3VsZCBiZSBwdXJpZmllZCBvZiBhbGwgdGhvdWdodHMgdGhhdCByZWxhdGUgdG8gc2VlaW5nLCBoZWFyaW5nLCB0YXN0aW5nLCBzbWVsbGluZywgdG91Y2hpbmcsIGFuZCBkaXNjcmltaW5hdGluZy4gVGhleSBzaG91bGQgdXNlIHRoZWlyIG1pbmRzIHNwb250YW5lb3VzbHkgYW5kIG5hdHVyYWxseSwgd2l0aG91dCBiZWluZyBjb25zdHJhaW5lZCBieSBwcmVjb25jZWl2ZWQgbm90aW9ucyBhcmlzaW5nIGZyb20gdGhlIHNlbnNlcy7igJ1cIixcbiAgXCLigJxTdXBwb3NlLCBTdWJodXRpLCBhIG1hbiBoYWQgYW4gZW5vcm1vdXMgYm9keS4gV291bGQgdGhlIHNlbnNlIG9mIHBlcnNvbmFsIGV4aXN0ZW5jZSBoZSBoYWQgYWxzbyBiZSBlbm9ybW91cz/igJ1cIixcbiAgXCLigJxZZXMsIGluZGVlZCwgQnVkZGhhLOKAnSBTdWJodXRpIGFuc3dlcmVkLiDigJxIaXMgc2Vuc2Ugb2YgcGVyc29uYWwgZXhpc3RlbmNlIHdvdWxkIGJlIGVub3Jtb3VzLiBCdXQgdGhlIEJ1ZGRoYSBoYXMgdGF1Z2h0IHRoYXQgcGVyc29uYWwgZXhpc3RlbmNlIGlzIGp1c3QgYSBuYW1lLCBmb3IgaXQgaXMgaW4gZmFjdCBuZWl0aGVyIGV4aXN0ZW5jZSBub3Igbm9uLWV4aXN0ZW5jZS4gU28gaXQgb25seSBoYXMgdGhlIG5hbWUg4oCYcGVyc29uYWwgZXhpc3RlbmNl4oCZLuKAnVwiLFxuICBcIuKAnFN1Ymh1dGksIGlmIHRoZXJlIHdlcmUgYXMgbWFueSBHYW5nZXMgcml2ZXJzIGFzIHRoZSBudW1iZXIgb2YgZ3JhaW5zIG9mIHNhbmQgaW4gdGhlIEdhbmdlcywgd291bGQgeW91IHNheSB0aGF0IHRoZSBudW1iZXIgb2YgZ3JhaW5zIG9mIHNhbmQgaW4gYWxsIHRob3NlIEdhbmdlcyByaXZlcnMgd291bGQgYmUgdmVyeSBtYW55P+KAnVwiLFxuICBcIlN1Ymh1dGkgYW5zd2VyZWQsIOKAnFZlcnkgbWFueSBpbmRlZWQsIE1vc3QgSG9ub3JlZCBPbmUuIElmIHRoZSBudW1iZXIgb2YgR2FuZ2VzIHJpdmVycyB3ZXJlIHRoYXQgbGFyZ2UsIGhvdyBtdWNoIG1vcmUgc28gd291bGQgYmUgdGhlIG51bWJlciBvZiBncmFpbnMgb2Ygc2FuZCBpbiBhbGwgdGhvc2UgR2FuZ2VzIHJpdmVycy7igJ1cIixcbiAgXCLigJxTdWJodXRpLCBJIHdpbGwgZGVjbGFyZSBhIHRydXRoIHRvIHlvdS4gSWYgYSBnb29kIG1hbiBvciBhIGdvb2Qgd29tYW4gZmlsbGVkIG92ZXIgdGVuIHRob3VzYW5kIGdhbGF4aWVzIG9mIHdvcmxkcyB3aXRoIHRoZSBzZXZlbiB0cmVhc3VyZXMgZm9yIGVhY2ggZ3JhaW4gb2Ygc2FuZCBpbiBhbGwgdGhvc2UgR2FuZ2VzIHJpdmVycywgYW5kIGdhdmUgaXQgYWxsIGF3YXkgZm9yIHRoZSBwdXJwb3NlIG9mIGNvbXBhc3Npb24sIGNoYXJpdHkgYW5kIGdpdmluZyBhbG1zLCB3b3VsZCB0aGlzIG1hbiBvciB3b21hbiBub3QgZ2FpbiBncmVhdCBtZXJpdCBhbmQgc3ByZWFkIG11Y2ggaGFwcGluZXNzP+KAnVwiLFxuICBcIlN1Ymh1dGkgcmVwbGllZCwg4oCcVmVyeSBtdWNoIHNvLCBNb3N0IEhvbm9yZWQgT25lLuKAnVwiLFxuICBcIuKAnFN1Ymh1dGksIGlmIGFmdGVyIHN0dWR5aW5nIGFuZCBvYnNlcnZpbmcgZXZlbiBhIHNpbmdsZSBzdGFuemEgb2YgdGhpcyBTdXRyYSwgYW5vdGhlciBwZXJzb24gd2VyZSB0byBleHBsYWluIGl0IHRvIG90aGVycywgdGhlIGhhcHBpbmVzcyBhbmQgbWVyaXQgdGhhdCB3b3VsZCByZXN1bHQgZnJvbSB0aGlzIHZpcnR1b3VzIGFjdCB3b3VsZCBiZSBmYXIgZ3JlYXRlci7igJ1cIixcbiAgXCLigJxGdXJ0aGVybW9yZSwgU3ViaHV0aSwgaWYgYW55IHBlcnNvbiBpbiBhbnkgcGxhY2Ugd2VyZSB0byB0ZWFjaCBldmVuIGZvdXIgbGluZXMgb2YgdGhpcyBTdXRyYSwgdGhlIHBsYWNlIHdoZXJlIHRoZXkgdGF1Z2h0IGl0IHdvdWxkIGJlY29tZSBzYWNyZWQgZ3JvdW5kIGFuZCB3b3VsZCBiZSByZXZlcmVkIGJ5IGFsbCBraW5kcyBvZiBiZWluZ3MuIEhvdyBtdWNoIG1vcmUgc2FjcmVkIHdvdWxkIHRoZSBwbGFjZSBiZWNvbWUgaWYgdGhhdCBwZXJzb24gdGhlbiBzdHVkaWVkIGFuZCBvYnNlcnZlZCB0aGUgd2hvbGUgU3V0cmEhIFN1Ymh1dGksIHlvdSBzaG91bGQga25vdyB0aGF0IGFueSBwZXJzb24gd2hvIGRvZXMgdGhhdCB3b3VsZCBzdXJlbHkgYXR0YWluIHNvbWV0aGluZyByYXJlIGFuZCBwcm9mb3VuZC4gV2hlcmV2ZXIgdGhpcyBTdXRyYSBpcyBob25vcmVkIGFuZCByZXZlcmVkIHRoZXJlIGlzIGEgc2FjcmVkIHNpdGUgZW5zaHJpbmluZyB0aGUgcHJlc2VuY2Ugb2YgdGhlIEJ1ZGRoYSBvciBvbmUgb2YgdGhlIEJ1ZGRoYeKAmXMgbW9zdCB2ZW5lcmFibGUgZGlzY2lwbGVzLuKAnVwiLFxuICBcIlN1Ymh1dGkgc2FpZCB0byB0aGUgQnVkZGhhLCDigJxCeSB3aGF0IG5hbWUgc2hhbGwgd2Uga25vdyB0aGlzIFN1dHJhLCBzbyB0aGF0IGl0IGNhbiBiZSBob25vcmVkIGFuZCBzdHVkaWVkP+KAnVwiLFxuICBcIlRoZSBsb3JkIEJ1ZGRoYSByZXBsaWVkLCDigJxUaGlzIFN1dHJhIHNoYWxsIGJlIGtub3duIGFzXCIsXG4gIFwi4oCYVGhlIERpYW1vbmQgdGhhdCBDdXRzIHRocm91Z2ggSWxsdXNpb27igJkuXCIsXG4gIFwiQnkgdGhpcyBuYW1lIGl0IHNoYWxsIGJlIHJldmVyZWQgYW5kIHN0dWRpZWQgYW5kIG9ic2VydmVkLiBXaGF0IGRvZXMgdGhpcyBuYW1lIG1lYW4/IEl0IG1lYW5zIHRoYXQgd2hlbiB0aGUgQnVkZGhhIG5hbWVkIGl0LCBoZSBkaWQgbm90IGhhdmUgaW4gbWluZCBhbnkgZGVmaW5pdGUgb3IgYXJiaXRyYXJ5IGNvbmNlcHRpb24sIGFuZCBzbyBuYW1lZCBpdC4gVGhpcyBTdXRyYSBpcyBoYXJkIGFuZCBzaGFycCwgbGlrZSBhIGRpYW1vbmQgdGhhdCB3aWxsIGN1dCBhd2F5IGFsbCBhcmJpdHJhcnkgY29uY2VwdGlvbnMgYW5kIGJyaW5nIG9uZSB0byB0aGUgb3RoZXIgc2hvcmUgb2YgRW5saWdodGVubWVudC7igJ1cIixcbiAgXCLigJxXaGF0IGRvIHlvdSB0aGluaywgU3ViaHV0aT8gSGFzIHRoZSBCdWRkaGEgdGF1Z2h0IGFueSBkZWZpbml0ZSB0ZWFjaGluZyBpbiB0aGlzIFN1dHJhP+KAnVwiLFxuICBcIuKAnE5vIGxvcmQsIHRoZSBCdWRkaGEgaGFzIG5vdCB0YXVnaHQgYW55IGRlZmluaXRlIHRlYWNoaW5nIGluIHRoaXMgU3V0cmEu4oCdXCIsXG4gIFwi4oCcV2hhdCBkbyB5b3UgdGhpbmssIFN1Ymh1dGk/IEFyZSB0aGVyZSBtYW55IHBhcnRpY2xlcyBvZiBkdXN0IGluIHRoaXMgdmFzdCB1bml2ZXJzZT/igJ1cIixcbiAgXCJTdWJodXRpIHJlcGxpZWQ6IOKAnFllcywgbWFueSwgTW9zdCBIb25vcmVkIE9uZSHigJ1cIixcbiAgXCLigJxTdWJodXRpLCB3aGVuIHRoZSBCdWRkaGEgc3BlYWtzIG9mIHBhcnRpY2xlcyBvZiBkdXN0LCBpdCBkb2VzIG5vdCBtZWFuIEkgYW0gdGhpbmtpbmcgb2YgYW55IGRlZmluaXRlIG9yIGFyYml0cmFyeSB0aG91Z2h0LCBJIGFtIG1lcmVseSB1c2luZyB0aGVzZSB3b3JkcyBhcyBhIGZpZ3VyZSBvZiBzcGVlY2guIFRoZXkgYXJlIG5vdCByZWFsLCBvbmx5IGlsbHVzaW9uLiBJdCBpcyBqdXN0IHRoZSBzYW1lIHdpdGggdGhlIHdvcmQgdW5pdmVyc2U7IHRoZXNlIHdvcmRzIGRvIG5vdCBhc3NlcnQgYW55IGRlZmluaXRlIG9yIGFyYml0cmFyeSBpZGVhLCBJIGFtIG9ubHkgdXNpbmcgdGhlIHdvcmRzIGFzIHdvcmRzLuKAnVwiLFxuICBcIuKAnFN1Ymh1dGksIHdoYXQgZG8geW91IHRoaW5rPyBDYW4gdGhlIEJ1ZGRoYSBiZSBwZXJjZWl2ZWQgYnkgbWVhbnMgb2YgaGlzIHRoaXJ0eS10d28gcGh5c2ljYWwgY2hhcmFjdGVyaXN0aWNzP+KAnVwiLFxuICBcIuKAnE5vLCBNb3N0IEhvbm9yZWQgT25lLiBUaGUgQnVkZGhhIGNhbm5vdCBiZSBwZXJjZWl2ZWQgYnkgaGlzIHRoaXJ0eS10d28gcGh5c2ljYWwgY2hhcmFjdGVyaXN0aWNzLiBXaHk/IEJlY2F1c2UgdGhlIEJ1ZGRoYSB0ZWFjaGVzIHRoYXQgdGhleSBhcmUgbm90IHJlYWwgYnV0IGFyZSBtZXJlbHkgY2FsbGVkIHRoZSB0aGlydHktdHdvIHBoeXNpY2FsIGNoYXJhY3RlcmlzdGljcy7igJ1cIixcbiAgXCLigJxTdWJodXRpLCBpZiBhIGdvb2QgYW5kIGZhaXRoZnVsIHBlcnNvbiwgd2hldGhlciBtYWxlIG9yIGZlbWFsZSwgaGFzLCBmb3IgdGhlIHNha2Ugb2YgY29tcGFzc2lvbiBhbmQgY2hhcml0eSwgYmVlbiBzYWNyaWZpY2luZyB0aGVpciBsaWZlIGZvciBnZW5lcmF0aW9uIHVwb24gZ2VuZXJhdGlvbiwgZm9yIGFzIG1hbnkgZ2VuZXJhdGlvbnMgYXMgdGhlIGdyYWlucyBvZiBzYW5kcyBpbiAzLDAwMCB1bml2ZXJzZXM7IGFuZCBhbm90aGVyIGZvbGxvd2VyIGhhcyBiZWVuIHN0dWR5aW5nIGFuZCBvYnNlcnZpbmcgZXZlbiBhIHNpbmdsZSBzZWN0aW9uIG9mIHRoaXMgU3V0cmEgYW5kIGV4cGxhaW5zIGl0IHRvIG90aGVycywgdGhhdCBwZXJzb27igJlzIGJsZXNzaW5ncyBhbmQgbWVyaXQgd291bGQgYmUgZmFyIGdyZWF0ZXIu4oCdXCIsXG4gIFwiQXQgdGhhdCB0aW1lLCBhZnRlciBsaXN0ZW5pbmcgdG8gdGhpcyBTdXRyYSwgU3ViaHV0aSBoYWQgdW5kZXJzdG9vZCBpdHMgcHJvZm91bmQgbWVhbmluZyBhbmQgd2FzIG1vdmVkIHRvIHRlYXJzLlwiLFxuICBcIkhlIHNhaWQsIOKAnFdoYXQgYSByYXJlIGFuZCBwcmVjaW91cyB0aGluZyBpdCBpcyB0aGF0IHlvdSBzaG91bGQgZGVsaXZlciBzdWNoIGEgZGVlcGx5IHByb2ZvdW5kIHRlYWNoaW5nLiBTaW5jZSB0aGUgZGF5IEkgYXR0YWluZWQgdGhlIGV5ZXMgb2YgdW5kZXJzdGFuZGluZywgdGhhbmtzIHRvIHRoZSBndWlkYW5jZSBvZiB0aGUgQnVkZGhhLCBJIGhhdmUgbmV2ZXIgYmVmb3JlIGhlYXJkIHRlYWNoaW5ncyBzbyBkZWVwIGFuZCB3b25kZXJmdWwgYXMgdGhlc2UuIE1vc3QgSG9ub3JlZCBPbmUsIGlmIHNvbWVvbmUgaGVhcnMgdGhpcyBTdXRyYSwgYW5kIGhhcyBwdXJlIGFuZCBjbGVhciBjb25maWRlbmNlIGluIGl0IHRoZXkgd2lsbCBoYXZlIGEgcHJvZm91bmQgaW5zaWdodCBpbnRvIHRoZSB0cnV0aC4gSGF2aW5nIHBlcmNlaXZlZCB0aGF0IHByb2ZvdW5kIGluc2lnaHQsIHRoYXQgcGVyc29uIHdpbGwgcmVhbGl6ZSB0aGUgcmFyZXN0IGtpbmQgb2YgdmlydHVlLiBNb3N0IEhvbm9yZWQgT25lLCB0aGF0IGluc2lnaHQgaW50byB0aGUgdHJ1dGggaXMgZXNzZW50aWFsbHkgbm90IGluc2lnaHQgaW50byB0aGUgdHJ1dGgsIGJ1dCBpcyB3aGF0IHRoZSBCdWRkaGEgY2FsbHMgaW5zaWdodCBpbnRvIHRoZSB0cnV0aC7igJ1cIixcbiAgXCLigJxNb3N0IEhvbm9yZWQgT25lLCBoYXZpbmcgbGlzdGVuZWQgdG8gdGhpcyBTdXRyYSwgSSBhbSBhYmxlIHRvIHJlY2VpdmUgYW5kIHJldGFpbiBpdCB3aXRoIGZhaXRoIGFuZCB1bmRlcnN0YW5kaW5nLiBUaGlzIGlzIG5vdCBkaWZmaWN1bHQgZm9yIG1lLCBidXQgaW4gYWdlcyB0byBjb21lIOKAkyBpbiB0aGUgbGFzdCBmaXZlIGh1bmRyZWQgeWVhcnMsIGlmIHRoZXJlIGlzIGEgcGVyc29uIHdobyBoZWFycyB0aGlzIFN1dHJhLCB3aG8gcmVjZWl2ZXMgYW5kIHJldGFpbnMgaXQgd2l0aCBmYWl0aCBhbmQgdW5kZXJzdGFuZGluZywgdGhlbiB0aGF0IHBlcnNvbiB3aWxsIGJlIGEgcmFyZSBvbmUsIGEgcGVyc29uIG9mIG1vc3QgcmVtYXJrYWJsZSBhY2hpZXZlbWVudC4gU3VjaCBhIHBlcnNvbiB3aWxsIGJlIGFibGUgdG8gYXdha2VuIHB1cmUgZmFpdGggYmVjYXVzZSB0aGV5IGhhdmUgY2Vhc2VkIHRvIGNoZXJpc2ggYW55IGFyYml0cmFyeSBub3Rpb25zIG9mIHRoZWlyIG93biBzZWxmaG9vZCwgb3RoZXIgc2VsdmVzLCBsaXZpbmcgYmVpbmdzLCBvciBhIHVuaXZlcnNhbCBzZWxmLiBXaHk/IEJlY2F1c2UgaWYgdGhleSBjb250aW51ZSB0byBob2xkIG9udG8gYXJiaXRyYXJ5IGNvbmNlcHRpb25zIGFzIHRvIHRoZWlyIG93biBzZWxmaG9vZCwgdGhleSB3aWxsIGJlIGhvbGRpbmcgb250byBzb21ldGhpbmcgdGhhdCBpcyBub24tZXhpc3RlbnQuIEl0IGlzIHRoZSBzYW1lIHdpdGggYWxsIGFyYml0cmFyeSBjb25jZXB0aW9ucyBvZiBvdGhlciBzZWx2ZXMsIGxpdmluZyBiZWluZ3MsIG9yIGEgdW5pdmVyc2FsIHNlbGYuIFRoZXNlIGFyZSBhbGwgZXhwcmVzc2lvbnMgb2Ygbm9uLWV4aXN0ZW50IHRoaW5ncy4gQnVkZGhhcyBhcmUgQnVkZGhhcyBiZWNhdXNlIHRoZXkgaGF2ZSBiZWVuIGFibGUgdG8gZGlzY2FyZCBhbGwgYXJiaXRyYXJ5IGNvbmNlcHRpb25zIG9mIGZvcm0gYW5kIHBoZW5vbWVuYSwgdGhleSBoYXZlIHRyYW5zY2VuZGVkIGFsbCBwZXJjZXB0aW9ucywgYW5kIGhhdmUgcGVuZXRyYXRlZCB0aGUgaWxsdXNpb24gb2YgYWxsIGZvcm1zLuKAnVwiLFxuICBcIlRoZSBCdWRkaGEgcmVwbGllZDpcIixcbiAgXCLigJxTbyBpdCBpcywgU3ViaHV0aS4gTW9zdCB3b25kZXJmdWxseSBibGVzdCB3aWxsIGJlIHRob3NlIGJlaW5ncyB3aG8sIG9uIGhlYXJpbmcgdGhpcyBTdXRyYSwgd2lsbCBub3QgdHJlbWJsZSwgbm9yIGJlIGZyaWdodGVuZWQsIG9yIHRlcnJpZmllZCBpbiBhbnkgd2F5LiBBbmQgd2h5PyBUaGUgQnVkZGhhIGhhcyB0YXVnaHQgdGhpcyBTdXRyYSBhcyB0aGUgaGlnaGVzdCBwZXJmZWN0aW9uLiBBbmQgd2hhdCB0aGUgQnVkZGhhIHRlYWNoZXMgYXMgdGhlIGhpZ2hlc3QgcGVyZmVjdGlvbiwgdGhhdCBhbHNvIHRoZSBpbm51bWVyYWJsZSBCbGVzc2VkIEJ1ZGRoYXMgZG8gdGVhY2guIFRoZXJlZm9yZSBpcyBpdCBjYWxsZWQgdGhlIOKAmGhpZ2hlc3QgcGVyZmVjdGlvbuKAmS7igJ1cIixcbiAgXCLigJxTdWJodXRpLCB3aGVuIEkgdGFsayBhYm91dCB0aGUgcHJhY3RpY2Ugb2YgdHJhbnNjZW5kZW50IHBhdGllbmNlLCBJIGRvIG5vdCBob2xkIG9udG8gYW55IGFyYml0cmFyeSBjb25jZXB0aW9ucyBhYm91dCB0aGUgcGhlbm9tZW5hIG9mIHBhdGllbmNlLCBJIG1lcmVseSByZWZlciB0byBpdCBhcyB0aGUgcHJhY3RpY2Ugb2YgdHJhbnNjZW5kZW50IHBhdGllbmNlLiBBbmQgd2h5IGlzIHRoYXQ/IEJlY2F1c2Ugd2hlbiwgdGhvdXNhbmRzIG9mIGxpZmV0aW1lcyBhZ28sIHRoZSBQcmluY2Ugb2YgS2FsaW5nYSBzZXZlcmVkIHRoZSBmbGVzaCBmcm9tIG15IGxpbWJzIGFuZCBteSBib2R5IEkgaGFkIG5vIHBlcmNlcHRpb24gb2YgYSBzZWxmLCBhIGJlaW5nLCBhIHNvdWwsIG9yIGEgdW5pdmVyc2FsIHNlbGYuIElmIEkgaGFkIGNoZXJpc2hlZCBhbnkgb2YgdGhlc2UgYXJiaXRyYXJ5IG5vdGlvbnMgYXQgdGhlIHRpbWUgbXkgbGltYnMgd2VyZSBiZWluZyB0b3JuIGF3YXksIEkgd291bGQgaGF2ZSBmYWxsZW4gaW50byBhbmdlciBhbmQgaGF0cmVkLuKAnVwiLFxuICBcIuKAnEkgYWxzbyByZW1lbWJlciBTdWJodXRpIHRoYXQgZHVyaW5nIG15IGZpdmUgaHVuZHJlZCBwcmV2aW91cyBsaXZlcyBJIGhhZCB1c2VkIGxpZmUgYWZ0ZXIgbGlmZSB0byBwcmFjdGljZSBwYXRpZW5jZSBhbmQgdG8gbG9vayB1cG9uIG15IGxpZmUgaHVtYmx5LCBhcyB0aG91Z2ggSSB3ZXJlIGEgc2FpbnQgY2FsbGVkIHVwb24gdG8gc3VmZmVyIGh1bWlsaXR5LiBFdmVuIHRoZW4gbXkgbWluZCB3YXMgZnJlZSBvZiBhcmJpdHJhcnkgY29uY2VwdGlvbnMgb2YgdGhlIHBoZW5vbWVuYSBvZiBteSBzZWxmLCBhIGJlaW5nLCBhIHNvdWwsIG9yIGEgdW5pdmVyc2FsIHNlbGYu4oCdXCIsXG4gIFwi4oCcVGhlcmVmb3JlLCBTdWJodXRpLCBkaXNjaXBsZXMgc2hvdWxkIGxlYXZlIGJlaGluZCBhbGwgZGlzdGluY3Rpb25zIG9mIHBoZW5vbWVuYSBhbmQgYXdha2VuIHRoZSB0aG91Z2h0IG9mIHRoZSBhdHRhaW5tZW50IG9mIFN1cHJlbWUgRW5saWdodGVubWVudC4gQSBkaXNjaXBsZSBzaG91bGQgZG8gdGhpcyBieSBub3QgYWxsb3dpbmcgdGhlaXIgbWluZCB0byBkZXBlbmQgdXBvbiBpZGVhcyBldm9rZWQgYnkgdGhlIHdvcmxkIG9mIHRoZSBzZW5zZXMg4oCTIGJ5IG5vdCBhbGxvd2luZyB0aGVpciBtaW5kIHRvIGRlcGVuZCB1cG9uIGlkZWFzIHN0aXJyZWQgYnkgc291bmRzLCBvZG9ycywgZmxhdm9ycywgc2Vuc29yeSB0b3VjaCwgb3IgYW55IG90aGVyIHF1YWxpdGllcy4gVGhlIGRpc2NpcGxl4oCZcyBtaW5kIHNob3VsZCBiZSBrZXB0IGluZGVwZW5kZW50IG9mIGFueSB0aG91Z2h0cyB0aGF0IG1pZ2h0IGFyaXNlIHdpdGhpbiBpdC4gSWYgdGhlIGRpc2NpcGxl4oCZcyBtaW5kIGRlcGVuZHMgdXBvbiBhbnl0aGluZyBpbiB0aGUgc2Vuc29yeSByZWFsbSBpdCB3aWxsIGhhdmUgbm8gc29saWQgZm91bmRhdGlvbiBpbiBhbnkgcmVhbGl0eS4gVGhpcyBpcyB3aHkgQnVkZGhhIHRlYWNoZXMgdGhhdCB0aGUgbWluZCBvZiBhIGRpc2NpcGxlIHNob3VsZCBub3QgYWNjZXB0IHRoZSBhcHBlYXJhbmNlcyBvZiB0aGluZ3MgYXMgYSBiYXNpcyB3aGVuIGV4ZXJjaXNpbmcgY2hhcml0eS4gU3ViaHV0aSwgYXMgZGlzY2lwbGVzIHByYWN0aWNlIGNvbXBhc3Npb24gYW5kIGNoYXJpdHkgZm9yIHRoZSB3ZWxmYXJlIG9mIGFsbCBsaXZpbmcgYmVpbmdzIHRoZXkgc2hvdWxkIGRvIGl0IHdpdGhvdXQgcmVseWluZyBvbiBhcHBlYXJhbmNlcywgYW5kIHdpdGhvdXQgYXR0YWNobWVudC4gSnVzdCBhcyB0aGUgQnVkZGhhIGRlY2xhcmVzIHRoYXQgZm9ybSBpcyBub3QgZm9ybSwgc28gaGUgYWxzbyBkZWNsYXJlcyB0aGF0IGFsbCBsaXZpbmcgYmVpbmdzIGFyZSwgaW4gZmFjdCwgbm90IGxpdmluZyBiZWluZ3Mu4oCdXCIsXG4gIFwi4oCcU3ViaHV0aSwgaWYgb24gdGhlIG9uZSBoYW5kLCBhIHNvbiBvciBkYXVnaHRlciBvZiBhIGdvb2QgZmFtaWx5IGdpdmVzIHVwIGhpcyBvciBoZXIgbGlmZSBpbiB0aGUgbW9ybmluZyBhcyBtYW55IHRpbWVzIGFzIHRoZXJlIGFyZSBncmFpbnMgb2Ygc2FuZCBpbiB0aGUgR2FuZ2VzIHJpdmVyIGFzIGFuIGFjdCBvZiBnZW5lcm9zaXR5LCBhbmQgZ2l2ZXMgYXMgbWFueSBhZ2FpbiBpbiB0aGUgYWZ0ZXJub29uIGFuZCBhcyBtYW55IGFnYWluIGluIHRoZSBldmVuaW5nLCBhbmQgY29udGludWVzIGRvaW5nIHNvIGZvciBjb3VudGxlc3MgYWdlczsgYW5kIGlmLCBvbiB0aGUgb3RoZXIgaGFuZCwgYW5vdGhlciBwZXJzb24gbGlzdGVucyB0byB0aGlzIFN1dHJhIHdpdGggY29tcGxldGUgY29uZmlkZW5jZSBhbmQgd2l0aG91dCBjb250ZW50aW9uLCB0aGF0IHBlcnNvbuKAmXMgaGFwcGluZXNzIHdpbGwgYmUgZmFyIGdyZWF0ZXIuIEJ1dCB0aGUgaGFwcGluZXNzIG9mIG9uZSB3aG8gd3JpdGVzIHRoaXMgU3V0cmEgZG93biwgcmVjZWl2ZXMsIHJlY2l0ZXMsIGFuZCBleHBsYWlucyBpdCB0byBvdGhlcnMgY2Fubm90IGV2ZW4gYmUgY29tcGFyZWQgaXQgaXMgc28gZ3JlYXQu4oCdXCIsXG4gIFwi4oCcU3ViaHV0aSwgd2UgY2FuIHN1bW1hcml6ZSBieSBzYXlpbmcgdGhhdCB0aGUgbWVyaXQgYW5kIHZpcnR1ZSBvZiB0aGlzIFN1dHJhIGlzIGluY29uY2VpdmFibGUsIGluY2FsY3VsYWJsZSBhbmQgYm91bmRsZXNzLiBUaGUgQnVkZGhhIGhhcyBkZWNsYXJlZCB0aGlzIHRlYWNoaW5nIGZvciB0aGUgYmVuZWZpdCBvZiBpbml0aWF0ZXMgb24gdGhlIHBhdGggdG8gRW5saWdodGVubWVudDsgaGUgaGFzIGRlY2xhcmVkIGl0IGZvciB0aGUgYmVuZWZpdCBvZiBpbml0aWF0ZXMgb24gdGhlIHBhdGggdG8gTmlydmFuYS4gSWYgdGhlcmUgaXMgc29tZW9uZSBjYXBhYmxlIG9mIHJlY2VpdmluZywgcHJhY3RpY2luZywgcmVjaXRpbmcsIGFuZCBzaGFyaW5nIHRoaXMgU3V0cmEgd2l0aCBvdGhlcnMsIHRoZSBCdWRkaGEgd2lsbCBzZWUgYW5kIGtub3cgdGhhdCBwZXJzb24sIGFuZCBoZSBvciBzaGUgd2lsbCByZWNlaXZlIGltbWVhc3VyYWJsZSwgaW5jYWxjdWxhYmxlLCBhbmQgYm91bmRsZXNzIG1lcml0IGFuZCB2aXJ0dWUuIFN1Y2ggYSBwZXJzb24gaXMga25vd24gdG8gYmUgY2FycnlpbmcgdGhlIFN1cHJlbWUgRW5saWdodGVubWVudCBhdHRhaW5lZCBieSB0aGUgQnVkZGhhLiBXaHk/IFN1Ymh1dGksIGlmIGEgcGVyc29uIGlzIHNhdGlzZmllZCB3aXRoIGxlc3NlciB0ZWFjaGluZ3MgdGhhbiB0aG9zZSBJIHByZXNlbnQgaGVyZSwgaWYgaGUgb3Igc2hlIGlzIHN0aWxsIGNhdWdodCB1cCBpbiB0aGUgaWRlYSBvZiBhIHNlbGYsIGEgcGVyc29uLCBhIGxpdmluZyBiZWluZywgb3IgYSB1bml2ZXJzYWwgc2VsZiwgdGhlbiB0aGF0IHBlcnNvbiB3b3VsZCBub3QgYmUgYWJsZSB0byBsaXN0ZW4gdG8sIHJlY2VpdmUsIHJlY2l0ZSwgb3IgZXhwbGFpbiB0aGlzIFN1dHJhIHRvIG90aGVycy7igJ1cIixcbiAgXCLigJxTdWJodXRpLCB3aGVyZXZlciB0aGlzIFN1dHJhIHNoYWxsIGJlIG9ic2VydmVkLCBzdHVkaWVkIGFuZCBleHBsYWluZWQsIHRoYXQgcGxhY2Ugd2lsbCBiZWNvbWUgc2FjcmVkIGdyb3VuZCB0byB3aGljaCBjb3VudGxlc3Mgc3Bpcml0dWFsbHkgYWR2YW5jZWQgYmVpbmdzIHdpbGwgYnJpbmcgb2ZmZXJpbmdzLiBTdWNoIHBsYWNlcywgaG93ZXZlciBodW1ibGUgdGhleSBtYXkgYmUsIHdpbGwgYmUgcmV2ZXJlZCBhcyB0aG91Z2ggdGhleSB3ZXJlIGZhbW91cyB0ZW1wbGVzLCBhbmQgY291bnRsZXNzIHBpbGdyaW1zIHdpbGwgY29tZSB0aGVyZSB0byB3b3JzaGlwLiBTdWNoIGEgcGxhY2UgaXMgYSBzaHJpbmUgYW5kIHNob3VsZCBiZSB2ZW5lcmF0ZWQgd2l0aCBmb3JtYWwgY2VyZW1vbmllcywgYW5kIG9mZmVyaW5ncyBvZiBmbG93ZXJzIGFuZCBpbmNlbnNlLiBUaGF0IGlzIHRoZSBwb3dlciBvZiB0aGlzIFN1dHJhLuKAnVwiLFxuICBcIuKAnEZ1cnRoZXJtb3JlLCBTdWJodXRpLCBpZiBhIGdvb2QgbWFuIG9yIGdvb2Qgd29tYW4gd2hvIGFjY2VwdHMsIHVwaG9sZHMsIHJlYWRzIG9yIHJlY2l0ZXMgdGhpcyBTdXRyYSBpcyBkaXNkYWluZWQgb3Igc2xhbmRlcmVkLCBpZiB0aGV5IGFyZSBkZXNwaXNlZCBvciBpbnN1bHRlZCwgaXQgbWVhbnMgdGhhdCBpbiBwcmlvciBsaXZlcyB0aGV5IGNvbW1pdHRlZCBldmlsIGFjdHMgYW5kIGFzIGEgcmVzdWx0IGFyZSBub3cgc3VmZmVyaW5nIHRoZSBmcnVpdHMgb2YgdGhlaXIgYWN0aW9ucy4gV2hlbiB0aGVpciBwcmlvciBsaWZl4oCZcyBldmlsIGFjdHMgaGF2ZSBmaW5hbGx5IGJlZW4gZGlzc29sdmVkIGFuZCBleHRpbmd1aXNoZWQsIGhlIG9yIHNoZSB3aWxsIGF0dGFpbiB0aGUgc3VwcmVtZSBjbGFyaXR5IG9mIHRoZSBtb3N0IGZ1bGZpbGxlZCwgYW5kIGF3YWtlbmVkIG1pbmQu4oCdXCIsXG4gIFwi4oCcU3ViaHV0aSwgaW4gYW5jaWVudCB0aW1lcyBiZWZvcmUgSSBtZXQgRGlwYW5rYXJhIEJ1ZGRoYSwgSSBoYWQgbWFkZSBvZmZlcmluZ3MgdG8gYW5kIGhhZCBiZWVuIGF0dGVuZGFudCBvZiBhbGwgODQsMDAwIG1pbGxpb24gQnVkZGhhcy4gSWYgc29tZW9uZSBpcyBhYmxlIHRvIHJlY2VpdmUsIHJlY2l0ZSwgc3R1ZHksIGFuZCBwcmFjdGljZSB0aGlzIFN1dHJhIGluIGEgbGF0ZXIsIG1vcmUgZGlzdGFudCBhZ2UsIHRoZW4gdGhlIGhhcHBpbmVzcyBhbmQgbWVyaXQgYnJvdWdodCBhYm91dCBieSB0aGlzIHZpcnR1b3VzIGFjdCB3b3VsZCBiZSBodW5kcmVkcyBvZiB0aG91c2FuZHMgb2YgdGltZXMgZ3JlYXRlciB0aGFuIHRoYXQgd2hpY2ggSSBicm91Z2h0IGFib3V0IGJ5IG15IHNlcnZpY2UgdG8gdGhlIEJ1ZGRoYXMgaW4gYW5jaWVudCB0aW1lcy4gSW4gZmFjdCwgc3VjaCBoYXBwaW5lc3MgYW5kIG1lcml0IGNhbm5vdCBiZSBjb25jZWl2ZWQgb3IgY29tcGFyZWQgd2l0aCBhbnl0aGluZywgZXZlbiBtYXRoZW1hdGljYWxseS4gSWYgSSB3ZXJlIHRvIGV4cGxhaW4gYWxsIHRoaXMgaW4gZGV0YWlsIG5vdyBzb21lIHBlb3BsZSBtaWdodCBiZWNvbWUgc3VzcGljaW91cyBhbmQgZGlzYmVsaWV2aW5nLCBhbmQgdGhlaXIgbWluZHMgbWF5IGV2ZW4gYmVjb21lIGRpc29yaWVudGVkIG9yIGNvbmZ1c2VkLiBTdWJodXRpLCB5b3Ugc2hvdWxkIGtub3cgdGhhdCB0aGUgbWVhbmluZyBvZiB0aGlzIFN1dHJhIGlzIGJleW9uZCBjb25jZXB0aW9uIGFuZCBkaXNjdXNzaW9uLiBMaWtld2lzZSwgdGhlIGZydWl0IHJlc3VsdGluZyBmcm9tIHJlY2VpdmluZyBhbmQgcHJhY3RpY2luZyB0aGlzIFN1dHJhIGlzIGJleW9uZCBjb25jZXB0aW9uIGFuZCBkaXNjdXNzaW9uLuKAnVwiLFxuICBcIkF0IHRoYXQgdGltZSwgdGhlIHZlbmVyYWJsZSBTdWJodXRpIHRoZW4gYXNrZWQgdGhlIEJ1ZGRoYSwg4oCcV29ybGQtSG9ub3JlZCBPbmUsIG1heSBJIGFzayB5b3UgYSBxdWVzdGlvbiBhZ2Fpbj8gSWYgc29ucyBvciBkYXVnaHRlcnMgb2YgYSBnb29kIGZhbWlseSB3YW50IHRvIGRldmVsb3AgdGhlIGhpZ2hlc3QsIG1vc3QgZnVsZmlsbGVkIGFuZCBhd2FrZW5lZCBtaW5kLCBpZiB0aGV5IHdpc2ggdG8gYXR0YWluIHRoZSBIaWdoZXN0IFBlcmZlY3QgV2lzZG9tLCB3aGF0IHNob3VsZCB0aGV5IGRvIHRvIGhlbHAgcXVpZXQgdGhlaXIgZHJpZnRpbmcgbWluZHMgYW5kIG1hc3RlciB0aGVpciB0aGlua2luZz/igJ1cIixcbiAgXCJUaGUgQnVkZGhhIHJlcGxpZWQ6XCIsXG4gIFwi4oCcU3ViaHV0aSwgYSBnb29kIHNvbiBvciBkYXVnaHRlciB3aG8gd2FudHMgdG8gZ2l2ZSByaXNlIHRvIHRoZSBoaWdoZXN0LCBtb3N0IGZ1bGZpbGxlZCwgYW5kIGF3YWtlbmVkIG1pbmQgbXVzdCBjcmVhdGUgdGhpcyByZXNvbHZlZCBhdHRpdHVkZSBvZiBtaW5kOiDigJhJIG11c3QgaGVscCB0byBsZWFkIGFsbCBiZWluZ3MgdG8gdGhlIHNob3JlIG9mIGF3YWtlbmluZywgYnV0LCBhZnRlciB0aGVzZSBiZWluZ3MgaGF2ZSBiZWNvbWUgbGliZXJhdGVkLCBpbiB0cnV0aCBJIGtub3cgdGhhdCBub3QgZXZlbiBhIHNpbmdsZSBiZWluZyBoYXMgYmVlbiBsaWJlcmF0ZWQu4oCZIFdoeSBpcyB0aGlzIHNvPyBJZiBhIGRpc2NpcGxlIGNoZXJpc2hlcyB0aGUgaWRlYSBvZiBhIHNlbGYsIGEgcGVyc29uLCBhIGxpdmluZyBiZWluZyBvciBhIHVuaXZlcnNhbCBzZWxmLCB0aGVuIHRoYXQgcGVyc29uIGlzIG5vdCBhbiBhdXRoZW50aWMgZGlzY2lwbGUuIFdoeT8gQmVjYXVzZSBpbiBmYWN0IHRoZXJlIGlzIG5vIGluZGVwZW5kZW50bHkgZXhpc3Rpbmcgb2JqZWN0IG9mIG1pbmQgY2FsbGVkIHRoZSBoaWdoZXN0LCBtb3N0IGZ1bGZpbGxlZCwgYW5kIGF3YWtlbmVkIG1pbmQu4oCdXCIsXG4gIFwi4oCcV2hhdCBkbyB5b3UgdGhpbmssIFN1Ymh1dGk/IEluIGFuY2llbnQgdGltZXMsIHdoZW4gdGhlIEJ1ZGRoYSB3YXMgbGl2aW5nIHdpdGggRGlwYW5rYXJhIEJ1ZGRoYSwgZGlkIGhlIGF0dGFpbiBhbnl0aGluZyBjYWxsZWQgdGhlIGhpZ2hlc3QsIG1vc3QgZnVsZmlsbGVkLCBhbmQgYXdha2VuZWQgbWluZD/igJ1cIixcbiAgXCLigJxObywgTW9zdCBIb25vcmVkIE9uZS4gQWNjb3JkaW5nIHRvIHdoYXQgSSB1bmRlcnN0YW5kIGZyb20gdGhlIHRlYWNoaW5ncyBvZiB0aGUgQnVkZGhhLCB0aGVyZSBpcyBubyBhdHRhaW5pbmcgb2YgYW55dGhpbmcgY2FsbGVkIHRoZSBoaWdoZXN0LCBtb3N0IGZ1bGZpbGxlZCwgYW5kIGF3YWtlbmVkIG1pbmQu4oCdXCIsXG4gIFwiVGhlIEJ1ZGRoYSBzYWlkOlwiLFxuICBcIuKAnFlvdSBhcmUgY29ycmVjdCwgU3ViaHV0aS4gSW4gZmFjdCwgdGhlcmUgZG9lcyBub3QgZXhpc3QgYW55IHNvLWNhbGxlZCBoaWdoZXN0LCBtb3N0IGZ1bGZpbGxlZCwgYW5kIGF3YWtlbmVkIG1pbmQgdGhhdCB0aGUgQnVkZGhhIGF0dGFpbnMuIEJlY2F1c2UgaWYgdGhlcmUgaGFkIGJlZW4gYW55IHN1Y2ggdGhpbmcsIERpcGFua2FyYSBCdWRkaGEgd291bGQgbm90IGhhdmUgcHJlZGljdGVkIG9mIG1lLCDigJhJbiB0aGUgZnV0dXJlLCB5b3Ugd2lsbCBjb21lIHRvIGJlIGEgQnVkZGhhIGtub3duIGFzIFRoZSBNb3N0IEhvbm9yZWQgT25l4oCZLiBUaGlzIHByZWRpY3Rpb24gd2FzIG1hZGUgYmVjYXVzZSB0aGVyZSBpcywgaW4gZmFjdCwgbm90aGluZyB0byBiZSBhdHRhaW5lZC4gU29tZW9uZSB3b3VsZCBiZSBtaXN0YWtlbiB0byBzYXkgdGhhdCB0aGUgQnVkZGhhIGhhcyBhdHRhaW5lZCB0aGUgaGlnaGVzdCwgbW9zdCBmdWxmaWxsZWQsIGFuZCBhd2FrZW5lZCBtaW5kIGJlY2F1c2UgdGhlcmUgaXMgbm8gc3VjaCB0aGluZyBhcyBhIGhpZ2hlc3QsIG1vc3QgZnVsZmlsbGVkLCBvciBhd2FrZW5lZCBtaW5kIHRvIGJlIGF0dGFpbmVkLuKAnVwiLFxuICBcIuKAnFN1Ymh1dGksIGEgY29tcGFyaXNvbiBjYW4gYmUgbWFkZSB3aXRoIHRoZSBpZGVhIG9mIGEgbGFyZ2UgaHVtYW4gYm9keS4gV2hhdCB3b3VsZCB5b3UgdW5kZXJzdGFuZCBtZSB0byBtZWFuIGlmIEkgc3Bva2Ugb2YgYSDigJhsYXJnZSBodW1hbiBib2R54oCZP+KAnVwiLFxuICBcIuKAnEkgd291bGQgdW5kZXJzdGFuZCB0aGF0IHRoZSBsb3JkIEJ1ZGRoYSB3YXMgc3BlYWtpbmcgb2YgYSDigJhsYXJnZSBodW1hbiBib2R54oCZIG5vdCBhcyBhbiBhcmJpdHJhcnkgY29uY2VwdGlvbiBvZiBpdHMgYmVpbmcsIGJ1dCBhcyBhIHNlcmllcyBvZiB3b3JkcyBvbmx5LiBJIHdvdWxkIHVuZGVyc3RhbmQgdGhhdCB0aGUgd29yZHMgY2FycmllZCBtZXJlbHkgYW4gaW1hZ2luYXJ5IG1lYW5pbmcuIFdoZW4gdGhlIEJ1ZGRoYSBzcGVha3Mgb2YgYSBsYXJnZSBodW1hbiBib2R5LCBoZSB1c2VzIHRoZSB3b3JkcyBvbmx5IGFzIHdvcmRzLuKAnVwiLFxuICBcIuKAnFN1Ymh1dGksIGl0IGlzIGp1c3QgdGhlIHNhbWUgd2hlbiBhIGRpc2NpcGxlIHNwZWFrcyBvZiBsaWJlcmF0aW5nIG51bWJlcmxlc3Mgc2VudGllbnQgYmVpbmdzLiBJZiB0aGV5IGhhdmUgaW4gbWluZCBhbnkgYXJiaXRyYXJ5IGNvbmNlcHRpb24gb2Ygc2VudGllbnQgYmVpbmdzIG9yIG9mIGRlZmluaXRlIG51bWJlcnMsIHRoZW4gdGhleSBhcmUgdW53b3J0aHkgb2YgYmVpbmcgY2FsbGVkIGEgZGlzY2lwbGUuIFN1Ymh1dGksIG15IHRlYWNoaW5ncyByZXZlYWwgdGhhdCBldmVuIHN1Y2ggYSB0aGluZyBhcyBpcyBjYWxsZWQgYSDigJhkaXNjaXBsZeKAmSBpcyBub24tZXhpc3RlbnQuIEZ1cnRoZXJtb3JlLCB0aGVyZSBpcyByZWFsbHkgbm90aGluZyBmb3IgYSBkaXNjaXBsZSB0byBsaWJlcmF0ZS7igJ1cIixcbiAgXCLigJxBIHRydWUgZGlzY2lwbGUga25vd3MgdGhhdCB0aGVyZSBpcyBubyBzdWNoIHRoaW5nIGFzIGEgc2VsZiwgYSBwZXJzb24sIGEgbGl2aW5nIGJlaW5nLCBvciBhIHVuaXZlcnNhbCBzZWxmLiBBIHRydWUgZGlzY2lwbGUga25vd3MgdGhhdCBhbGwgdGhpbmdzIGFyZSBkZXZvaWQgb2Ygc2VsZmhvb2QsIGRldm9pZCBvZiBhbnkgc2VwYXJhdGUgaW5kaXZpZHVhbGl0eS7igJ1cIixcbiAgXCJUbyBtYWtlIHRoaXMgdGVhY2hpbmcgZXZlbiBtb3JlIGVtcGhhdGljLCB0aGUgbG9yZCBCdWRkaGEgY29udGludWVkLFwiLFxuICBcIuKAnElmIGEgZGlzY2lwbGUgd2VyZSB0byBzcGVhayBhcyBmb2xsb3dzLCDigJhJIGhhdmUgdG8gY3JlYXRlIGEgc2VyZW5lIGFuZCBiZWF1dGlmdWwgQnVkZGhhIGZpZWxk4oCZLCB0aGF0IHBlcnNvbiBpcyBub3QgeWV0IHRydWx5IGEgZGlzY2lwbGUuIFdoeT8gV2hhdCB0aGUgQnVkZGhhIGNhbGxzIGEg4oCYc2VyZW5lIGFuZCBiZWF1dGlmdWwgQnVkZGhhIGZpZWxk4oCZIGlzIG5vdCBpbiBmYWN0IGEgc2VyZW5lIGFuZCBiZWF1dGlmdWwgQnVkZGhhIGZpZWxkLiBBbmQgdGhhdCBpcyB3aHkgaXQgaXMgY2FsbGVkIGEgc2VyZW5lIGFuZCBiZWF1dGlmdWwgQnVkZGhhIGZpZWxkLiBTdWJodXRpLCBvbmx5IGEgZGlzY2lwbGUgd2hvIGlzIHdob2xseSBkZXZvaWQgb2YgYW55IGNvbmNlcHRpb24gb2Ygc2VwYXJhdGUgc2VsZmhvb2QgaXMgd29ydGh5IG9mIGJlaW5nIGNhbGxlZCBhIGRpc2NpcGxlLuKAnVwiLFxuICBcIlRoZSBCdWRkaGEgdGhlbiBhc2tlZCBTdWJodXRpLCDigJxXaGF0IGRvIHlvdSB0aGluaz8gRG9lcyB0aGUgQnVkZGhhIGhhdmUgaHVtYW4gZXllcz/igJ1cIixcbiAgXCJTdWJodXRpIHJlcGxpZWQsIOKAnFllcywgaGUgaGFzIGh1bWFuIGV5ZXMu4oCdXCIsXG4gIFwi4oCcRG9lcyBoZSBoYXZlIHRoZSBleWVzIG9mIEVubGlnaHRlbm1lbnQ/4oCdXCIsXG4gIFwi4oCcT2YgY291cnNlLCB0aGUgQnVkZGhhIGhhcyB0aGUgZXllcyBvZiBFbmxpZ2h0ZW5tZW50LCBvdGhlcndpc2UgaGUgd291bGQgbm90IGJlIHRoZSBCdWRkaGEu4oCdXCIsXG4gIFwi4oCcRG9lcyB0aGUgQnVkZGhhIGhhdmUgdGhlIGV5ZXMgb2YgdHJhbnNjZW5kZW50IGludGVsbGlnZW5jZT/igJ1cIixcbiAgXCLigJxZZXMsIHRoZSBCdWRkaGEgaGFzIHRoZSBleWVzIG9mIHRyYW5zY2VuZGVudCBpbnRlbGxpZ2VuY2Uu4oCdXCIsXG4gIFwi4oCcRG9lcyB0aGUgQnVkZGhhIGhhdmUgdGhlIGV5ZXMgb2Ygc3Bpcml0dWFsIGludHVpdGlvbj/igJ1cIixcbiAgXCLigJxZZXMsIGxvcmQsIHRoZSBCdWRkaGEgaGFzIHRoZSBleWVzIG9mIHNwaXJpdHVhbCBpbnR1aXRpb24u4oCdXCIsXG4gIFwi4oCcRG9lcyB0aGUgQnVkZGhhIGhhdmUgdGhlIGV5ZXMgb2YgbG92ZSBhbmQgY29tcGFzc2lvbiBmb3IgYWxsIHNlbnRpZW50IGJlaW5ncz/igJ1cIixcbiAgXCJTdWJodXRpIGFncmVlZCBhbmQgc2FpZCwg4oCcTG9yZCwgeW91IGxvdmUgYWxsIHNlbnRpZW50IGxpZmUu4oCdXCIsXG4gIFwi4oCcV2hhdCBkbyB5b3UgdGhpbmssIFN1Ymh1dGk/IFdoZW4gSSByZWZlcnJlZCB0byB0aGUgZ3JhaW5zIG9mIHNhbmQgaW4gdGhlIHJpdmVyIEdhbmdlcywgZGlkIEkgYXNzZXJ0IHRoYXQgdGhleSB3ZXJlIHRydWx5IGdyYWlucyBvZiBzYW5kP+KAnVwiLFxuICBcIuKAnE5vIGJsZXNzZWQgbG9yZCwgeW91IG9ubHkgc3Bva2Ugb2YgdGhlbSBhcyBncmFpbnMgb2Ygc2FuZC7igJ1cIixcbiAgXCLigJxTdWJodXRpLCBpZiB0aGVyZSB3ZXJlIGFzIG1hbnkgR2FuZ2VzIHJpdmVycyBhcyB0aGVyZSBhcmUgZ3JhaW5zIG9mIHNhbmQgaW4gdGhlIHJpdmVyIEdhbmdlcywgYW5kIGlmIHRoZXJlIHdlcmUgYXMgbWFueSBidWRkaGFsYW5kcyBhcyB0aGVyZSBhcmUgZ3JhaW5zIG9mIHNhbmQgaW4gYWxsIHRob3NlIGlubnVtZXJhYmxlIHJpdmVycywgd291bGQgdGhlc2UgYnVkZGhhbGFuZHMgYmUgY29uc2lkZXJlZCBudW1lcm91cz/igJ1cIixcbiAgXCLigJxWZXJ5IG51bWVyb3VzIGluZGVlZCwgbG9yZCBCdWRkaGEu4oCdXCIsXG4gIFwi4oCcU3ViaHV0aSwgSSBrbm93IHRoZSBtaW5kIG9mIGV2ZXJ5IHNlbnRpZW50IGJlaW5nIGluIGFsbCB0aGUgaG9zdCBvZiB1bml2ZXJzZXMsIHJlZ2FyZGxlc3Mgb2YgYW55IG1vZGVzIG9mIHRob3VnaHQsIGNvbmNlcHRpb25zIG9yIHRlbmRlbmNpZXMuIEZvciBhbGwgbW9kZXMsIGNvbmNlcHRpb25zIGFuZCB0ZW5kZW5jaWVzIG9mIHRob3VnaHQgYXJlIG5vdCBtaW5kLiBBbmQgeWV0IHRoZXkgYXJlIGNhbGxlZCDigJhtaW5k4oCZLiBXaHk/IEl0IGlzIGltcG9zc2libGUgdG8gcmV0YWluIGEgcGFzdCB0aG91Z2h0LCB0byBzZWl6ZSBhIGZ1dHVyZSB0aG91Z2h0LCBhbmQgZXZlbiB0byBob2xkIG9udG8gYSBwcmVzZW50IHRob3VnaHQu4oCdXCIsXG4gIFwiVGhlIEJ1ZGRoYSBjb250aW51ZWQ6XCIsXG4gIFwi4oCcV2hhdCBkbyB5b3UgdGhpbmsgU3ViaHV0aT8gSWYgYSBmb2xsb3dlciB3ZXJlIHRvIGdpdmUgYXdheSBlbm91Z2ggdHJlYXN1cmVzIHRvIGZpbGwgMywwMDAgdW5pdmVyc2VzLCB3b3VsZCBhIGdyZWF0IGJsZXNzaW5nIGFuZCBtZXJpdCBpbmN1ciB0byBoaW0gb3IgaGVyP+KAnVwiLFxuICBcIlN1Ymh1dGkgcmVwbGllZCwg4oCcSG9ub3JlZCBvbmUsIHN1Y2ggYSBmb2xsb3dlciB3b3VsZCBhY3F1aXJlIGNvbnNpZGVyYWJsZSBibGVzc2luZ3MgYW5kIG1lcml0LuKAnVwiLFxuICBcIlRoZSBsb3JkIEJ1ZGRoYSBzYWlkOlwiLFxuICBcIuKAnFN1Ymh1dGksIGlmIHN1Y2ggYSBibGVzc2luZyBoYWQgYW55IHN1YnN0YW50aWFsaXR5LCBpZiBpdCB3ZXJlIGFueXRoaW5nIG90aGVyIHRoYW4gYSBmaWd1cmUgb2Ygc3BlZWNoLCB0aGUgTW9zdCBIb25vcmVkIE9uZSB3b3VsZCBub3QgaGF2ZSB1c2VkIHRoZSB3b3JkcyDigJhibGVzc2luZ3MgYW5kIG1lcml04oCZLuKAnVwiLFxuICBcIuKAnFN1Ymh1dGksIHdoYXQgZG8geW91IHRoaW5rLCBzaG91bGQgb25lIGxvb2sgZm9yIEJ1ZGRoYSBpbiBoaXMgcGVyZmVjdCBwaHlzaWNhbCBib2R5P+KAnVwiLFxuICBcIuKAnE5vLCBQZXJmZWN0bHkgRW5saWdodGVuZWQgT25lLCBvbmUgc2hvdWxkIG5vdCBsb29rIGZvciBCdWRkaGEgaW4gaGlzIHBlcmZlY3QgcGh5c2ljYWwgYm9keS4gV2h5PyBUaGUgQnVkZGhhIGhhcyBzYWlkIHRoYXQgdGhlIHBlcmZlY3QgcGh5c2ljYWwgYm9keSBpcyBub3QgdGhlIHBlcmZlY3QgcGh5c2ljYWwgYm9keS4gVGhlcmVmb3JlIGl0IGlzIGNhbGxlZCB0aGUgcGVyZmVjdCBwaHlzaWNhbCBib2R5LuKAnVwiLFxuICBcIuKAnFN1Ymh1dGksIHdoYXQgZG8geW91IHRoaW5rLCBzaG91bGQgb25lIGxvb2sgZm9yIEJ1ZGRoYSBpbiBhbGwgaGlzIHBlcmZlY3QgYXBwZWFyYW5jZXM/4oCdXCIsXG4gIFwi4oCcTm8gTW9zdCBIb25vcmVkIE9uZSwgb25lIHNob3VsZCBub3QgbG9vayBmb3IgQnVkZGhhIGluIGFsbCBoaXMgcGVyZmVjdCBhcHBlYXJhbmNlcy4gV2h5PyBUaGUgQnVkZGhhIGhhcyBzYWlkIHBlcmZlY3QgYXBwZWFyYW5jZXMgYXJlIG5vdCBwZXJmZWN0IGFwcGVhcmFuY2VzLiBUaGVyZWZvcmUgdGhleSBhcmUgY2FsbGVkIHBlcmZlY3QgYXBwZWFyYW5jZXMu4oCdXCIsXG4gIFwi4oCcU3ViaHV0aSwgZG8gbm90IG1haW50YWluIHRoYXQgdGhlIEJ1ZGRoYSBoYXMgdGhpcyB0aG91Z2h0OiDigJhJIGhhdmUgc3Bva2VuIHNwaXJpdHVhbCB0cnV0aHMu4oCZIERvIG5vdCB0aGluayB0aGF0IHdheS4gV2h5PyBJZiBzb21lb25lIHNheXMgdGhlIEJ1ZGRoYSBoYXMgc3Bva2VuIHNwaXJpdHVhbCB0cnV0aHMsIGhlIHNsYW5kZXJzIHRoZSBCdWRkaGEgZHVlIHRvIGhpcyBpbmFiaWxpdHkgdG8gdW5kZXJzdGFuZCB3aGF0IHRoZSBCdWRkaGEgdGVhY2hlcy4gU3ViaHV0aSwgYXMgdG8gc3BlYWtpbmcgdHJ1dGgsIG5vIHRydXRoIGNhbiBiZSBzcG9rZW4uIFRoZXJlZm9yZSBpdCBpcyBjYWxsZWQg4oCYc3BlYWtpbmcgdHJ1dGjigJku4oCdXCIsXG4gIFwiQXQgdGhhdCB0aW1lIFN1Ymh1dGksIHRoZSB3aXNlIGVsZGVyLCBhZGRyZXNzZWQgdGhlIEJ1ZGRoYSwg4oCcTW9zdCBIb25vcmVkIE9uZSwgd2lsbCB0aGVyZSBiZSBsaXZpbmcgYmVpbmdzIGluIHRoZSBmdXR1cmUgd2hvIGJlbGlldmUgaW4gdGhpcyBTdXRyYSB3aGVuIHRoZXkgaGVhciBpdD/igJ1cIixcbiAgXCJUaGUgQnVkZGhhIHNhaWQ6XCIsXG4gIFwi4oCcVGhlIGxpdmluZyBiZWluZ3MgdG8gd2hvbSB5b3UgcmVmZXIgYXJlIG5laXRoZXIgbGl2aW5nIGJlaW5ncyBub3Igbm90IGxpdmluZyBiZWluZ3MuIFdoeT8gU3ViaHV0aSwgYWxsIHRoZSBkaWZmZXJlbnQga2luZHMgb2YgbGl2aW5nIGJlaW5ncyB0aGUgQnVkZGhhIHNwZWFrcyBvZiBhcmUgbm90IGxpdmluZyBiZWluZ3MuIEJ1dCB0aGV5IGFyZSByZWZlcnJlZCB0byBhcyBsaXZpbmcgYmVpbmdzLuKAnVwiLFxuICBcIlN1Ymh1dGkgYWdhaW4gYXNrZWQsIOKAnEJsZXNzZWQgbG9yZCwgd2hlbiB5b3UgYXR0YWluZWQgY29tcGxldGUgRW5saWdodGVubWVudCwgZGlkIHlvdSBmZWVsIGluIHlvdXIgbWluZCB0aGF0IG5vdGhpbmcgaGFkIGJlZW4gYWNxdWlyZWQ/4oCdXCIsXG4gIFwiVGhlIEJ1ZGRoYSByZXBsaWVkOlwiLFxuICBcIuKAnFRoYXQgaXMgaXQgZXhhY3RseSwgU3ViaHV0aS4gV2hlbiBJIGF0dGFpbmVkIHRvdGFsIEVubGlnaHRlbm1lbnQsIEkgZGlkIG5vdCBmZWVsLCBhcyB0aGUgbWluZCBmZWVscywgYW55IGFyYml0cmFyeSBjb25jZXB0aW9uIG9mIHNwaXJpdHVhbCB0cnV0aCwgbm90IGV2ZW4gdGhlIHNsaWdodGVzdC4gRXZlbiB0aGUgd29yZHMg4oCYdG90YWwgRW5saWdodGVubWVudOKAmSBhcmUgbWVyZWx5IHdvcmRzLCB0aGV5IGFyZSB1c2VkIG1lcmVseSBhcyBhIGZpZ3VyZSBvZiBzcGVlY2gu4oCdXCIsXG4gIFwi4oCcRnVydGhlcm1vcmUgU3ViaHV0aSwgd2hhdCBJIGhhdmUgYXR0YWluZWQgaW4gdG90YWwgRW5saWdodGVubWVudCBpcyB0aGUgc2FtZSBhcyB3aGF0IGFsbCBvdGhlcnMgaGF2ZSBhdHRhaW5lZC4gSXQgaXMgdW5kaWZmZXJlbnRpYXRlZCwgcmVnYXJkZWQgbmVpdGhlciBhcyBhIGhpZ2ggc3RhdGUsIG5vciBhIGxvdyBzdGF0ZS4gSXQgaXMgd2hvbGx5IGluZGVwZW5kZW50IG9mIGFueSBkZWZpbml0ZSBvciBhcmJpdHJhcnkgY29uY2VwdGlvbnMgb2YgYW4gaW5kaXZpZHVhbCBzZWxmLCBvdGhlciBzZWx2ZXMsIGxpdmluZyBiZWluZ3MsIG9yIGEgdW5pdmVyc2FsIHNlbGYu4oCdXCIsXG4gIFwi4oCcU3ViaHV0aSwgd2hlbiBzb21lb25lIGlzIHNlbGZsZXNzbHkgY2hhcml0YWJsZSwgdGhleSBzaG91bGQgYWxzbyBwcmFjdGljZSBiZWluZyBldGhpY2FsIGJ5IHJlbWVtYmVyaW5nIHRoYXQgdGhlcmUgaXMgbm8gZGlzdGluY3Rpb24gYmV0d2VlbiBvbmXigJlzIHNlbGYgYW5kIHRoZSBzZWxmaG9vZCBvZiBvdGhlcnMuIFRodXMgb25lIHByYWN0aWNlcyBjaGFyaXR5IGJ5IGdpdmluZyBub3Qgb25seSBnaWZ0cywgYnV0IHRocm91Z2gga2luZG5lc3MgYW5kIHN5bXBhdGh5LiBQcmFjdGljZSBraW5kbmVzcyBhbmQgY2hhcml0eSB3aXRob3V0IGF0dGFjaG1lbnQgYW5kIHlvdSBjYW4gYmVjb21lIGZ1bGx5IGVubGlnaHRlbmVkLuKAnVwiLFxuICBcIuKAnFN1Ymh1dGksIHdoYXQgSSBqdXN0IHNhaWQgYWJvdXQga2luZG5lc3MgZG9lcyBub3QgbWVhbiB0aGF0IHdoZW4gc29tZW9uZSBpcyBiZWluZyBjaGFyaXRhYmxlIHRoZXkgc2hvdWxkIGhvbGQgb250byBhcmJpdHJhcnkgY29uY2VwdGlvbnMgYWJvdXQga2luZG5lc3MsIGZvciBraW5kbmVzcyBpcywgYWZ0ZXIgYWxsLCBvbmx5IGEgd29yZCBhbmQgY2hhcml0eSBuZWVkcyB0byBiZSBzcG9udGFuZW91cyBhbmQgc2VsZmxlc3MsIGRvbmUgd2l0aG91dCByZWdhcmQgZm9yIGFwcGVhcmFuY2VzLuKAnVwiLFxuICBcIlRoZSBCdWRkaGEgY29udGludWVkOlwiLFxuICBcIuKAnFN1Ymh1dGksIGlmIGEgcGVyc29uIGNvbGxlY3RlZCB0cmVhc3VyZXMgYXMgaGlnaCBhcyAzLDAwMCBvZiB0aGUgaGlnaGVzdCBtb3VudGFpbnMsIGFuZCBnYXZlIHRoZW0gYWxsIHRvIG90aGVycywgdGhlaXIgbWVyaXQgd291bGQgYmUgbGVzcyB0aGFuIHdoYXQgd291bGQgYWNjcnVlIHRvIGFub3RoZXIgcGVyc29uIHdobyBzaW1wbHkgb2JzZXJ2ZWQgYW5kIHN0dWRpZWQgdGhpcyBTdXRyYSBhbmQsIG91dCBvZiBraW5kbmVzcywgZXhwbGFpbmVkIGl0IHRvIG90aGVycy4gVGhlIGxhdHRlciBwZXJzb24gd291bGQgYWNjdW11bGF0ZSBodW5kcmVkcyBvZiB0aW1lcyB0aGUgbWVyaXQsIGh1bmRyZWRzIG9mIHRob3VzYW5kcyBvZiBtaWxsaW9ucyBvZiB0aW1lcyB0aGUgbWVyaXQuIFRoZXJlIGlzIG5vIGNvbmNlaXZhYmxlIGNvbXBhcmlzb24u4oCdXCIsXG4gIFwi4oCcU3ViaHV0aSwgZG8gbm90IHNheSB0aGF0IHRoZSBCdWRkaGEgaGFzIHRoZSBpZGVhLCDigJhJIHdpbGwgbGVhZCBhbGwgc2VudGllbnQgYmVpbmdzIHRvIE5pcnZhbmEu4oCZIERvIG5vdCB0aGluayB0aGF0IHdheSwgU3ViaHV0aS4gV2h5PyBJbiB0cnV0aCB0aGVyZSBpcyBub3Qgb25lIHNpbmdsZSBiZWluZyBmb3IgdGhlIEJ1ZGRoYSB0byBsZWFkIHRvIEVubGlnaHRlbm1lbnQuIElmIHRoZSBCdWRkaGEgd2VyZSB0byB0aGluayB0aGVyZSB3YXMsIGhlIHdvdWxkIGJlIGNhdWdodCBpbiB0aGUgaWRlYSBvZiBhIHNlbGYsIGEgcGVyc29uLCBhIGxpdmluZyBiZWluZywgb3IgYSB1bml2ZXJzYWwgc2VsZi4gU3ViaHV0aSwgd2hhdCB0aGUgQnVkZGhhIGNhbGxzIGEgc2VsZiBlc3NlbnRpYWxseSBoYXMgbm8gc2VsZiBpbiB0aGUgd2F5IHRoYXQgb3JkaW5hcnkgcGVyc29ucyB0aGluayB0aGVyZSBpcyBhIHNlbGYuIFN1Ymh1dGksIHRoZSBCdWRkaGEgZG9lcyBub3QgcmVnYXJkIGFueW9uZSBhcyBhbiBvcmRpbmFyeSBwZXJzb24uIFRoYXQgaXMgd2h5IGhlIGNhbiBzcGVhayBvZiB0aGVtIGFzIG9yZGluYXJ5IHBlcnNvbnMu4oCdXCIsXG4gIFwiVGhlbiB0aGUgQnVkZGhhIGlucXVpcmVkIG9mIFN1Ymh1dGk6XCIsXG4gIFwi4oCcV2hhdCBkbyB5b3UgdGhpbmsgU3ViaHV0aT8gSXMgaXQgcG9zc2libGUgdG8gcmVjb2duaXplIHRoZSBCdWRkaGEgYnkgdGhlIDMyIHBoeXNpY2FsIG1hcmtzP+KAnVwiLFxuICBcIlN1Ymh1dGkgcmVwbGllZCwg4oCcWWVzLCBNb3N0IEhvbm9yZWQgT25lLCB0aGUgQnVkZGhhIG1heSB0aHVzIGJlIHJlY29nbml6ZWQu4oCdXCIsXG4gIFwi4oCcU3ViaHV0aSwgaWYgdGhhdCB3ZXJlIHRydWUgdGhlbiBDaGFrcmF2YXJ0aW4sIHRoZSBteXRob2xvZ2ljYWwga2luZyB3aG8gYWxzbyBoYWQgdGhlIDMyIG1hcmtzLCB3b3VsZCBiZSBjYWxsZWQgYSBCdWRkaGEu4oCdXCIsXG4gIFwiVGhlbiBTdWJodXRpLCByZWFsaXppbmcgaGlzIGVycm9yLCBzYWlkLCDigJxNb3N0IEhvbm9yZWQgT25lLCBub3cgSSByZWFsaXplIHRoYXQgdGhlIEJ1ZGRoYSBjYW5ub3QgYmUgcmVjb2duaXplZCBtZXJlbHkgYnkgaGlzIDMyIHBoeXNpY2FsIG1hcmtzIG9mIGV4Y2VsbGVuY2Uu4oCdXCIsXG4gIFwiVGhlIEJ1ZGRoYSB0aGVuIHNhaWQ6XCIsXG4gIFwi4oCcU2hvdWxkIGFueW9uZSwgbG9va2luZyBhdCBhbiBpbWFnZSBvciBsaWtlbmVzcyBvZiB0aGUgQnVkZGhhLCBjbGFpbSB0byBrbm93IHRoZSBCdWRkaGEgYW5kIHdvcnNoaXAgaGltLCB0aGF0IHBlcnNvbiB3b3VsZCBiZSBtaXN0YWtlbiwgbm90IGtub3dpbmcgdGhlIHRydWUgQnVkZGhhLuKAnVwiLFxuICBcIuKAnEhvd2V2ZXIsIFN1Ymh1dGksIGlmIHlvdSB0aGluayB0aGF0IHRoZSBCdWRkaGEgcmVhbGl6ZXMgdGhlIGhpZ2hlc3QsIG1vc3QgZnVsZmlsbGVkLCBhbmQgYXdha2VuZWQgbWluZCBhbmQgZG9lcyBub3QgbmVlZCB0byBoYXZlIGFsbCB0aGUgbWFya3MsIHlvdSBhcmUgbWlzdGFrZW4uIFN1Ymh1dGksIGRvIG5vdCB0aGluayBpbiB0aGF0IHdheS4gRG8gbm90IHRoaW5rIHRoYXQgd2hlbiBvbmUgZ2l2ZXMgcmlzZSB0byB0aGUgaGlnaGVzdCwgbW9zdCBmdWxmaWxsZWQsIGFuZCBhd2FrZW5lZCBtaW5kLCBvbmUgbmVlZHMgdG8gc2VlIGFsbCBvYmplY3RzIG9mIG1pbmQgYXMgbm9uZXhpc3RlbnQsIGN1dCBvZmYgZnJvbSBsaWZlLiBQbGVhc2UgZG8gbm90IHRoaW5rIGluIHRoYXQgd2F5LiBPbmUgd2hvIGdpdmVzIHJpc2UgdG8gdGhlIGhpZ2hlc3QsIG1vc3QgZnVsZmlsbGVkLCBhbmQgYXdha2VuZWQgbWluZCBkb2VzIG5vdCBjb250ZW5kIHRoYXQgYWxsIG9iamVjdHMgb2YgbWluZCBhcmUgbm9uZXhpc3RlbnQgYW5kIGN1dCBvZmYgZnJvbSBsaWZlLiBUaGF0IGlzIG5vdCB3aGF0IEkgc2F5LuKAnVwiLFxuICBcIlRoZSBsb3JkIEJ1ZGRoYSBjb250aW51ZWQ6XCIsXG4gIFwi4oCcU3ViaHV0aSwgaWYgc29tZW9uZSBnaXZlcyB0cmVhc3VyZXMgZXF1YWwgdG8gdGhlIG51bWJlciBvZiBzYW5kcyBvbiB0aGUgc2hvcmVzIG9mIHRoZSBHYW5nZXMgcml2ZXIsIGFuZCBpZiBhbm90aGVyLCBoYXZpbmcgcmVhbGl6ZWQgdGhlIGVnb2xlc3NuZXNzIG9mIGFsbCB0aGluZ3MsIHRoZXJlYnkgdW5kZXJzdGFuZHMgc2VsZmxlc3NuZXNzLCB0aGUgbGF0dGVyIHdvdWxkIGJlIG1vcmUgYmxlc3NlZCB0aGFuIHRoZSBvbmUgd2hvIHByYWN0aWNlZCBleHRlcm5hbCBjaGFyaXR5LiBXaHk/IEJlY2F1c2UgZ3JlYXQgZGlzY2lwbGVzIGRvIG5vdCBzZWUgYmxlc3NpbmdzIGFuZCBtZXJpdCBhcyBhIHByaXZhdGUgcG9zc2Vzc2lvbiwgYXMgc29tZXRoaW5nIHRvIGJlIGdhaW5lZC7igJ1cIixcbiAgXCJTdWJodXRpIGlucXVpcmVkIG9mIHRoZSBsb3JkIEJ1ZGRoYSwg4oCcV2hhdCBkbyB5b3UgbWVhbiDigJhncmVhdCBkaXNjaXBsZXMgZG8gbm90IHNlZSBibGVzc2luZ3MgYW5kIG1lcml0IGFzIGEgcHJpdmF0ZSBwb3NzZXNzaW9u4oCZP+KAnVwiLFxuICBcIlRoZSBCdWRkaGEgcmVwbGllZDpcIixcbiAgXCLigJxCZWNhdXNlIHRob3NlIGJsZXNzaW5ncyBhbmQgbWVyaXQgaGF2ZSBuZXZlciBiZWVuIHNvdWdodCBhZnRlciBieSB0aG9zZSBncmVhdCBkaXNjaXBsZXMsIHRoZXkgZG8gbm90IHNlZSB0aGVtIGFzIHByaXZhdGUgcG9zc2Vzc2lvbnMsIGJ1dCB0aGV5IHNlZSB0aGVtIGFzIHRoZSBjb21tb24gcG9zc2Vzc2lvbiBvZiBhbGwgYmVpbmdzLuKAnVwiLFxuICBcIlRoZSBCdWRkaGEgc2FpZDpcIixcbiAgXCLigJxTdWJodXRpLCBpZiBhbnkgcGVyc29uIHdlcmUgdG8gc2F5IHRoYXQgdGhlIEJ1ZGRoYSBpcyBub3cgY29taW5nIG9yIGdvaW5nLCBvciBzaXR0aW5nIHVwIG9yIGx5aW5nIGRvd24sIHRoZXkgd291bGQgbm90IGhhdmUgdW5kZXJzdG9vZCB0aGUgcHJpbmNpcGxlIEkgaGF2ZSBiZWVuIHRlYWNoaW5nLiBXaHk/IEJlY2F1c2Ugd2hpbGUgdGhlIGV4cHJlc3Npb24g4oCYQnVkZGhh4oCZIG1lYW5zIOKAmGhlIHdobyBoYXMgdGh1cyBjb21lLCB0aHVzIGdvbmUs4oCZIHRoZSB0cnVlIEJ1ZGRoYSBpcyBuZXZlciBjb21pbmcgZnJvbSBhbnl3aGVyZSBvciBnb2luZyBhbnl3aGVyZS4gVGhlIG5hbWUg4oCYQnVkZGhh4oCZIGlzIG1lcmVseSBhbiBleHByZXNzaW9uLCBhIGZpZ3VyZSBvZiBzcGVlY2gu4oCdXCIsXG4gIFwiVGhlIGxvcmQgQnVkZGhhIHJlc3VtZWQ6XCIsXG4gIFwi4oCcU3ViaHV0aSwgaWYgYW55IGdvb2QgcGVyc29uLCBlaXRoZXIgbWFuIG9yIHdvbWFuLCB3ZXJlIHRvIHRha2UgMywwMDAgZ2FsYXhpZXMgYW5kIGdyaW5kIHRoZW0gaW50byBtaWNyb3Njb3BpYyBwb3dkZXIgYW5kIGJsb3cgaXQgaW50byBzcGFjZSwgd2hhdCBkbyB5b3UgdGhpbmssIHdvdWxkIHRoaXMgcG93ZGVyIGhhdmUgYW55IGluZGl2aWR1YWwgZXhpc3RlbmNlP+KAnVwiLFxuICBcIlN1Ymh1dGkgcmVwbGllZCwg4oCcWWVzLCBsb3JkLCBhcyBhIG1pY3Jvc2NvcGljIHBvd2RlciBibG93biBpbnRvIHNwYWNlLCBpdCBtaWdodCBiZSBzYWlkIHRvIGhhdmUgYSByZWxhdGl2ZSBleGlzdGVuY2UsIGJ1dCBhcyB5b3UgdXNlIHdvcmRzLCBpdCBoYXMgbm8gZXhpc3RlbmNlLiBUaGUgd29yZHMgYXJlIHVzZWQgb25seSBhcyBhIGZpZ3VyZSBvZiBzcGVlY2guIE90aGVyd2lzZSB0aGUgd29yZHMgd291bGQgaW1wbHkgYSBiZWxpZWYgaW4gdGhlIGV4aXN0ZW5jZSBvZiBtYXR0ZXIgYXMgYW4gaW5kZXBlbmRlbnQgYW5kIHNlbGYtZXhpc3RlbnQgdGhpbmcsIHdoaWNoIGl0IGlzIG5vdC7igJ1cIixcbiAgXCLigJxGdXJ0aGVybW9yZSwgd2hlbiB0aGUgTW9zdCBIb25vcmVkIE9uZSByZWZlcnMgdG8gdGhlIOKAmDMsMDAwIGdhbGF4aWVzLOKAmSBoZSBjb3VsZCBvbmx5IGRvIHNvIGFzIGEgZmlndXJlIG9mIHNwZWVjaC4gV2h5PyBCZWNhdXNlIGlmIHRoZSAzLDAwMCBnYWxheGllcyByZWFsbHkgZXhpc3RlZCwgdGhlaXIgb25seSByZWFsaXR5IHdvdWxkIGNvbnNpc3QgaW4gdGhlaXIgY29zbWljIHVuaXR5LiBXaGV0aGVyIGFzIG1pY3Jvc2NvcGljIHBvd2RlciBvciBhcyBnYWxheGllcywgd2hhdCBkb2VzIGl0IG1hdHRlcj8gT25seSBpbiB0aGUgc2Vuc2Ugb2YgdGhlIGNvc21pYyB1bml0eSBvZiB1bHRpbWF0ZSBiZWluZyBjYW4gdGhlIEJ1ZGRoYSByaWdodGZ1bGx5IHJlZmVyIHRvIGl0LuKAnVwiLFxuICBcIlRoZSBsb3JkIEJ1ZGRoYSB3YXMgdmVyeSBwbGVhc2VkIHdpdGggdGhpcyByZXBseSBhbmQgc2FpZDpcIixcbiAgXCLigJxTdWJodXRpLCBhbHRob3VnaCBvcmRpbmFyeSBwZW9wbGUgaGF2ZSBhbHdheXMgZ3Jhc3BlZCBhZnRlciBhbiBhcmJpdHJhcnkgY29uY2VwdGlvbiBvZiBtYXR0ZXIgYW5kIGdhbGF4aWVzLCB0aGUgY29uY2VwdCBoYXMgbm8gdHJ1ZSBiYXNpczsgaXQgaXMgYW4gaWxsdXNpb24gb2YgdGhlIG1vcnRhbCBtaW5kLiBFdmVuIHdoZW4gaXQgaXMgcmVmZXJyZWQgdG8gYXMg4oCYY29zbWljIHVuaXR54oCZIGl0IGlzIHVudGhpbmthYmxlIGFuZCB1bmtub3dhYmxlLuKAnVwiLFxuICBcIlRoZSBsb3JkIEJ1ZGRoYSBjb250aW51ZWQ6XCIsXG4gIFwi4oCcSWYgYW55IHBlcnNvbiB3ZXJlIHRvIHNheSB0aGF0IHRoZSBCdWRkaGEsIGluIGhpcyB0ZWFjaGluZ3MsIGhhcyBjb25zdGFudGx5IHJlZmVycmVkIHRvIGhpbXNlbGYsIHRvIG90aGVyIHNlbHZlcywgdG8gbGl2aW5nIGJlaW5ncywgb3IgdG8gYSB1bml2ZXJzYWwgc2VsZiwgd2hhdCBkbyB5b3UgdGhpbmssIHdvdWxkIHRoYXQgcGVyc29uIGhhdmUgdW5kZXJzdG9vZCBteSBtZWFuaW5nP+KAnVwiLFxuICBcIlN1Ymh1dGkgcmVwbGllZCwg4oCcTm8sIGJsZXNzZWQgbG9yZC4gVGhhdCBwZXJzb24gd291bGQgbm90IGhhdmUgdW5kZXJzdG9vZCB0aGUgbWVhbmluZyBvZiB5b3VyIHRlYWNoaW5ncy4gRm9yIHdoZW4geW91IHJlZmVyIHRvIHRob3NlIHRoaW5ncywgeW91IGFyZSBub3QgcmVmZXJyaW5nIHRvIHRoZWlyIGFjdHVhbCBleGlzdGVuY2UsIHlvdSBvbmx5IHVzZSB0aGUgd29yZHMgYXMgZmlndXJlcyBvZiBzcGVlY2gsIGFzIHN5bWJvbHMuIE9ubHkgaW4gdGhhdCBzZW5zZSBjYW4gd29yZHMgYmUgdXNlZCwgZm9yIGNvbmNlcHRpb25zLCBpZGVhcywgbGltaXRlZCB0cnV0aHMsIGFuZCBzcGlyaXR1YWwgdHJ1dGhzIGhhdmUgbm8gbW9yZSByZWFsaXR5IHRoYW4gaGF2ZSBtYXR0ZXIgb3IgcGhlbm9tZW5hLuKAnVwiLFxuICBcIlRoZW4gdGhlIGxvcmQgQnVkZGhhIG1hZGUgaGlzIG1lYW5pbmcgZXZlbiBtb3JlIGVtcGhhdGljIGJ5IHNheWluZzpcIixcbiAgXCLigJxTdWJodXRpLCB3aGVuIHBlb3BsZSBiZWdpbiB0aGVpciBwcmFjdGljZSBvZiBzZWVraW5nIHRvIGF0dGFpbmluZyB0b3RhbCBFbmxpZ2h0ZW5tZW50LCB0aGV5IG91Z2h0IHRvIHNlZSwgdG8gcGVyY2VpdmUsIHRvIGtub3csIHRvIHVuZGVyc3RhbmQsIGFuZCB0byByZWFsaXplIHRoYXQgYWxsIHRoaW5ncyBhbmQgYWxsIHNwaXJpdHVhbCB0cnV0aHMgYXJlIG5vLXRoaW5ncywgYW5kLCB0aGVyZWZvcmUsIHRoZXkgb3VnaHQgbm90IHRvIGNvbmNlaXZlIHdpdGhpbiB0aGVpciBtaW5kcyBhbnkgYXJiaXRyYXJ5IGNvbmNlcHRpb25zIHdoYXRzb2V2ZXIu4oCdXCIsXG4gIFwiQnVkZGhhIGNvbnRpbnVlZDpcIixcbiAgXCLigJxTdWJodXRpLCBpZiBhbnlvbmUgZ2F2ZSB0byB0aGUgQnVkZGhhIGFuIGltbWVhc3VyYWJsZSBxdWFudGl0eSBvZiB0aGUgc2V2ZW4gdHJlYXN1cmVzIHN1ZmZpY2llbnQgdG8gZmlsbCB0aGUgd2hvbGUgdW5pdmVyc2U7IGFuZCBpZiBhbm90aGVyIHBlcnNvbiwgd2hldGhlciBhIG1hbiBvciB3b21hbiwgaW4gc2Vla2luZyB0byBhdHRhaW4gY29tcGxldGUgRW5saWdodGVubWVudCB3ZXJlIHRvIGVhcm5lc3RseSBhbmQgZmFpdGhmdWxseSBvYnNlcnZlIGFuZCBzdHVkeSBldmVuIGEgc2luZ2xlIHNlY3Rpb24gb2YgdGhpcyBTdXRyYSBhbmQgZXhwbGFpbiBpdCB0byBvdGhlcnMsIHRoZSBhY2N1bXVsYXRlZCBibGVzc2luZyBhbmQgbWVyaXQgb2YgdGhhdCBsYXR0ZXIgcGVyc29uIHdvdWxkIGJlIGZhciBncmVhdGVyLuKAnVwiLFxuICBcIuKAnFN1Ymh1dGksIGhvdyBjYW4gb25lIGV4cGxhaW4gdGhpcyBTdXRyYSB0byBvdGhlcnMgd2l0aG91dCBob2xkaW5nIGluIG1pbmQgYW55IGFyYml0cmFyeSBjb25jZXB0aW9uIG9mIGZvcm1zIG9yIHBoZW5vbWVuYSBvciBzcGlyaXR1YWwgdHJ1dGhzPyBJdCBjYW4gb25seSBiZSBkb25lLCBTdWJodXRpLCBieSBrZWVwaW5nIHRoZSBtaW5kIGluIHBlcmZlY3QgdHJhbnF1aWxpdHkgYW5kIGZyZWUgZnJvbSBhbnkgYXR0YWNobWVudCB0byBhcHBlYXJhbmNlcy7igJ1cIixcbiAgXCLigJxTbyBJIHNheSB0byB5b3Ug4oCTXCIsXG4gIFwiVGhpcyBpcyBob3cgdG8gY29udGVtcGxhdGUgb3VyIGNvbmRpdGlvbmVkIGV4aXN0ZW5jZSBpbiB0aGlzIGZsZWV0aW5nIHdvcmxkOuKAnVwiLFxuICBcIuKAnExpa2UgYSB0aW55IGRyb3Agb2YgZGV3LCBvciBhIGJ1YmJsZSBmbG9hdGluZyBpbiBhIHN0cmVhbTtcIixcbiAgXCJMaWtlIGEgZmxhc2ggb2YgbGlnaHRuaW5nIGluIGEgc3VtbWVyIGNsb3VkLFwiLFxuICBcIk9yIGEgZmxpY2tlcmluZyBsYW1wLCBhbiBpbGx1c2lvbiwgYSBwaGFudG9tLCBvciBhIGRyZWFtLuKAnVwiLFxuICBcIuKAnFNvIGlzIGFsbCBjb25kaXRpb25lZCBleGlzdGVuY2UgdG8gYmUgc2Vlbi7igJ1cIixcbiAgXCJUaHVzIHNwb2tlIEJ1ZGRoYS5cIlxuXSIsInZhciBNYXJrb3ZDaGFpbiA9IHJlcXVpcmUoJ21hcmtvdmNoYWluJyk7XG52YXIgc3V0cmEgPSByZXF1aXJlKCcuL2RpYW1vbmRfc3V0cmEuanNvbicpO1xudmFyIHRleHQgPSBzdXRyYS5qb2luKCcgJyk7XG5jb25zdCBtYXJrb3YgPSBuZXcgTWFya292Q2hhaW4odGV4dCk7XG5cbmxldCBpeCA9IDA7XG5cbmNvbnN0IHNyYyA9IFsnKiddO1xuXG5mdW5jdGlvbiBnZW5lcmF0ZUFuZERpc3BsYXlUZXh0KCkge1xuICAgIGxldCB0eHQgPSAnOyc7XG4gICAgbGV0IGdvbGQgPSBmYWxzZTtcblxuICAgIGlmICgoaXggPiAxICYmIGl4ICUgMzIpID09IDEgfHwgTWF0aC5yYW5kb20oKSA8IDAuMDEpIHtcbiAgICAgICAgdHh0ID0gc3V0cmFbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogc3V0cmEubGVuZ3RoKV07XG4gICAgICAgIGdvbGQgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoTWF0aC5yYW5kb20oKSA8IDAuODApIHtcbiAgICAgICAgY29uc3QgbiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwOCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICB0eHQgKz0gc3JjW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHNyYy5sZW5ndGgpXTtcbiAgICAgICAgICAgIGlmIChpICUgMzIgPT0gMCkge1xuICAgICAgICAgICAgICAgIHR4dCArPSAnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB0eHQgPSBtYXJrb3Yuc3RhcnQoJ3doYXQnKS5lbmQoOCArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDI2KSkucHJvY2VzcygpO1xuICAgIH1cblxuICAgIGNvbnN0IHR4dEVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0eHRFbGVtLmNsYXNzTGlzdC5hZGQoJ3R4dCcpO1xuICAgIGlmIChnb2xkKSB7XG4gICAgICAgIHR4dEVsZW0uc3R5bGUuY29sb3IgPSAnZ29sZCc7XG4gICAgfVxuXG4gICAgLy8gU2ltdWxhdGUgdHlwaW5nIGVmZmVjdFxuICAgIGNvbnN0IHR5cGluZ1NwZWVkID0gNTsgLy8gbWlsbGlzZWNvbmRzIHBlciBjaGFyYWN0ZXJcbiAgICBsZXQgY2hhckluZGV4ID0gMDtcblxuICAgIGZ1bmN0aW9uIHR5cGVDaGFyYWN0ZXIoKSB7XG4gICAgICAgIGlmIChjaGFySW5kZXggPCB0eHQubGVuZ3RoKSB7XG4gICAgICAgICAgICB0eHRFbGVtLnRleHRDb250ZW50ICs9IHR4dFtjaGFySW5kZXhdO1xuICAgICAgICAgICAgY2hhckluZGV4Kys7XG4gICAgICAgICAgICBzY3JvbGxUb0JvdHRvbSgpO1xuICAgICAgICAgICAgc2V0VGltZW91dCh0eXBlQ2hhcmFjdGVyLCB0eXBpbmdTcGVlZCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0eXBlQ2hhcmFjdGVyKCk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGVybWluYWwnKS5hcHBlbmRDaGlsZCh0eHRFbGVtKTtcblxuICAgIGl4Kys7XG59XG5cblxuZnVuY3Rpb24gc2Nyb2xsVG9Cb3R0b20oKSB7XG4gICAgdmFyIHRlcm1pbmFsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Rlcm1pbmFsJyk7XG4gICAgdGVybWluYWwuc2Nyb2xsVG9wID0gdGVybWluYWwuc2Nyb2xsSGVpZ2h0O1xufVxuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGdlbmVyYXRlQW5kRGlzcGxheVRleHQoKTtcbn0pO1xuXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGVybWluYWwnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGdlbmVyYXRlQW5kRGlzcGxheVRleHQoKTtcbn0pO1xuIiwiIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gKGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmICgndmFsdWUnIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfSByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9OyB9KSgpO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvbicpOyB9IH1cblxudmFyIHBpY2tPbmVCeVdlaWdodCA9IHJlcXVpcmUoJ3BpY2stb25lLWJ5LXdlaWdodCcpO1xuXG52YXIgaXNUeXBlID0gZnVuY3Rpb24gaXNUeXBlKHQpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh0KS5zbGljZSg4LCAtMSkudG9Mb3dlckNhc2UoKTtcbn07XG5cbnZhciBNYXJrb3ZDaGFpbiA9IChmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIE1hcmtvdkNoYWluKGNvbnRlbnRzKSB7XG4gICAgdmFyIG5vcm1GbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGZ1bmN0aW9uICh3b3JkKSB7XG4gICAgICByZXR1cm4gd29yZC5yZXBsYWNlKC9cXC4kL2lnLCAnJyk7XG4gICAgfSA6IGFyZ3VtZW50c1sxXTtcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBNYXJrb3ZDaGFpbik7XG5cbiAgICB0aGlzLndvcmRCYW5rID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB0aGlzLnNlbnRlbmNlID0gJyc7XG4gICAgdGhpcy5fbm9ybWFsaXplRm4gPSBub3JtRm47XG4gICAgdGhpcy5wYXJzZUJ5ID0gLyg/OlxcLnxcXD98XFxuKS9pZztcbiAgICB0aGlzLnBhcnNlKGNvbnRlbnRzKTtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhNYXJrb3ZDaGFpbiwgW3tcbiAgICBrZXk6ICdzdGFydEZuJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gc3RhcnRGbih3b3JkTGlzdCkge1xuICAgICAgdmFyIGsgPSBPYmplY3Qua2V5cyh3b3JkTGlzdCk7XG4gICAgICB2YXIgbCA9IGsubGVuZ3RoO1xuICAgICAgcmV0dXJuIGtbfiB+KE1hdGgucmFuZG9tKCkgKiBsKV07XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnZW5kRm4nLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBlbmRGbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnNlbnRlbmNlLnNwbGl0KCcgJykubGVuZ3RoID4gNztcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdwcm9jZXNzJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gcHJvY2VzcygpIHtcbiAgICAgIHZhciBjdXJXb3JkID0gdGhpcy5zdGFydEZuKHRoaXMud29yZEJhbmspO1xuICAgICAgdGhpcy5zZW50ZW5jZSA9IGN1cldvcmQ7XG4gICAgICB3aGlsZSAodGhpcy53b3JkQmFua1tjdXJXb3JkXSAmJiAhdGhpcy5lbmRGbigpKSB7XG4gICAgICAgIGN1cldvcmQgPSBwaWNrT25lQnlXZWlnaHQodGhpcy53b3JkQmFua1tjdXJXb3JkXSk7XG4gICAgICAgIHRoaXMuc2VudGVuY2UgKz0gJyAnICsgY3VyV29yZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnNlbnRlbmNlO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ3BhcnNlJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gcGFyc2UoKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICB2YXIgdGV4dCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/ICcnIDogYXJndW1lbnRzWzBdO1xuICAgICAgdmFyIHBhcnNlQnkgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyB0aGlzLnBhcnNlQnkgOiBhcmd1bWVudHNbMV07XG5cbiAgICAgIHRleHQuc3BsaXQocGFyc2VCeSkuZm9yRWFjaChmdW5jdGlvbiAobGluZXMpIHtcbiAgICAgICAgdmFyIHdvcmRzID0gbGluZXMuc3BsaXQoJyAnKS5maWx0ZXIoZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgICByZXR1cm4gdy50cmltKCkgIT09ICcnO1xuICAgICAgICB9KTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB3b3Jkcy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgICB2YXIgY3VyV29yZCA9IF90aGlzLl9ub3JtYWxpemUod29yZHNbaV0pO1xuICAgICAgICAgIHZhciBuZXh0V29yZCA9IF90aGlzLl9ub3JtYWxpemUod29yZHNbaSArIDFdKTtcblxuICAgICAgICAgIGlmICghX3RoaXMud29yZEJhbmtbY3VyV29yZF0pIHtcbiAgICAgICAgICAgIF90aGlzLndvcmRCYW5rW2N1cldvcmRdID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFfdGhpcy53b3JkQmFua1tjdXJXb3JkXVtuZXh0V29yZF0pIHtcbiAgICAgICAgICAgIF90aGlzLndvcmRCYW5rW2N1cldvcmRdW25leHRXb3JkXSA9IDE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF90aGlzLndvcmRCYW5rW2N1cldvcmRdW25leHRXb3JkXSArPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdzdGFydCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHN0YXJ0KGZuU3RyKSB7XG4gICAgICB2YXIgc3RhcnRUeXBlID0gaXNUeXBlKGZuU3RyKTtcbiAgICAgIGlmIChzdGFydFR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuc3RhcnRGbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gZm5TdHI7XG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKHN0YXJ0VHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLnN0YXJ0Rm4gPSBmdW5jdGlvbiAod29yZExpc3QpIHtcbiAgICAgICAgICByZXR1cm4gZm5TdHIod29yZExpc3QpO1xuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNdXN0IHBhc3MgYSBmdW5jdGlvbiwgb3Igc3RyaW5nIGludG8gc3RhcnQoKScpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnZW5kJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZW5kKGZuU3RyT3JOdW0pIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICB2YXIgZW5kVHlwZSA9IGlzVHlwZShmblN0ck9yTnVtKTtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKGVuZFR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5lbmRGbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gZm5TdHJPck51bShfdGhpczIuc2VudGVuY2UpO1xuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmIChlbmRUeXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLmVuZEZuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczIuc2VudGVuY2Uuc3BsaXQoJyAnKS5zbGljZSgtMSlbMF0gPT09IGZuU3RyT3JOdW07XG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKGVuZFR5cGUgPT09ICdudW1iZXInIHx8IGZuU3RyT3JOdW0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmblN0ck9yTnVtID0gZm5TdHJPck51bSB8fCBJbmZpbml0eTtcbiAgICAgICAgdGhpcy5lbmRGbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gc2VsZi5zZW50ZW5jZS5zcGxpdCgnICcpLmxlbmd0aCA+IGZuU3RyT3JOdW07XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ011c3QgcGFzcyBhIGZ1bmN0aW9uLCBzdHJpbmcgb3IgbnVtYmVyIGludG8gZW5kKCknKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ19ub3JtYWxpemUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBfbm9ybWFsaXplKHdvcmQpIHtcbiAgICAgIHJldHVybiB0aGlzLl9ub3JtYWxpemVGbih3b3JkKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdub3JtYWxpemUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBub3JtYWxpemUoZm4pIHtcbiAgICAgIHRoaXMuX25vcm1hbGl6ZUZuID0gZm47XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1dLCBbe1xuICAgIGtleTogJ1ZFUlNJT04nLFxuICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgcmV0dXJuIHJlcXVpcmUoJy4uL3BhY2thZ2UnKS52ZXJzaW9uO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ01hcmtvdkNoYWluJyxcbiAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgIC8vIGxvYWQgb2xkZXIgTWFya292Q2hhaW5cbiAgICAgIHJldHVybiByZXF1aXJlKCcuLi9vbGRlci9pbmRleC5qcycpLk1hcmtvdkNoYWluO1xuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBNYXJrb3ZDaGFpbjtcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWFya292Q2hhaW47IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXN5bmMgPSByZXF1aXJlKCdhc3luYycpXG4gICwgZnMgPSByZXF1aXJlKCdmcycpXG4gICwgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxuICAsIHBpY2tPbmVCeVdlaWdodCA9IHJlcXVpcmUoJ3BpY2stb25lLWJ5LXdlaWdodCcpXG4gICwgaXNUeXBlXG4gICwga2luZGFGaWxlXG4gICwgTWFya292Q2hhaW5cblxuaXNUeXBlID0gZnVuY3Rpb24odCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHQpLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpXG59XG5cbmtpbmRhRmlsZSA9IGZ1bmN0aW9uKGZpbGUpIHtcbiAgcmV0dXJuIGZpbGUuaW5kZXhPZignLicgKyBwYXRoLnNlcCkgPT09IDAgfHwgZmlsZS5pbmRleE9mKHBhdGguc2VwKSA9PT0gMFxufVxuXG5NYXJrb3ZDaGFpbiA9IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgaWYgKCFhcmdzKSB7IGFyZ3MgPSB7fSB9XG4gIHRoaXMud29yZEJhbmsgPSB7fVxuICB0aGlzLnNlbnRlbmNlID0gJydcbiAgdGhpcy5maWxlcyA9IFtdXG4gIGlmIChhcmdzLmZpbGVzKSB7XG4gICAgcmV0dXJuIHRoaXMudXNlKGFyZ3MuZmlsZXMpXG4gIH1cblxuICB0aGlzLnN0YXJ0Rm4gPSBmdW5jdGlvbih3b3JkTGlzdCkge1xuICAgIHZhciBrID0gT2JqZWN0LmtleXMod29yZExpc3QpXG4gICAgdmFyIGwgPSBrLmxlbmd0aFxuXG4gICAgcmV0dXJuIGtbfn4oTWF0aC5yYW5kb20oKSpsKV1cbiAgfVxuXG4gIHRoaXMuZW5kRm4gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5zZW50ZW5jZS5zcGxpdCgnICcpLmxlbmd0aCA+IDdcbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1hcmtvdkNoYWluLnByb3RvdHlwZS5WRVJTSU9OID0gcmVxdWlyZSgnLi4vcGFja2FnZScpLnZlcnNpb25cblxuTWFya292Q2hhaW4ucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uKGZpbGVzKSB7XG4gIGlmIChpc1R5cGUoZmlsZXMpID09PSAnYXJyYXknKSB7XG4gICAgdGhpcy5maWxlcyA9IGZpbGVzXG4gIH1cbiAgZWxzZSBpZiAoaXNUeXBlKGZpbGVzKSA9PT0gJ3N0cmluZycpIHtcbiAgICB0aGlzLmZpbGVzID0gW2ZpbGVzXVxuICB9XG4gIGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignTmVlZCB0byBwYXNzIGEgc3RyaW5nIG9yIGFycmF5IGZvciB1c2UoKScpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuTWFya292Q2hhaW4ucHJvdG90eXBlLnJlYWRGaWxlID0gZnVuY3Rpb24oZmlsZSkge1xuICByZXR1cm4gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBmcy5yZWFkRmlsZShmaWxlLCAndXRmOCcsIGZ1bmN0aW9uKGVyciwgZGF0YSkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICAvLyBpZiB0aGUgZmlsZSBkb2VzIG5vdCBleGlzdCxcbiAgICAgICAgLy8gaWYgYGZpbGVgIHN0YXJ0cyB3aXRoIC4vIG9yIC8sIGFzc3VtaW5nIHRyeWluZyB0byBiZSBhIGZpbGVcbiAgICAgICAgLy8gaWYgYGZpbGVgIGhhcyBhICcuJywgYW5kIHRoZSBzdHJpbmcgYWZ0ZXIgdGhhdCBoYXMgbm8gc3BhY2UsIGFzc3VtZSBmaWxlXG4gICAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VOT0VOVCcgJiYgIWtpbmRhRmlsZShmaWxlKSkge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBmaWxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKVxuICAgICAgfVxuICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHsgY2FsbGJhY2sobnVsbCwgZGF0YSkgfSlcbiAgICB9KVxuICB9XG59XG5cbk1hcmtvdkNoYWluLnByb3RvdHlwZS5jb3VudFRvdGFsID0gZnVuY3Rpb24od29yZCkge1xuICB2YXIgdG90YWwgPSAwXG4gICAgLCBwcm9wXG5cbiAgZm9yIChwcm9wIGluIHRoaXMud29yZEJhbmtbd29yZF0pIHtcbiAgICBpZiAodGhpcy53b3JkQmFua1t3b3JkXS5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgdG90YWwgKz0gdGhpcy53b3JkQmFua1t3b3JkXVtwcm9wXVxuICAgIH1cbiAgfVxuICByZXR1cm4gdG90YWxcbn1cblxuTWFya292Q2hhaW4ucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICB2YXIgcmVhZEZpbGVzID0gW11cblxuICB0aGlzLmZpbGVzLmZvckVhY2goZnVuY3Rpb24oZmlsZSkge1xuICAgIHJlYWRGaWxlcy5wdXNoKHRoaXMucmVhZEZpbGUoZmlsZSkpXG4gIH0uYmluZCh0aGlzKSlcblxuICBhc3luYy5wYXJhbGxlbChyZWFkRmlsZXMsIGZ1bmN0aW9uKGVyciwgcmV0RmlsZXMpIHtcbiAgICB2YXIgd29yZHNcbiAgICAgICwgY3VyV29yZFxuICAgIHRoaXMucGFyc2VGaWxlKHJldEZpbGVzLnRvU3RyaW5nKCkpXG5cbiAgICBjdXJXb3JkID0gdGhpcy5zdGFydEZuKHRoaXMud29yZEJhbmspXG5cbiAgICB0aGlzLnNlbnRlbmNlID0gY3VyV29yZFxuXG4gICAgd2hpbGUgKHRoaXMud29yZEJhbmtbY3VyV29yZF0gJiYgIXRoaXMuZW5kRm4oKSkge1xuICAgICAgY3VyV29yZCA9IHBpY2tPbmVCeVdlaWdodCh0aGlzLndvcmRCYW5rW2N1cldvcmRdKVxuICAgICAgdGhpcy5zZW50ZW5jZSArPSAnICcgKyBjdXJXb3JkXG4gICAgfVxuICAgIGNhbGxiYWNrKG51bGwsIHRoaXMuc2VudGVuY2UudHJpbSgpKVxuXG4gIH0uYmluZCh0aGlzKSlcblxuICByZXR1cm4gdGhpc1xufVxuXG5NYXJrb3ZDaGFpbi5wcm90b3R5cGUucGFyc2VGaWxlID0gZnVuY3Rpb24oZmlsZSkge1xuICAvLyBzcGxpdHMgc2VudGVuY2VzIGJhc2VkIG9uIGVpdGhlciBhbiBlbmQgbGluZVxuICAvLyBvciBhIHBlcmlvZCAoZm9sbG93ZWQgYnkgYSBzcGFjZSlcbiAgZmlsZS5zcGxpdCgvKD86XFwuIHxcXG4pL2lnKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmVzKSB7XG4gICAgdmFyIGN1cldvcmRcbiAgICAgICwgaVxuICAgICAgLCBuZXh0V29yZFxuICAgICAgLCB3b3Jkc1xuXG4gICAgd29yZHMgPSBsaW5lcy5zcGxpdCgnICcpLmZpbHRlcihmdW5jdGlvbih3KSB7IHJldHVybiAody50cmltKCkgIT09ICcnKSB9KVxuICAgIGZvciAoaSA9IDA7IGkgPCB3b3Jkcy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgIGN1cldvcmQgPSB0aGlzLm5vcm1hbGl6ZSh3b3Jkc1tpXSlcbiAgICAgIG5leHRXb3JkID0gdGhpcy5ub3JtYWxpemUod29yZHNbaSArIDFdKVxuICAgICAgaWYgKCF0aGlzLndvcmRCYW5rW2N1cldvcmRdKSB7XG4gICAgICAgIHRoaXMud29yZEJhbmtbY3VyV29yZF0gPSB7fVxuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLndvcmRCYW5rW2N1cldvcmRdW25leHRXb3JkXSkge1xuICAgICAgICB0aGlzLndvcmRCYW5rW2N1cldvcmRdW25leHRXb3JkXSA9IDFcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLndvcmRCYW5rW2N1cldvcmRdW25leHRXb3JkXSArPSAxXG4gICAgICB9XG4gICAgfVxuICB9LmJpbmQodGhpcykpXG59XG5cbk1hcmtvdkNoYWluLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKGZuU3RyKSB7XG4gIHZhciBzdGFydFR5cGUgPSBpc1R5cGUoZm5TdHIpXG4gIGlmIChzdGFydFR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgdGhpcy5zdGFydEZuID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZm5TdHJcbiAgICB9XG4gIH1cbiAgZWxzZSBpZiAoc3RhcnRUeXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5zdGFydEZuID0gZnVuY3Rpb24od29yZExpc3QpIHtcbiAgICAgIHJldHVybiBmblN0cih3b3JkTGlzdClcbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNdXN0IHBhc3MgYSBmdW5jdGlvbiwgb3Igc3RyaW5nIGludG8gc3RhcnQoKScpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuTWFya292Q2hhaW4ucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGZuU3RyT3JOdW0pIHtcbiAgdmFyIGVuZFR5cGUgPSBpc1R5cGUoZm5TdHJPck51bSlcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmIChlbmRUeXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5lbmRGbiA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gZm5TdHJPck51bSh0aGlzLnNlbnRlbmNlKSB9XG4gIH1cbiAgZWxzZSBpZiAoZW5kVHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICB0aGlzLmVuZEZuID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gc2VsZi5zZW50ZW5jZS5zcGxpdCgnICcpLnNsaWNlKC0xKVswXSA9PT0gZm5TdHJPck51bVxuICAgIH1cbiAgfVxuICBlbHNlIGlmIChlbmRUeXBlID09PSAnbnVtYmVyJyB8fCBmblN0ck9yTnVtID09PSB1bmRlZmluZWQpIHtcbiAgICBmblN0ck9yTnVtID0gZm5TdHJPck51bSB8fCBJbmZpbml0eVxuICAgIHRoaXMuZW5kRm4gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHNlbGYuc2VudGVuY2Uuc3BsaXQoJyAnKS5sZW5ndGggPiBmblN0ck9yTnVtIH1cbiAgfVxuICBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ011c3QgcGFzcyBhIGZ1bmN0aW9uLCBzdHJpbmcgb3IgbnVtYmVyIGludG8gZW5kKCknKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbk1hcmtvdkNoYWluLnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbih3b3JkKSB7XG4gIHJldHVybiB3b3JkLnJlcGxhY2UoL1xcLiQvaWcsICcnKVxufVxuXG5tb2R1bGUuZXhwb3J0cy5NYXJrb3ZDaGFpbiA9IE1hcmtvdkNoYWluXG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibmFtZVwiOiBcIm1hcmtvdmNoYWluXCIsXG4gIFwidmVyc2lvblwiOiBcIjEuMC4yXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJnZW5lcmF0ZXMgYSBtYXJrb3YgY2hhaW4gb2Ygd29yZHMgYmFzZWQgb24gaW5wdXQgZmlsZXNcIixcbiAgXCJtYWluXCI6IFwibGliL2luZGV4LmpzXCIsXG4gIFwiZGlyZWN0b3JpZXNcIjoge1xuICAgIFwidGVzdFwiOiBcInRlc3RcIlxuICB9LFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwidGVzdFwiOiBcIm1vY2hhIHRlc3QvdGVzdCouanNcIixcbiAgICBcImJhYmVsLXdhdGNoXCI6IFwiYmFiZWwgc3JjIC0td2F0Y2ggLS1vdXQtZGlyIGxpYlwiLFxuICAgIFwiY29tcGlsZVwiOiBcImJhYmVsIHNyYyAtLW91dC1kaXIgbGliXCIsXG4gICAgXCJwcmV2ZXJzaW9uXCI6IFwibnBtIHRlc3RcIixcbiAgICBcInByZXB1Ymxpc2hcIjogXCJucG0gcnVuIGNvbXBpbGUgJiYgbnBtIHRlc3RcIixcbiAgICBcInBvc3RwdWJsaXNoXCI6IFwicm0gLXJmIC4vbGliLyouanNcIlxuICB9LFxuICBcInJlcG9zaXRvcnlcIjoge1xuICAgIFwidHlwZVwiOiBcImdpdFwiLFxuICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL3N3YW5nL21hcmtvdmNoYWluXCJcbiAgfSxcbiAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgXCJtYXJrb3YgY2hhaW5cIixcbiAgICBcIm1hcmtvdlwiXG4gIF0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcInBpY2stb25lLWJ5LXdlaWdodFwiOiBcIn4xLjAuMFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJhYmVsXCI6IFwifjUuOC4yM1wiLFxuICAgIFwiY2hhaVwiOiBcIn4zLjQuMVwiLFxuICAgIFwibW9jaGFcIjogXCJ+Mi4zLjRcIlxuICB9LFxuICBcImF1dGhvclwiOiBcIlNodWFuIFdhbmdcIixcbiAgXCJsaWNlbnNlXCI6IFwiSVNDXCIsXG4gIFwiYnVnc1wiOiB7XG4gICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vc3dhbmcvbWFya292Y2hhaW4vaXNzdWVzXCJcbiAgfSxcbiAgXCJlbmdpbmVzXCI6IHtcbiAgICBcIm5vZGVcIjogXCI+PTAuOFwiXG4gIH1cbn1cbiIsIi8vICdwYXRoJyBtb2R1bGUgZXh0cmFjdGVkIGZyb20gTm9kZS5qcyB2OC4xMS4xIChvbmx5IHRoZSBwb3NpeCBwYXJ0KVxuLy8gdHJhbnNwbGl0ZWQgd2l0aCBCYWJlbFxuXG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBhc3NlcnRQYXRoKHBhdGgpIHtcbiAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1BhdGggbXVzdCBiZSBhIHN0cmluZy4gUmVjZWl2ZWQgJyArIEpTT04uc3RyaW5naWZ5KHBhdGgpKTtcbiAgfVxufVxuXG4vLyBSZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggd2l0aCBkaXJlY3RvcnkgbmFtZXNcbmZ1bmN0aW9uIG5vcm1hbGl6ZVN0cmluZ1Bvc2l4KHBhdGgsIGFsbG93QWJvdmVSb290KSB7XG4gIHZhciByZXMgPSAnJztcbiAgdmFyIGxhc3RTZWdtZW50TGVuZ3RoID0gMDtcbiAgdmFyIGxhc3RTbGFzaCA9IC0xO1xuICB2YXIgZG90cyA9IDA7XG4gIHZhciBjb2RlO1xuICBmb3IgKHZhciBpID0gMDsgaSA8PSBwYXRoLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKGkgPCBwYXRoLmxlbmd0aClcbiAgICAgIGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgZWxzZSBpZiAoY29kZSA9PT0gNDcgLyovKi8pXG4gICAgICBicmVhaztcbiAgICBlbHNlXG4gICAgICBjb2RlID0gNDcgLyovKi87XG4gICAgaWYgKGNvZGUgPT09IDQ3IC8qLyovKSB7XG4gICAgICBpZiAobGFzdFNsYXNoID09PSBpIC0gMSB8fCBkb3RzID09PSAxKSB7XG4gICAgICAgIC8vIE5PT1BcbiAgICAgIH0gZWxzZSBpZiAobGFzdFNsYXNoICE9PSBpIC0gMSAmJiBkb3RzID09PSAyKSB7XG4gICAgICAgIGlmIChyZXMubGVuZ3RoIDwgMiB8fCBsYXN0U2VnbWVudExlbmd0aCAhPT0gMiB8fCByZXMuY2hhckNvZGVBdChyZXMubGVuZ3RoIC0gMSkgIT09IDQ2IC8qLiovIHx8IHJlcy5jaGFyQ29kZUF0KHJlcy5sZW5ndGggLSAyKSAhPT0gNDYgLyouKi8pIHtcbiAgICAgICAgICBpZiAocmVzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIHZhciBsYXN0U2xhc2hJbmRleCA9IHJlcy5sYXN0SW5kZXhPZignLycpO1xuICAgICAgICAgICAgaWYgKGxhc3RTbGFzaEluZGV4ICE9PSByZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICBpZiAobGFzdFNsYXNoSW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcmVzID0gJyc7XG4gICAgICAgICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcyA9IHJlcy5zbGljZSgwLCBsYXN0U2xhc2hJbmRleCk7XG4gICAgICAgICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSByZXMubGVuZ3RoIC0gMSAtIHJlcy5sYXN0SW5kZXhPZignLycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxhc3RTbGFzaCA9IGk7XG4gICAgICAgICAgICAgIGRvdHMgPSAwO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKHJlcy5sZW5ndGggPT09IDIgfHwgcmVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcmVzID0gJyc7XG4gICAgICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IDA7XG4gICAgICAgICAgICBsYXN0U2xhc2ggPSBpO1xuICAgICAgICAgICAgZG90cyA9IDA7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgICAgICAgaWYgKHJlcy5sZW5ndGggPiAwKVxuICAgICAgICAgICAgcmVzICs9ICcvLi4nO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJlcyA9ICcuLic7XG4gICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSAyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocmVzLmxlbmd0aCA+IDApXG4gICAgICAgICAgcmVzICs9ICcvJyArIHBhdGguc2xpY2UobGFzdFNsYXNoICsgMSwgaSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXMgPSBwYXRoLnNsaWNlKGxhc3RTbGFzaCArIDEsIGkpO1xuICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IGkgLSBsYXN0U2xhc2ggLSAxO1xuICAgICAgfVxuICAgICAgbGFzdFNsYXNoID0gaTtcbiAgICAgIGRvdHMgPSAwO1xuICAgIH0gZWxzZSBpZiAoY29kZSA9PT0gNDYgLyouKi8gJiYgZG90cyAhPT0gLTEpIHtcbiAgICAgICsrZG90cztcbiAgICB9IGVsc2Uge1xuICAgICAgZG90cyA9IC0xO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiBfZm9ybWF0KHNlcCwgcGF0aE9iamVjdCkge1xuICB2YXIgZGlyID0gcGF0aE9iamVjdC5kaXIgfHwgcGF0aE9iamVjdC5yb290O1xuICB2YXIgYmFzZSA9IHBhdGhPYmplY3QuYmFzZSB8fCAocGF0aE9iamVjdC5uYW1lIHx8ICcnKSArIChwYXRoT2JqZWN0LmV4dCB8fCAnJyk7XG4gIGlmICghZGlyKSB7XG4gICAgcmV0dXJuIGJhc2U7XG4gIH1cbiAgaWYgKGRpciA9PT0gcGF0aE9iamVjdC5yb290KSB7XG4gICAgcmV0dXJuIGRpciArIGJhc2U7XG4gIH1cbiAgcmV0dXJuIGRpciArIHNlcCArIGJhc2U7XG59XG5cbnZhciBwb3NpeCA9IHtcbiAgLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuICByZXNvbHZlOiBmdW5jdGlvbiByZXNvbHZlKCkge1xuICAgIHZhciByZXNvbHZlZFBhdGggPSAnJztcbiAgICB2YXIgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuICAgIHZhciBjd2Q7XG5cbiAgICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgICAgdmFyIHBhdGg7XG4gICAgICBpZiAoaSA+PSAwKVxuICAgICAgICBwYXRoID0gYXJndW1lbnRzW2ldO1xuICAgICAgZWxzZSB7XG4gICAgICAgIGlmIChjd2QgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICAgICAgICBwYXRoID0gY3dkO1xuICAgICAgfVxuXG4gICAgICBhc3NlcnRQYXRoKHBhdGgpO1xuXG4gICAgICAvLyBTa2lwIGVtcHR5IGVudHJpZXNcbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJDb2RlQXQoMCkgPT09IDQ3IC8qLyovO1xuICAgIH1cblxuICAgIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbiAgICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAgIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICAgIHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZVN0cmluZ1Bvc2l4KHJlc29sdmVkUGF0aCwgIXJlc29sdmVkQWJzb2x1dGUpO1xuXG4gICAgaWYgKHJlc29sdmVkQWJzb2x1dGUpIHtcbiAgICAgIGlmIChyZXNvbHZlZFBhdGgubGVuZ3RoID4gMClcbiAgICAgICAgcmV0dXJuICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuICcvJztcbiAgICB9IGVsc2UgaWYgKHJlc29sdmVkUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZWRQYXRoO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJy4nO1xuICAgIH1cbiAgfSxcblxuICBub3JtYWxpemU6IGZ1bmN0aW9uIG5vcm1hbGl6ZShwYXRoKSB7XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcuJztcblxuICAgIHZhciBpc0Fic29sdXRlID0gcGF0aC5jaGFyQ29kZUF0KDApID09PSA0NyAvKi8qLztcbiAgICB2YXIgdHJhaWxpbmdTZXBhcmF0b3IgPSBwYXRoLmNoYXJDb2RlQXQocGF0aC5sZW5ndGggLSAxKSA9PT0gNDcgLyovKi87XG5cbiAgICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgICBwYXRoID0gbm9ybWFsaXplU3RyaW5nUG9zaXgocGF0aCwgIWlzQWJzb2x1dGUpO1xuXG4gICAgaWYgKHBhdGgubGVuZ3RoID09PSAwICYmICFpc0Fic29sdXRlKSBwYXRoID0gJy4nO1xuICAgIGlmIChwYXRoLmxlbmd0aCA+IDAgJiYgdHJhaWxpbmdTZXBhcmF0b3IpIHBhdGggKz0gJy8nO1xuXG4gICAgaWYgKGlzQWJzb2x1dGUpIHJldHVybiAnLycgKyBwYXRoO1xuICAgIHJldHVybiBwYXRoO1xuICB9LFxuXG4gIGlzQWJzb2x1dGU6IGZ1bmN0aW9uIGlzQWJzb2x1dGUocGF0aCkge1xuICAgIGFzc2VydFBhdGgocGF0aCk7XG4gICAgcmV0dXJuIHBhdGgubGVuZ3RoID4gMCAmJiBwYXRoLmNoYXJDb2RlQXQoMCkgPT09IDQ3IC8qLyovO1xuICB9LFxuXG4gIGpvaW46IGZ1bmN0aW9uIGpvaW4oKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICByZXR1cm4gJy4nO1xuICAgIHZhciBqb2luZWQ7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBhcmcgPSBhcmd1bWVudHNbaV07XG4gICAgICBhc3NlcnRQYXRoKGFyZyk7XG4gICAgICBpZiAoYXJnLmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKGpvaW5lZCA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgIGpvaW5lZCA9IGFyZztcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGpvaW5lZCArPSAnLycgKyBhcmc7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChqb2luZWQgPT09IHVuZGVmaW5lZClcbiAgICAgIHJldHVybiAnLic7XG4gICAgcmV0dXJuIHBvc2l4Lm5vcm1hbGl6ZShqb2luZWQpO1xuICB9LFxuXG4gIHJlbGF0aXZlOiBmdW5jdGlvbiByZWxhdGl2ZShmcm9tLCB0bykge1xuICAgIGFzc2VydFBhdGgoZnJvbSk7XG4gICAgYXNzZXJ0UGF0aCh0byk7XG5cbiAgICBpZiAoZnJvbSA9PT0gdG8pIHJldHVybiAnJztcblxuICAgIGZyb20gPSBwb3NpeC5yZXNvbHZlKGZyb20pO1xuICAgIHRvID0gcG9zaXgucmVzb2x2ZSh0byk7XG5cbiAgICBpZiAoZnJvbSA9PT0gdG8pIHJldHVybiAnJztcblxuICAgIC8vIFRyaW0gYW55IGxlYWRpbmcgYmFja3NsYXNoZXNcbiAgICB2YXIgZnJvbVN0YXJ0ID0gMTtcbiAgICBmb3IgKDsgZnJvbVN0YXJ0IDwgZnJvbS5sZW5ndGg7ICsrZnJvbVN0YXJ0KSB7XG4gICAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCkgIT09IDQ3IC8qLyovKVxuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgdmFyIGZyb21FbmQgPSBmcm9tLmxlbmd0aDtcbiAgICB2YXIgZnJvbUxlbiA9IGZyb21FbmQgLSBmcm9tU3RhcnQ7XG5cbiAgICAvLyBUcmltIGFueSBsZWFkaW5nIGJhY2tzbGFzaGVzXG4gICAgdmFyIHRvU3RhcnQgPSAxO1xuICAgIGZvciAoOyB0b1N0YXJ0IDwgdG8ubGVuZ3RoOyArK3RvU3RhcnQpIHtcbiAgICAgIGlmICh0by5jaGFyQ29kZUF0KHRvU3RhcnQpICE9PSA0NyAvKi8qLylcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHZhciB0b0VuZCA9IHRvLmxlbmd0aDtcbiAgICB2YXIgdG9MZW4gPSB0b0VuZCAtIHRvU3RhcnQ7XG5cbiAgICAvLyBDb21wYXJlIHBhdGhzIHRvIGZpbmQgdGhlIGxvbmdlc3QgY29tbW9uIHBhdGggZnJvbSByb290XG4gICAgdmFyIGxlbmd0aCA9IGZyb21MZW4gPCB0b0xlbiA/IGZyb21MZW4gOiB0b0xlbjtcbiAgICB2YXIgbGFzdENvbW1vblNlcCA9IC0xO1xuICAgIHZhciBpID0gMDtcbiAgICBmb3IgKDsgaSA8PSBsZW5ndGg7ICsraSkge1xuICAgICAgaWYgKGkgPT09IGxlbmd0aCkge1xuICAgICAgICBpZiAodG9MZW4gPiBsZW5ndGgpIHtcbiAgICAgICAgICBpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0ICsgaSkgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgZnJvbWAgaXMgdGhlIGV4YWN0IGJhc2UgcGF0aCBmb3IgYHRvYC5cbiAgICAgICAgICAgIC8vIEZvciBleGFtcGxlOiBmcm9tPScvZm9vL2Jhcic7IHRvPScvZm9vL2Jhci9iYXonXG4gICAgICAgICAgICByZXR1cm4gdG8uc2xpY2UodG9TdGFydCArIGkgKyAxKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICAgIC8vIFdlIGdldCBoZXJlIGlmIGBmcm9tYCBpcyB0aGUgcm9vdFxuICAgICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209Jy8nOyB0bz0nL2ZvbydcbiAgICAgICAgICAgIHJldHVybiB0by5zbGljZSh0b1N0YXJ0ICsgaSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGZyb21MZW4gPiBsZW5ndGgpIHtcbiAgICAgICAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCArIGkpID09PSA0NyAvKi8qLykge1xuICAgICAgICAgICAgLy8gV2UgZ2V0IGhlcmUgaWYgYHRvYCBpcyB0aGUgZXhhY3QgYmFzZSBwYXRoIGZvciBgZnJvbWAuXG4gICAgICAgICAgICAvLyBGb3IgZXhhbXBsZTogZnJvbT0nL2Zvby9iYXIvYmF6JzsgdG89Jy9mb28vYmFyJ1xuICAgICAgICAgICAgbGFzdENvbW1vblNlcCA9IGk7XG4gICAgICAgICAgfSBlbHNlIGlmIChpID09PSAwKSB7XG4gICAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgdG9gIGlzIHRoZSByb290LlxuICAgICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209Jy9mb28nOyB0bz0nLydcbiAgICAgICAgICAgIGxhc3RDb21tb25TZXAgPSAwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHZhciBmcm9tQ29kZSA9IGZyb20uY2hhckNvZGVBdChmcm9tU3RhcnQgKyBpKTtcbiAgICAgIHZhciB0b0NvZGUgPSB0by5jaGFyQ29kZUF0KHRvU3RhcnQgKyBpKTtcbiAgICAgIGlmIChmcm9tQ29kZSAhPT0gdG9Db2RlKVxuICAgICAgICBicmVhaztcbiAgICAgIGVsc2UgaWYgKGZyb21Db2RlID09PSA0NyAvKi8qLylcbiAgICAgICAgbGFzdENvbW1vblNlcCA9IGk7XG4gICAgfVxuXG4gICAgdmFyIG91dCA9ICcnO1xuICAgIC8vIEdlbmVyYXRlIHRoZSByZWxhdGl2ZSBwYXRoIGJhc2VkIG9uIHRoZSBwYXRoIGRpZmZlcmVuY2UgYmV0d2VlbiBgdG9gXG4gICAgLy8gYW5kIGBmcm9tYFxuICAgIGZvciAoaSA9IGZyb21TdGFydCArIGxhc3RDb21tb25TZXAgKyAxOyBpIDw9IGZyb21FbmQ7ICsraSkge1xuICAgICAgaWYgKGkgPT09IGZyb21FbmQgfHwgZnJvbS5jaGFyQ29kZUF0KGkpID09PSA0NyAvKi8qLykge1xuICAgICAgICBpZiAob3V0Lmxlbmd0aCA9PT0gMClcbiAgICAgICAgICBvdXQgKz0gJy4uJztcbiAgICAgICAgZWxzZVxuICAgICAgICAgIG91dCArPSAnLy4uJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBMYXN0bHksIGFwcGVuZCB0aGUgcmVzdCBvZiB0aGUgZGVzdGluYXRpb24gKGB0b2ApIHBhdGggdGhhdCBjb21lcyBhZnRlclxuICAgIC8vIHRoZSBjb21tb24gcGF0aCBwYXJ0c1xuICAgIGlmIChvdXQubGVuZ3RoID4gMClcbiAgICAgIHJldHVybiBvdXQgKyB0by5zbGljZSh0b1N0YXJ0ICsgbGFzdENvbW1vblNlcCk7XG4gICAgZWxzZSB7XG4gICAgICB0b1N0YXJ0ICs9IGxhc3RDb21tb25TZXA7XG4gICAgICBpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0KSA9PT0gNDcgLyovKi8pXG4gICAgICAgICsrdG9TdGFydDtcbiAgICAgIHJldHVybiB0by5zbGljZSh0b1N0YXJ0KTtcbiAgICB9XG4gIH0sXG5cbiAgX21ha2VMb25nOiBmdW5jdGlvbiBfbWFrZUxvbmcocGF0aCkge1xuICAgIHJldHVybiBwYXRoO1xuICB9LFxuXG4gIGRpcm5hbWU6IGZ1bmN0aW9uIGRpcm5hbWUocGF0aCkge1xuICAgIGFzc2VydFBhdGgocGF0aCk7XG4gICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSByZXR1cm4gJy4nO1xuICAgIHZhciBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuICAgIHZhciBoYXNSb290ID0gY29kZSA9PT0gNDcgLyovKi87XG4gICAgdmFyIGVuZCA9IC0xO1xuICAgIHZhciBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAgIGZvciAodmFyIGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gMTsgLS1pKSB7XG4gICAgICBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKGNvZGUgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgaWYgKCFtYXRjaGVkU2xhc2gpIHtcbiAgICAgICAgICAgIGVuZCA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yXG4gICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChlbmQgPT09IC0xKSByZXR1cm4gaGFzUm9vdCA/ICcvJyA6ICcuJztcbiAgICBpZiAoaGFzUm9vdCAmJiBlbmQgPT09IDEpIHJldHVybiAnLy8nO1xuICAgIHJldHVybiBwYXRoLnNsaWNlKDAsIGVuZCk7XG4gIH0sXG5cbiAgYmFzZW5hbWU6IGZ1bmN0aW9uIGJhc2VuYW1lKHBhdGgsIGV4dCkge1xuICAgIGlmIChleHQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZXh0ICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJleHRcIiBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICAgIHZhciBzdGFydCA9IDA7XG4gICAgdmFyIGVuZCA9IC0xO1xuICAgIHZhciBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAgIHZhciBpO1xuXG4gICAgaWYgKGV4dCAhPT0gdW5kZWZpbmVkICYmIGV4dC5sZW5ndGggPiAwICYmIGV4dC5sZW5ndGggPD0gcGF0aC5sZW5ndGgpIHtcbiAgICAgIGlmIChleHQubGVuZ3RoID09PSBwYXRoLmxlbmd0aCAmJiBleHQgPT09IHBhdGgpIHJldHVybiAnJztcbiAgICAgIHZhciBleHRJZHggPSBleHQubGVuZ3RoIC0gMTtcbiAgICAgIHZhciBmaXJzdE5vblNsYXNoRW5kID0gLTE7XG4gICAgICBmb3IgKGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIHZhciBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBpZiAoY29kZSA9PT0gNDcgLyovKi8pIHtcbiAgICAgICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBwYXRoIHNlcGFyYXRvciB0aGF0IHdhcyBub3QgcGFydCBvZiBhIHNldCBvZiBwYXRoXG4gICAgICAgICAgICAvLyBzZXBhcmF0b3JzIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZywgc3RvcCBub3dcbiAgICAgICAgICAgIGlmICghbWF0Y2hlZFNsYXNoKSB7XG4gICAgICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGZpcnN0Tm9uU2xhc2hFbmQgPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvciwgcmVtZW1iZXIgdGhpcyBpbmRleCBpbiBjYXNlXG4gICAgICAgICAgICAvLyB3ZSBuZWVkIGl0IGlmIHRoZSBleHRlbnNpb24gZW5kcyB1cCBub3QgbWF0Y2hpbmdcbiAgICAgICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICAgICAgZmlyc3ROb25TbGFzaEVuZCA9IGkgKyAxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZXh0SWR4ID49IDApIHtcbiAgICAgICAgICAgIC8vIFRyeSB0byBtYXRjaCB0aGUgZXhwbGljaXQgZXh0ZW5zaW9uXG4gICAgICAgICAgICBpZiAoY29kZSA9PT0gZXh0LmNoYXJDb2RlQXQoZXh0SWR4KSkge1xuICAgICAgICAgICAgICBpZiAoLS1leHRJZHggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCB0aGUgZXh0ZW5zaW9uLCBzbyBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXIgcGF0aFxuICAgICAgICAgICAgICAgIC8vIGNvbXBvbmVudFxuICAgICAgICAgICAgICAgIGVuZCA9IGk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBkb2VzIG5vdCBtYXRjaCwgc28gb3VyIHJlc3VsdCBpcyB0aGUgZW50aXJlIHBhdGhcbiAgICAgICAgICAgICAgLy8gY29tcG9uZW50XG4gICAgICAgICAgICAgIGV4dElkeCA9IC0xO1xuICAgICAgICAgICAgICBlbmQgPSBmaXJzdE5vblNsYXNoRW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoc3RhcnQgPT09IGVuZCkgZW5kID0gZmlyc3ROb25TbGFzaEVuZDtlbHNlIGlmIChlbmQgPT09IC0xKSBlbmQgPSBwYXRoLmxlbmd0aDtcbiAgICAgIHJldHVybiBwYXRoLnNsaWNlKHN0YXJ0LCBlbmQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIGlmIChwYXRoLmNoYXJDb2RlQXQoaSkgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgcGF0aCBzZXBhcmF0b3IgdGhhdCB3YXMgbm90IHBhcnQgb2YgYSBzZXQgb2YgcGF0aFxuICAgICAgICAgICAgLy8gc2VwYXJhdG9ycyBhdCB0aGUgZW5kIG9mIHRoZSBzdHJpbmcsIHN0b3Agbm93XG4gICAgICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgICAgICBzdGFydCA9IGkgKyAxO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICAgICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvciwgbWFyayB0aGlzIGFzIHRoZSBlbmQgb2Ygb3VyXG4gICAgICAgICAgLy8gcGF0aCBjb21wb25lbnRcbiAgICAgICAgICBtYXRjaGVkU2xhc2ggPSBmYWxzZTtcbiAgICAgICAgICBlbmQgPSBpICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZW5kID09PSAtMSkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuIHBhdGguc2xpY2Uoc3RhcnQsIGVuZCk7XG4gICAgfVxuICB9LFxuXG4gIGV4dG5hbWU6IGZ1bmN0aW9uIGV4dG5hbWUocGF0aCkge1xuICAgIGFzc2VydFBhdGgocGF0aCk7XG4gICAgdmFyIHN0YXJ0RG90ID0gLTE7XG4gICAgdmFyIHN0YXJ0UGFydCA9IDA7XG4gICAgdmFyIGVuZCA9IC0xO1xuICAgIHZhciBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAgIC8vIFRyYWNrIHRoZSBzdGF0ZSBvZiBjaGFyYWN0ZXJzIChpZiBhbnkpIHdlIHNlZSBiZWZvcmUgb3VyIGZpcnN0IGRvdCBhbmRcbiAgICAvLyBhZnRlciBhbnkgcGF0aCBzZXBhcmF0b3Igd2UgZmluZFxuICAgIHZhciBwcmVEb3RTdGF0ZSA9IDA7XG4gICAgZm9yICh2YXIgaSA9IHBhdGgubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHZhciBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKGNvZGUgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIHBhdGggc2VwYXJhdG9yIHRoYXQgd2FzIG5vdCBwYXJ0IG9mIGEgc2V0IG9mIHBhdGhcbiAgICAgICAgICAvLyBzZXBhcmF0b3JzIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZywgc3RvcCBub3dcbiAgICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgICAgc3RhcnRQYXJ0ID0gaSArIDE7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIGlmIChlbmQgPT09IC0xKSB7XG4gICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXJcbiAgICAgICAgLy8gZXh0ZW5zaW9uXG4gICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICBlbmQgPSBpICsgMTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2RlID09PSA0NiAvKi4qLykge1xuICAgICAgICAgIC8vIElmIHRoaXMgaXMgb3VyIGZpcnN0IGRvdCwgbWFyayBpdCBhcyB0aGUgc3RhcnQgb2Ygb3VyIGV4dGVuc2lvblxuICAgICAgICAgIGlmIChzdGFydERvdCA9PT0gLTEpXG4gICAgICAgICAgICBzdGFydERvdCA9IGk7XG4gICAgICAgICAgZWxzZSBpZiAocHJlRG90U3RhdGUgIT09IDEpXG4gICAgICAgICAgICBwcmVEb3RTdGF0ZSA9IDE7XG4gICAgICB9IGVsc2UgaWYgKHN0YXJ0RG90ICE9PSAtMSkge1xuICAgICAgICAvLyBXZSBzYXcgYSBub24tZG90IGFuZCBub24tcGF0aCBzZXBhcmF0b3IgYmVmb3JlIG91ciBkb3QsIHNvIHdlIHNob3VsZFxuICAgICAgICAvLyBoYXZlIGEgZ29vZCBjaGFuY2UgYXQgaGF2aW5nIGEgbm9uLWVtcHR5IGV4dGVuc2lvblxuICAgICAgICBwcmVEb3RTdGF0ZSA9IC0xO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdGFydERvdCA9PT0gLTEgfHwgZW5kID09PSAtMSB8fFxuICAgICAgICAvLyBXZSBzYXcgYSBub24tZG90IGNoYXJhY3RlciBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGRvdFxuICAgICAgICBwcmVEb3RTdGF0ZSA9PT0gMCB8fFxuICAgICAgICAvLyBUaGUgKHJpZ2h0LW1vc3QpIHRyaW1tZWQgcGF0aCBjb21wb25lbnQgaXMgZXhhY3RseSAnLi4nXG4gICAgICAgIHByZURvdFN0YXRlID09PSAxICYmIHN0YXJ0RG90ID09PSBlbmQgLSAxICYmIHN0YXJ0RG90ID09PSBzdGFydFBhcnQgKyAxKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnNsaWNlKHN0YXJ0RG90LCBlbmQpO1xuICB9LFxuXG4gIGZvcm1hdDogZnVuY3Rpb24gZm9ybWF0KHBhdGhPYmplY3QpIHtcbiAgICBpZiAocGF0aE9iamVjdCA9PT0gbnVsbCB8fCB0eXBlb2YgcGF0aE9iamVjdCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcInBhdGhPYmplY3RcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgT2JqZWN0LiBSZWNlaXZlZCB0eXBlICcgKyB0eXBlb2YgcGF0aE9iamVjdCk7XG4gICAgfVxuICAgIHJldHVybiBfZm9ybWF0KCcvJywgcGF0aE9iamVjdCk7XG4gIH0sXG5cbiAgcGFyc2U6IGZ1bmN0aW9uIHBhcnNlKHBhdGgpIHtcbiAgICBhc3NlcnRQYXRoKHBhdGgpO1xuXG4gICAgdmFyIHJldCA9IHsgcm9vdDogJycsIGRpcjogJycsIGJhc2U6ICcnLCBleHQ6ICcnLCBuYW1lOiAnJyB9O1xuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJldDtcbiAgICB2YXIgY29kZSA9IHBhdGguY2hhckNvZGVBdCgwKTtcbiAgICB2YXIgaXNBYnNvbHV0ZSA9IGNvZGUgPT09IDQ3IC8qLyovO1xuICAgIHZhciBzdGFydDtcbiAgICBpZiAoaXNBYnNvbHV0ZSkge1xuICAgICAgcmV0LnJvb3QgPSAnLyc7XG4gICAgICBzdGFydCA9IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICB9XG4gICAgdmFyIHN0YXJ0RG90ID0gLTE7XG4gICAgdmFyIHN0YXJ0UGFydCA9IDA7XG4gICAgdmFyIGVuZCA9IC0xO1xuICAgIHZhciBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAgIHZhciBpID0gcGF0aC5sZW5ndGggLSAxO1xuXG4gICAgLy8gVHJhY2sgdGhlIHN0YXRlIG9mIGNoYXJhY3RlcnMgKGlmIGFueSkgd2Ugc2VlIGJlZm9yZSBvdXIgZmlyc3QgZG90IGFuZFxuICAgIC8vIGFmdGVyIGFueSBwYXRoIHNlcGFyYXRvciB3ZSBmaW5kXG4gICAgdmFyIHByZURvdFN0YXRlID0gMDtcblxuICAgIC8vIEdldCBub24tZGlyIGluZm9cbiAgICBmb3IgKDsgaSA+PSBzdGFydDsgLS1pKSB7XG4gICAgICBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKGNvZGUgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIHBhdGggc2VwYXJhdG9yIHRoYXQgd2FzIG5vdCBwYXJ0IG9mIGEgc2V0IG9mIHBhdGhcbiAgICAgICAgICAvLyBzZXBhcmF0b3JzIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZywgc3RvcCBub3dcbiAgICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgICAgc3RhcnRQYXJ0ID0gaSArIDE7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIGlmIChlbmQgPT09IC0xKSB7XG4gICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXJcbiAgICAgICAgLy8gZXh0ZW5zaW9uXG4gICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICBlbmQgPSBpICsgMTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2RlID09PSA0NiAvKi4qLykge1xuICAgICAgICAgIC8vIElmIHRoaXMgaXMgb3VyIGZpcnN0IGRvdCwgbWFyayBpdCBhcyB0aGUgc3RhcnQgb2Ygb3VyIGV4dGVuc2lvblxuICAgICAgICAgIGlmIChzdGFydERvdCA9PT0gLTEpIHN0YXJ0RG90ID0gaTtlbHNlIGlmIChwcmVEb3RTdGF0ZSAhPT0gMSkgcHJlRG90U3RhdGUgPSAxO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXJ0RG90ICE9PSAtMSkge1xuICAgICAgICAvLyBXZSBzYXcgYSBub24tZG90IGFuZCBub24tcGF0aCBzZXBhcmF0b3IgYmVmb3JlIG91ciBkb3QsIHNvIHdlIHNob3VsZFxuICAgICAgICAvLyBoYXZlIGEgZ29vZCBjaGFuY2UgYXQgaGF2aW5nIGEgbm9uLWVtcHR5IGV4dGVuc2lvblxuICAgICAgICBwcmVEb3RTdGF0ZSA9IC0xO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdGFydERvdCA9PT0gLTEgfHwgZW5kID09PSAtMSB8fFxuICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgY2hhcmFjdGVyIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZG90XG4gICAgcHJlRG90U3RhdGUgPT09IDAgfHxcbiAgICAvLyBUaGUgKHJpZ2h0LW1vc3QpIHRyaW1tZWQgcGF0aCBjb21wb25lbnQgaXMgZXhhY3RseSAnLi4nXG4gICAgcHJlRG90U3RhdGUgPT09IDEgJiYgc3RhcnREb3QgPT09IGVuZCAtIDEgJiYgc3RhcnREb3QgPT09IHN0YXJ0UGFydCArIDEpIHtcbiAgICAgIGlmIChlbmQgIT09IC0xKSB7XG4gICAgICAgIGlmIChzdGFydFBhcnQgPT09IDAgJiYgaXNBYnNvbHV0ZSkgcmV0LmJhc2UgPSByZXQubmFtZSA9IHBhdGguc2xpY2UoMSwgZW5kKTtlbHNlIHJldC5iYXNlID0gcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKHN0YXJ0UGFydCwgZW5kKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN0YXJ0UGFydCA9PT0gMCAmJiBpc0Fic29sdXRlKSB7XG4gICAgICAgIHJldC5uYW1lID0gcGF0aC5zbGljZSgxLCBzdGFydERvdCk7XG4gICAgICAgIHJldC5iYXNlID0gcGF0aC5zbGljZSgxLCBlbmQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKHN0YXJ0UGFydCwgc3RhcnREb3QpO1xuICAgICAgICByZXQuYmFzZSA9IHBhdGguc2xpY2Uoc3RhcnRQYXJ0LCBlbmQpO1xuICAgICAgfVxuICAgICAgcmV0LmV4dCA9IHBhdGguc2xpY2Uoc3RhcnREb3QsIGVuZCk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0UGFydCA+IDApIHJldC5kaXIgPSBwYXRoLnNsaWNlKDAsIHN0YXJ0UGFydCAtIDEpO2Vsc2UgaWYgKGlzQWJzb2x1dGUpIHJldC5kaXIgPSAnLyc7XG5cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIHNlcDogJy8nLFxuICBkZWxpbWl0ZXI6ICc6JyxcbiAgd2luMzI6IG51bGwsXG4gIHBvc2l4OiBudWxsXG59O1xuXG5wb3NpeC5wb3NpeCA9IHBvc2l4O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBvc2l4O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IHBpY2tPbmVCeVdlaWdodDtcblxuZnVuY3Rpb24gcGlja09uZUJ5V2VpZ2h0KGFuT2JqKSB7XG4gIHZhciBfa2V5cyA9IE9iamVjdC5rZXlzKGFuT2JqKTtcbiAgdmFyIHN1bSA9IF9rZXlzLnJlZHVjZShmdW5jdGlvbiAocCwgYykge1xuICAgIHJldHVybiBwICsgYW5PYmpbY107XG4gIH0sIDApO1xuICBpZiAoIU51bWJlci5pc0Zpbml0ZShzdW0pKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQWxsIHZhbHVlcyBpbiBvYmplY3QgbXVzdCBiZSBhIG51bWVyaWMgdmFsdWVcIik7XG4gIH1cbiAgdmFyIGNob29zZSA9IH4gfihNYXRoLnJhbmRvbSgpICogc3VtKTtcbiAgZm9yICh2YXIgaSA9IDAsIGNvdW50ID0gMDsgaSA8IF9rZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgY291bnQgKz0gYW5PYmpbX2tleXNbaV1dO1xuICAgIGlmIChjb3VudCA+IGNob29zZSkge1xuICAgICAgcmV0dXJuIF9rZXlzW2ldO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbXCJkZWZhdWx0XCJdOyIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJ2YXIgbmV4dFRpY2sgPSByZXF1aXJlKCdwcm9jZXNzL2Jyb3dzZXIuanMnKS5uZXh0VGljaztcbnZhciBhcHBseSA9IEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseTtcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBpbW1lZGlhdGVJZHMgPSB7fTtcbnZhciBuZXh0SW1tZWRpYXRlSWQgPSAwO1xuXG4vLyBET00gQVBJcywgZm9yIGNvbXBsZXRlbmVzc1xuXG5leHBvcnRzLnNldFRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBUaW1lb3V0KGFwcGx5LmNhbGwoc2V0VGltZW91dCwgd2luZG93LCBhcmd1bWVudHMpLCBjbGVhclRpbWVvdXQpO1xufTtcbmV4cG9ydHMuc2V0SW50ZXJ2YWwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBUaW1lb3V0KGFwcGx5LmNhbGwoc2V0SW50ZXJ2YWwsIHdpbmRvdywgYXJndW1lbnRzKSwgY2xlYXJJbnRlcnZhbCk7XG59O1xuZXhwb3J0cy5jbGVhclRpbWVvdXQgPVxuZXhwb3J0cy5jbGVhckludGVydmFsID0gZnVuY3Rpb24odGltZW91dCkgeyB0aW1lb3V0LmNsb3NlKCk7IH07XG5cbmZ1bmN0aW9uIFRpbWVvdXQoaWQsIGNsZWFyRm4pIHtcbiAgdGhpcy5faWQgPSBpZDtcbiAgdGhpcy5fY2xlYXJGbiA9IGNsZWFyRm47XG59XG5UaW1lb3V0LnByb3RvdHlwZS51bnJlZiA9IFRpbWVvdXQucHJvdG90eXBlLnJlZiA9IGZ1bmN0aW9uKCkge307XG5UaW1lb3V0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9jbGVhckZuLmNhbGwod2luZG93LCB0aGlzLl9pZCk7XG59O1xuXG4vLyBEb2VzIG5vdCBzdGFydCB0aGUgdGltZSwganVzdCBzZXRzIHVwIHRoZSBtZW1iZXJzIG5lZWRlZC5cbmV4cG9ydHMuZW5yb2xsID0gZnVuY3Rpb24oaXRlbSwgbXNlY3MpIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuICBpdGVtLl9pZGxlVGltZW91dCA9IG1zZWNzO1xufTtcblxuZXhwb3J0cy51bmVucm9sbCA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuICBpdGVtLl9pZGxlVGltZW91dCA9IC0xO1xufTtcblxuZXhwb3J0cy5fdW5yZWZBY3RpdmUgPSBleHBvcnRzLmFjdGl2ZSA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuXG4gIHZhciBtc2VjcyA9IGl0ZW0uX2lkbGVUaW1lb3V0O1xuICBpZiAobXNlY3MgPj0gMCkge1xuICAgIGl0ZW0uX2lkbGVUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uIG9uVGltZW91dCgpIHtcbiAgICAgIGlmIChpdGVtLl9vblRpbWVvdXQpXG4gICAgICAgIGl0ZW0uX29uVGltZW91dCgpO1xuICAgIH0sIG1zZWNzKTtcbiAgfVxufTtcblxuLy8gVGhhdCdzIG5vdCBob3cgbm9kZS5qcyBpbXBsZW1lbnRzIGl0IGJ1dCB0aGUgZXhwb3NlZCBhcGkgaXMgdGhlIHNhbWUuXG5leHBvcnRzLnNldEltbWVkaWF0ZSA9IHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHNldEltbWVkaWF0ZSA6IGZ1bmN0aW9uKGZuKSB7XG4gIHZhciBpZCA9IG5leHRJbW1lZGlhdGVJZCsrO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cy5sZW5ndGggPCAyID8gZmFsc2UgOiBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgaW1tZWRpYXRlSWRzW2lkXSA9IHRydWU7XG5cbiAgbmV4dFRpY2soZnVuY3Rpb24gb25OZXh0VGljaygpIHtcbiAgICBpZiAoaW1tZWRpYXRlSWRzW2lkXSkge1xuICAgICAgLy8gZm4uY2FsbCgpIGlzIGZhc3RlciBzbyB3ZSBvcHRpbWl6ZSBmb3IgdGhlIGNvbW1vbiB1c2UtY2FzZVxuICAgICAgLy8gQHNlZSBodHRwOi8vanNwZXJmLmNvbS9jYWxsLWFwcGx5LXNlZ3VcbiAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm4uY2FsbChudWxsKTtcbiAgICAgIH1cbiAgICAgIC8vIFByZXZlbnQgaWRzIGZyb20gbGVha2luZ1xuICAgICAgZXhwb3J0cy5jbGVhckltbWVkaWF0ZShpZCk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gaWQ7XG59O1xuXG5leHBvcnRzLmNsZWFySW1tZWRpYXRlID0gdHlwZW9mIGNsZWFySW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIgPyBjbGVhckltbWVkaWF0ZSA6IGZ1bmN0aW9uKGlkKSB7XG4gIGRlbGV0ZSBpbW1lZGlhdGVJZHNbaWRdO1xufTsiXX0=
