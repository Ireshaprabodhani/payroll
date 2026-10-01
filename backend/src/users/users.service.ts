import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.users.findMany({
      select: { Username: true, Role: true, Department: true },
      orderBy: { Username: 'asc' },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.users.findUnique({
      where: { Username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.users.create({
      data: {
        Username: dto.username,
        Password: hashedPassword,
        Role: dto.role,
        Department: dto.department ?? null,
      },
      select: { Username: true, Role: true, Department: true },
    });
  }

  async remove(username: string) {
    const user = await this.prisma.users.findUnique({
      where: { Username: username },
    });
    if (!user) {
      throw new NotFoundException(`User '${username}' not found`);
    }
    await this.prisma.users.delete({ where: { Username: username } });
  }
}
