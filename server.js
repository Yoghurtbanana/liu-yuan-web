const express = require('express');
const multer = require('multer');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { Pool } = require('pg');
require('dotenv').config();

const gstorage = new Storage();
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});
const bucketName = process.env.GCS_BUCKET;
const bucket = gstorage.bucket(bucketName);
const app = express();
const PORT = process.env.PORT || 8080;

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Middleware function for password checking
const simpleAuth = (req, res, next) => {
    // Check if the session has been authenticated
    if (req.session.isAuthenticated) {
      return next();
    }
  
    // Check if the submitted password matches
    if (req.body.password === process.env.ADMIN_PW) {
      req.session.isAuthenticated = true;
      return next();
    }
    
    // If not authenticated, redirect to login or send an error
    res.status(401).send('Authentication required');
  };
  
  // Use express-session middleware for session management
  const session = require('express-session');
  app.use(session({
    secret: 'mySecretSessionKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: !true }
}));
  
// Connect to the database
pool.on('connect', () => {
    console.log('Connected to the PostgreSQL database');
});

// Create the table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS stories (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_path TEXT
  )
`;

pool.query(createTableQuery, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Table 'stories' created or already exists");
  }
});

const imageFilter = (req, file, cb) => {
    // Accept image only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

// Set up storage engine
const multerGoogleStorage = require("multer-google-storage");
// Set up upload handle
const uploadHandler = multer({
    storage: multerGoogleStorage.storageEngine(),
    fileFilter: imageFilter,
    limits: { fileSize: 1024 * 1024 * 10 } // Limit of 10 MB
});

// Serve static files (CSS, JS, images) from a 'public' directory
app.use(express.static('public'));

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Fetching multiple stories on a branch
app.get('/branch/:b', (req, res) => {
    const b = req.params.b;
    const threshold = process.env.IGNORE_STORY_COUNT;
    const query = 'SELECT * FROM stories WHERE id % 6 = $1 AND id > $2';
    const values = [b, threshold];
  
    pool.query(query, values, (err, result) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Error accessing the database" });
        }
        // Send the rows back as JSON
        res.json(result.rows);
    });
});  

// Story entry page
app.get('/story/:id', (req, res) => {
    const id = req.params.id;

    pool.query('SELECT * FROM stories WHERE id = $1', [id], (err, result) => {
        if (err) {
            console.error(err.message);
            return res.status(500).render('message', {
                title: "500",
                detail: "存取資料庫時發生錯誤"
            });
        }
        if (result.rows.length > 0) {
            const row = result.rows[0];
            res.render('story', {
                title: row.title,
                image: row.image_path,
                story: row.content
            });
        } else {
            return res.status(404).render('message', {
                title: "404",
                detail: "查無故事"
            });
        }
    });
})

// Login page
app.get('/login', (req, res) => {
    res.render('auth');
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Admin page
app.get('/admin', simpleAuth, (req, res) => {
    pool.query('SELECT * FROM stories ORDER BY id DESC', (err, result) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("An error occurred");
        }
    
        // The rows are available in the result.rows array
        res.render('admin', { stories: result.rows });
    });
});

// Form submission
app.post('/submit', uploadHandler.single('storyImage'), async (req, res) => {
    const storyTitle = req.body.storyTitle;
    const storyContent = req.body.storyContent;
    const storyImage = req.file ? req.file.path : null;

    if (!storyTitle || !storyContent || !storyImage) {
        res.status(400).render('message', {
            title: "400",
            detail: "輸入欄不可為空"
        });
    } else {
        const insertQuery = 'INSERT INTO stories (title, content, image_path) VALUES ($1, $2, $3) RETURNING id';
        const values = [storyTitle, storyContent, storyImage];
        try {
            const result = await pool.query(insertQuery, values);
            console.log(`A story has been added with id ${result.rows[0].id}`);
            res.render('message', {
                title: "感謝您的分享",
                detail: ""
            });
        } catch (err) {
            console.error(err.message);
            res.status(500).render('message', {
                title: "500",
                detail: "儲存故事時發生錯誤"
            });
        }
    }  
}, (err, req, res, next) => {
    console.error(err.message);
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).render('message', {
            title: "413",
            detail: "檔案過大（大小限制為10MB）"
        });
    } else {
        return res.status(400).render('message', {
            title: "400",
            detail: "上傳檔案發生問題，可能是格式不相容"
        });
    }
});

app.post('/login', simpleAuth, (req, res) => {
    res.redirect('/admin');
});

// Delete a story
app.post('/delete-story/:id', simpleAuth, (req, res) => {
    const id = req.params.id;
    const deleteQuery = 'DELETE FROM stories WHERE id = $1';
    const values = [id];

    pool.query(deleteQuery, values, (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("An error occurred");
        }
        // Redirect back to the admin page
        res.redirect('/admin');
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
    pool.end().then(() => {
      console.log('Pool has ended');
    });
});