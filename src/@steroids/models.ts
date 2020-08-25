import { CorsOptions } from 'cors';
export { Response, NextFunction } from 'express';
import { Request as OriginalRequest } from 'express';
import { config } from '../config';
export type ServerConfig = typeof config & BaseServerConfig;

export interface BaseServerConfig {

  port: number;
  predictive404: boolean;
  predictive404Priority: number;
  timezone: string;
  colorfulLogs: boolean;
  consoleLogLevels: ('debug'|'info'|'notice'|'warn'|'error')[]|'all';
  writeLogsToFile: boolean;
  logFileLevels: ('debug'|'info'|'notice'|'warn'|'error')[]|'all';
  logFileMaxAge: number;
  archiveLogs: boolean;
  excludeQueryParamsInLogs: string[];
  excludeHeadersInLogs: string[];
  logRequestHeaders: boolean;
  fileUploadLimit: string;
  sessionManagement: boolean;
  cookieSecret: string;

}

export interface Request extends OriginalRequest {

  sessionId: string;

}

export interface ModuleDecoratorArgs {

  name: string;
  priority?: number;

}

export interface RouterDecoratorArgs extends ModuleDecoratorArgs {

  routes: RouteDefinition[];
  corsPolicy?: CORSPolicy;

}

export interface CORSPolicy {

  origin?: CorsOptions['origin'];
  methods?: CorsOptions['methods'];
  allowedHeaders?: CorsOptions['allowedHeaders'];
  exposedHeaders?: CorsOptions['exposedHeaders'];
  credentials?: CorsOptions['credentials'];
  maxAge?: CorsOptions['maxAge'];
  optionsSuccessStatus?: CorsOptions['optionsSuccessStatus'];

}

export interface RouteDefinition {

  path: string;
  handler: string;
  method?: RouteMethod;
  validate?: ValidationRule[];
  corsPolicy?: CORSPolicy;

}

export enum RouteMethod {

  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
  PATCH = 'patch'

}

export enum ModuleType {

  Service,
  Router

}

export interface BasicModule {

  __metadata: ModuleMetadata;

}

export interface ModuleMetadata {

  name: string;
  type: ModuleType;
  routes?: RouteDefinition[];
  priority?: number;
  corsPolicy?: CORSPolicy;

}

export interface OnInjection {

  onInjection(services: any): void|Promise<void>;

}

export interface OnConfig {

  onConfig(config: ServerConfig): void|Promise<void>;

}

export interface OnInit {

  onInit(): void|Promise<void>;

}

export enum ValidationType {

  Header,
  Query,
  Body,
  Custom

}

export interface ValidationRule {

  type: ValidationType;
  validator: BodyValidationDefinition|ValidationDefinition|ValidatorFunction|AsyncValidatorFunction;

}

export interface BodyValidationDefinition {

  [key: string]: AsyncValidatorFunction|ValidatorFunction|BodyValidationDefinition;

}

export interface ValidationDefinition {

  [key: string]: AsyncValidatorFunction|ValidatorFunction;

}

export type ValidatorFunction = (value: any, rawValues?: any) => boolean|Error;
export type AsyncValidatorFunction = (value: any, rawValues?: any) => Promise<boolean|Error>;
