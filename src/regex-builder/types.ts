export interface CharacterClassRange {
  readonly from: string;
  readonly to: string;
}

export interface RegexFragmentLike {
  readonly source: string;
  toString(): string;
  compile(flags?: string): RegExp;
}

export type PatternInput = string | RegExp | RegexFragmentLike;

export type CharacterClassItem = string | CharacterClassRange | RegexFragmentLike;
