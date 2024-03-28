const express = require('express');
const cors = require("cors");
const path = require("path");


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

//config static file
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//config template
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");


app.get('/', (req, res) => {
    res.render("home", {title: "Home Page"});
});
app.get('/login', (req, res) => {
    res.render("login", {title: "Login Page"});
});

app.listen(PORT, () => {
    console.log(`Server run on ${PORT}`);
});
