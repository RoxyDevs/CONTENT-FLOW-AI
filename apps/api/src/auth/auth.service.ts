import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slug.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthUserResponse = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  workspace: {
    id: string;
    name: string;
    slug: string;
    role: 'owner' | 'admin' | 'member';
  } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: AuthUserResponse; tokens: AuthTokens }> {
    const { name, email, password } = registerDto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, Number(this.configService.get('BCRYPT_ROUNDS') ?? 10));

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    const workspace = await this.createDefaultWorkspace(user.id, name);

    const tokens = await this.issueTokens(user.id, email);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          role: 'owner',
        },
      },
      tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<{ user: AuthUserResponse; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: loginDto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user.id, user.email);
    const membership = await this.prisma.workspaceMembership.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        workspace: membership
          ? {
              id: membership.workspace.id,
              name: membership.workspace.name,
              slug: membership.workspace.slug,
              role: membership.role,
            }
          : null,
      },
      tokens,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'fallback-refresh-secret',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      const storedTokens = await this.prisma.refreshToken.findMany({
        where: { userId: user.id },
      });

      const anyMatch = await Promise.all(
        storedTokens.map(async (stored) => {
          if (stored.revokedAt) return false;
          return bcrypt.compare(refreshToken, stored.tokenHash);
        }),
      );

      if (!anyMatch.some(Boolean)) {
        throw new UnauthorizedException('Refresh token is invalid or revoked');
      }

      const newTokens = await this.issueTokens(user.id, user.email);

      await this.prisma.refreshToken.deleteMany({
        where: { userId: user.id },
      });

      return newTokens;
    } catch (error) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { success: true };
  }

  async me(userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    createdAt: Date;
    workspaces: Array<{
      id: string;
      name: string;
      slug: string;
      role: 'owner' | 'admin' | 'member';
    }>;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      workspaces: user.memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        role: membership.role,
      })),
    };
  }

  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        type: 'access',
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'fallback-access-secret',
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        type: 'refresh',
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'fallback-refresh-secret',
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      },
    );

    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const refreshTokenHash = await bcrypt.hash(refreshToken, Number(this.configService.get('BCRYPT_ROUNDS') ?? 10));

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private async createDefaultWorkspace(userId: string, userName: string) {
    const baseSlug = slugify(userName || 'workspace');
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

    const workspace = await this.prisma.workspace.create({
      data: {
        name: `${userName}'s Workspace`,
        slug,
      },
    });

    await this.prisma.workspaceMembership.create({
      data: {
        userId,
        workspaceId: workspace.id,
        role: 'owner',
      },
    });

    return workspace;
  }
}
