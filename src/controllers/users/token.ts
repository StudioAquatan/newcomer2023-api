import { sign, decode, verify } from '@tsndr/cloudflare-worker-jwt';
import { Context } from 'hono';
// eslint-disable-next-line import/no-unresolved
import { HTTPException } from 'hono/http-exception';

export class UserTokenController {
  constructor(private secret: string | JsonWebKey, private issuer: string) {}

  async create(userId: string) {
    const token = await sign(
      {
        sub: userId,
        iss: this.issuer,
      },
      this.secret,
    );
    return token;
  }

  async parseToId(token: string) {
    await verify(token, this.secret, { throwError: true });
    const decoded = await decode(token);
    if (decoded.payload.iss !== this.issuer) {
      throw new Error('Issuer not matched');
    }
    if (!decoded.payload.sub) {
      throw new Error('No subject');
    }
    return decoded.payload.sub;
  }

  static getTokenFromHeader(ctx: Context) {
    const tokenHeader = ctx.req.header('Authorization');
    const token = tokenHeader?.replace(/^[bB]earer\s+/, '');

    if (!token) {
      throw new HTTPException(401);
    }

    return token;
  }
}
