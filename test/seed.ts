import { DataSource } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import * as bcrypt from 'bcrypt';

export const seedTestData = async (dataSource: DataSource) => {
  const userRepository = dataSource.getRepository(User);
  
  // Clear existing data
  await userRepository.delete({});

  // Create test users
  const testUsers = [
    {
      email: 'test1@example.com',
      password: await bcrypt.hash('Test123!', 10),
      firstName: 'Test',
      lastName: 'User1',
    },
    {
      email: 'test2@example.com',
      password: await bcrypt.hash('Test123!', 10),
      firstName: 'Test',
      lastName: 'User2',
    },
  ];

  await userRepository.save(testUsers);
}; 