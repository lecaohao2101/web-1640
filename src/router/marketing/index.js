const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const checkLoggedIn = require("../../middleware/checkLogin");
const path = require("path");
const fs = require("fs");
const archiver = require('archiver');


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

router.get("/marketing-page", async (req, res) => {
    const connection = await pool.getConnection();
    connection.release();
    res.render("marketing/marketing-page", {title: "Marketing"});
});


//student mange
router.get("/marketing-manage-student", async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT student.*, faculty.department_name FROM student INNER JOIN faculty ON student.student_department_id = faculty.department_id ORDER BY student.student_name");
    connection.release();
    res.render("marketing/marketing-manage-student", { students: rows });
});


//create student
router.get("/marketing-add-student", async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * from faculty");
    connection.release();
    res.render("marketing/marketing-manage-student", { faculty: rows});
});


//manage post
router.get("/marketing-manage-post", async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
        "SELECT * FROM post INNER JOIN student ON post.article_author_id = student.student_id",
    );
    connection.release();
    console.log(rows);
    res.render("marketing/marketing-manage-post", { title: "Post manager", posts: rows });
});


//download post
router.get('/downloadPostsZip', async (req, res) => {
    try {
        const zipFileName = 'posts.zip';
        const output = fs.createWriteStream(zipFileName);
        const archive = archiver('zip');
        archive.pipe(output);

        const connection = await pool.getConnection();
        const [posts] = await connection.query(
            "SELECT * FROM post INNER JOIN student ON post.article_author_id = student.student_id",
        );

        for (const post of posts) {
            const folderName = `${post.article_title}-${post.student_name.replace(/ /g, '_')}`;
            const folderPath = path.join(__dirname, folderName);
            const attachmentPath = path.join(__dirname, '..', 'uploads', post.article_file);

            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath);
            }

            fs.copyFileSync(attachmentPath, path.join(folderPath, post.article_file));

            archive.directory(folderPath, folderName);
        }

        archive.finalize();

        output.on('close', () => {
            res.download(zipFileName, zipFileName, (err) => {
                if (!err) {
                    fs.unlinkSync(zipFileName);
                }
            });
        });
    } catch (err) {
        console.error('Error creating zip file:', err);
        res.status(500).send('Internal Server Error');
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


//manage magazine post
router.get("/marketing-manage-magazine-post/:magazineId", async (req, res) => {
    try {
        const magazineId = req.params.magazineId;
        const connection = await pool.getConnection();
        const [posts] = await connection.query(
            "SELECT post.*, student.student_name AS author_name FROM post JOIN student ON post.article_author_id = student.student_id WHERE post.magazine_id = ?",
            [magazineId]
        );
        connection.release();
        res.render("marketing/marketing-manage-magazine-post", { title: "Manage Magazine Post", posts: posts });
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).send("Error fetching posts. Please try again later.");
    }
});


//manage magazine
router.get("/marketing-manage-magazine", async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [magazines] = await connection.query(
            "SELECT magazine.magazine_id, magazine.magazine_name, magazine.start_date, magazine.end_date, faculty.department_name FROM magazine JOIN faculty ON magazine.faculty_id = faculty.department_id ORDER BY magazine.magazine_name"
        );
        connection.release();
        res.render("marketing/marketing-manage-magazine", { title: "Manage Magazine", magazines: magazines });
    } catch (error) {
        console.error("Error fetching magazines:", error);
        res.status(500).send("Error fetching magazines. Please try again later.");
    }
});


//create magazine
router.get("/marketing-create-magazine", async (req, res) => {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * from faculty");
    connection.release();
    res.render("marketing/marketing-create-magazine", { faculty: rows });
});
router.post("/marketing-create-magazine", async (req, res) => {
    const { magazine_name, start_date, end_date, faculty_id } = req.body;

    try {
        const connection = await pool.getConnection();
        await connection.query(
            "INSERT INTO magazine (magazine_name, start_date, end_date, faculty_id) VALUES (?, ?, ?, ?)",
            [magazine_name, start_date, end_date, faculty_id]
        );
        connection.release();

        res.redirect("/marketing/marketing-manage-magazine");
    } catch (error) {
        console.error("Error creating magazine:", error);
        res.status(500).send("Error creating magazine. Please try again later.");
    }
});


// Edit magazine
router.get("/marketing-edit-magazine/:magazineId", async (req, res) => {
    const magazineId = req.params.magazineId;

    try {
        const connection = await pool.getConnection();

        const [magazine] = await connection.query(
            "SELECT * FROM magazine WHERE magazine_id = ?",
            [magazineId]
        );

        if (magazine.length === 0) {
            connection.release();
            return res.status(404).send("Magazine not found");
        }

        const [faculty] = await connection.query(
            "SELECT * FROM faculty"
        );

        connection.release();
        res.render("marketing/marketing-edit-magazine", { title: "Edit Magazine", magazine: magazine[0], faculty: faculty });
    } catch (error) {
        console.error("Error fetching magazine details:", error);
        res.status(500).send("Error fetching magazine details. Please try again later.");
    }
});
router.post("/marketing-edit-magazine/:magazineId", async (req, res) => {
    const magazineId = req.params.magazineId;
    const { magazine_name, start_date, end_date, faculty_id } = req.body;

    try {
        const connection = await pool.getConnection();
        await connection.query(
            "UPDATE magazine SET magazine_name = ?, start_date = ?, end_date = ?, faculty_id = ? WHERE magazine_id = ?",
            [magazine_name, start_date, end_date, faculty_id, magazineId]
        );

        connection.release();
        res.redirect("/marketing/marketing-manage-magazine");
    } catch (error) {
        console.error("Error updating magazine:", error);
        res.status(500).send("Error updating magazine. Please try again later.");
    }
});


//delete magazine
router.post("/marketing-delete-magazine/:id", async (req, res) => {
    const magazineId = req.params.id;
    const connection = await pool.getConnection();
    try {
        await connection.query("DELETE FROM magazine WHERE magazine_id = ?", [magazineId]);
        res.redirect("/marketing/marketing-manage-magazine");
    } catch (error) {
        console.error("Error deleting magazine:", error);
        res.status(500).send("Error deleting magazine");
    } finally {
        connection.release();
    }
});


//dashboard
router.get("/dashboard", async (req, res) => {res.render("marketing/dashboard");});
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
    const [magazineCountRows] = await connection.execute(
        "SELECT COUNT(*) AS magazine FROM magazine"
    );

    connection.release();
    res.json({
        totalStudents: studentCountRows[0].totalStudents,
        totalDeptManagers: deptManagerCountRows[0].totalDeptManagers,
        totalMarketingManagers: makeringManagerCountRows[0].totalMarketingManagers,
        totalFaculties: facultyCountRows[0].faculty,
        totalComments: feedbackCountRows[0].comment,
        totalPosts: postCountRows[0].post,
        totalMagazines: magazineCountRows[0].magazine
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


module.exports = router;
