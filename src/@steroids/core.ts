import {
  ModuleType,
  ModuleDecoratorArgs,
  RouterDecoratorArgs,
  ValidationType,
  ValidationRule,
  ValidatorFunction,
  AsyncValidatorFunction,
  BodyValidationDefinition,
  ValidationDefinition
} from './models';

import _ from 'lodash';

export * from './models';

export function Service(config: ModuleDecoratorArgs) {

  return (target: any) => {

    target.prototype.__metadata = {
      name: config.name,
      type: ModuleType.Service
    };

  };

}

export function Router(config: RouterDecoratorArgs) {

  return (target: any) => {

    target.prototype.__metadata = {
      name: config.name,
      type: ModuleType.Router,
      routes: config.routes,
      priority: config.priority || 0,
      corsPolicy: config.corsPolicy
    };

  };

}

/**
* Resolves reference from raw values.
*/
export function resolveRef(ref: string, rawValues: any): any {

  const segments = ref.split('.');
  let currentRef: any = rawValues;

  for ( const segment of segments ) {

    if ( currentRef === undefined ) return undefined;

    currentRef = currentRef[segment];

  }

  return currentRef;

}

/**
* Type checks.
*/
export namespace type {

  /**
  * String type comparison.
  */
  export function String(value: any): boolean { return typeof value === 'string' }
  /**
  * Number type comparison.
  */
  export function Number(value: any): boolean { return typeof value === 'number'; }
  /**
  * Boolean type comparison.
  */
  export function Boolean(value: any): boolean { return typeof value === 'boolean'; }
  /**
  * Null type comparison.
  */
  export function Null(value: any): boolean { return value === null; }
  /**
  * Array type comparison.
  * @param validator      A validator to apply to all items inside the array.
  * @param arrayValidator A validator to apply to the whole array (e.g. len.min).
  */
  export function Array(validator?: ValidatorFunction, arrayValidator?: ValidatorFunction): ValidatorFunction {

    return (value: any): boolean|Error => {

      if ( ! value || typeof value !== 'object' || value.constructor !== Array ) return false;

      if ( validator ) {

        for ( const item of value ) {

          const result = validator(item);

          if ( result === false ) return false;
          if ( result instanceof Error ) return result;

        }

      }

      if ( arrayValidator ) {

        return arrayValidator(value);

      }

      return true;

    };

  }
  /**
  * Enum type comparison.
  * @param enumerator An enumerator to validate the value against.
  */
  export function Enum(enumerator: any): ValidatorFunction {

    return (value: any): boolean => {

      return _.values(enumerator).includes(value);

    };

  }

}

/**
* Equality comparison.
*/
export function equal(val: any): ValidatorFunction {

  return (value: any): boolean => {

    return value === val;

  };

}

/**
* Equality comparison with value from reference.
*/
export function equalRef(ref: string): ValidatorFunction {

  return (value: any, rawValues: any): boolean => {

    return value === resolveRef(ref, rawValues);

  };

}

/**
* Validates a string against a given regular expression.
* @param validators A rest argument of validators.
*/
export function match(regex: RegExp): ValidatorFunction {

  return (value: any): boolean => {

    return typeof value === 'string' && !! value.match(regex);

  };

}

/**
* Validates an object against the given flat body validator (useful for validating arrays of objects).
* @param bodyValidator A flat body validator.
*/
export function sub(bodyValidator: ValidationDefinition): ValidatorFunction {

  return (value: any): boolean => {

    if ( ! value || typeof value !== 'object' || value.constructor !== Object ) return false;

    for ( const key of _.keys(bodyValidator) ) {

      if ( ! value.hasOwnProperty(key) || ! bodyValidator[key](value[key]) ) return false;

    }

    return true;

  };

}

/**
* ORs all given validators.
* @param validators A rest argument of validators.
*/
export function or(...validators: Array<ValidatorFunction>): ValidatorFunction {

  return (value: any): boolean|Error => {

    let orCheck: boolean = false;

    for ( const validator of validators ) {

      const result = validator(value);

      orCheck = orCheck || (typeof result === 'boolean' ? result : false);

    }

    return orCheck;

  };

}

/**
* ANDs all given validators.
* @param validators A rest argument of validators.
*/
export function and(...validators: Array<ValidatorFunction>): ValidatorFunction {

  return (value: any): boolean|Error => {

    for ( const validator of validators ) {

      const result = validator(value);

      if ( result === false ) return false;
      if ( result instanceof Error ) return result;

    }

    return true;

  };

}

/**
* Negates all given validators.
* @param validators A rest argument of validators.
*/
export function not(validator: ValidatorFunction): ValidatorFunction {

  return (value: any): boolean|Error => {

    const result = validator(value);

    return result !== true;

  };

}

/**
* Makes the given validator optional (e.g. property may not exist but if it does...).
* @param validator A validator.
*/
export function opt(validator: ValidatorFunction): ValidatorFunction {

  return (value: any): boolean|Error => {

    return value === undefined ? true : validator(value);

  };

}

/**
* Checks if value includes the given value.
*/
export function include(val: any): ValidatorFunction {

  return (value: any): boolean|Error => {

    return value.includes && value.includes(val);

  };

}

/**
* Checks if value includes the given value by reference.
*/
export function includeRef(ref: string): ValidatorFunction {

  return (value: any, rawValues: any): boolean|Error => {

    return value.includes && value.includes(resolveRef(ref, rawValues));

  };

}

/**
* Checks if value exists.
*/
export function exist(value: any): boolean|Error {

  return value !== undefined;

}

/** Casts to number and... */
export namespace num {

  /**
  * The value must be within the given range (inclusive).
  */
  export function between(min: number, max: number): ValidatorFunction {

    return (value: any): boolean => {

      return +value >= min && +value <= max;

    };

  }

  /**
  * The value must be within the given range (exclusive).
  */
  export function betweenEx(min: number, max: number): ValidatorFunction {

    return (value: any): boolean => {

      return +value > min && +value < max;

    };

  }

  /**
  * The value must be greater than the given number.
  */
  export function gt(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return +value > val;

    };

  }

  /**
  * The value must be greater than or equal to the given number.
  */
  export function gte(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return +value >= val;

    };

  }

  /**
  * The value must be less than the given number.
  */
  export function lt(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return +value < val;

    };

  }

  /**
  * The value must be less than or equal to the given number.
  */
  export function lte(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return +value <= val;

    };

  }

  /**
  * The value must be greater than the given value by reference.
  */
  export function gtRef(ref: string): ValidatorFunction {

    return (value: any, rawValues: any): boolean => {

      return +value > +resolveRef(ref, rawValues);

    };

  }

  /**
  * The value must be greater than or equal to the given value by reference.
  */
  export function gteRef(ref: string): ValidatorFunction {

    return (value: any, rawValues: any): boolean => {

      return +value >= +resolveRef(ref, rawValues);

    };

  }

  /**
  * The value must be less than the given value by reference.
  */
  export function ltRef(ref: string): ValidatorFunction {

    return (value: any, rawValues: any): boolean => {

      return +value < +resolveRef(ref, rawValues);

    };

  }

  /**
  * The value must be less than or equal to the given value by reference.
  */
  export function lteRef(ref: string): ValidatorFunction {

    return (value: any, rawValues: any): boolean => {

      return +value <= +resolveRef(ref, rawValues);

    };

  }

}

/** Checks length of value. */
export namespace len {

  /**
  * The length of value must be within the given range (inclusive).
  */
  export function between(min: number, max: number): ValidatorFunction {

    return (value: any): boolean => {

      return value.length >= min && value.length <= max;

    };

  }

  /**
  * The length of value must be within the given range (exclusive).
  */
  export function betweenEx(min: number, max: number): ValidatorFunction {

    return (value: any): boolean => {

      return value.length > min && value.length < max;

    };

  }

  /**
  * The length of value must be greater than the given number.
  */
  export function gt(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return value.length > val;

    };

  }

  /**
  * The length of value must be greater than or equal to the given number.
  */
  export function gte(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return value.length >= val;

    };

  }

  /**
  * The length of value must be less than the given number.
  */
  export function lt(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return value.length < val;

    };

  }

  /**
  * The length of value must be less than or equal to the given number.
  */
  export function lte(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return value.length <= val;

    };

  }

  /**
  * The length of value must be greater than the given value by reference.
  */
  export function gtRef(ref: string): ValidatorFunction {

    return (value: any, rawValues: any): boolean => {

      return value.length > +resolveRef(ref, rawValues);

    };

  }

  /**
  * The length of value must be greater than or equal to the given value by reference.
  */
  export function gteRef(ref: string): ValidatorFunction {

    return (value: any, rawValues: any): boolean => {

      return value.length >= +resolveRef(ref, rawValues);

    };

  }

  /**
  * The length of value must be less than the given value by reference.
  */
  export function ltRef(ref: string): ValidatorFunction {

    return (value: any, rawValues: any): boolean => {

      return value.length < +resolveRef(ref, rawValues);

    };

  }

  /**
  * The length of value must be less than or equal to the given value by reference.
  */
  export function lteRef(ref: string): ValidatorFunction {

    return (value: any, rawValues: any): boolean => {

      return value.length <= +resolveRef(ref, rawValues);

    };

  }

}

export function headers(validator: ValidationDefinition): ValidationRule { return { type: ValidationType.Header, validator: validator }; }
export function queries(validator: ValidationDefinition): ValidationRule { return { type: ValidationType.Query, validator: validator }; }
export function body(validator: BodyValidationDefinition): ValidationRule { return { type: ValidationType.Body, validator: validator }; }
export function custom(validator: AsyncValidatorFunction|ValidatorFunction): ValidationRule { return { type: ValidationType.Custom, validator: validator } };
