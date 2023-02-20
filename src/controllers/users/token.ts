import { sign, decode, verify } from '@tsndr/cloudflare-worker-jwt';
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
}
