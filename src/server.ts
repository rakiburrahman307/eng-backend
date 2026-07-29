import mongoose from "mongoose";
import dns from "dns";
import app from "./app";
import config from "./config";
import { errorLogger, logger } from "./shared/logger";
import colors from 'colors';
import { socketHelper } from "./helpers/socketHelper";
import { Server } from "socket.io";
import seedSuperAdmin from "./DB";

// Set DNS servers to resolve SRV records for MongoDB Atlas if local DNS fails
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);


//uncaught exception
process.on('uncaughtException', error => {
    errorLogger.error('uncaughtException Detected', error);
    process.exit(1);
});


let server: any;

async function main() {
    try {

        // remove cluster fromt his code
        // create super admin

        
        await mongoose.connect(config.database_url as string);
        logger.info(colors.green('🚀 Database connected successfully'));
        await seedSuperAdmin();

        const port = typeof config.port === 'number' ? config.port : Number(config.port);

        server = app.listen(port,"0.0.0.0", () => {
            logger.info(colors.yellow(`♻️  Application listening on port:${config.port}`));
        });
        //socket
        const io = new Server(server, {
            pingTimeout: 60000,
            cors: {
                origin: '*'
            }
        });

        socketHelper.socket(io);
        //@ts-ignore
        global.io = io;

    } catch (error) {
        errorLogger.error(colors.red('🤢 Failed to connect Database'), error);
        process.exit(1);
    }

    //handle unhandledRejection safely without crashing server
    process.on('unhandledRejection', error => {
        errorLogger.error('UnhandledRejection Detected:', error);
    });
}

main();

// ─────────────────────────────────────────────────────────────────────────────
// SIGTERM — sent by ts-node-dev when a file changes (hot-reload)
// server.close() stops new connections but WAITS for keep-alive connections.
// Without a timeout the process hangs → fixed with a 5-second force-exit.
// ─────────────────────────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
    logger.info('SIGTERM received — gracefully shutting down...');

    if (server) {
        // Force-close all idle keep-alive sockets immediately (Node ≥ 18.2)
        server.closeAllConnections?.();

        server.close(() => {
            logger.info('HTTP server closed cleanly.');
            process.exit(0); // ✅ clean exit → ts-node-dev restarts
        });

        // Safety net: force-exit after 3 s so ts-node-dev can restart
        // exit(0) — NOT exit(1) — otherwise ts-node-dev stops restarting
        setTimeout(() => {
            logger.info('Force exit after 3 s timeout on SIGTERM');
            process.exit(0); // ✅ must be 0 for ts-node-dev auto-restart
        }, 3000).unref();
    } else {
        process.exit(0);
    }
});