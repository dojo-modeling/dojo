/* eslint-disable camelcase */

import * as yup from 'yup';

const isNum = (type) => type === 'int' || type === 'float';

/*
 * Patch options in the case where the default value is left out.
 * Currently, there are no checks in the templater for `defaultValue`'s
 * membership in `options`.
 */
const patchOptions = (options, defaultValue) => (
  options.includes(defaultValue) ? options : [defaultValue].concat(options)
);

/*
 * Generates the Form defaults as the run defaults as specified
 * by the user that registered the model.
 */
const getRunDefaults = (parameters) => Object.fromEntries(
  // Generate key-value pairs to use for transform into object
  parameters.map(({
    annotation: {
      name, type, default_value
    }
  }) => [
    name,
    // Coerce type so yup validation works properly
    isNum(type) ? Number(default_value) : default_value
  ])
);

/*
 * Generates a yup object that has a single field that
 * corresponds to one of the parameters.
 */
const genParamEntry = ({
  name, min, max, type
}) => {
  // Initialize empty entry where restrictions where yup restrictions will stack
  const entry = {};
  if (isNum(type)) {
    // Coerce to infinity so we don't have to conditionally filter based of off min/max existence
    const lower = min === '' ? -Infinity : Number(min);
    const upper = max === '' ? Infinity : Number(max);
    entry[name] = yup.number()
      .min(
        lower,
        (ctx) => `Must be greater than or equal to ${ctx.min}`
      )
      .max(
        upper,
        (ctx) => `Must be less than or equal to ${ctx.max}`
      );
    if (type === 'int') {
      entry[name] = entry[name].integer('Must be an integer');
    }
  } else {
    entry[name] = yup.string();
  }
  // Require all entries to have some text. When requiring is done here, the text fields don't
  // have to be given a special property that adds an '*'.
  entry[name] = entry[name].required();
  return entry;
};

/*
 * Dynamically build a yup validation schema based on the parameters.
 * The fields are unique to each model, so the field has to be
 * generated on-the-fly using the constraints set by the model.
 */
const RunCreationSchema = (parameters) => {
  // Generate list of single field yup objects
  const entries = parameters.map((param) => genParamEntry(param.annotation));
  // Fold fields into single object
  return entries.reduce(
    (validation, entry) => validation.shape(entry),
    yup.object({})
  );
};

export {
  getRunDefaults, isNum, patchOptions, RunCreationSchema
};
