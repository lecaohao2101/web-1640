const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const checkLoggedIn = require("../../middleware/checkLogin");
const checkAdminRole = require("../../middleware/checkAdmin");

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "../../uploads"));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
 });
const upload = multer({ storage: storage });

//config database
const dbConfig = {
    host: "localhost",
    user: "root",
    password: "",
    database: "lms",
};
const pool = mysql.createPool(dbConfig);

router.use(checkLoggedIn)

router.get("/student_page", async (req, res) => {
    const connection = await pool.getConnection();
    const student_id = req.cookies.uid;
    connection.release();
    res.render("student/student_page", {title: "Student"});
});

router.get("/view_post", async (req, res) => {
    const connection = await pool.getConnection();
    const student_id = req.cookies.uid;
    const [rows] = await connection.query(
        "SELECT * FROM post WHERE article_author_id = ?",
        [student_id]
    );
    console.log(rows);
    connection.release();
    res.render("student/view_post", { title: "Post", posts: rows });
 });
 

router.get("/edit_post/:article_id", async (req, res) => {
    const connection = await pool.getConnection();
    const student_id = req.cookies.uid;
    const article_id = req.params.article_id;
    const [rows] = await connection.query(
        "SELECT * FROM post WHERE article_author_id = ? AND article_id= ?",
        [student_id, article_id]
    );
    connection.release();
    res.render("student/edit_post", { title: "Post", article: rows[0] });
 });

 // Post the edits
 router.post("/edit_post/:article_id", upload.single("file"), async (req, res) => {
    // Implementation of the post handling, including updating the post details in the database
    // and redirecting to the view post page or handling errors.
 });

 router.post("/create_post", upload.single("file"), async (req, res) => {
    const { title, content, student_id } = req.body;
    const file = req.file;
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            "INSERT into post(article_title, article_content, article_file, article_author_id, article_created_at, article_updated_at) VALUES(?, ?, ?, ?, ?, ?)",
            [
                title,
                content,
                file ? file.filename : null,
                student_id,
                new Date().toString,
                new Date().toString,
            ]
        );
        
        connection.release();
        res.redirect("/student/view_post");
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).send("Database query error");
    }
});

 


module.exports = router;
