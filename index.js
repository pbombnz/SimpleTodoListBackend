// Imports
const express = require('express');
const path = require('path')
const cors = require('cors');
const bodyParser = require('body-parser');
const pg = require('pg');//.native;
const morgan = require('morgan')

// Port Setup
var PORT = process.env.PORT || 8080;
var DATABASE_URL = process.env.DATABASE_URL || 'postgres://yfcxnmmnhrogdb:35786636165fbf8ad69c0b6c1f1f6c2bac235331c0ad5365e368533c745eed2d@ec2-107-22-221-60.compute-1.amazonaws.com:5432/d5r86lcb00bu3m';

// Database Setup
var pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: true,
});


// Helper functions
function HttpError(statusCode, message) {
    var err = new Error(message);
    err.statusCode = statusCode;
    return err;
}


// Express Setup
var app = express()
    .use(bodyParser.urlencoded({ extended : true}))
    .use(bodyParser.json())
    .use(morgan(/*'tiny'*/'combined'))
    .use(cors())
    .use(express.static(path.join(__dirname, 'public')));


//app.get('/', function (req, res) {
    //testOutput(res)
    //res.render()
//});

app.get('/db', async (req, res) => {
    try {
        const client = await pool.connect()
        var result = await client.query('SELECT * FROM todo');   
        if (!result) {
            throw new HttpError(503, 'Failure to retrieve data.')
        }// else {
        //    result.rows.forEach(row=> { console.log(row); }); 
        //}
        res.type('application/json');
        res.send({success : true, 'todo': result.rows})
        client.release();
    } catch (err) {
        if('error' in err) {
            err = err.error;
        }    
        //console.error(err);
        res.status(err.statusCode || 400).send({success :false, error : err.message});
    }
});

app.get('/tasks', async (req, res) => {
    try {
        const client = await pool.connect()
        var result = await client.query('SELECT * FROM todo ORDER BY id');   
        if (!result) {
            throw new HttpError(503, 'Failure to retrieve data.');
        }
        res.type('application/json');
        res.send({success : true, data : result.rows});
        client.release();
    } catch (err) {
        if('error' in err) {
            err = err.error;
        }    
        //console.error(err);
        res.status(err.statusCode || 400).send({success : false, error : err.message});
    }
});

app.get('/tasks/:id', async (req, res) => {
    try {
        const client = await pool.connect()
        var result = await client.query('SELECT * FROM todo WHERE id=$1', [req.params.id]);   
        if (!result || result.rowCount == 0) {
            throw new HttpError(404, `No task with id ${req.params.id}.`)
        }

        res.type('application/json');
        res.send({success : true, data : result.rows[0]});
        client.release();
    } catch (err) {
        if('error' in err) {
            err.message = err.error;
        }    
        res.status(err.statusCode || 400).send({success : false, error : err.message});
    }
});

app.put('/tasks/:id', async (req, res) => {
    try {
        const client = await pool.connect();

        let bodyKeys = Object.keys(req.body); 
        if(bodyKeys.length == 0) {
            throw new HttpError(400, `No body parameters provided.`);
        }

        let resParams = [];
        let resQuery = "UPDATE todo SET ";
        for(let i = 0; i < bodyKeys.length; i++) {
            if(bodyKeys[i].toLowerCase() == 'id' || bodyKeys[i].toLowerCase() == 'date_created') {
                continue;
            }
            resParams.push(req.body[bodyKeys[i]])
            resQuery += bodyKeys[i] + '=$' + resParams.length + ', ';
        }
        resParams.push(req.params.id);
        resQuery = resQuery.slice(0, -2).concat(' WHERE id=$', resParams.length);
        //console.log("body:", req.body);
        //console.log("resQuery:", resQuery);
        //console.log("resParams:", resParams);

        var result = await client.query(resQuery, resParams); 
        

        if (!result || result.rowCount == 0) {
            throw new Error(`No task updated as no task exists with id ${req.params.id}.`);
        }

        // Retrieve the task data from todo table after update.
        result = await client.query('SELECT * FROM todo WHERE id=$1', [req.params.id]);   
        if (!result) {
            throw new HttpError(503, 'Task updated successfully, but cannot retrieve updated task data from database.');
        }

        // Response body is the updated task.
        res.type('application/json');
        res.send({success : true, data : result.rows[0]});
        client.release();
    } catch (err) {
        if('error' in err) {
            err = err.error;
        }    
        //console.error(err);
        res.status(err.statusCode || 400).send({success : false, error : err.message});
    }
});

app.post('/tasks', async (req, res) => {
    try {
        const client = await pool.connect()
        // Insert new task data into todo table
        if(Object.keys(req.body).length == 2 && req.body.item && req.body.completed) {
            var result = await client.query('INSERT INTO todo(item, completed) VALUES($1, $2) RETURNING id', [req.body.item, req.body.completed]);   
        } else if(Object.keys(req.body).length == 1 && req.body.item) {
            var result = await client.query('INSERT INTO todo(item) VALUES($1) RETURNING id', [req.body.item]);   
        } else {
            throw new HttpError(400, 'Body must contain a \'item\' field.');
        }

        if (!result) {
            throw new HttpError(503, 'Task cannot be inserted into datbase.');
        }

        // Retrieve the new task data from todo table after inserted.
        result = await client.query('SELECT * FROM todo WHERE id=$1', [result.rows[0].id]);   
        if (!result) {
            throw new Error('Task inserted successfully, but cannot retrieve new task data from database.');
        }

        // Response body is the new task.
        res.type('application/json');
        res.send({success : true, data : result.rows[0]});
        client.release();
    } catch (err) {
        if('error' in err) {
            err = err.error;
        }    
        //console.error(err);
        res.status(err.statusCode || 400).send({success : false, error : err.message});
    }
});

app.delete('/tasks/:id', async (req, res) => {
    try {
        const client = await pool.connect()
        var result = await client.query('DELETE FROM todo WHERE id=$1', [req.params.id]);   
        if (!result || result.rowCount == 0) {
            throw new HttpError(404, `No task exists with id ${req.params.id}.`);
        }

        // Response body is the updated task.
        res.type('application/json');
        res.send({success : true});
        client.release();
    } catch (err) {
        if('error' in err) {
            err = err.error;
        }    
        //console.error(err);
        res.status(err.statusCode || 400).send({success : false, error : err.message});
    }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));