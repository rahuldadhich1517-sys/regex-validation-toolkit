export {
  literal,
  sequence,
  oneOf,
  optional,
  zeroOrMore,
  oneOrMore,
  exactly,
  between,
  atLeast,
  capture,
  nonCapture,
  lookahead,
  negativeLookahead,
  characterClass,
  negatedCharacterClass,
  range,
  startOfLine,
  endOfLine,
  digit,
  whitespace,
  wordCharacter,
  buildRegex,
  compileRegex,
  resolvePattern,
} from './builder.js';

export {
  escapeRegex,
  escapeCharacterClass,
} from './escape.js';

export {
  RegexFragment,
  fragment,
  validateFlags,
} from './fragment.js';

export type {
  PatternInput,
  CharacterClassItem,
  CharacterClassRange,
  RegexFragmentLike,
} from './types.js';
