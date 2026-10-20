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
  describe('escapeRegex and escapeCharacterClass', () => {
    it('escapes all regular expression metacharacters', () => {
      const metachars = '\\ ^ $ . * + ? ( ) [ ] { } | /';
      const escaped = escapeRegex(metachars);
      expect(escaped).toBe('\\\\ \\^ \\$ \\. \\* \\+ \\? \\( \\) \\[ \\] \\{ \\} \\| \\/');

      // Verify safe compilation
      const rx = new RegExp(`^${escaped}$`);
      expect(rx.test(metachars)).toBe(true);
      expect(rx.test('something else')).toBe(false);
    });

    it('escapeRegex throws RegexBuilderError when input is not a string', () => {
      // @ts-expect-error testing invalid input at runtime
      expect(() => escapeRegex(null)).toThrow(RegexBuilderError);
      // @ts-expect-error testing invalid input at runtime
      expect(() => escapeRegex(123)).toThrow(RegexBuilderError);
    });

    it('escapeCharacterClass escapes special characters inside character classes', () => {
      expect(escapeCharacterClass('a-z]')).toBe('a\\-z\\]');
      expect(escapeCharacterClass('^\\')).toBe('\\^\\\\');
    });

    it('escapeCharacterClass throws RegexBuilderError when input is not a string', () => {
      // @ts-expect-error testing invalid input at runtime
      expect(() => escapeCharacterClass(undefined)).toThrow(RegexBuilderError);
    });
  });

  describe('literal and sequence', () => {
    it('literal creates an escaped RegexFragment', () => {
      const lit = literal('file.txt');
      expect(lit.source).toBe('file\\.txt');
      expect(lit.toString()).toBe('file\\.txt');
      expect(lit.compile().test('file.txt')).toBe(true);
      expect(lit.compile().test('fileatxt')).toBe(false);
    });

    it('sequence concatenates parts in order', () => {
      const seq = sequence(startOfLine(), literal('user_'), digit(), endOfLine());
      expect(seq.source).toBe('^user_\\d$');
      expect(seq.compile().test('user_5')).toBe(true);
      expect(seq.compile().test('user_x')).toBe(false);
    });

    it('sequence works with strings, RegexFragments, and RegExps', () => {
      const seq = sequence('prefix-', /foo|bar/, literal('-suffix'));
      expect(seq.source).toBe('prefix-foo|bar-suffix');
    });
  });

  describe('oneOf and grouping', () => {
    it('oneOf wraps multiple alternatives in non-capturing group', () => {
      const alt = oneOf('cat', 'dog', 'fish');
      expect(alt.source).toBe('(?:cat|dog|fish)');
      expect(alt.compile().test('dog')).toBe(true);
      expect(alt.compile().test('bird')).toBe(false);
    });

    it('oneOf with single alternative returns it unwrapped', () => {
      const single = oneOf('apple');
      expect(single.source).toBe('apple');
    });

    it('oneOf throws if no alternatives are provided', () => {
      expect(() => oneOf()).toThrow(RegexBuilderError);
    });

    it('capture creates unnamed capturing group', () => {
      const cap = capture(sequence(digit(), digit()));
      expect(cap.source).toBe('(\\d\\d)');
      const match = compileRegex(cap).exec('abc42xyz');
      expect(match?.[1]).toBe('42');
    });

    it('capture creates named capturing group with valid name', () => {
      const cap = capture(digit(), 'myGroup');
      expect(cap.source).toBe('(?<myGroup>\\d)');
      const match = compileRegex(cap).exec('num: 7');
      expect(match?.groups?.['myGroup']).toBe('7');
    });

    it('capture throws RegexBuilderError on invalid group names', () => {
      expect(() => capture(digit(), '123invalid')).toThrow(RegexBuilderError);
      expect(() => capture(digit(), 'invalid-hyphen')).toThrow(RegexBuilderError);
      expect(() => capture(digit(), 'has space')).toThrow(RegexBuilderError);
    });

    it('nonCapture creates (?:...) non-capturing group', () => {
      const nc = nonCapture('abc');
      expect(nc.source).toBe('(?:abc)');
    });

    it('lookahead and negativeLookahead create assertions', () => {
      const la = sequence('foo', lookahead('bar'));
      expect(la.source).toBe('foo(?=bar)');
      expect(compileRegex(la).test('foobar')).toBe(true);
      expect(compileRegex(la).test('foobaz')).toBe(false);

      const nla = sequence('foo', negativeLookahead('bar'));
      expect(nla.source).toBe('foo(?!bar)');
      expect(compileRegex(nla).test('foobaz')).toBe(true);
      expect(compileRegex(nla).test('foobar')).toBe(false);
    });
  });

  describe('Quantifiers and Precedence', () => {
    it('quantifies single atomic tokens without redundant grouping', () => {
      expect(optional('a').source).toBe('a?');
      expect(zeroOrMore(digit()).source).toBe('\\d*');
      expect(oneOrMore(characterClass('a-z')).source).toBe('[a-z]+');
      expect(exactly(nonCapture('ab'), 3).source).toBe('(?:ab){3}');
    });

    it('quantifies multi-character sequences with necessary grouping to prevent precedence bugs', () => {
      const seq = sequence('a', 'b');
      expect(oneOrMore(seq).source).toBe('(?:ab)+');
      expect(compileRegex(oneOrMore(seq)).test('abab')).toBe(true);

      const alt = oneOf('cat', 'dog');
      expect(zeroOrMore(alt).source).toBe('(?:cat|dog)*');
      expect(compileRegex(zeroOrMore(alt)).test('catdogcat')).toBe(true);

      // Multi-bracket or compound parts
      expect(oneOrMore('[a-z][0-9]').source).toBe('(?:[a-z][0-9])+');
    });

    it('between matches bounded counts', () => {
      const b = between(digit(), 2, 4);
      expect(b.source).toBe('\\d{2,4}');
      const rx = compileRegex(sequence(startOfLine(), b, endOfLine()));
      expect(rx.test('1')).toBe(false);
      expect(rx.test('12')).toBe(true);
      expect(rx.test('1234')).toBe(true);
      expect(rx.test('12345')).toBe(false);
    });

    it('atLeast matches minimum count', () => {
      const al = atLeast(digit(), 3);
      expect(al.source).toBe('\\d{3,}');
      const rx = compileRegex(sequence(startOfLine(), al, endOfLine()));
      expect(rx.test('12')).toBe(false);
      expect(rx.test('123')).toBe(true);
      expect(rx.test('123456')).toBe(true);
    });

    it('repetition helpers validate counts strictly', () => {
      expect(() => exactly('a', -1)).toThrow(RegexBuilderError);
      expect(() => exactly('a', 1.5)).toThrow(RegexBuilderError);
      // @ts-expect-error testing invalid type
      expect(() => exactly('a', '3')).toThrow(RegexBuilderError);
      expect(() => exactly('a', 70000)).toThrow(RegexBuilderError);

      expect(() => between('a', 5, 2)).toThrow(RegexBuilderError);
      expect(() => between('a', -1, 5)).toThrow(RegexBuilderError);
      expect(() => between('a', 1, 70000)).toThrow(RegexBuilderError);

      expect(() => atLeast('a', -2)).toThrow(RegexBuilderError);
      expect(() => atLeast('a', 70000)).toThrow(RegexBuilderError);
    });
  });

  describe('Character classes', () => {
    it('characterClass creates positive character classes', () => {
      const cc = characterClass('abc', range('0', '9'), '_');
      expect(cc.source).toBe('[abc0-9_]');
      const rx = compileRegex(sequence(startOfLine(), oneOrMore(cc), endOfLine()));
      expect(rx.test('a1_b2')).toBe(true);
      expect(rx.test('a1-b2')).toBe(false);
    });

    it('range correctly enforces order and bounds', () => {
      expect(range('a', 'z')).toEqual({ from: 'a', to: 'z' });
      expect(() => range('z', 'a')).toThrow(RegexBuilderError);
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

    it('characterClass throws when empty', () => {
      expect(() => characterClass()).toThrow(RegexBuilderError);
      expect(() => negatedCharacterClass()).toThrow(RegexBuilderError);
    });

    it('negatedCharacterClass creates [^...]', () => {
      const ncc = negatedCharacterClass('0-9');
      expect(ncc.source).toBe('[^0-9]');
      expect(compileRegex(ncc).test('a')).toBe(true);
      expect(compileRegex(ncc).test('5')).toBe(false);
    });

    it('characterClass safely escapes special characters', () => {
      const cc = characterClass(']', '\\', '-');
      expect(cc.source).toBe('[\\]\\\\\\-]');
      const rx = compileRegex(cc);
      expect(rx.test(']')).toBe(true);
      expect(rx.test('\\')).toBe(true);
      expect(rx.test('-')).toBe(true);
    });
  });

  describe('Anchors and character shortcuts', () => {
    it('exports standard character class shortcuts', () => {
      expect(startOfLine().source).toBe('^');
      expect(endOfLine().source).toBe('$');
      expect(digit().source).toBe('\\d');
      expect(whitespace().source).toBe('\\s');
      expect(wordCharacter().source).toBe('\\w');
    });
  });

  describe('Compilation and flag validation', () => {
    it('validates supported flags', () => {
      expect(() => validateFlags('i')).not.toThrow();
      expect(() => validateFlags('gimsuy')).not.toThrow();
      expect(() => validateFlags('')).not.toThrow();
      expect(() => validateFlags(undefined)).not.toThrow();

      // Duplicate flags
      expect(() => validateFlags('ii')).toThrow(RegexCompilationError);
      expect(() => validateFlags('gig')).toThrow(RegexCompilationError);

      // Unsupported flags
      expect(() => validateFlags('x')).toThrow(RegexCompilationError);
      expect(() => validateFlags('z')).toThrow(RegexCompilationError);

      // Mutually exclusive u and v
      expect(() => validateFlags('uv')).toThrow(RegexCompilationError);
    });

    it('compileRegex and buildRegex compile valid patterns', () => {
      const rx1 = compileRegex('^test$', 'i');
      expect(rx1.test('TEST')).toBe(true);

      const rx2 = buildRegex(sequence('hello', whitespace(), 'world'));
      expect(rx2.test('hello world')).toBe(true);
    });

    it('compileRegex throws RegexCompilationError on invalid syntax', () => {
      expect(() => compileRegex('[unclosed')).toThrow(RegexCompilationError);
      expect(() => compileRegex('(?<1invalid>abc)')).toThrow(RegexCompilationError);
    });

    it('RegexFragment methods work as expected', () => {
      const frag = new RegexFragment('\\d+');
      expect(frag.source).toBe('\\d+');
      expect(frag.toString()).toBe('\\d+');
      expect(frag[Symbol.toPrimitive]()).toBe('\\d+');
      expect(frag.test('123')).toBe(true);
      expect(frag.test('abc')).toBe(false);

      // Testing characterClass with RegexFragment directly
      const ccWithFrag = characterClass(digit(), '_');
      expect(ccWithFrag.source).toBe('[\\d_]');

      // Testing resolvePattern with custom source object
      expect(resolvePattern({ source: 'custom_source' })).toBe('custom_source');
    });

    it('resolvePattern throws on unsupported input types', () => {
      // @ts-expect-error testing invalid input at runtime
      expect(() => resolvePattern(12345)).toThrow(RegexBuilderError);
      // @ts-expect-error testing invalid input at runtime
      expect(() => resolvePattern(null)).toThrow(RegexBuilderError);
    });
  });
});
