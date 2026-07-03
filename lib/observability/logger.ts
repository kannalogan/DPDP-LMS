export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    context,
    level,
    message,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }

  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method](payload);
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      write("debug", message, context);
    }
  },
  error(message: string, context?: LogContext) {
    write("error", message, context);
  },
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  }
};
