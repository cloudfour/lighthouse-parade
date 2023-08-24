import globrex from 'globrex';

const globToRegex = (glob: string) =>
  globrex(glob.replace(/\/$/, ''), { globstar: true, extended: true }).regex;

export const createUrlFilter = (
  includeGlob: string[],
  excludeGlob: string[],
) => {
  const pathIncludeRegexes = includeGlob.map(globToRegex);
  const pathExcludeRegexes = excludeGlob.map(globToRegex);
  return ({ path }: { path: string }) => {
    const withoutTrailingSlash = path.replace(/\/$/, '');
    return (
      (pathIncludeRegexes.length === 0 ||
        pathIncludeRegexes.some((regex) => regex.test(withoutTrailingSlash))) &&
      !pathExcludeRegexes.some((regex) => regex.test(withoutTrailingSlash))
    );
  };
};

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  test('if the include array is empty allow any path', () => {
    const filter = createUrlFilter([], []);
    expect(filter({ path: '/foo' })).toBeTruthy();
    expect(filter({ path: '/' })).toBeTruthy();
    expect(filter({ path: '/asdf/1234' })).toBeTruthy();
  });

  test('only allow items matching static include glob', () => {
    const filter = createUrlFilter(['/foo'], []);
    expect(filter({ path: '/foo' })).toBeTruthy();
    expect(filter({ path: '/foo/' })).toBeTruthy();
    expect(filter({ path: '/foo/bar' })).toBeFalsy();
    expect(filter({ path: '/foobar' })).toBeFalsy();
    expect(filter({ path: '/asdf' })).toBeFalsy();
  });

  test('only allow items matching include glob', () => {
    const filter = createUrlFilter(['/foo/*'], []);
    expect(filter({ path: '/foo' })).toBeFalsy();
    expect(filter({ path: '/foo/bar' })).toBeTruthy();
    expect(filter({ path: '/foo/bar/' })).toBeTruthy();
    expect(filter({ path: '/asdf' })).toBeFalsy();
  });

  test('allow items from multiple include globs', () => {
    const filter = createUrlFilter(['/foo/*', '/foo'], []);
    expect(filter({ path: '/foo/' })).toBeTruthy();
    expect(filter({ path: '/foo' })).toBeTruthy();
    expect(filter({ path: '/foo/bar' })).toBeTruthy();
    expect(filter({ path: '/foo/bar/' })).toBeTruthy();
    expect(filter({ path: '/foo/bar/baz' })).toBeFalsy();
    expect(filter({ path: '/asdf' })).toBeFalsy();
  });

  test('glob with star in the middle', () => {
    const filter = createUrlFilter(['/foo/*/bar'], []);
    expect(filter({ path: '/foo/asdf/bar' })).toBeTruthy();
    expect(filter({ path: '/foo/asdf/bar/' })).toBeTruthy();
    expect(filter({ path: '/foo/bar' })).toBeFalsy();
    expect(filter({ path: '/foo/asdf/1234' })).toBeFalsy();
  });

  test('removes trailing slash from glob', () => {
    const filter = createUrlFilter(['/foo/'], []);
    expect(filter({ path: '/foo/' })).toBeTruthy();
    expect(filter({ path: '/foo' })).toBeTruthy();
    expect(filter({ path: '/foo/bar' })).toBeFalsy();
  });

  test('exclude has higher precedence than include', () => {
    const filter = createUrlFilter(['/foo/*'], ['/foo/asdf']);
    expect(filter({ path: '/foo/bar' })).toBeTruthy();
    expect(filter({ path: '/foo/bar/' })).toBeTruthy();
    expect(filter({ path: '/foo/asdf' })).toBeFalsy();
    expect(filter({ path: '/foo/bar/baz' })).toBeFalsy();
    expect(filter({ path: '/foo/asdfasdf' })).toBeTruthy();
  });

  test('globstar and globs in exclude', () => {
    const filter = createUrlFilter(['/foo/**'], ['/foo/asdf/**']);
    expect(filter({ path: '/foo' })).toBeFalsy();
    expect(filter({ path: '/foo/sdf' })).toBeTruthy();
    expect(filter({ path: '/foo/sdf/asdf' })).toBeTruthy();
    expect(filter({ path: '/foo/sdf/asdf/' })).toBeTruthy();
    expect(filter({ path: '/foo/asdf' })).toBeTruthy();
    expect(filter({ path: '/foo/asdf/foo' })).toBeFalsy();
    expect(filter({ path: '/foo/asdf/foo/bar' })).toBeFalsy();
  });

  test('fancy globs', () => {
    const filter = createUrlFilter(['/{foo,bar}/*'], []);
    expect(filter({ path: '/foo/asdf' })).toBeTruthy();
    expect(filter({ path: '/bar/asdf' })).toBeTruthy();
    expect(filter({ path: '/bar/asdf/' })).toBeTruthy();
    expect(filter({ path: '/1234/asdf' })).toBeFalsy();
  });
}
