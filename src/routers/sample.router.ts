import {
  Router,
  RouteMethod,
  OnInjection,
  header,
  query,
  body,
  custom,
  type,
  and,
  len,
  opt,
  ServerError
} from '@steroids/core';

import { AuthenticatorService } from '@steroids/service/sample';
import { Request, Response, NextFunction } from 'express';

@Router({
  name: 'auth',
  // High priority in middleware stack
  priority: 100,
  routes: [
    // GET /protected-by-oauth
    { path: '/protected-by-oauth', handler: 'oauthHandler', method: RouteMethod.GET, validate: [
      // Content-Type header must be present with value 'application/json'
      header({ 'content-type': 'application/json' }),
      body({
        // object 'credentials' must exist
        credentials: {
          // 'credentials.client_id' must exist and be a valid string
          client_id: type.string,
          // 'credentials.client_secret' must exist, be a valid string and at least 8 characters long
          client_secret: and(type.string, len.min(8))
        },
        // 'keepSession' can exist and must be boolean if so
        keepSession: opt(type.boolean)
      })
    ]},
    // POST /protected-by-token
    { path: '/protected-by-token', handler: 'tokenHandler', method: RouteMethod.POST, validate: [
      // Query parameter 'token' must be present
      query(['token'])
    ]},
    // PUT /protected-by-basic
    { path: '/protected-by-basic', handler: 'basicHandler', method: RouteMethod.PUT, validate: [
      // 'Authorization' header must be valid
      custom(basicAuthValidator)
    ]},
    // [GLOBAL] /protected-by-[ANYTHING]
    { path: '/protected-by-*', handler: 'authDoneHandler' }
  ]
})
export class AuthRouter implements OnInjection {

  private auth: AuthenticatorService;

  // Inject the 'authenticator' service
  onInjection(services: any) {

    this.auth = services.authenticator;

  }

  oauthHandler(req: Request, res: Response, next: NextFunction) {

    // Validation is already done!
    this.auth.oauth(req.body.credentials)
    .then(next)
    .catch(error => res.status(403).json(new ServerError(error.message, 'AUTH_ERROR')));

  }

  tokenHandler(req: Request, res: Response, next: NextFunction) {

    // Validation is already done!
    this.auth.jwt(req.query.token)
    .then(next)
    .catch(error => res.status(403).json(new ServerError(error.message, 'AUTH_ERROR')));

  }

  basicHandler(req: Request, res: Response, next: NextFunction) {

    // Validation is already done!
    this.auth.basic((<any>req).auth.username, (<any>req).auth.password)
    .then(next)
    .catch(error => res.status(403).json(new ServerError(error.message, 'AUTH_ERROR')));

  }

  authDoneHandler(req: Request, res: Response) {

    res.status(200).json({ success: true, message: 'Authentication done!' });

  }

}

// Custom Basic auth validator
function basicAuthValidator(req: Request) {

  const basic: string = req.header('Authorization');

  if ( ! basic || basic.substr(0, 5) !== 'Basic' ) return { valid: false, error: 'Basic authorization header not set!' };

  let credentials = Buffer.from(basic.substr(6), 'base64').toString().split(':');

  if ( ! credentials || credentials.length !== 2 ) return { valid: false, error: 'Invalid authorization header!' };

  (<any>req).auth = {
    username: credentials[0],
    password: credentials[1]
  };

  return true;

}
