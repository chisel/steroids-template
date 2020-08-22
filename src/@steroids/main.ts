// This script builds the app and starts the server
import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import { URL } from 'url';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { DateTime } from 'luxon';
import { config as serverConfig } from '../config';
import * as tsConfigPaths from 'tsconfig-paths';
import paths from '../paths.json';
import { ServerLogger, ServerLoggerCore } from './logger';
import { ServerEventManager } from './events';
import { ServerSessionManager, ServerSessionManagerInternal } from './session';
import { ServerError } from './error';
import { RequestHandler } from 'express';
import { Request, Response, NextFunction } from './models';

import {
  ServerConfig,
  BaseServerConfig,
  BasicModule,
  ModuleType,
  RouteDefinition,
  ValidationType,
  ValidationDefinition,
  BodyValidationDefinition,
  ValidatorFunction,
  AsyncValidatorFunction
} from './core';

// Register path alias resolver
tsConfigPaths.register({
  // If CWD is the dist folder, set the baseUrl to './', otherwise set it to './dist'
  baseUrl: './' + (fs.existsSync(path.resolve(process.cwd(), '@steroids')) ? '' : 'dist'),
  paths: paths
});

const CONFIG_DEFAULT: BaseServerConfig = {
  port: 5000,
  predictive404: false,
  predictive404Priority: Infinity,
  timezone: DateTime.local().zone.name,
  colorfulLogs: true,
  writeLogsToFile: true,
  logFileLevels: 'all',
  consoleLogLevels: ['info', 'notice', 'warn', 'error'],
  logFileMaxAge: 7,
  archiveLogs: true,
  fileUploadLimit: '10mb',
  excludeHeadersInLogs: [],
  logRequestHeaders: false,
  excludeQueryParamsInLogs: [],
  sessionManagement: false,
  cookieSecret: undefined
};

// Override the config file
const config: ServerConfig = _.assign(CONFIG_DEFAULT, serverConfig);

// Testing mode
if ( process.env.STEROIDS_TEST ) {

  config.writeLogsToFile = false;
  config.port = 8123;

}

// Sanitize config
config.excludeHeadersInLogs = config.excludeHeadersInLogs.map(h => h.toLowerCase());
config.excludeHeadersInLogs.push('authorization'); // Hide authorization header by default
config.excludeQueryParamsInLogs = config.excludeQueryParamsInLogs.map(q => q.toLowerCase());

// Provide server logger globally
declare global {

  const log: ServerLogger;
  const events: ServerEventManager;
  const session: ServerSessionManager;
  const ServerError: ServerError;

}

(<any>global).log = new ServerLogger(new ServerLoggerCore(config));
(<any>global).events = new ServerEventManager();
(<any>global).session = new ServerSessionManagerInternal(!! config.sessionManagement, !! config.cookieSecret);
(<any>global).ServerError = ServerError;

const app = express();
const services: any = {};
let routers: any = {};

function installModule(filename: string): void {

  if ( ! path.basename(filename).match(/^(.+)\.((service)|(router))\.js$/) ) return;

  const modules: any[] = _.values(require(path.join(__dirname, filename)));

  for ( const module of modules ) {

    if ( typeof module !== 'function' ) continue;

    try {

      const initializedModule: BasicModule = new module();

      if ( ! initializedModule.__metadata ) continue;

      if ( initializedModule.__metadata.type === ModuleType.Service ) {

        services[initializedModule.__metadata.name] = initializedModule;
        log.debug(`Service "${initializedModule.__metadata.name}" installed`);

      }
      else if ( initializedModule.__metadata.type === ModuleType.Router ) {

        routers[initializedModule.__metadata.name] = initializedModule;
        log.debug(`Router "${initializedModule.__metadata.name}" installed`);

      }

    }
    catch {

      continue;

    }

  }

}

function scanDirRec(dir: string): string[] {

  const all: string[] = fs.readdirSync(path.join(__dirname, dir));
  let files: string[] = [];
  const dirs: string[] = [];

  for ( const item of all ) {

    const stat = fs.statSync(path.join(__dirname, dir, item));

    if ( ! stat ) continue;

    if ( stat.isDirectory() ) dirs.push(item);
    if ( stat.isFile() ) files.push(path.join(dir, item));

  }

  for ( const item of dirs ) {

    files = _.concat(files, scanDirRec(path.join(dir, item)));

  }

  return files;

}

async function initializeModules(modules: any) {

  for ( const name in modules ) {

    const module = modules[name];
    const moduleType = module.__metadata.type === ModuleType.Service ? 'service' : 'router';

    if ( module.onInjection && typeof module.onInjection === 'function' ) {

      const componentServices = _.clone(services);

      events.emitOnce(`${moduleType}:inject:before`, componentServices);
      events.emitOnce(`${module.__metadata.name}-${moduleType}:inject:before`, componentServices);

      await module.onInjection(componentServices);

      events.emitOnce(`${module.__metadata.name}-${moduleType}:inject:after`, componentServices);
      events.emitOnce(`${moduleType}:inject:after`);

      log.debug(`Services injected into ${moduleType} "${module.__metadata.name}"`);

    }

    if ( module.onConfig && typeof module.onConfig === 'function' ) {

      const componentConfig = _.cloneDeep(config);

      events.emitOnce(`${moduleType}:config:before`, componentConfig);
      events.emitOnce(`${module.__metadata.name}-${moduleType}:config:before`, componentConfig);

      await module.onConfig(componentConfig);

      events.emitOnce(`${module.__metadata.name}-${moduleType}:config:after`, componentConfig);
      events.emitOnce(`${moduleType}:config:after`);

      log.debug(`Config injected into ${moduleType} "${module.__metadata.name}"`);

    }

    if ( module.onInit && typeof module.onInit === 'function' ) {

      events.emitOnce(`${moduleType}:init:before`);
      events.emitOnce(`${module.__metadata.name}-${moduleType}:init:before`);

      await module.onInit();

      events.emitOnce(`${module.__metadata.name}-${moduleType}:init:after`);
      events.emitOnce(`${moduleType}:init:after`);

      log.debug(`${_.startCase(moduleType)} "${module.__metadata.name}" was initialized`);

    }

  }

}

function rejectForValidation(res: Response, message: string): void {

  new ServerError(message, 400, 'VALIDATION_FAILED').respond(res);

}

async function validateDefinition(
  definition: ValidationDefinition|BodyValidationDefinition,
  values: any,
  originalValues: any,
  type: 'header'|'query'|'body property',
  prefix: string = '',
  recursive?: boolean
): Promise<void|Error> {

  for ( const key of _.keys(definition) ) {

    const keyPath = prefix ? prefix + '.' + key : key;

    if ( typeof definition[key] === 'function' ) {

      const validator = <ValidatorFunction|AsyncValidatorFunction>definition[key];
      const result = await validator(values[key], originalValues);

      if ( result === false ) return new Error(`Invalid ${type} '${keyPath}'!`);
      if ( result instanceof Error ) return result;

    }
    else if ( recursive ) {

      if ( ! values.hasOwnProperty(key) || ! values[key] || typeof values[key] !== 'object' || values[key].constructor !== Object )
        return new Error(`Invalid ${type} '${key}'!`);

      const error = await validateDefinition(<BodyValidationDefinition>definition[key], values[key], originalValues, type, keyPath, recursive);

      if ( error ) return error;

    }

  }

}

function createValidationMiddleware(route: RouteDefinition): RequestHandler {

  return (req: Request, res: Response, next: NextFunction) => {

    (async (): Promise<boolean|Error> => {

      for ( const rule of route.validate ) {

        if ( rule.type === ValidationType.Header ) {

          const error = await validateDefinition(<ValidationDefinition>rule.validator, req.headers, req.headers, 'header');

          if ( error ) return error;

        }
        else if ( rule.type === ValidationType.Query ) {

          const error = await validateDefinition(<ValidationDefinition>rule.validator, req.query, req.query, 'query');

          if ( error ) return error;

        }
        else if ( rule.type === ValidationType.Body ) {

          if ( ! req.body || typeof req.body !== 'object' || req.body.constructor !== Object )
            return new Error('Invalid body type!');

          const error = await validateDefinition(<BodyValidationDefinition>rule.validator, req.body, req.body, 'body property');

          if ( error ) return error;

        }
        else if ( rule.type === ValidationType.Custom ) {

          const validationResult = await (<ValidatorFunction|AsyncValidatorFunction>rule.validator)(req);

          if ( validationResult === false ) return new Error('Invalid request!');
          if ( validationResult instanceof Error ) return validationResult;

        }

      }

      return true;

    })()
    .then(result => {

      if ( result === true ) next();
      else rejectForValidation(res, (<Error>result).message);

    })
    .catch(error => {

      if ( error.valid === false ) new ServerError(error.error ? error.error : 'Invalid request!', 500, 'VALIDATION_FAILED').respond(res);
      else ServerError.from(error, 500, 'VALIDATION_FAILED').respond(res);

    });

  };

}

function installPredictive404(): void {

  app.use('*', (req, res, next) => {

    let matches: number = 0;

    app._router.stack.map(layer => {

      if ( layer.regexp.fast_star || layer.regexp.fast_slash ) return;

      if ( layer.match(req.originalUrl) ) matches++;

    });

    if ( matches ) next();
    else new ServerError(`Route ${getLogPath(req).path} not found!`, 404, 'ROUTE_NOT_FOUND').respond(res);

  });

}

function getLogPath(req) {

  // Parse URL
  const url = new URL(req.originalUrl);
  const result = {
    headers: undefined,
    path: undefined
  };

  // Hide params based on config
  for ( const param of url.searchParams.keys() ) {

    if ( config.excludeQueryParamsInLogs.includes(param.toLowerCase()) )
      url.searchParams.set(param, 'HIDDEN');

  }

  result.path = url.toString();

  // Log headers
  if ( config.logRequestHeaders ) {

    // Hide headers based on config
    const headers = _.clone(req.headers);

    for ( const header of config.excludeHeadersInLogs ) {

      if ( headers.hasOwnProperty(header) ) headers[header] = 'HIDDEN';

    }

    // Log headers
    let headersLog = 'HEADERS';

    for ( const header in headers ) {

      headersLog += `\n${header} ${headers[header]}`;

    }

    result.headers = headersLog;

  }

  return result;

}

// Scan the current directory
const files = scanDirRec('..');

// Install all modules
for ( const file of files ) {

  installModule(file);

}

// Install body parsers
app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(bodyParser.raw({ limit: config.fileUploadLimit }));
app.use(bodyParser.urlencoded({ extended: true }));

// Install body parsing error
app.use((error, req, res, next) => {

  new ServerError('Invalid body!', 400, 'INVALID_BODY').respond(res);

});

// Install cookie parser
app.use(cookieParser(config.cookieSecret));

// Install cookie parser error handler
app.use((error, req, res, next) => {

  new ServerError('Invalid cookies!', 400, 'INVALID_COOKIES').respond(res);

});

// Install session manager middleware
if ( config.sessionManagement ) app.use((<ServerSessionManagerInternal>session).middleware);

// Sort routers based on priority
routers = _.orderBy(routers, (router: BasicModule) => router.__metadata.priority, ['desc']);

let predictive404Installed: boolean = false;

// Install routes
for ( const name in routers ) {

  const router: BasicModule = routers[name];

  // Install predictive 404 handler
  if ( config.predictive404 && config.predictive404Priority > router.__metadata.priority && ! predictive404Installed ) {

    predictive404Installed = true;

    installPredictive404();

    log.debug('Predictive 404 handler installed');

  }

  // Check router
  if ( ! router.__metadata.routes || ! router.__metadata.routes.length ) {

    log.warn(`Router "${router.__metadata.name}" has no defined routes!`);
    continue;

  }

  for ( const route of router.__metadata.routes ) {

    // Validate route definition
    if ( ! route || ! route.path || ! route.handler ) {

      log.warn(`Router "${router.__metadata.name}" has incorrectly defined a route!`);
      continue;

    }

    if ( ! Object.getOwnPropertyNames(Object.getPrototypeOf(router)).includes(route.handler) || typeof router[route.handler] !== 'function' ) {

      log.error(`Route handler "${route.handler}" not found in router "${router.__metadata.name}"!`);
      continue;

    }

    // Create route handlers
    const handlers: RequestHandler[] = [];

    // Create route logger
    handlers.push((req, res, next) => {

      const url = getLogPath(req);

      if ( config.logRequestHeaders ) log.debug(url.headers);

      log.debug(req.method.toUpperCase(), url.path);

      next();

    });
    // Create route validator if necessary
    if ( route.validate ) handlers.push(createValidationMiddleware(route));
    // Add CORS handler
    const policy = route.corsPolicy || router.__metadata.corsPolicy || { origin: true };

    handlers.push(cors({
      origin: policy.origin,
      methods: policy.methods,
      allowedHeaders: policy.allowedHeaders,
      exposedHeaders: policy.exposedHeaders,
      credentials: policy.credentials,
      maxAge: policy.maxAge,
      optionsSuccessStatus: policy.optionsSuccessStatus
    }));
    // Add the route handler provided by user
    handlers.push(router[route.handler].bind(router));

    // Install the route
    app[route.method || 'use'](route.path, ...handlers);

    log.debug(`Route "${(route.method ? route.method.toUpperCase() : 'GLOBAL') + ' ' + route.path}" from router "${router.__metadata.name}" was installed`);

  }

}

// Install predictive 404 (if not already)
if ( config.predictive404 && ! predictive404Installed ) {

  predictive404Installed = true;

  installPredictive404();

  log.debug('Predictive 404 handler installed');

}

// Install 404 router
if ( ! config.predictive404 ) {

  app.use('*', (req, res) => {

  new ServerError(`Route ${getLogPath(req).path} not found!`, 404, 'ROUTE_NOT_FOUND').respond(res);

});

  log.debug('404 handler installed');

}

// Install error handler
app.use((error, req, res, next) => {

  log.error('An unknown error has occured:', error);
  events.emit('error', error);

  if ( ! res.headerSent ) new ServerError('An unknown error has occured!').respond(res);

});

log.debug('Error handler installed');

// Misc
app.disable('x-powered-by');

// Initialize all modules
initializeModules(services)
.then(() => {

  return initializeModules(routers);

})
.catch(error => {

  log.error('Could not initialize modules due to an error:', error);
  events.emit('error', error);

})
.then(() => {

  // Start the server
  app.listen(config.port, (error: Error) => {

    if ( error ) {

      log.error('Could not start the server due to an error:', error);
      events.emit('error', error);

    }
    else {

      log.notice(`Server started on port ${config.port}`);
      events.emit('launch', config.port);

    }

  });

});
