import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.usersService.getAllUsers();
  }

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<User | null> {
    return this.usersService.getUser(id);
  }

  @Post()
  async createUser(
    @Body() body: { name: string; email: string },
  ): Promise<User> {
    return this.usersService.createUser(body);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string): Promise<boolean> {
    return this.usersService.deleteUser(id);
  }
}
