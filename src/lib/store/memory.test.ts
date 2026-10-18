import { MemoryStore } from "./memory";
import { runStoreContract } from "./contract";

runStoreContract("mémoire", async () => new MemoryStore());
