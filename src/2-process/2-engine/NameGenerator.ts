import {
  uniqueNamesGenerator,
  type Config,
  adjectives,
  colors,
  animals,
} from 'unique-names-generator';

const config: Config = {
  separator: '',
  length: 2,
  style: 'capital',
  dictionaries: [adjectives, colors, animals],
};

export const generateName = (): string => {
  return uniqueNamesGenerator(config);
};
