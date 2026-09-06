import express from "express";

import campaignRouter from "./routes/campaign.routes.js";
import adRouter from "./routes/ad.routes.js";
import eventRouter from "./routes/event.routes.js";


const app = express();

app.use(express.json());

app.use("/campaigns", campaignRouter);
app.use("/ads", adRouter);
app.use("/events", eventRouter);


app.get("/", (_req, res) => {
  res.json({
    message: "Ad Campaign Manager API",
  });
});


const PORT = 8000;

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});