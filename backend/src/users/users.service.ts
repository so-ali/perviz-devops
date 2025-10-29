import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  private users: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      createdAt: new Date(),
    },
  ];

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getAllUsers(): Promise<User[]> {
    // Try to get from cache
    const cacheKey = 'users:all';
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      console.log('Returning cached users');
      return cached as User[];
    }

    // Simulate database delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('Fetching users from database and caching');
    await this.cacheManager.set(cacheKey, this.users, 300000); // 5 min TTL

    return this.users;
  }

  async getUser(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`;
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      console.log(`Returning cached user ${id}`);
      return cached as User;
    }

    const user = this.users.find((u) => u.id === id);
    if (user) {
      await this.cacheManager.set(cacheKey, user, 300000);
    }

    return user || null;
  }

  async createUser(data: { name: string; email: string }): Promise<User> {
    const newUser: User = {
      id: String(this.users.length + 1),
      name: data.name,
      email: data.email,
      createdAt: new Date(),
    };

    this.users.push(newUser);

    // Invalidate cache when new user is created
    await this.invalidateUsersCache();

    return newUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return false;

    this.users.splice(index, 1);

    // Invalidate specific user cache and all users cache
    await this.invalidateUsersCache();
    await this.cacheManager.del(`user:${id}`);

    return true;
  }

  private async invalidateUsersCache() {
    console.log('Invalidating users cache');
    await this.cacheManager.del('users:all');
  }
}
