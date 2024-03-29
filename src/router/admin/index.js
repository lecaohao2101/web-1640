const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const checkLoggedIn = require("../../middleware/checkLogin");
const checkAdminRole = require("../../middleware/checkAdmin");
const nodemailer = require("nodemailer");

//config database
const dbConfig = {
    host: "localhost",
    user: "root",
    password: "",
    database: "lms",
};
const pool = mysql.createPool(dbConfig);

router.use(checkLoggedIn)

//admin page
router.get("/admin_page", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    connection.release();
    res.render("admin/admin_page", {title: "Admin"});
});


//admin manage student
router.get("/student/admin-manage-student", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT student.*, faculty.department_name FROM student INNER JOIN faculty ON student.student_department_id = faculty.department_id ORDER BY student.student_name");
    connection.release();
    res.render("admin/student/admin-manage-student", { students: rows });
});


// add student
router.get("/student/admin-add-student", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * from faculty");
    connection.release();
    res.render("admin/student/admin-add-student", { faculty: rows});
});
router.post("/student/admin-add-student", async (req, res) => {
    const { name, email, password, department } = req.body;
    const connection = await pool.getConnection();
    await connection.query("INSERT INTO student(student_name, student_email, student_password, student_department_id) VALUES(?, ?, ?, ?)", [name, email, password, department]);
    const [rows] = await connection.query("SELECT * FROM student ORDER BY student_name");
    connection.release();
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "lecaohao2101@gmail.com",
            pass: "zozsertkmqozztta",
        },
    });

    const mailOptions = {
        from: "datistpham@gmail.com",
        to: email,
        subject: "Information Account Student",
        text: `Hello ${name},\n\nYour account has been created.\nEmail: ${email}\nPassword: ${password}\n\nThank You!.`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    res.render("admin/student/admin-manage-student", { students: rows });
});


// edit student
router.get("/student/admin-edit-student/:id", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    const [studentRows] = await connection.query("SELECT * FROM student WHERE student_id = ?", [req.params.id]);
    const [facultyRows] = await connection.query("SELECT * FROM faculty");
    connection.release();
    res.render("admin/student/admin-edit-student", { student: studentRows[0], faculty: facultyRows });
});


// update student
router.post("/student/admin-edit-student/:id", checkAdminRole, async (req, res) => {
    const { name, email, department } = req.body;
    const connection = await pool.getConnection();
    await connection.query("UPDATE student SET student_name = ?, student_email = ?, student_department_id = ? WHERE student_id = ?", [name, email, department, req.params.id]);
    connection.release();
    res.redirect("/admin/student/admin-manage-student");
});


// delete student
router.post("/student/admin-delete-student/:id", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    await connection.query("DELETE FROM student WHERE student_id = ?", [req.params.id]);
    connection.release();
    res.redirect("/admin/student/admin-manage-student");
});

/______________________________________________________________________________________________________________________/

//manege coordinator
router.get("/coordinator/admin-manage-coordinator", async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query("SELECT departmentManager.*, faculty.department_name FROM departmentManager INNER JOIN faculty ON departmentManager.department_id = faculty.department_id");
        connection.release();
        res.render("admin/coordinator/admin-manage-coordinator", { departments: rows });
    } catch (error) {
        console.error("Error fetching departments:", error);
        res.status(500).send("Internal Server Error");
    }
});


// add coordinator
router.get("/coordinator/admin-add-coordinator", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM faculty");
    connection.release();
    res.render("admin/coordinator/admin-add-coordinator", { faculty: rows });
});
router.post("/coordinator/admin-add-coordinator", async (req, res) => {
    const { name, email, password, department } = req.body;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
        "INSERT INTO departmentManager(manager_name, manager_email, manager_password, department_id) VALUES(?, ?, ?, ?)",
        [name, email, password, department]
    );
    connection.release();
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "lecaohao2101@gmail.com",
            pass: "zozsertkmqozztta",
        },
    });

    const mailOptions = {
        from: "datistpham@gmail.com",
        to: email,
        subject: "Information Account Student",
        text: `Hello ${name},\n\nYour account has been created.\nEmail: ${email}\nPassword: ${password}\n\nThank You!.`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    res.redirect("/admin/coordinator/admin-manage-coordinator");
});


// Edit coordinator
router.get("/coordinator/admin-edit-coordinator/:id", checkAdminRole, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [departmentManagerRows] = await connection.query("SELECT * FROM departmentManager WHERE department_manager_id = ?", [req.params.id]);
        const [facultyRows] = await connection.query("SELECT * FROM faculty");
        connection.release();
        res.render("admin/coordinator/admin-edit-coordinator", { departmentManager: departmentManagerRows[0], faculty: facultyRows });
    } catch (error) {
        console.error("Error fetching coordinator:", error);
        res.status(500).send("Internal Server Error");
    }
});
router.post("/coordinator/admin-edit-coordinator/:id", checkAdminRole, async (req, res) => {
    try {
        const { name, email, faculty } = req.body;
        const connection = await pool.getConnection();
        await connection.query("UPDATE departmentManager SET manager_name = ?, manager_email = ?, department_id = ? WHERE department_manager_id = ?", [name, email, faculty, req.params.id]); // Sửa "department" thành "faculty"
        connection.release();
        res.redirect("/admin/coordinator/admin-manage-coordinator");
    } catch (error) {
        console.error("Error updating coordinator:", error);
        res.status(500).send("Internal Server Error");
    }
});


// delete coordinator
router.post("/coordinator/admin-delete-coordinator/:manager_id", async (req, res) => {
    const connection = await pool.getConnection();
    await connection.query("DELETE FROM departmentManager WHERE department_manager_id = ?", [req.params.manager_id]);
    connection.release();
    res.redirect("/admin/coordinator/admin-manage-coordinator");
})

//______________________________________________________________________________________________________________________/

//marketing manage
router.get("/marketing/admin-manage-marketing", async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM marketing ");
    connection.release();
    return res.render("admin/marketing/admin-manage-marketing", {
        marketings: rows,
        title: "Manage marketing manager",
    });
});


//add marketing manager
router.get("/marketing/admin-add-marketing", async (req, res)=> {
    res.render("admin/marketing/admin-add-marketing");
})
router.post("/marketing/admin-add-marketing", async (req, res) => {
    const { email, name, password } = req.body;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
        "INSERT INTO marketing(marketing_name, marketing_email, marketing_password ) VALUES(?, ?, ?)",
        [name, email, password]
    );
    connection.release();
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "lecaohao2101@gmail.com",
            pass: "zozsertkmqozztta",
        },
    });

    const mailOptions = {
        from: "datistpham@gmail.com",
        to: email,
        subject: "Information Account Student",
        text: `Hello ${name},\n\nYour account has been created.\nEmail: ${email}\nPassword: ${password}\n\nThank You!.`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    res.redirect("/admin/marketing/admin-manage-marketing");
});



module.exports = router;


