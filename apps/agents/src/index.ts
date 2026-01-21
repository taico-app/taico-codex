import 'dotenv/config';
import { Coordinator } from "./Coordinator.js";

const coordinator = new Coordinator();

await coordinator.start();
