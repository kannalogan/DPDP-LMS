import { AiExecutionError } from "@/features/ai/errors";

type CircuitState = { failures: number; openedUntil: number | null };

export class AiCircuitBreaker {
  private readonly states = new Map<string, CircuitState>();

  constructor(
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 60000,
    private readonly now = () => Date.now()
  ) {}

  assertAvailable(key: string) {
    const state = this.states.get(key);
    if (!state?.openedUntil) return;
    if (state.openedUntil <= this.now()) {
      this.states.set(key, { failures: state.failures, openedUntil: null });
      return;
    }
    throw new AiExecutionError("circuit_open");
  }

  recordFailure(key: string) {
    const current = this.states.get(key) ?? { failures: 0, openedUntil: null };
    const failures = current.failures + 1;
    this.states.set(key, {
      failures,
      openedUntil: failures >= this.failureThreshold ? this.now() + this.cooldownMs : null
    });
  }

  recordSuccess(key: string) {
    this.states.set(key, { failures: 0, openedUntil: null });
  }
}
