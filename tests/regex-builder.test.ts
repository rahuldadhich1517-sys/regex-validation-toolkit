import { describe, expect, it } from 'vitest';
import {
  atLeast,
  between,
  buildRegex,
  capture,
  characterClass,
  compileRegex,
  digit,
  endOfLine,
  escapeCharacterClass,
  escapeRegex,
  exactly,
  literal,
  lookahead,
  negatedCharacterClass,
  negativeLookahead,
  nonCapture,
  oneOf,
  oneOrMore,
  optional,
  range,
  RegexFragment,
  resolvePattern,
  sequence,
  startOfLine,
  validateFlags,
  whitespace,
  wordCharacter,
  zeroOrMore,
} from '../src/regex-builder/index.js';
import { RegexBuilderError, RegexCompilationError } from '../src/errors.js';

describe('regex-builder module', () => {
  describe('A. escapeRegex and escapeCharacterClass', () => {
    it('escapes every regex metacharacter individually and in combinations', () => {
      const metachars = ['\\', '^', '$', '.', '*', '+', '?', '(', ')', '[', ']', '{', '}', '|', '/'];
      for (const char of metachars) {
        const escaped = escapeRegex(char);
        const rx = new RegExp(`^${escaped}$`);
        expect(rx.test(char)).toBe(true);
        expect(rx.test('other')).toBe(false);
      }

      const allCombined = '\\^$.*+?()[]{}|/';
      const escapedCombined = escapeRegex(allCombined);
      const rxCombined = new RegExp(`^${escapedCombined}$`);
      expect(rxCombined.test(allCombined)).toBe(true);
      expect(rxCombined.test('test')).toBe(false);
    });

    it('escapes hyphens, quotes, whitespace, newlines, and tabs safely', () => {
      const textWithSpecial = 'Hyphen-Name "double quotes" \'single quotes\' \t\r\n test';
      const escaped = escapeRegex(textWithSpecial);
      const rx = new RegExp(`^${escaped}$`);
      expect(rx.test(textWithSpecial)).toBe(true);
      expect(rx.test('something else')).toBe(false);
    });

    it('escapes Unicode and Emoji text safely', () => {
      const unicodeSample = 'Café München 漢字 😀🎉';
      const escaped = escapeRegex(unicodeSample);
      const rx = new RegExp(`^${escaped}$`, 'u');
      expect(rx.test(unicodeSample)).toBe(true);
    });

    it('handles empty string and long string with consecutive metacharacters', () => {
      expect(escapeRegex('')).toBe('');
      const longInput = '.*+?^${}()|[]/\\'.repeat(50);
      const escaped = escapeRegex(longInput);
      const rx = new RegExp(`^${escaped}$`);
      expect(rx.test(longInput)).toBe(true);
    });

    it('escapeRegex throws RegexBuilderError when input is not a string', () => {
      // @ts-expect-error testing invalid input at runtime
      expect(() => escapeRegex(null)).toThrow(RegexBuilderError);
      // @ts-expect-error testing invalid input at runtime
      expect(() => escapeRegex(undefined)).toThrow(RegexBuilderError);
      // @ts-expect-error testing invalid input at runtime
      expect(() => escapeRegex(12345)).toThrow(RegexBuilderError);
      // @ts-expect-error testing invalid input at runtime
      expect(() => escapeRegex({})).toThrow(RegexBuilderError);
    });

    it('escapeCharacterClass escapes special characters inside character classes', () => {
      expect(escapeCharacterClass('a-z]')).toBe('a\\-z\\]');
      expect(escapeCharacterClass('^\\')).toBe('\\^\\\\');
      expect(escapeCharacterClass('abc')).toBe('abc');
    });

    it('escapeCharacterClass throws RegexBuilderError when input is not a string', () => {
      // @ts-expect-error testing invalid input at runtime
      expect(() => escapeCharacterClass(null)).toThrow(RegexBuilderError);
      // @ts-expect-error testing invalid input at runtime
      expect(() => escapeCharacterClass(undefined)).toThrow(RegexBuilderError);
    });
  });

  describe('B. Sequence composition', () => {
    it('sequence handles 0, 1, and multiple parts', () => {
      expect(sequence().source).toBe('');
      expect(sequence('a').source).toBe('a');
      expect(sequence('a', 'b', 'c').source).toBe('abc');
    });

    it('sequence supports nested sequences and mixed part types', () => {
      const nested = sequence(
        startOfLine(),
        sequence(literal('user_'), digit()),
        endOfLine(),
      );
      expect(nested.source).toBe('^user_\\d$');
      expect(compileRegex(nested).test('user_7')).toBe(true);
      expect(compileRegex(nested).test('user_x')).toBe(false);
    });

    it('sequence supports empty strings and raw regex fragments', () => {
      const seq = sequence('start', '', literal('.'), digit(), '');
      expect(seq.source).toBe('start\\.\\d');
      expect(compileRegex(seq).test('start.5')).toBe(true);
    });

    it('sequence throws RegexBuilderError on unsupported input types', () => {
      // @ts-expect-error testing invalid type
      expect(() => sequence('valid', null)).toThrow(RegexBuilderError);
      // @ts-expect-error testing invalid type
      expect(() => sequence(123)).toThrow(RegexBuilderError);
    });
  });

  describe('C. Alternatives and oneOf', () => {
    it('oneOf wraps multiple alternatives in non-capturing group', () => {
      const alt = oneOf('cat', 'dog', 'fish');
      expect(alt.source).toBe('(?:cat|dog|fish)');
      expect(compileRegex(alt).test('cat')).toBe(true);
      expect(compileRegex(alt).test('dog')).toBe(true);
      expect(compileRegex(alt).test('fish')).toBe(true);
      expect(compileRegex(alt).test('bird')).toBe(false);
    });

    it('oneOf with single alternative returns it unwrapped', () => {
      const single = oneOf('single');
      expect(single.source).toBe('single');
    });

    it('oneOf throws if no alternatives are provided', () => {
      expect(() => oneOf()).toThrow(RegexBuilderError);
    });

    it('oneOf supports nested alternatives and different length branches', () => {
      const nested = oneOf('a', oneOf('bb', 'ccc'));
      expect(nested.source).toBe('(?:a|(?:bb|ccc))');
      expect(compileRegex(nested).test('bb')).toBe(true);
    });

    it('precedence: quantifying an alternation groups the entire alternation', () => {
      const alt = oneOf('cat', 'dog');
      const quantified = oneOrMore(alt);
      expect(quantified.source).toBe('(?:cat|dog)+');

      const rx = compileRegex(sequence(startOfLine(), quantified, endOfLine()));
      expect(rx.test('cat')).toBe(true);
      expect(rx.test('dog')).toBe(true);
      expect(rx.test('catdogcat')).toBe(true);
      expect(rx.test('catdogggg')).toBe(false); // does not accidentally match 'cat' + 'dog'+
    });
  });

  describe('D. Optional and repetition helpers', () => {
    it('quantifies single atomic tokens without redundant non-capturing groups', () => {
      expect(optional('a').source).toBe('a?');
      expect(zeroOrMore(digit()).source).toBe('\\d*');
      expect(oneOrMore(characterClass('a-z')).source).toBe('[a-z]+');
      expect(exactly(nonCapture('ab'), 3).source).toBe('(?:ab){3}');
    });

    it('quantifies multi-character sequences with necessary grouping to prevent precedence bugs', () => {
      const seq = sequence('a', 'b');
      expect(optional(seq).source).toBe('(?:ab)?');
      expect(zeroOrMore(seq).source).toBe('(?:ab)*');
      expect(oneOrMore(seq).source).toBe('(?:ab)+');
      expect(exactly(seq, 2).source).toBe('(?:ab){2}');

      const rx = compileRegex(sequence(startOfLine(), exactly(seq, 2), endOfLine()));
      expect(rx.test('abab')).toBe(true);
      expect(rx.test('abb')).toBe(false); // would happen if grouped as a(b{2})
    });

    it('between matches bounded repetition counts at exact boundaries', () => {
      const b = between(digit(), 2, 4);
      expect(b.source).toBe('\\d{2,4}');

      const rx = compileRegex(sequence(startOfLine(), b, endOfLine()));
      expect(rx.test('1')).toBe(false); // 1 less than min
      expect(rx.test('12')).toBe(true); // exactly min
      expect(rx.test('123')).toBe(true); // inside bounds
      expect(rx.test('1234')).toBe(true); // exactly max
      expect(rx.test('12345')).toBe(false); // 1 more than max
    });

    it('atLeast matches minimum repetition counts at boundaries', () => {
      const al = atLeast(digit(), 3);
      expect(al.source).toBe('\\d{3,}');

      const rx = compileRegex(sequence(startOfLine(), al, endOfLine()));
      expect(rx.test('12')).toBe(false); // 1 less than min
      expect(rx.test('123')).toBe(true); // exactly min
      expect(rx.test('123456')).toBe(true); // greater than min
    });

    it('repetition helpers strictly reject invalid bounds', () => {
      // exactly
      expect(() => exactly('a', -1)).toThrow(RegexBuilderError);
      expect(() => exactly('a', 1.5)).toThrow(RegexBuilderError);
      expect(() => exactly('a', NaN)).toThrow(RegexBuilderError);
      expect(() => exactly('a', 70000)).toThrow(RegexBuilderError); // exceeds limit

      // between
      expect(() => between('a', 5, 2)).toThrow(RegexBuilderError); // min > max
      expect(() => between('a', -1, 5)).toThrow(RegexBuilderError);
      expect(() => between('a', 1, -5)).toThrow(RegexBuilderError);
      expect(() => between('a', 1.2, 5)).toThrow(RegexBuilderError);
      expect(() => between('a', 1, 5.5)).toThrow(RegexBuilderError);
      expect(() => between('a', 0, 70000)).toThrow(RegexBuilderError);

      // atLeast
      expect(() => atLeast('a', -1)).toThrow(RegexBuilderError);
      expect(() => atLeast('a', 2.5)).toThrow(RegexBuilderError);
      expect(() => atLeast('a', 70000)).toThrow(RegexBuilderError);
    });
  });

  describe('E. Group helpers', () => {
    it('capture creates unnamed capturing group and captures value', () => {
      const cap = capture(sequence(digit(), digit()));
      expect(cap.source).toBe('(\\d\\d)');

      const match = compileRegex(cap).exec('value: 42');
      expect(match?.[1]).toBe('42');
    });

    it('capture creates named capturing group with valid identifier names', () => {
      const validNames = ['group', '_private', '$element', 'item123'];
      for (const name of validNames) {
        const cap = capture(digit(), name);
        expect(cap.source).toBe(`(?<${name}>\\d)`);
        const match = compileRegex(cap).exec('8');
        expect(match?.groups?.[name]).toBe('8');
      }
    });

    it('capture throws RegexBuilderError on invalid group names', () => {
      const invalidNames = ['123startWithDigit', 'invalid-hyphen', 'has space', '@symbol', ''];
      for (const name of invalidNames) {
        expect(() => capture(digit(), name)).toThrow(RegexBuilderError);
      }
    });

    it('duplicate group names in sequence fail compilation', () => {
      const duplicatePattern = sequence(capture('a', 'grp'), capture('b', 'grp'));
      expect(() => compileRegex(duplicatePattern)).toThrow(RegexCompilationError);
    });

    it('nonCapture creates (?:...) non-capturing group', () => {
      const nc = nonCapture('abc');
      expect(nc.source).toBe('(?:abc)');
      const match = compileRegex(nc).exec('abc');
      expect(match?.[1]).toBeUndefined(); // no captured group
    });
  });

  describe('F. Lookaheads', () => {
    it('lookahead asserts following text without consuming characters', () => {
      const la = sequence('foo', lookahead('bar'));
      expect(la.source).toBe('foo(?=bar)');

      const rx = compileRegex(la);
      const match = rx.exec('foobar');
      expect(match?.[0]).toBe('foo'); // does not consume 'bar'
      expect(rx.test('foobaz')).toBe(false);
    });

    it('negativeLookahead asserts absence of following text', () => {
      const nla = sequence('foo', negativeLookahead('bar'));
      expect(nla.source).toBe('foo(?!bar)');

      const rx = compileRegex(nla);
      expect(rx.test('foobaz')).toBe(true);
      expect(rx.test('foobar')).toBe(false);
    });

    it('supports empty following text and nested lookaheads', () => {
      const emptyLa = sequence('foo', lookahead(''));
      expect(emptyLa.source).toBe('foo(?=)');
      expect(compileRegex(emptyLa).test('foo')).toBe(true);
    });
  });

  describe('G. Character classes', () => {
    it('characterClass creates positive character class with literal characters and ranges', () => {
      const cc = characterClass('abc', range('0', '9'), '_');
      expect(cc.source).toBe('[abc0-9_]');

      const rx = compileRegex(sequence(startOfLine(), oneOrMore(cc), endOfLine()));
      expect(rx.test('a9_b0')).toBe(true);
      expect(rx.test('a9-b0')).toBe(false);
    });

    it('range descriptor validates bounds and rejects inverted ranges', () => {
      expect(range('a', 'z')).toEqual({ from: 'a', to: 'z' });
      expect(range('a', 'a')).toEqual({ from: 'a', to: 'a' });

      expect(() => range('z', 'a')).toThrow(RegexBuilderError);
      expect(() => range('9', '0')).toThrow(RegexBuilderError);
      expect(() => range('aa', 'z')).toThrow(RegexBuilderError);
      // @ts-expect-error testing invalid type
      expect(() => range(1, 2)).toThrow(RegexBuilderError);
    });

    it('characterClass rejects string ranges that are out of order', () => {
      expect(() => characterClass('z-a')).toThrow(RegexBuilderError);
      expect(() => characterClass('9-0')).toThrow(RegexBuilderError);
      expect(() => characterClass({ from: 'z', to: 'a' })).toThrow(RegexBuilderError);
      // @ts-expect-error testing invalid type
      expect(() => characterClass(123)).toThrow(RegexBuilderError);
    });

    it('characterClass safely escapes special characters: ], \\, -, and ^ at beginning', () => {
      const cc = characterClass(']', '\\', '-', '^');
      expect(cc.source).toBe('[\\]\\\\\\-\\^]');

      const rx = compileRegex(cc);
      expect(rx.test(']')).toBe(true);
      expect(rx.test('\\')).toBe(true);
      expect(rx.test('-')).toBe(true);
      expect(rx.test('^')).toBe(true);
      expect(rx.test('a')).toBe(false);
    });

    it('characterClass safely escapes caret when specified alone or first', () => {
      const cc = characterClass('^');
      expect(cc.source).toBe('[\\^]');
      const rx = compileRegex(cc);
      expect(rx.test('^')).toBe(true);
      expect(rx.test('a')).toBe(false); // positive class, not negated!
    });

    it('characterClass throws when called with no arguments', () => {
      expect(() => characterClass()).toThrow(RegexBuilderError);
      expect(() => negatedCharacterClass()).toThrow(RegexBuilderError);
    });

    it('negatedCharacterClass creates [^...]', () => {
      const ncc = negatedCharacterClass('0-9');
      expect(ncc.source).toBe('[^0-9]');
      expect(compileRegex(ncc).test('a')).toBe(true);
      expect(compileRegex(ncc).test('5')).toBe(false);
    });
  });

  describe('H. Anchors and character shorthands', () => {
    it('exports standard shorthands', () => {
      expect(startOfLine().source).toBe('^');
      expect(endOfLine().source).toBe('$');
      expect(digit().source).toBe('\\d');
      expect(whitespace().source).toBe('\\s');
      expect(wordCharacter().source).toBe('\\w');
    });

    it('multiline flag changes anchor behavior to line boundaries', () => {
      const pattern = sequence(startOfLine(), digit(), endOfLine());
      const singleLineRx = compileRegex(pattern);
      expect(singleLineRx.test('1\n2')).toBe(false);

      const multilineRx = compileRegex(pattern, 'm');
      expect(multilineRx.test('1\n2')).toBe(true);
    });
  });

  describe('I. Flags and compilation', () => {
    it('validates all supported ECMAScript flags', () => {
      expect(() => validateFlags('')).not.toThrow();
      expect(() => validateFlags(undefined)).not.toThrow();
      expect(() => validateFlags('d')).not.toThrow();
      expect(() => validateFlags('g')).not.toThrow();
      expect(() => validateFlags('i')).not.toThrow();
      expect(() => validateFlags('m')).not.toThrow();
      expect(() => validateFlags('s')).not.toThrow();
      expect(() => validateFlags('u')).not.toThrow();
      expect(() => validateFlags('y')).not.toThrow();
      expect(() => validateFlags('gimsuy')).not.toThrow();
    });

    it('rejects duplicate, unsupported, and non-string flags', () => {
      expect(() => validateFlags('gg')).toThrow(RegexCompilationError);
      expect(() => validateFlags('imi')).toThrow(RegexCompilationError);
      expect(() => validateFlags('z')).toThrow(RegexCompilationError);
      expect(() => validateFlags('uv')).toThrow(RegexCompilationError); // mutually exclusive
      // @ts-expect-error testing invalid type
      expect(() => validateFlags(123)).toThrow(RegexCompilationError);
      // @ts-expect-error testing invalid type
      expect(() => validateFlags(null)).toThrow(RegexCompilationError);
    });

    it('compileRegex and buildRegex compile valid patterns with flags', () => {
      const rx1 = compileRegex('^test$', 'i');
      expect(rx1.test('TEST')).toBe(true);

      const rx2 = buildRegex(sequence('hello', whitespace(), 'world'));
      expect(rx2.test('hello world')).toBe(true);
    });

    it('compileRegex throws RegexCompilationError on syntax errors with cause', () => {
      try {
        compileRegex('[unclosed');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err instanceof RegexCompilationError).toBe(true);
        expect((err as RegexCompilationError).cause).toBeDefined();
      }
    });

    it('evaluates statefulness of global (g) and sticky (y) flags accurately', () => {
      const rxG = compileRegex('\\d+', 'g');
      expect(rxG.lastIndex).toBe(0);
      expect(rxG.test('123 456')).toBe(true);
      expect(rxG.lastIndex).toBe(3);
      expect(rxG.test('123 456')).toBe(true);
      expect(rxG.lastIndex).toBe(7);
      expect(rxG.test('123 456')).toBe(false); // resets to 0
      expect(rxG.lastIndex).toBe(0);

      const rxY = compileRegex('\\d+', 'y');
      rxY.lastIndex = 4;
      expect(rxY.test('abc 123')).toBe(true);
    });

    it('RegexFragment methods and properties work as expected', () => {
      const frag = new RegexFragment('\\d+');
      expect(frag.source).toBe('\\d+');
      expect(frag.toString()).toBe('\\d+');
      expect(frag[Symbol.toPrimitive]()).toBe('\\d+');
      expect(frag.test('123')).toBe(true);
      expect(frag.test('abc')).toBe(false);

      const ccWithFrag = characterClass(digit(), '_');
      expect(ccWithFrag.source).toBe('[\\d_]');

      expect(resolvePattern({ source: 'custom_source' })).toBe('custom_source');
    });

    it('resolvePattern throws on unsupported input types', () => {
      // @ts-expect-error testing invalid input at runtime
      expect(() => resolvePattern(12345)).toThrow(RegexBuilderError);
      // @ts-expect-error testing invalid input at runtime
      expect(() => resolvePattern(null)).toThrow(RegexBuilderError);
      // @ts-expect-error testing invalid input at runtime
      expect(() => resolvePattern(undefined)).toThrow(RegexBuilderError);
    });
  });

  describe('J. Complex nested composition', () => {
    it('composes sequences, alternations, repetitions, and character classes safely', () => {
      // Pattern: IPv4 with optional port: (?:(?:\d{1,3}\.){3}\d{1,3})(?::\d{1,5})?
      const octet = between(digit(), 1, 3);
      const dotOctet = sequence(octet, literal('.'));
      const ip = sequence(exactly(dotOctet, 3), octet);
      const port = sequence(literal(':'), between(digit(), 1, 5));
      const fullEndpoint = sequence(startOfLine(), capture(ip, 'ip'), optional(capture(port, 'port')), endOfLine());

      const rx = compileRegex(fullEndpoint);
      const match = rx.exec('192.168.1.1:8080');
      expect(match?.groups?.['ip']).toBe('192.168.1.1');
      expect(match?.groups?.['port']).toBe(':8080');
    });
  });
});
