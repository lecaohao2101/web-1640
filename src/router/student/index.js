const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const checkLoggedIn = require("../../middleware/checkLogin");

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
const nodemailer = require('nodemailer');

//config database
const dbConfig = {
    host: "localhost",
    user: "root",
    password: "",
    database: "lms",
    // database: "lmsUpdate",
};
const pool = mysql.createPool(dbConfig);

router.use(checkLoggedIn)

router.get("/student_page", async (req, res) => {
    const connection = await pool.getConnection();
    const student_id = req.cookies.uid;
    connection.release();
    res.render("student/student_page", {title: "Student"});
});


//view post
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


//create post
router.get("/create_post", async (req, res) => {
    try {
        const [magazines] = await pool.query("SELECT * FROM magazine");
        res.render("student/create_post", { magazines });
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ err: "Database query error" });
    }
});
router.post("/create_post", upload.single("file"), async (req, res) => {
    const { title, content, student_id, magazine } = req.body;
    const file = req.file;
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            "INSERT into post(article_title, article_content, article_file, article_author_id, article_created_at, article_updated_at, magazine_id) VALUES(?, ?, ?, ?, ?, ?, ?)",
            [
                title,
                content,
                file.filename,
                student_id,
                new Date().toString(),
                new Date().toString(),
                magazine
            ]
        );
        const [rows2]= await connection.query("SELECT * FROM student INNER JOIN departmentManager ON departmentManager.department_id = student.student_department_id WHERE student.student_id= ?", [student_id])
        if(rows2.length >0 ) {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "lecaohao2101@gmail.com",
                    pass: "zozsertkmqozztta",
                },
            });


            const mailOptions = {
                from: "lecaohao2101@gmail.com",
                to: rows2[0].manager_email,
                subject: "Notify students to post articles",
                text: `Hello ,student ${rows2[0].student_name} posted the article. Thank you!`,
            };
            await transporter.sendMail(mailOptions);
        }
        connection.release();
        res.redirect("/student/view_post");
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ err: "Database query error" });
    }
});

//edit my post
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
router.post("/edit_post/:article_id", upload.single("file"), async (req, res) => {async (req, res) => {
            if (req.file) {
                const file = req.file.filename;
                const {title, content} = req.body;
                const {article_id} = req.params;
                const connection = await pool.getConnection();
                const [rows] = await connection.query(
                    "UPDATE post SET article_title= ?, article_content= ?, article_file= ? WHERE article_id= ?",
                    [title, content, file, article_id]
                );
                connection.release();
                return res.send("Successfully updated post");
            }
            const {title, content, file_old} = req.body;
            const {article_id} = req.params;
            const connection = await pool.getConnection();
            const [rows] = await connection.query(
                "UPDATE post SET article_title= ?, article_content= ?, article_file= ? WHERE article_id= ?",
                [title, content, file_old, article_id]
            );
            connection.release();
            res.redirect("/student/view_post");
        }});
module.exports = router;
