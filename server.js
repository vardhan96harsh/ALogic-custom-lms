const dns = require("dns");

// DNS fix should be before MongoDB connection
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const connectDB = require("./config/db");

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:5173",
  "https://alogiclms.netlify.app",
  "https://alogiclms.duckdns.org",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // keeping your current behavior unchanged
      callback(null, true);
    }
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Course-Id",
  ],

  credentials: true,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!origin || allowedOrigins.includes(origin)) {
    res.header(
      "Access-Control-Allow-Origin",
      origin || "*"
    );
  }

  res.header(
    "Access-Control-Allow-Credentials",
    "true"
  );

  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,PATCH,OPTIONS"
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Course-Id"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// JSON/body middleware
app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// Static uploads
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

// Test route
app.get("/", (req, res) => {
  res.send(
    "Alogic Data LMS Backend is running"
  );
});

/*
|--------------------------------------------------------------------------
| Existing Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  require("./routes/authRoutes")
);

app.use(
  "/api/courses",
  require("./routes/courseRoutes")
);

app.use(
  "/api/mail",
  require("./routes/mailRoutes")
);

app.use(
  "/api/analytics",
  require("./routes/analyticsRoutes")
);

/*
|--------------------------------------------------------------------------
| xAPI Route
|--------------------------------------------------------------------------
*/

app.use(
  "/api/xapi",
  require("./routes/xapiRoutes")
);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Important:
    // Wait until MongoDB is connected BEFORE
    // allowing requests to hit the API.
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Server could not start because MongoDB connection failed:",
      error
    );

    process.exit(1);
  }
}

startServer();