import { OpenAIApi, Configuration, CreateChatCompletionRequest } from 'openai';
import {
  errors,
  validateFunctionDefinition,
} from './errorHandlingAndValidation';
import { validateNumericInputRange } from './errorHandlingAndValidation';
import { encode, decode } from '../tokenizer';
import { FunctionDefinition } from './functions';
import { JSONSchema4 } from 'json-schema';

const MAX_N_CHOICES = 100;

function createClient(apiKey: string) {
  try {
    return new OpenAIApi(
      new Configuration({
        apiKey,
      }),
    );
  } catch (e: any) {
    throw errors.failedToCreateClient(e);
  }
}

let _apiKey: string | undefined;

export function initialize(apiKey: string) {
  if (!apiKey) {
    throw errors.invalidApiKey;
  }
  _apiKey = apiKey;
}

type ChatCompletionModel = 'gpt-3.5-turbo' | 'gpt-4';

class ChatCompletionRequest {
  #client: OpenAIApi;
  #request: CreateChatCompletionRequest;
  constructor(model: ChatCompletionModel) {
    if (!_apiKey) {
      throw errors.notInitialized;
    }
    this.#client = createClient(_apiKey);
    this.#request = {
      model,
      messages: [],
      // logit_bias: {},
    };
  }
  tuneByTemperature(temperature: number) {
    if (this.#request.top_p) {
      throw errors.incorrectUse(
        "cannot set 'temperature' if 'top_p' is already set.",
      );
    }
    validateNumericInputRange('temperature', temperature, 0, 2);
    this.#request.temperature = temperature;
    return this;
  }
  tuneByProbabilityMass(topP: number) {
    if (this.#request.temperature) {
      throw errors.incorrectUse(
        "cannot set 'topP' if 'temperature' is already set.",
      );
    }
    validateNumericInputRange('topP', topP, 0, 2);
    this.#request.top_p = topP;
    return this;
  }
  systemPrompt(message: string) {
    this.#request.messages.push({
      role: 'system',
      content: message,
    });
    return this;
  }
  assistantPrompt(message: string) {
    this.#request.messages.push({
      role: 'assistant',
      content: message,
    });
    return this;
  }
  assistantCallFunctionPrompt<T>(functionName: string, functionArgs: T) {
    // check function name belongs to a registered function
    if (
      !this.#request.functions ||
      !this.#request.functions.find(f => f.name === functionName)
    ) {
      throw errors.invalidParameter(
        'functionName',
        `must describe this function using describeFunction(...) first.`,
      );
    }
    // add prompt
    this.#request.messages.push({
      role: 'assistant',
      function_call: {
        name: functionName,
        arguments:
          typeof functionArgs === 'string'
            ? functionArgs
            : JSON.stringify(functionArgs),
      },
    });
  }
  userPrompt(message: string) {
    this.#request.messages.push({
      role: 'user',
      content: message,
    });
    return this;
  }
  functionResponsePrompt<T>(functionName: string, functionResponse: T) {
    // check function name belongs to a registered function
    if (
      !this.#request.functions ||
      !this.#request.functions.find(f => f.name === functionName)
    ) {
      throw errors.invalidParameter(
        'functionName',
        `must describe this function using describeFunction(...) first.`,
      );
    }
    // add prompt
    this.#request.messages.push({
      role: 'function',
      name: functionName,
      content:
        typeof functionResponse === 'string'
          ? functionResponse
          : JSON.stringify(functionResponse),
    });
  }
  setBias(term: string, weight: number): typeof this;
  setBias(terms: Array<string>, weight: number): typeof this;
  setBias(terms: string | Array<string>, weight: number) {
    if (!this.#request.logit_bias) {
      this.#request.logit_bias = {};
    }
    validateNumericInputRange('weight', weight, -100, 100);
    if (typeof terms === 'string') {
      terms = [terms];
    }
    for (const term of terms) {
      if (!term) {
        throw errors.incorrectUse("'term' must not be empty.");
      }
      const tokens = encode(term);
      for (const token of tokens) {
        (this.#request.logit_bias as Record<number, number>)[token] = weight;
      }
    }
    return this;
  }
  limitOutput(nOfTokens: number) {
    validateNumericInputRange('nOfTokens', nOfTokens, 0, Infinity);
    this.#request.max_tokens = nOfTokens;
    return this;
  }
  setPresencePenalty(presencePenalty: number) {
    validateNumericInputRange('presencePenalty', presencePenalty, -2, 2);
    this.#request.presence_penalty = presencePenalty;
    return this;
  }
  setFrequencyPenalty(frequencyPenalty: number) {
    validateNumericInputRange('frequencyPenalty', frequencyPenalty, -2, 2);
    this.#request.frequency_penalty = frequencyPenalty;
    return this;
  }
  public describeFunction(f: FunctionDefinition): typeof this;
  public describeFunction(
    f: Function | string,
    description?: string,
    parameters?: JSONSchema4,
  ): typeof this;
  describeFunction(
    f: FunctionDefinition | Function | string,
    description?: string,
    parameters?: JSONSchema4,
  ) {
    if (!this.#request.functions) {
      this.#request.functions = [];
    }
    if (typeof f === 'function') {
      (this.#request.functions as Array<FunctionDefinition>).push({
        name: f.name,
        description,
        parameters,
      });
    } else if (typeof f === 'string') {
      (this.#request.functions as Array<FunctionDefinition>).push({
        name: f,
        description,
        parameters,
      });
    } else {
      validateFunctionDefinition(f);
      (this.#request.functions as Array<FunctionDefinition>).push(f);
    }
    return this;
  }
  stopFunctionCalls() {
    this.#request.function_call = 'none';
  }
  async go(nChoices: number = 1) {
    validateNumericInputRange('nChoices', nChoices, 1, MAX_N_CHOICES);
    if (!this.#request.messages || this.#request.messages.length < 1) {
      throw errors.incorrectUse(
        'no prompts have been supplied for the large language model (LLM) to use.',
      );
    }
    try {
      const result = await this.#client.createChatCompletion(this.#request);
      return result.data;
    } catch (e: any) {
      throw errors.openAiFailure(e);
    }
  }
}

export const request = (model: ChatCompletionModel) =>
  new ChatCompletionRequest(model);

export { encode, decode };
