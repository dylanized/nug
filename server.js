const config = require("config");
const ejs = require("ejs");
const express = require("express");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const os = require("os");
const path = require("path");
const pino = require("pino-http");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

// Instantiate logger
const logConfig = {
  level: config.get("app.logLevel"),
  name: config.get("app.name"),
};
const logger = pino(logConfig);

// Instantiate Express app, mount logger and error handling middleware
const app = express();
app.use(logger);

// Mount body parser and cookie parser middlewares
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);
app.use(bodyParser.json());
app.use(cookieParser());

// Define helper for auth middleware
let checkToken = (req, res, next) => {
  // If saved token found...
  if (req.cookies["nug_auth"]) {
    // Try to async verify saved token is valid...
    jwt.verify(
      req.cookies["nug_auth"],
      config.get("app.secret"),
      (err, decoded) => {
        // If invalid token, redirect back to Login, else proceed
        if (err) {
          return res.redirect("/login?error=please_login");
        } else {
          req.decoded = decoded;
          next();
        }
      },
    );
  }
  // Else saved token not found, redirect back to Login
  else {
    return res.redirect("/login?error=please_login");
  }
};

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

// Mount health check for dev server
mountHealthCheck(app, {
  themeConfig,
  themePath,
});

const demoData = {
  posts: [
    {
      authorHandle: "foobar",
      authorName: "Foobar McGee",
      content: "The quick brown fox jumps over the lazy dog",
      timestamp: "1min",
    },
    {
      authorHandle: "jerrbear",
      authorName: "Jerry Garcia",
      content: "Just testing out my nug",
      timestamp: "1hr",
    },
    {
      authorHandle: "foobar",
      authorName: "Foobar McGee",
      content: "Here is a link: https://google.com",
      timestamp: "11s",
    },
    {
      authorHandle: "lincoln",
      authorName: "Honest Abe",
      content:
        "Four score and seven years ago our fathers brought forth, upon this continent, a new nation, conceived in liberty, and dedicated to the proposition that all men are created equal.",
      timestamp: "1min",
      location: "Springfield, Mass",
    },
    {
      authorHandle: "jerrbear",
      authorName: "Jerry Garcia",
      content: "Just testing out my nug",
      timestamp: "1hr",
    },
    {
      authorHandle: "foobar",
      authorName: "Foobar McGee",
      content: "Here is a link: https://google.com",
      timestamp: "11s",
    },
    {
      authorHandle: "foobar",
      authorName: "Foobar McGee",
      content: "The quick brown fox jumps over the lazy dog",
      timestamp: "1min",
    },
    {
      authorHandle: "bobbyweir",
      authorName: "Bob Weir",
      content: "Come see Wolf Bros",
      timestamp: "1hr",
      location: "Marin County",
    },
    {
      authorHandle: "foobar",
      authorName: "Foobar McGee",
      content: "Here is a link: https://google.com",
      timestamp: "11s",
    },
  ],
  topics: [
    {
      name: "Something",
      count: 99,
      slug: "something",
    },
    {
      name: "Foobar",
      count: 15,
      slug: "foobar",
    },
    {
      name: "somethingElse",
      count: 12,
      slug: "something-else",
    },
    {
      name: "aTopic",
      count: 300,
      slug: "a-topic",
    },
    {
      name: "anotherTopic",
      count: 5005,
      slug: "another-topic",
    },
    {
      name: "foobar",
      count: 100,
      slug: "foobar",
    },
    {
      name: "Biden2024",
      count: 12,
      slug: "biden-2024",
    },
    {
      name: "USA",
      count: 99,
      slug: "usa",
    },
  ],
  users: [
    {
      authorHandle: "foobar",
      authorName: "Foobar McGee",
    },
    {
      authorHandle: "jerrbear",
      authorName: "Jerry Garcia",
    },
    {
      authorHandle: "foobar",
      authorName: "Foobar McGee",
    },
    {
      authorHandle: "lincoln",
      authorName: "Honest Abe",
    },
    {
      authorHandle: "jerrbear",
      authorName: "Jerry Garcia",
    },
    {
      authorHandle: "foobar",
      authorName: "Foobar McGee",
    },
  ],
};

// Define helper functions
const helpers = {
  getPosts: (limit = 15) => {
    if (limit < demoData.posts.length) {
      return demoData.posts.slice(0, limit);
    } else {
      return demoData.posts;
    }
  },
  getTopics: (limit = 10) => {
    if (limit < demoData.topics.length) {
      return demoData.topics.slice(0, limit);
    } else {
      return demoData.topics;
    }
  },
  getUsers: (limit = 5) => {
    if (limit < demoData.users.length) {
      return demoData.users.slice(0, limit);
    } else {
      return demoData.users;
    }
  },
  getUser: (id = null) => {
    return {
      handle: "foobar",
      desc: "Just a dude trying not to screw up",
      link: "https://google.com",
      name: "Foobar McGee",
      posts: 99,
      followers: 1200,
      following: 5,
      mentions: 15,
    };
  },
};

// Define view locals
const buildLocals = (req, templateSlug) => {
  // Build locals object
  const locals = Object.assign(
    {},
    { req },
    themeConfig,
    { templateSlug },
    helpers,
  );
  // If user is logged in, mount user props
  if (req.cookies["nug_auth"]) {
    locals.user = helpers.getUser();
  }
  return locals;
};

const renderTemplate = (req, res, templateSlug) => {
  res.render(templateSlug, buildLocals(req, templateSlug));
};

const users = {
  dylanized: "foobar",
};

const isUser = (username, password) => {
  // If user and password match found, return true, else return false
  return users[username] && users[username] === password;
};

const handlers = {
  login: (req, res) => {
    // If username and password provided...
    if (req.body.username && req.body.password) {
      // And if valid user...
      if (isUser(req.body.username, req.body.password)) {
        // Create token and save it to cookie, then redirect to Home
        let token = jwt.sign(
          { username: req.body.username },
          config.get("app.secret"),
          {
            expiresIn: "24h",
          },
        );
        res.cookie("nug_auth", token);
        res.redirect("/home");
      }
      // Else not valid user, redirect back to Login
      else {
        res.redirect("/login?error=invalid_login");
      }
    }
    // else invalid request, redirect back to Login
    else {
      res.redirect("/login?error=invalid_login");
    }
  },
};

// Mount route for api
app.post("/api", (req, res, next) => {
  // If valid handler provided, handle it, else send invalid code
  if (req.body && req.body.handler && handlers[req.body.handler]) {
    handlers[req.body.handler](req, res, next);
  } else {
    if (req.body && req.body.redirect) {
      res.redirect(req.body.redirect);
    } else {
      res.sendStatus(400);
    }
  }
});

// Mount route for 'When user requests logout route, delete auth cookie and redirect to Root'
app.get("/logout", (req, res, next) => {
  res.clearCookie("nug_auth");
  res.redirect("/");
});

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

const protectedPages = ["/home", "/explore", "/activity", "/saved", "/account"];

const publicPages = ["/login", "/signup"];

const profiles = ["dylanized", "garrett", "jack", "foobar"];

// Mount route for 'When user requests a proteced page, check token and try to render it'
app.get(protectedPages, checkToken, (req, res, next) => {
  renderTemplate(req, res, req.path.slice(1));
});

// Mount route for 'When user requests a public page, try to render it'
app.get(publicPages, (req, res, next) => {
  renderTemplate(req, res, req.path.slice(1));
});

// Mount route for 'When user requests a profile page, try to render it'
app.get("/:slug", (req, res, next) => {
  if (profiles.includes(req.path.slice(1))) {
    renderTemplate(req, res, "profile");
  } else {
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
