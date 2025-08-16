import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import * as dotenv from "dotenv";

dotenv.config();

type ServiceConfig = {
  name: string;
  envTemplatePath: string; // points to .env.test.runtime
  envOutputPath: string;   // we overwrite the service's .env for the test run
  dbName: string;
};

const services: ServiceConfig[] = [
  {
    name: "auth-service",
    envTemplatePath: resolve(__dirname, "../../../services/auth-service/backend/.env.test.runtime"),
    envOutputPath: resolve(__dirname, "../../../services/auth-service/backend/.env"),
    dbName: "test_auth_db",
  },
  {
    name: "users-service",
    envTemplatePath: resolve(__dirname, "../../../services/users-service/backend/.env.test.runtime"),
    envOutputPath: resolve(__dirname, "../../../services/users-service/backend/.env"),
    dbName: "test_users_db",
  },
  {
    name: "organizations-service",
    envTemplatePath: resolve(__dirname, "../../../services/organizations-service/backend/.env.test.runtime"),
    envOutputPath: resolve(__dirname, "../../../services/organizations-service/backend/.env"),
    dbName: "test_orgs_db",
  },
  {
    name: "businesses-service",
    envTemplatePath: resolve(__dirname, "../../../services/businesses-service/backend/.env.test.runtime"),
    envOutputPath: resolve(__dirname, "../../../services/businesses-service/backend/.env"),
    dbName: "test_businesses_db",
  },
];

const started: Record<string, StartedTestContainer> = {};

export default async function globalSetup() {
  console.log("🚀 Starting PostgreSQL containers for all services...");

  for (const svc of services) {
    const container = await new GenericContainer("postgres:15-alpine")
      .withEnvironment({
        POSTGRES_PASSWORD: "testpass",
        POSTGRES_USER: "testuser",
        POSTGRES_DB: svc.dbName,
      })
      .withExposedPorts(5432)
      .start();

    started[svc.name] = container;

    const mappedPort = container.getMappedPort(5432);
    console.log(`📦 ${svc.name}: db port ${mappedPort}`);

    // Read the service's .env.test.runtime and inject the mapped port
    const tpl = readFileSync(svc.envTemplatePath, "utf8");
    const finalEnv = tpl.replace("${TEST_DB_PORT}", String(mappedPort));

    // Write to the service's .env so TypeORM picks it up
    writeFileSync(svc.envOutputPath, finalEnv, "utf8");
  }

  // expose containers to teardown
  (global as any).__TEST_CONTAINERS__ = started;
  console.log("✅ Wrote test .env files and started databases.");
}
