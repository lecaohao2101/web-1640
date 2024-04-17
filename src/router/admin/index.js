const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const checkLoggedIn = require("../../middleware/checkLogin");
const checkAdminRole = require("../../middleware/checkAdmin");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const archiver = require('archiver');
const multer = require('multer');

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
    // database: "lmsUpdate",
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


//manage student by faculty
router.get("/faculty/student", async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [departments] = await connection.execute("SELECT * FROM faculty");

        let students;
        let selectedDepartment;
        if (req.query.department) {
            const departmentId = req.query.department;
            [selectedDepartment] = await connection.execute(
                "SELECT * FROM faculty WHERE department_id = ?",
                [departmentId]
            );
            [students] = await connection.execute(
                "SELECT student.*, faculty.department_name FROM student LEFT JOIN faculty ON student.student_department_id = faculty.department_id WHERE student.student_department_id = ? ORDER BY student.student_name",
                [departmentId]
            );
        } else {
            [students] = await connection.execute(
                "SELECT student.*, faculty.department_name FROM student LEFT JOIN faculty ON student.student_department_id = faculty.department_id ORDER BY student.student_name"
            );
        }

        res.render("admin/faculty/student", {
            departments,
            students,
            selectedDepartment: selectedDepartment ? selectedDepartment[0] : null,
        });
    } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).send("Error fetching students. Please try again later.");
    }
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
        from: "lecaohao2101@gmail.com",
        to: email,
        subject: "Information Account Student",
        text: `Hello ${name},\n\nYour account has been created.\nEmail: ${email}\nPassword: ${password}\n\nThank You!.`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    res.redirect("/admin/faculty/student");
});


// edit student
router.get("/student/admin-edit-student/:id", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    const [studentRows] = await connection.query("SELECT * FROM student WHERE student_id = ?", [req.params.id]);
    const [facultyRows] = await connection.query("SELECT * FROM faculty");
    connection.release();
    res.render("admin/student/admin-edit-student", { student: studentRows[0], faculty: facultyRows });
});
router.post("/student/admin-edit-student/:id", checkAdminRole, async (req, res) => {
    const { name, email, department } = req.body;
    const connection = await pool.getConnection();
    await connection.query("UPDATE student SET student_name = ?, student_email = ?, student_department_id = ? WHERE student_id = ?", [name, email, department, req.params.id]);
    connection.release();
    // res.redirect("/admin/student/admin-manage-student");
    res.redirect("/admin/faculty/student");
});


// delete student
router.post("/student/admin-delete-student/:id", checkAdminRole, async (req, res) => {
    const connection = await pool.getConnection();
    await connection.query("DELETE FROM student WHERE student_id = ?", [req.params.id]);
    connection.release();
    res.redirect("/admin/faculty/student");
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


//add coordinator
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


// edit marketing manager
router.get("/marketing/admin-edit-marketing/:manager_id", async (req, res) => {
    const manager_id = req.params.manager_id;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
        "SELECT * FROM marketing WHERE marketing_id = ?",
        [manager_id]
    );
    connection.release();
    res.render("admin/marketing/admin-edit-marketing", {
        title: "Update marketing",
        marketing: rows[0],
        success: false
    });
});
router.post("/marketing/admin-edit-marketing/:manager_id", async (req, res) => {
    const { name, email } = req.body;
    const { manager_id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
        "UPDATE marketing SET marketing_name= ?, marketing_email= ? WHERE marketing_id= ?",
        [name, email, manager_id]
    );
    const [rows1] = await connection.query(
        "SELECT * FROM marketing WHERE marketing_id = ?",
        [manager_id]
    );
    connection.release();
    res.redirect("/admin/marketing/admin-manage-marketing");
});


//delete marketing manager
router.post("/marketing/admin-delete-marketing/:manager_id", async (req, res) => {
    const manager_id = req.params.manager_id;
    const connection = await pool.getConnection();
    const [rows] = await connection.query("DELETE FROM marketing WHERE marketing_id = ?", [manager_id]);
    await connection.query("DELETE FROM departmentManager WHERE department_manager_id = ?", [req.params.manager_id]);
    connection.release()
    res.redirect("/admin/marketing/admin-manage-marketing");
});

//____________________________________________________________________________________________________________________/

//faculty manage
router.get("/faculty/admin-manage-faculty", async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * from faculty");
    res.render("admin/faculty/admin-manage-faculty", { title: "Manage Faculty", departments: rows });
});


//add faculty
router.get("/faculty/admin-add-faculty", async (req, res) => {
    res.render("admin/faculty/admin-add-faculty");
});
router.post("/faculty/admin-add-faculty", async (req, res) => {
    const connection= await pool.getConnection()
    const {name }= req.body
    const [result] = await connection.execute('INSERT into faculty(department_name) VALUES (?)', [name]);
    await connection.release();
    res.redirect("/admin/faculty/admin-manage-faculty");
});


//edit faculty
router.get("/faculty/admin-edit-faculty/:facultyId", async (req, res) => {
    const connection = await pool.getConnection();
    const facultyId = req.params.facultyId;
    const [rows] = await connection.query(
        "SELECT * from faculty WHERE department_id= ?",
        [facultyId]
    );
    console.log(rows[0]);
    res.render("admin/faculty/admin-edit-faculty", {
        title: "Update Faculty",
        department: rows[0],
    });
});
router.post("/faculty/admin-edit-faculty/:facultyId", async (req, res)=> {
    const connection= await pool.getConnection()
    const facultyId= req.params.facultyId
    const {name }= req.body
    const [rows]= await connection.query('update faculty SET department_name= ? WHERE department_id= ?', [name, facultyId])
    res.redirect("/admin/faculty/admin-manage-faculty");
})


//delete faculty
router.post("/faculty/admin-delete-faculty/:facultyId", async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("DELETE FROM faculty WHERE department_id = ?", [req.params.facultyId]);
    connection.release()
    res.redirect("/admin/faculty/admin-manage-faculty");
});

//____________________________________________________________________________________________________________________/

//dashboard
router.get("/dashboardData", async (req, res) => {
    const connection = await pool.getConnection();

    const [studentCountRows] = await connection.execute(
        "SELECT COUNT(*) AS totalStudents FROM student"
    );
    const [deptManagerCountRows] = await connection.execute(
        "SELECT COUNT(*) AS totalDeptManagers FROM departmentManager"
    );
    const [makeringManagerCountRows] = await connection.execute(
        "SELECT COUNT(*) AS totalMarketingManagers FROM marketing"
    );
    const [facultyCountRows] = await connection.execute(
        "SELECT COUNT(*) AS faculty FROM faculty"
    );
    const [feedbackCountRows] = await connection.execute(
        "SELECT COUNT(*) AS comment FROM comment"
    );
    const [postCountRows] = await connection.execute(
        "SELECT COUNT(*) AS post FROM post"
    );

    connection.release();
    res.json({
        totalStudents: studentCountRows[0].totalStudents,
        totalDeptManagers: deptManagerCountRows[0].totalDeptManagers,
        totalMarketingManagers: makeringManagerCountRows[0].totalMarketingManagers,
        totalFaculties: facultyCountRows[0].faculty,
        totalComments: feedbackCountRows[0].comment,
        totalPosts: postCountRows[0].post,
    });
});
router.get("/departmentData", async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const [departmentDataRows] = await connection.query(`
            SELECT f.department_name, COUNT(s.student_id) AS totalStudents, COUNT(c.id) AS totalComments
            FROM faculty f
            LEFT JOIN student s ON f.department_id = s.student_department_id
            LEFT JOIN Comment c ON s.student_id = c.author_id
            GROUP BY f.department_name
        `);

        res.json(departmentDataRows);
    } catch (error) {
        console.error("Error fetching department data:", error);
        res.status(500).json({ error: "An error occurred while fetching department data" });
    } finally {
        connection.release();
    }
});
router.get("/dashboard/analysis", async (req, res) => {res.render("admin/dashboard/admin-analysis");});

//______________________________________________________________________________________________________________________/

//manage post
router.get("/post/admin-manage-post", async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            "SELECT * FROM post INNER JOIN student ON post.article_author_id = student.student_id ORDER BY post.article_title"
        );
        connection.release();
        console.log(rows);
        res.render("admin/post/admin-manage-post", { title: "Post manager", posts: rows });
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).send("Error fetching posts. Please try again later.");
    }
});


//download posts
router.get('/downloadPostsZip', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [posts] = await connection.query("SELECT * FROM post");
        connection.release();

        if (!posts.length) {
            return res.status(404).json({ error: 'No posts found' });
        }

        const output = fs.createWriteStream(path.join(__dirname, 'posts.zip'));
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        archive.pipe(output);

        posts.forEach(post => {
            archive.file(path.join(__dirname, 'uploads', post.article_file), { name: post.article_file });
        });

        output.on('close', () => {
            res.download(path.join(__dirname, 'posts.zip'), 'all_posts.zip', (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Server error' });
                }
            });
        });

        archive.on('error', (err) => {
            console.error(err);
            return res.status(500).json({ error: 'Server error' });
        });

        archive.finalize();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/downloadPostAsZip/:articleId', async (req, res) => {
    try {
        const articleId = req.params.articleId;
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            "SELECT * FROM post INNER JOIN student ON post.article_author_id = student.student_id WHERE article_id = ?",
            [articleId]
        );
        connection.release();
        const post = rows[0];

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const output = fs.createWriteStream(__dirname + '/post.zip');
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        const fileName = `${post.article_title}-${post.student_name}.zip`; // Tạo tên file mới
        archive.file(__dirname + '/uploads/' + post.article_file, { name: post.article_file });

        archive.pipe(output);

        output.on('close', () => {
            res.download(__dirname + '/post.zip', fileName, (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Server error' });
                }
            });
        });

        archive.on('error', (err) => {
            console.error(err);
            return res.status(500).json({ error: 'Server error' });
        });

        archive.finalize();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


//view post
router.get("/post/admin-view-post/:post_id", async (req, res) => {
    const connection = await pool.getConnection();
    const post_id = req.params.post_id;
    const [rows0] = await connection.query(
        "SELECT * FROM Comment INNER JOIN departmentManager ON Comment.author_id = departmentManager.department_manager_id INNER JOIN post ON post.article_id = Comment.article_id WHERE post.article_id = ?",
        [post_id]
    );
    const [rows] = await connection.query(
        "SELECT * FROM post INNER JOIN student ON student.student_id = post.article_author_id WHERE post.article_id = ?",
        [post_id]
    );
    const [rows1] = await connection.query(
        "SELECT * FROM post WHERE article_id = ?",
        [post_id]
    );
    connection.release();
    console.log(rows);
    res.render("admin/post/admin-view-post", {
        title: "View detail article",
        post: rows1[0],
        author: rows[0],
        comments: rows0,
    });
});


//edit post
router.get("/post/admin-edit-post/:article_id", async (req, res) => {
    const connection = await pool.getConnection();
    const article_id = req.params.article_id;
    const [rows] = await connection.query(
        "SELECT * FROM post WHERE article_id = ?",
        [article_id]
    );
    connection.release();
    res.render("admin/post/admin-edit-post", { title: "Edit article", article: rows[0] });
});
router.post("/post/admin-edit-edit/:article_id", upload.single("file"), async (req, res) => {
    if (req.file) {
        const file = req.file.filename;
        const { title, content } = req.body;
        const { article_id } = req.params;
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            "UPDATE post SET article_title= ?, article_content= ?, article_file= ? WHERE article_id= ?",
            [title, content, file, article_id]
        );
        connection.release();

    }
    const { title, content, file_old } = req.body;
    const { article_id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
        "UPDATE post SET article_title= ?, article_content= ?, article_file= ? WHERE article_id= ?",
        [title, content, file_old, article_id]
    );
    connection.release();
    res.redirect("/admin/post/admin-manage-post");
});


//delete post
router.post("/post/admin-delete-post/:article_id", async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("DELETE FROM post WHERE article_id = ?", [req.params.article_id]);
    connection.release();
    res.redirect("/admin/post/admin-manage-post");
});

//______________________________________________________________________________________________________________________//

//manage magazine
router.get("/magazine/admin-manage-magazine", async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            "SELECT * FROM magazine ORDER BY magazine_name"
        );
        connection.release();
        console.log(rows);
        res.render("admin/magazine/admin-manage-magazine", { title: "Manage magazine", magazines: rows });
    } catch (error) {
        console.error("Error fetching magazines:", error);
        res.status(500).send("Error fetching magazines. Please try again later.");
    }
});

//______________________________________________________________________________________________________________________//

//manage session
router.get("/session/admin-manage-session", async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows, fields] = await connection.execute("SELECT * FROM academic_years ORDER BY start_date");
        connection.release();
        res.render("admin/session/admin-manage-session", { academicYears: rows });
    } catch (error) {
        console.error("Error fetching academic years:", error);
        res.status(500).send("Internal Server Error");
    }
});


//add session
router.get("/session/admin-add-session", checkAdminRole, (req, res) => {res.render("admin/session/admin-add-session", { title: "Add session" });});
router.post("/session/admin-add-session", checkAdminRole, async (req, res) => {
    const { year, start_date, end_date } = req.body;
    try {
        const connection = await pool.getConnection();
        await connection.execute("INSERT INTO academic_years (year, start_date, end_date) VALUES (?, ?, ?)", [year, start_date, end_date]);
        connection.release();
        res.redirect("/admin/session/admin-manage-session");
    } catch (error) {
        console.error("Error adding academic year:", error);
        res.status(500).send("Internal Server Error");
    }
});


//edit session
router.get("/session/admin-edit-session/:id", checkAdminRole, async (req, res) => {
    const id = req.params.id;
    try {
        const connection = await pool.getConnection();
        const [rows, fields] = await connection.execute("SELECT * FROM academic_years WHERE id = ?", [id]);
        connection.release();
        if (rows.length === 0) {
            res.status(404).send("Academic year not found");
        } else {
            res.render("admin/session/admin-edit-session", { academicYear: rows[0] });
        }
    } catch (error) {
        console.error("Error fetching academic year:", error);
        res.status(500).send("Internal Server Error");
    }
});
router.post("/session/admin-edit-session/:id", checkAdminRole, async (req, res) => {
    const id = req.params.id;
    const { year, start_date, end_date } = req.body;
    try {
        const connection = await pool.getConnection();
        await connection.execute("UPDATE academic_years SET year = ?, start_date = ?, end_date = ? WHERE id = ?", [year, start_date, end_date, id]);
        connection.release();
        res.redirect("/admin/session/admin-manage-session");
    } catch (error) {
        console.error("Error updating academic year:", error);
        res.status(500).send("Internal Server Error");
    }
});


//delete session
router.post("/session/admin-delete-session/:id", checkAdminRole, async (req, res) => {
    const id = req.params.id;
    try {
        const connection = await pool.getConnection();
        await connection.execute("DELETE FROM academic_years WHERE id = ?", [id]);
        connection.release();
        res.redirect("/admin/session/admin-manage-session");
    } catch (error) {
        console.error("Error deleting academic year:", error);
        res.status(500).send("Internal Server Error");
    }
});


module.exports = router;


