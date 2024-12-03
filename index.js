const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));

// Middleware - Verify the token
const verifyAccessToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if(!token) return res.status(401).send({message: 'Unauthorized Access'});
  // verifying if token exist
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if(error) return res.status(401).send({message: 'Unauthorized Access'});
    req.user = decoded
    next();
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.up5eg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const cookieOptions = {
  httpOnly: true, 
  secure: process.env.NODE_ENV === 'production' ? true : false,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const serviceCollection = client.db('smartFixDB').collection('services');
    const bookingCollection = client.db('smartFixDB').collection('booking');

    // Service Related API
    app.post('/service', async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    })
    app.get('/services', async (req, res) => {
        const result = await serviceCollection.find().toArray();
        res.send(result);
    });
    app.get('/service/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await serviceCollection.findOne(query);
        res.send(result);
    });
    app.get('/manage-service', async(req, res) => {
      const userEmail = req.query.email;
      const query = {providerEmail: userEmail};
      const result = await serviceCollection.find(query).toArray();
      res.send(result);
    });
    app.patch('/update-service/:id', async (req, res) => {
      const id = req.params.id;
      const newService = req.body;
      const filter = {_id: new ObjectId(id)};
      const updatedService = {
        $set: {
          imgURL: newService.imgURL,
          serviceName: newService.serviceName,
          price: newService.price,
          serviceArea: newService.serviceArea,
          description: newService.description
        }
      };
      const result = await serviceCollection.updateOne(filter, updatedService);
      res.send(result)
    });
    app.delete('/service/:id', async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const result = await serviceCollection.deleteOne(filter);
      res.send(result);
    });


    // Booking Related API
    app.post('/booking-service', async(req, res) => {
      const bookingService = req.body;
      delete bookingService._id;
      const result = await bookingCollection.insertOne(bookingService);
      res.send(result)
    });
    app.get('/booking-services', verifyAccessToken, async(req, res) => {
      const email = req.query.email;
      // Verifying the user
      if(email !== req.user.email) return res.status(403).send({message: 'Forbidden Access'});
      const filter = {userEmail: email}
      const result = await bookingCollection.find(filter).toArray();
      res.send(result);
    });
    app.delete('/booking-service/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const result = await bookingCollection.deleteOne(filter);
      res.send(result)
    });
    // To-Do Services Api
    app.get('/services-to-do', verifyAccessToken, async (req, res) => {
      const userEmail = req.query.email;
      if(userEmail !== req.user.email) return res.status(403).send({message: 'Forbidden Access'})
      const filter = {providerEmail: userEmail};
      const result = await bookingCollection.find(filter).toArray();
      res.send(result);
    });
    app.patch('/services-to-do/:id', async (req, res) => {
      const id = req.params.id;
      const newStatus = req.body;
      const filter = {_id: new ObjectId(id)};
      const updatedStatus = {
        $set: {status: newStatus.status}
      };
      const result = await bookingCollection.updateOne(filter, updatedStatus);
      res.send(result);
    });
    app.delete('/service-to-do/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const result = await bookingCollection.deleteOne(filter);
      res.send(result);
    });

    // Authentication related api
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      res
      .cookie('token', token, cookieOptions)
      .send({success: true})
    });
    app.post('/logout', async(req, res) => {
      console.log('clear cookie for', req.body)
      res
      .clearCookie('token', {...cookieOptions, maxAge: 0})
      .send({success: true})
    });




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello From Smart Fix Server')
});
app.listen(port,() => {
    console.log('Listening smartFix server on port', port);
})