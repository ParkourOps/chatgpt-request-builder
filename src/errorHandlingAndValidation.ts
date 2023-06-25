import { FunctionDefinition } from './functions';

const msg = (e: any): string => {
  if (e instanceof Error) {
    return e.message.toLowerCase();
  } else if (typeof e === 'string') {
    return e.toLowerCase();
  } else {
    return `< Error description not available. >`;
  }
};

export const errors = {
  failedToCreateClient: (e: any) => Error(`Failed to create client: ${msg(e)}`),
  notInitialized: Error(
    `Module not initialized. You must call the initialize(...) function first.`,
  ),
  invalidApiKey: Error('API key used for initialization is invalid.'),
  incorrectUse: (why: string) => Error(`Incorrect use: ${msg(why)}`),
  invalidParameter: (name: string, why: string) =>
    Error(`Invalid parameter '${name}': ${msg(why)}`),
  openAiFailure: (e: any) => Error(`OpenAI server error: ${msg(e)}`),
} as const;

export function validateNumericInputRange(
  name: string,
  n: number,
  inclusiveMin: number,
  inclusiveMax: number,
) {
  if (n < inclusiveMin || n > inclusiveMax) {
    throw errors.invalidParameter(
      name,
      `number is out of range, it must be between ${inclusiveMin} and ${inclusiveMax} (both inclusive).`,
    );
  }
}

export function validateFunctionDefinition(f: FunctionDefinition) {
  if (f.name.length < 1 || f.name.length > 64) {
    throw errors.invalidParameter(
      '<functionDefinition>.name',
      `(="${f.name}") must have a minimum length of 1 and maximum length of 64.`,
    );
  }
  const functionNameMatch = f.name.match(
    /^((?:[a-zA-Z\_])(?:[a-zA-Z0-9\_]*))$/,
  );
  if (
    !functionNameMatch ||
    functionNameMatch.length < 1 ||
    functionNameMatch.length > 2
  ) {
    throw errors.invalidParameter(
      '<functionDefinition>.name',
      `(="${f.name}") must (1) begin with a letter or underscore and (2) contain only letters, numbers, or underscores.`,
    );
  }
}
