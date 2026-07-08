import { config } from "./config.js";
import { createRealtimeApplication } from "./app.js";

const application = createRealtimeApplication(config);

application.httpServer.listen(config.port, () => {
  console.log(
    JSON.stringify({
      event: "realtime-service-started",
      port: config.port,
      javaLmsBaseUrl: config.javaBaseUrl,
      agoraConfigured: Boolean(config.agoraAppId && config.agoraAppCertificate)
    })
  );
});

function shutdown() {
  application.stageMonitor.stop();
  application.io.close();
  application.httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
