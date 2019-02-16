import { Service, OnConfig, ServerConfig } from '../core';

@Service({
  name: 'authenticator'
})
export class AuthenticatorService implements OnConfig {

  private config: ServerConfig;

  onConfig(config: ServerConfig) {

    // Inject the server config
    this.config = config;

  }

  oauth(credentials: any): Promise<void> {

    return new Promise((resolve, reject) => {

      // Do OAuth
      console.log('OAuth with', credentials);
      resolve();

    });

  }

  jwt(token: string): Promise<void> {

    return new Promise((resolve, reject) => {

      // Do JWT
      console.log('JWT with', token);
      resolve();

    });

  }

  basic(username: string, password: string): Promise<void> {

    return new Promise((resolve, reject) => {

      // Do basic auth
      console.log('Basic auth with', username, password);
      resolve();

    });

  }

}
