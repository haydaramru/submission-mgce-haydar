const express = require('express')
const mysql = require('mysql')
const router = express.Router()
const Multer = require('multer')
const imgUpload = require('../modules/imgUpload')

const multer = Multer({
    storage: Multer.MemoryStorage,
    fileSize: 5 * 1024 * 1024
})

// TODO: Sesuaikan konfigurasi database
const connection = mysql.createConnection({
    connectionLimit: 10,
    host: '34.128.83.225',
    user: 'root',
    database: 'my_database',
    password: '1234567890',
    debug: true
})

connection.connect((err) => {
    if (err) {
        console.error("Error connecting to the database:", err.stack);
        return;
    }
    console.log("Connected to database with thread ID:", connection.threadId);
});

router.get("/dashboard", (req, res) => {
    const query = `
        SELECT 
            (SELECT COUNT(*) 
             FROM records 
             WHERE MONTH(records.date) = MONTH(NOW()) 
             AND YEAR(records.date) = YEAR(NOW())
            ) AS month_records, 
            (SELECT SUM(amount) FROM records) AS total_amount;
    `;
    connection.query(query, (err, rows, field) => {
        if (err) {
            console.error("Error executing query:", err); // Log the error to console
            return res.status(500).send({message: err.sqlMessage || "An error occurred"});
        } else {
            res.json(rows);
        }
    });
});


router.get("/getrecords", (req, res) => {
    const query = "SELECT * FROM records"
    connection.query(query, (err, rows, field) => {
        if(err) {
            res.status(500).send({message: err.sqlMessage})
        } else {
            res.json(rows)
        }
    })
})

router.get("/getlast10records", (req, res) => {
    const query = "SELECT * FROM records ORDER BY date DESC LIMIT 10"
    connection.query(query, (err, rows, field) => {
        if(err) {
            res.status(500).send({message: err.sqlMessage})
        } else {
            res.json(rows)
        }
    })
})

router.get("/gettopexpense", (req, res) => {
    const query = "SELECT * FROM records WHERE amount < 0 ORDER BY amount ASC LIMIT 10"
    connection.query(query, (err, rows, field) => {
        if(err) {
            res.status(500).send({message: err.sqlMessage})
        } else {
            res.json(rows)
        }
    })
})

router.get("/getrecord/:id", (req, res) => {
    const id = req.params.id

    const query = "SELECT * FROM records WHERE id = ?"
    connection.query(query, [id], (err, rows, field) => {
        if(err) {
            res.status(500).send({message: err.sqlMessage})
        } else {
            res.json(rows)
        }
    })
})

router.get("/searchrecords", (req, res) => {
    const s = req.query.s;

    console.log(s)
    const query = "SELECT * FROM records WHERE name LIKE '%" + s + "%' or notes LIKE '%" + s + "%'"
    connection.query(query, (err, rows, field) => {
        if(err) {
            res.status(500).send({message: err.sqlMessage})
        } else {
            res.json(rows)
        }
    })
})

router.post("/insertrecord", multer.single('attachment'), imgUpload.uploadToGcs, (req, res) => {
    const name = req.body.name
    const amount = req.body.amount
    const date = req.body.date
    const notes = req.body.notes
    var imageUrl = ''

    if (req.file && req.file.cloudStoragePublicUrl) {
        imageUrl = req.file.cloudStoragePublicUrl
    }

    const query = "INSERT INTO records (name, amount, date, notes, attachment) values (?, ?, ?, ?, ?)"

    connection.query(query, [name, amount, date, notes, imageUrl], (err, rows, fields) => {
        if (err) {
            res.status(500).send({message: err.sqlMessage})
        } else {
            res.send({message: "Insert Successful"})
        }
    })
})

router.put("/editrecord/:id", multer.single('attachment'), imgUpload.uploadToGcs, (req, res) => {
    const id = req.params.id
    const name = req.body.name
    const amount = req.body.amount
    const date = req.body.date
    const notes = req.body.notes
    var imageUrl = ''

    if (req.file && req.file.cloudStoragePublicUrl) {
        imageUrl = req.file.cloudStoragePublicUrl
    }

    const query = "UPDATE records SET name = ?, amount = ?, date = ?, notes = ?, attachment = ? WHERE id = ?"
    
    connection.query(query, [name, amount, date, notes, imageUrl, id], (err, rows, fields) => {
        if (err) {
            res.status(500).send({message: err.sqlMessage})
        } else {
            res.send({message: "Update Successful"})
        }
    })
})

router.delete("/deleterecord/:id", (req, res) => {
    const id = req.params.id
    
    const query = "DELETE FROM records WHERE id = ?"
    connection.query(query, [id], (err, rows, fields) => {
        if (err) {
            res.status(500).send({message: err.sqlMessage})
        } else {
            res.send({message: "Delete successful"})
        }
    })
})

router.post("/uploadImage", multer.single('image'), imgUpload.uploadToGcs, (req, res, next) => {
    const data = req.body
    if (req.file && req.file.cloudStoragePublicUrl) {
        data.imageUrl = req.file.cloudStoragePublicUrl
    }

    res.send(data)
})

module.exports = router
