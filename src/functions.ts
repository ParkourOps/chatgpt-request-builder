import { JSONSchema4 } from 'json-schema';

export type FunctionDefinition = {
  name: string;
  description?: string;
  parameters?: JSONSchema4;
};
