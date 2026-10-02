import { isHealthy } from "./app/heartbeat.js";

// Exit code is all Docker needs: 0 = healthy, 1 = unhealthy.
process.exit(isHealthy() ? 0 : 1);
