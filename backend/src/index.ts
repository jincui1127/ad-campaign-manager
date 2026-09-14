import express from "express";

import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  randomUUID,
} from "node:crypto";

import {
  prisma,
} from "./lib/prisma.js";

import campaignRouter
  from "./routes/campaign.routes.js";

import adRouter
  from "./routes/ad.routes.js";

import eventRouter
  from "./routes/event.routes.js";


const app = express();


app.use(
  express.json({
    limit: "16kb",
  })
);


app.get(
  "/healthz",
  async (_req, res) => {
    await prisma.$queryRaw`
      SELECT 1
    `;

    return res.json({
      status: "ok",
    });
  }
);


app.use(
  "/campaigns",
  campaignRouter
);

app.use(
  "/ads",
  adRouter
);

app.use(
  "/events",
  eventRouter
);


app.get("/", (_req, res) => {
  return res.json({
    message:
      "Ad Campaign Manager API",
  });
});


app.use((_req, res) => {
  return res
    .status(404)
    .json({
      error: "NOT_FOUND",
    });
});


app.use(
  (
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    const errorId =
      randomUUID();

    console.error(
      JSON.stringify({
        level: "error",
        errorId,
        method: req.method,
        path: req.path,
        message:
          error instanceof Error
            ? error.message
            : String(error),
      })
    );

    return res
      .status(500)
      .json({
        error:
          "INTERNAL_ERROR",
        errorId,
      });
  }
);


const PORT = Number(
  process.env.PORT ?? 8000
);


const server =
  app.listen(PORT, () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  });


async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();

    process.exit(0);
  });
}


process.on(
  "SIGTERM",
  shutdown
);

process.on(
  "SIGINT",
  shutdown
);