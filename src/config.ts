import * as os from 'node:os';

// eslint-disable-next-line @cloudfour/n/file-extension-in-import
import * as kleur from 'kleur/colors';
import stringWidth from 'string-width';
import * as z from 'zod';

import type { LighthouseSettings } from './lighthouse.js';
import type { Crawler } from './main.js';
import { OutputType } from './output-writer/index.js';

export interface ConfigOptions {
  /** An array of targets where the results will be saved */
  outputs: (
    | {
        type: 'google-sheets';
        /** The document title of the created Google Spreadsheet */
        title: string;
      }
    | {
        type: 'csv';
        /** The filename of the CSV file */
        filename: string;
      }
  )[];
  /**
   * Options to be passed into Lighthouse.
   * See [Lighthouse's .d.ts](https://github.com/GoogleChrome/lighthouse/blob/v11.0.0/types/lhr/settings.d.ts#L49-L117) for more details.
   */
  lighthouseSettings?: LighthouseSettings;
  /**
   * A function that generates the list of URLs to run lighthouse on.
   * You can use `defaultCrawler` to create this function, or use your own.
   * The function will be passed a callback, `emitURL`,
   * which should be called for each URL to enqueue.
   */
  getURLs: Crawler;
  /**
   * Control the maximum number of Lighthouse reports running concurrently
   * (defaults to `os.cpus().length - 1`)
   */
  lighthouseConcurrency?: number;
}

/** Checks that two types are exactly equal. Do not pass a third type parameter. */
export type AssertEqual<A extends B, B extends C, C = A> = never;
// Forces us to keep the manually-written type above in sync with the generated type from zod
// The manually-written type is there for the sake of preserving doc comments in the generated .d.ts
export type Check1 = AssertEqual<ConfigOptions, z.input<typeof configSchema>>;

const googleSheetsOutputSchema = z.object({
  type: z.literal(OutputType.GoogleSheets),
  title: z.string(),
});

const csvOutputSchema = z.object({
  type: z.literal(OutputType.CSV),
  filename: z.string(),
});

export const configSchema = z.object({
  outputs: z
    .array(
      z.discriminatedUnion('type', [googleSheetsOutputSchema, csvOutputSchema]),
    )
    .min(1),
  lighthouseConcurrency: z
    .number()
    .positive()
    .int()
    .default(os.cpus().length - 1),
  lighthouseSettings: z.object({}).default({}) as z.ZodType<
    LighthouseSettings,
    z.ZodTypeDef,
    LighthouseSettings | undefined
  >,
  getURLs: z.function() as z.ZodType<Crawler>,
});

type Issue = z.ZodIssue & {
  originalPath: (string | number)[];
};

const formatIssuePath = (rootName: string, path: (string | number)[]) =>
  `${rootName}${path
    .map((segment) =>
      typeof segment === 'string' ? `.${segment}` : `[${segment}]`,
    )
    .join('')}`;

const indent = (input: string) => `  ${input.replace(/\n/g, '\n  ')}`;
// Like String.prototype.padEnd, but handling escape codes and handling characters with different widths (via `string-width`)
const padEnd = (input: string, length: number, padCharacter: string) =>
  `${input}${padCharacter.repeat(Math.max(length - stringWidth(input), 0))}`;

const stringify = (
  value: unknown,
  issues: Issue[],
  rootName: string,
): string => {
  if (typeof value === 'number') {
    // Not using JSON.stringify for handling NaN, Infinity, and -Infinity
    return String(value);
  }
  if (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return JSON.stringify(value);
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const printedChildren = value
      .map((item, i) => {
        const childIssues = issues
          .filter((issue) => issue.path[0] === i)
          .map((issue) => ({
            ...issue,
            path: issue.path.slice(1),
          }));
        return stringifyWithIssues(item, childIssues, rootName);
      })
      .join(',\n');
    if (value.length === 1 && printedChildren.split('\n').length === 1) {
      return `[${printedChildren}]`;
    }
    return `[\n${indent(printedChildren)}\n]`;
  }
  if (typeof value === 'object') {
    const children = [
      ...Object.getOwnPropertyNames(value),
      ...new Set(
        issues
          .map((issue) => issue.path[0])
          .filter(
            (prop) =>
              !Object.getOwnPropertyNames(value).includes(prop as string),
          ),
      ),
    ];

    if (children.length === 0) return '{}';

    const printedChildren = children
      .map((prop) => {
        const childsIssues = issues
          .filter((issue) => issue.path[0] === prop)
          .map((issue) => ({
            ...issue,
            path: issue.path.slice(1),
          }));
        const prefix = `${prop}: `;
        if (
          !Object.prototype.hasOwnProperty.call(value, prop) &&
          childsIssues.length === 1 &&
          childsIssues[0].code === 'invalid_type'
        ) {
          // Special case: property is required but missing
          // Returns a special symbol to be printed as (missing)
          return `${prefix}${stringifyWithIssues(
            missingSymbol,
            childsIssues,
            rootName,
            prefix.length,
          )},`;
        }
        return `${prefix}${stringifyWithIssues(
          (value as any)[prop],
          childsIssues,
          rootName,
          prefix.length,
        )},`;
      })
      .join('\n');
    if (children.length === 1 && printedChildren.split('\n').length === 1) {
      return `{ ${printedChildren} }`;
    }
    return `{\n${indent(printedChildren)}\n}`;
  }
  if (value === missingSymbol) {
    return '(missing)';
  }
  if (typeof value === 'function') {
    return `() => { ... }`;
  }
  return String(value);
};

const missingSymbol = Symbol('Missing');

const stringifyWithIssues = (
  value: unknown,
  issues: Issue[],
  rootName: string,
  firstLineOffset = 0,
): string => {
  const selfIssues = issues.filter((issue) => issue.path.length === 0);
  const childIssues = issues.filter((issue) => issue.path.length > 0);
  const stringified = stringify(value, childIssues, rootName);

  if (selfIssues.length === 0) return stringified;

  const printedPath = kleur.gray(
    `╭─➤ ${formatIssuePath(rootName, selfIssues[0].originalPath)}`,
  );

  const stringifiedLines = stringified.split('\n');

  if (stringifiedLines.length === 1) {
    const squiggles = `${' '.repeat(firstLineOffset)}${kleur.gray(
      stringified.replace(
        /^(\s*)(.*?)(\s*)$/g,
        (_full, leadingWhitespace, middle, trailingWhitespace) =>
          `${leadingWhitespace}${'^'.repeat(
            stringWidth(middle),
          )}${trailingWhitespace}`,
      ),
    )}`;
    const subsequentIssueSpacer = ' '.repeat(stringWidth(squiggles) + 1);
    return `${kleur.red(stringified)} ${printedPath}\n${kleur.red(
      squiggles,
    )} ${selfIssues
      .map(
        (issue, i) =>
          `${i === 0 ? '' : subsequentIssueSpacer}${kleur.bold(
            kleur.red(issue.message),
          )}`,
      )
      .join('\n')}`;
  }

  const widest =
    Math.max(
      ...stringifiedLines.map((line, i) =>
        i === 0 ? stringWidth(line) + firstLineOffset : stringWidth(line),
      ),
    ) + 1;
  const lastLine = selfIssues
    .map(
      (issue, i) =>
        `${
          i === 0
            ? kleur.gray(`└${'─'.repeat(widest - 1)}┴─ `)
            : ' '.repeat(widest + 3)
        }${kleur.bold(kleur.red(issue.message))}`,
    )
    .join('\n');
  return [
    ...stringifiedLines.map((line, i) => {
      const paddedLine = padEnd(
        line,
        i === 0 ? widest - firstLineOffset : widest,
        kleur.gray(i === 0 ? '─' : ' '),
      );
      const lineEnd = kleur.gray(i === 0 ? '┐' : '│');
      const path = i === stringifiedLines.length - 1 ? `  ${printedPath}` : '';
      return `${paddedLine}${lineEnd}${path}`;
    }),
    lastLine,
  ].join('\n');
};

const formatZodError = (
  inputConfig: unknown,
  error: z.ZodError,
  rootName: string,
): Error => {
  const issues = error.issues
    .map((issue) => {
      if (issue.code === 'invalid_union') {
        return {
          ...issue,
          message: `Expected one of the following union types to match: ${issue.unionErrors
            .flatMap((err) => err.issues)
            .map((issue) => `\n- ${issue.message}`)
            .join('')}`,
        };
      }
      return issue;
    })
    .map((issue) => ({ ...issue, originalPath: issue.path }));

  const allIssues = issues
    .map((issue) => {
      const issuePath = kleur.cyan(formatIssuePath(rootName, issue.path));
      return `${issuePath}: ${issue.message}`;
    })
    .join('\n');
  const msg = `Parsing ${rootName} failed: Received the following:
${stringifyWithIssues(inputConfig, issues, rootName)}

${allIssues}`;
  return new Error(msg);
};

export const parseConfig = <Schema extends z.Schema>(
  schema: Schema,
  config: unknown,
  rootName: string,
): z.output<Schema> => {
  const result = schema.safeParse(config);
  if (result.success) return result.data;
  throw formatZodError(config, result.error, rootName);
};
