import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService.login', () => {
  let service: AuthService;

  beforeAll(async () => {
    process.env.AUTH_USERNAME = 'besitzer';
    process.env.AUTH_PASSWORD_HASH = await bcrypt.hash('richtig', 4);
  });

  beforeEach(() => {
    const jwt = { signAsync: jest.fn().mockResolvedValue('token') };
    service = new AuthService(jwt as unknown as JwtService);
  });

  it('gibt bei richtigen Zugangsdaten ein Token zurück', async () => {
    await expect(service.login('besitzer', 'richtig')).resolves.toEqual({
      accessToken: 'token',
    });
  });

  it('lehnt ein falsches Passwort mit 401 ab', async () => {
    await expect(service.login('besitzer', 'falsch')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // Vorher warf bcrypt.compare bei fehlendem Passwort, und daraus wurde eine 500.
  it.each([
    [undefined, undefined],
    ['besitzer', undefined],
    [undefined, 'richtig'],
    [123, ['richtig']],
  ])('lehnt fehlende oder falsche Felder mit 401 ab (%p, %p)', async (u, p) => {
    await expect(service.login(u, p)).rejects.toThrow(UnauthorizedException);
  });
});
