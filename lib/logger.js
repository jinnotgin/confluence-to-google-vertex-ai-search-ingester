import { createLogger, format, transports } from "winston";

const logger = createLogger({
	level: "info",
	format: format.combine(
		format.timestamp({
			format: "YYYY-MM-DD HH:mm:ss",
		}),
		format.errors({ stack: true }),
		format.splat(),
		format.json()
	),
	defaultMeta: { service: "main" },
	transports: [
		//
		// - Write all logs with importance level of `error` or less to `error.log`
		// - Write all logs with importance level of `info` or less to `combined.log`
		//
		new transports.File({
			filename: "logs/error.log",
			level: "error",
			maxsize: 10 * 1024 * 1024,
			maxFiles: 10,
		}),
		new transports.File({
			filename: "logs/combined.log",
			maxsize: 10 * 1024 * 1024,
			maxFiles: 10,
		}),
	],
});

if (process.env.NODE_ENV === "production") {
	// Production environment: log only errors to the console
	logger.add(
		new transports.Console({
			level: "error",
			format: format.combine(format.colorize(), format.simple()),
		})
	);
} else {
	// Non-production environments: log all levels to the console
	logger.add(
		new transports.Console({
			format: format.combine(format.colorize(), format.simple()),
		})
	);
}

export default logger;
