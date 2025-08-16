import * as dotenv from 'dotenv';
import * as path from 'path';

// Load the runtime env that global-setup wrote
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env.test.runtime') });

// Optional: quicker test timeouts
jest.setTimeout(60_000);
