import {
  ModuleType,
  ModuleDecoratorArgs,
  RouterDecoratorArgs,
  ValidationType,
  ValidationRule,
  ValidatorFunction,
  AsyncValidatorFunction,
  HeaderValidator,
  BodyValidator,
  FlatBodyValidator
} from './models';

import { Response } from 'express';

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

export namespace type {

  /**
  * String type comparison.
  */
  export function string(value: any): boolean { return typeof value === 'string' }
  /**
  * Number type comparison.
  */
  export function number(value: any): boolean { return typeof value === 'number'; }
  /**
  * Boolean type comparison.
  */
  export function boolean(value: any): boolean { return typeof value === 'boolean'; }
  /**
  * Null type comparison.
  */
  export function nil(value: any): boolean { return value === null; }
  /**
  * Array type comparison.
  * @param validator      A validator to apply to all items inside the array.
  * @param arrayValidator A validator to apply to the whole array (e.g. len.min).
  */
  export function array(validator?: ValidatorFunction, arrayValidator?: ValidatorFunction): ValidatorFunction {

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
  export function ofenum(enumerator: any): ValidatorFunction {

    return (value: any): boolean => {

      return _.values(enumerator).includes(value);

    };

  }

}

/**
* Validates an object against the given flat body validator (useful for validating arrays of objects).
* @param bodyValidator A flat body validator.
*/
export function sub(bodyValidator: FlatBodyValidator): ValidatorFunction {

  return (value: any): boolean => {

    if ( ! value || typeof value !== 'object' || value.constructor !== Object ) return false;

    for ( const key of _.keys(bodyValidator) ) {

      if ( ! value.hasOwnProperty(key) || ! bodyValidator[key](value[key]) ) return false;

    }

    return true;

  };

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
* Validates a string against a given regular expression (no string type check!).
* @param validators A rest argument of validators.
*/
export function match(regex: RegExp) {

  return (value: any): boolean => {

    return !! value.match(regex);

  };

}

export namespace num {

  /**
  * The property must be greater than or equal to the given number.
  */
  export function min(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return value >= val;

    };

  }

  /**
  * The property must be less than or equal to the given number.
  */
  export function max(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return value <= val;

    };

  }

  /**
  * The property must be within the given range (inclusive).
  */
  export function range(min: number, max: number): ValidatorFunction {

    return (value: any): boolean => {

      return value >= min && value <= max;

    };

  }

  /**
  * The property must be greater than the given number.
  */
  export function gt(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return value > val;

    };

  }

  /**
  * The property must be greater than or equal to the given number.
  */
  export function gte(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return value >= val;

    };

  }

  /**
  * The property must be less than the given number.
  */
  export function lt(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return value < val;

    };

  }

  /**
  * The property must be less than or equal to the given number.
  */
  export function lte(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return value <= val;

    };

  }

}

export namespace len {

  /**
  * The length of the property must be greater than or equal to the given number.
  */
  export function min(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return value.length >= val;

    };

  }

  /**
  * The length of the property must be less than or equal to the given number.
  */
  export function max(val: number): ValidatorFunction {

    return (value: any): boolean => {

      return value.length <= val;

    };

  }

  /**
  * The length of the property must be within the given range.
  */
  export function range(min: number, max: number): ValidatorFunction {

    return (value: any): boolean => {

      return value.length >= min && value.length <= max;

    };

  }

}

export function header(validator: HeaderValidator): ValidationRule { return { type: ValidationType.Header, validator: validator }; }
export function query(validator: string[]): ValidationRule { return { type: ValidationType.Query, validator: validator }; }
export function body(validator: BodyValidator): ValidationRule { return { type: ValidationType.Body, validator: validator }; }
export function custom(validator: AsyncValidatorFunction|ValidatorFunction): ValidationRule { return { type: ValidationType.Custom, validator: validator } };

export class ServerError {

  public readonly error = true;
  public stack: string;

  constructor(
    public message: string,
    public httpCode: number = 500,
    public code: string = 'UNKOWN_ERROR'
  ) { }

  /**
  * Returns a new ServerError from an Error object.
  * @param error An error object.
  * @param httpCode The HTTP status code to use when responding to requests.
  * @param code An error code to override the error object's code (if any).
  */
  public static from(error: Error, httpCode: number = 500, code?: string): ServerError {

    const serverError = new ServerError(error.message, httpCode || 500, code || (<any>error).code);

    serverError.stack = error.stack;

    return serverError;

  }

  /**
  * Responds to request with current error.
  * @param res An Express response object.
  */
  public respond(res: Response) {

    res.status(this.httpCode).json({
      error: this.error,
      message: this.message,
      code: this.code
    });

  }

}
