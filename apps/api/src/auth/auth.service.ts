import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(username: unknown, password: unknown) {
    // Der Body ist nicht validiert: ohne diese Prüfung wirft bcrypt.compare
    // bei fehlendem Passwort, und aus einem falschen Login wird eine 500.
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new UnauthorizedException('Ungültige Zugangsdaten');
    }

    const validUsername = process.env.AUTH_USERNAME;
    const passwordHash = process.env.AUTH_PASSWORD_HASH;

    const passwordMatches =
      !!passwordHash && (await bcrypt.compare(password, passwordHash));

    if (username !== validUsername || !passwordMatches) {
      throw new UnauthorizedException('Ungültige Zugangsdaten');
    }

    const accessToken = await this.jwtService.signAsync({ sub: username });
    return { accessToken };
  }
}
