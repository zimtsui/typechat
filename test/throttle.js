import test from 'ava';
import { Throttle } from '../build/throttle.js';


test('Throttle bypasses locking when rpm is unlimited', async t => {
    const throttle = new Throttle(Number.POSITIVE_INFINITY);
    let acquireReadCalls = 0;
    let releaseReadCalls = 0;

    await throttle.requests({
        busy: {
            acquireRead: async () => {
                acquireReadCalls++;
            },
            releaseRead: () => {
                releaseReadCalls++;
            },
        },
    });

    t.is(acquireReadCalls, 0);
    t.is(releaseReadCalls, 0);
});

test('Throttle acquires and releases busy lock when rpm is finite', async t => {
    const throttle = new Throttle(60000);
    let acquireReadCalls = 0;
    let releaseReadCalls = 0;

    await throttle.requests({
        busy: {
            acquireRead: async () => {
                acquireReadCalls++;
            },
            releaseRead: () => {
                releaseReadCalls++;
            },
        },
    });

    t.is(acquireReadCalls, 1);
    t.is(releaseReadCalls, 1);
});

test('Throttle throw rejects current waiters', async t => {
    const throttle = new Throttle(1000);
    await throttle.requests({});

    const failure = new Error('throttle failed');
    const request = throttle.requests({});
    await Promise.resolve();
    throttle.throw(failure);

    const error = await t.throwsAsync(request);

    t.is(error, failure);
});
