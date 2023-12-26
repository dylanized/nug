const config = require("config");
const ejs = require("ejs");
const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const pino = require("pino-http");

// Instantiate logger
const logConfig = {
  level: config.get("app.logLevel"),
  name: config.get("app.name"),
};
const logger = pino(logConfig);

// Instantiate Express app, mount logger and error handling middleware
const app = express();
app.use(logger);

// Define helper function for health check
const buildMemoryMB = () => {
  const memoryFormatted = {};
  // Get memory values
  const memoryRaw = process.memoryUsage();
  // For each memory value, calculate in MB and mount it on result, then return result
  for (const key in memoryRaw) {
    memoryFormatted[key] = `${
      Math.round((memoryRaw[key] / 1024 / 1024) * 100) / 100
    } MB`;
  }
  return memoryFormatted;
};

function mountHealthCheck(app, options = null) {
  // Mount route for health check
  app.get("/health-check", (req, res) => {
    const [one, five, fifteen] = os.loadavg();
    const healthDetails = {
      app: {
        environment: process.env["NODE_ENV"],
        logLevel: logConfig.level,
        name: logConfig.name,
        ...options,
        port: config.get("app.port"),
      },
      process: {
        cpuUsage: process.cpuUsage,
        memory: buildMemoryMB(),
        uptime: process.uptime(),
        version: process.version,
      },
      system: {
        freemem: os.freemem(),
        loadavg: { 1: one, 5: five, 15: fifteen },
        timestamp: new Date().toISOString(),
        uptime: os.uptime(),
      },
    };
    req.logger.info(healthDetails);
    res.send(healthDetails);
  });
}

//  Mount route for simulating error
app.get("/error", function (req, res, next) {
  next(new Error("kaboom"));
});

// Calculate theme folder
const themePath = "src";

// Setup template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, themePath));

// Load theme config
const themeConfig = JSON.parse(
  fs.readFileSync(`${themePath}/config/theme.json`),
);
const themeData = JSON.parse(fs.readFileSync(`${themePath}/config/data.json`));

// Mount health check for dev server
mountHealthCheck(app, {
  themeConfig,
  themePath,
});

// Define view helpers
const buildLocals = (req) => {
  return Object.assign({}, { req }, themeConfig, themeData);
};

const renderTemplate = (req, res, templateSlug) => {
  res.render(templateSlug, buildLocals(req));
};

// Mount route for 'When user requests an ejs file, reject it with a bare 404'
app.get("/*.ejs", (req, res) => {
  res.sendStatus(404);
});

// Mount middleware for serving static files if they exist
app.use(express.static(themePath));

// Mount route for 'When user requests a css file, try to dynamically render it'
app.get("/css/:filename", (req, res, next) => {
  // Calculate CSS template filepath and if it exists, render it with CSS contentType, else proceed
  const cssFilepath = `css/${req.params.filename}.ejs`;
  if (fs.existsSync(path.join(themePath, cssFilepath))) {
    res.contentType("text/css");
    renderTemplate(req, res, cssFilepath);
  } else {
    next();
  }
});

const pages = ["/account", "/activity", "/explore", "/saved"];

const profiles = ["dylanized", "garrett", "jack", "foobar"];

// Mount route for 'When user requests a template, try to render it'
app.get("/:slug", (req, res, next) => {
  // If this page exists, show it...
  if (pages.includes(`/${req.params.slug}`)) {
    renderTemplate(req, res, req.params.slug);
  }
  // Else if this profile exists, show it...
  else if (profiles.includes(req.params.slug)) {
    renderTemplate(req, res, "profile");
  }
  // Else proceed
  else {
    next();
  }
});

// Mount route for 'When user requests base domain, serve the homepage template'
app.get("/", (req, res) => {
  renderTemplate(req, res, "index");
});

// Mount route for 'When a user requests any file that doesn't exist, send bare 404'
app.get(/\./, (req, res) => {
  res.sendStatus(404);
});

// Mount route for 'When a user requests any template that doesn't exist, render 404 template'
app.get("*", (req, res) => {
  res.statusCode = 404;
  renderTemplate(req, res, "404");
});

// Mount error handler
app.use(function (err, req, res, next) {
  res.statusCode = 500;
  res.end("Server Error");
});

// Launch app and display msg
app.listen(config.get("app.port"), () =>
  console.info(
    `Launched ${logConfig.name} serving ${themePath} on port ${config.get(
      "app.port",
    )} with log level ${logConfig.level}`,
  ),
);
