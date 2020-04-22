/* Adapted from https://stackoverflow.com/a/51482852 */

const sleep = require('./sleep');

class Queue {
    constructor(maxSimultaneously = 1, __rateLimit = 0) {
        this.maxSimultaneously = maxSimultaneously;
        this.__rateLimit = __rateLimit;
        this.__active = 0;
        this.__queue = [];
    }

    /** @param { () => Promise<T> } func 
     * @template T
     * @returns {Promise<T>}
    */
    async add(func) {
        if (++this.__active > this.maxSimultaneously) {
            await new Promise(resolve => this.__queue.push(resolve));
        }

        try {
            const returnValue = await func();
            if (this.__rateLimit > 0)
                await sleep(this.__rateLimit);
            return returnValue;
        } catch(err) {
            throw err;
        } finally {
            this.__active--;
            if(this.__queue.length) {
                this.__queue.shift()();
            }
        }
    }
}

module.exports = Queue;