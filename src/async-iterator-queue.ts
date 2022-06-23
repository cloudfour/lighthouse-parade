const noop = () => {};

export interface AsyncIteratorQueue<T> extends ReadonlyAsyncIteratorQueue<T> {
  push(...items: T[]): void;
  finish(): void;
}

export interface ReadonlyAsyncIteratorQueue<T> {
  onItemAdded(callback: (item: T) => void): void;
  [Symbol.asyncIterator](): AsyncGenerator<T, void, void>;
}

// Learn about async iterators here: https://javascript.info/async-iterators-generators

export const asyncIteratorQueue = <T>(): AsyncIteratorQueue<T> => {
  const queue: T[] = [];
  let isFinished = false;
  let unpauseGenerator = noop;
  const itemAddedListeners: ((item: T) => void)[] = [];
  return {
    push(...items: T[]) {
      for (const callback of itemAddedListeners) {
        for (const addedItem of items) callback(addedItem);
      }
      queue.push(...items);
      unpauseGenerator();
    },
    finish() {
      isFinished = true;
      unpauseGenerator();
    },
    onItemAdded(callback: (item: T) => void) {
      itemAddedListeners.push(callback);
    },
    async *[Symbol.asyncIterator](): AsyncGenerator<T, void, void> {
      let i = 0;

      // eslint-disable-next-line @cloudfour/typescript-eslint/no-unnecessary-condition
      while (true) {
        while (i < queue.length) {
          yield queue[i];
          i++;
        }
        if (isFinished) return;
        // eslint-disable-next-line no-await-in-loop
        await new Promise<void>((resolve) => {
          unpauseGenerator = resolve;
        });
      }
    },
  };
};

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  it('yields all items correctly', async () => {
    const queue = asyncIteratorQueue<number>();
    queue.push(3, 5, 7);
    // eslint-disable-next-line @cloudfour/unicorn/no-array-push-push
    queue.push(2, 9, 0);
    queue.finish();
    const arr = [];
    for await (const f of queue) {
      arr.push(f);
    }
    expect(arr).toMatchInlineSnapshot(`
      [
        3,
        5,
        7,
        2,
        9,
        0,
      ]
    `);
  });

  it('pauses whenever it runs out of items to yield', async () => {
    const queue = asyncIteratorQueue<number>();
    const iterator = queue[Symbol.asyncIterator]();
    const promises = [
      iterator.next(),
      iterator.next(),
      iterator.next(),
      iterator.next(),
    ];
    const isResolved = [false, false, false, false];
    promises[0].then(() => {
      isResolved[0] = true;
      expect(isResolved).toMatchInlineSnapshot(`
        [
          true,
          false,
          false,
          false,
        ]
      `);
    });

    promises[1].then(() => {
      isResolved[1] = true;
      expect(isResolved).toMatchInlineSnapshot(`
        [
          true,
          true,
          false,
          false,
        ]
      `);
    });

    promises[2].then(() => {
      isResolved[2] = true;
      expect(isResolved).toMatchInlineSnapshot(`
        [
          true,
          true,
          true,
          false,
        ]
      `);
    });

    promises[3].then(() => {
      isResolved[3] = true;
      expect(isResolved).toMatchInlineSnapshot(`
        [
          true,
          true,
          true,
          true,
        ]
      `);
    });

    await waitForNextTick();

    expect(isResolved).toMatchInlineSnapshot(`
      [
        false,
        false,
        false,
        false,
      ]
    `);

    queue.push(3, 4);
    await waitForNextTick();

    expect(isResolved).toMatchInlineSnapshot(`
      [
        true,
        true,
        false,
        false,
      ]
    `);

    queue.push(9);
    await waitForNextTick();

    expect(isResolved).toMatchInlineSnapshot(`
      [
        true,
        true,
        true,
        false,
      ]
    `);

    queue.finish();
    await waitForNextTick();

    expect(isResolved).toMatchInlineSnapshot(`
      [
        true,
        true,
        true,
        true,
      ]
    `);

    expect(await Promise.all(promises)).toMatchInlineSnapshot(`
      [
        {
          "done": false,
          "value": 3,
        },
        {
          "done": false,
          "value": 4,
        },
        {
          "done": false,
          "value": 9,
        },
        {
          "done": true,
          "value": undefined,
        },
      ]
    `);
  });

  const waitForNextTick = () =>
    new Promise((resolve) => process.nextTick(resolve));
}
