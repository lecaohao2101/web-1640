const express = require('express');
const path = require("path");
const mysql = require("mysql2/promise");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const checkAdminRole = require("./middleware/checkAdmin");
const checkLoggedIn = require("./middleware/checkLogin");
const extractUidFromCookie = require("./middleware/exactCookie");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

//config database
const dbConfig = {
    host: "localhost",
    user: "root",
    password: "",
    database: "lms",
};
const pool = mysql.createPool(dbConfig);

//midleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//config static file
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//config template
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

//router
app.use(cookieParser());
app.use(checkLoggedIn);
app.use(extractUidFromCookie);


app.get('/', async(req, res) => {
    const connection = await pool.getConnection();
    connection.release();
    res.render("home", {title: "Home Page"});
});
app.get('/login_page', (req, res) => {
    res.render("login_page", {title: "Login Page"});
});
app.post("/login", async (req, res) => {
    const connection = await pool.getConnection();
    const { email, password } = req.body;

    //admin
    const [rows] = await connection.query(
        "SELECT * FROM Admin WHERE admin_account = ? AND admin_password = ?",
        [email, password]
    );
    if (rows.length > 0) {
        res.cookie("uid", rows[0].id);
        res.cookie("role", "admin");
        connection.release();
        return res.redirect("admin/admin_page");
    }
    //coordinator
    const [rows1] = await connection.query(
        "SELECT * FROM departmentManager WHERE manager_email = ? AND manager_password = ?",
        [email, password]
    );
    if (rows1.length > 0) {
        res.cookie("uid", rows1[0].department_manager_id);
        res.cookie("role", "d_manager");
        connection.release();
        return res.redirect("coordinator/coordinator_page");
    }

    //marketing
    const [rows2] = await connection.query(
        "SELECT * FROM marketing WHERE marketing_email = ? AND marketing_password = ?",
        [email, password]
    );
    if (rows2.length > 0) {
        res.cookie("uid", rows2[0].marketing_id);
        res.cookie("role", "marketing");
        connection.release();
        return res.redirect("marketing/marketing_page");
    }

    //student
    const [rows3] = await connection.query(
        "SELECT * FROM student WHERE student_email = ? AND student_password= ?",
        [email, password]
    );
    if (rows3.length > 0) {
        res.cookie("uid", rows3[0].student_id);
        res.cookie("role", "student");
        connection.release();
        return res.redirect("student/student_page");
    }
    else {
        return res.send(
            "Account or password is incorrect or does not exist"
        );
    }
});
app.get('/logout', (req, res) => {
    res.clearCookie('uid');
    res.clearCookie('role');
    res.redirect('/login_page');
});
app.get("/admin/admin_page", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    connection.release();
    res.render("admin/admin_page", {title: "Admin"});
});
app.get("/coordinator/coordinator_page", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    connection.release();
    res.render("coordinator/coordinator_page", {title: "Coordinator"});
});
app.get("/marketing/marketing_page", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    connection.release();
    res.render("marketing/marketing_page", {title: "Marketing"});
});
app.get("/student/student_page", async (req, res) => {
    const connection = await pool.getConnection();
    const student_id = req.cookies.uid;
    connection.release();
    res.render("student/student_page", {title: "Student"});
});










app.listen(PORT, () => {
    console.log(`Server run on ${PORT}`);
});
