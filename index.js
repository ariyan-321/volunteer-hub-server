const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

require('dotenv').config();

app.use(cors({
  origin:["http://localhost:5173","https://assignment-11-ariyan.netlify.app","https://assignment-11-70383.web.app"],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken=(req,res,next)=>{
  console.log("verifying",req.cookies);
  const token=req?.cookies?.token;
 
  if(!token){
    return res.status(401).send({message:"UnAuthorized Access"})
  }

  jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:"UnAuthorized Access"})
    }
    req.user=decoded;
    next();
  })


}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@ariyan.mefyr.mongodb.net/?retryWrites=true&w=majority&appName=Ariyan`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // await client.connect(); // Establish a connection to the MongoDB cluster
    // console.log("Connected to MongoDB!");

    const volunteerCollection = client.db("volunteerDB").collection("volunteer");
    const requestsCollection =client.db("requestsDB").collection("requests");


    app.post("/jwt",async(req,res)=>{
      const user=req.body;
      const token=jwt.sign(user,process.env.JWT_SECRET,{expiresIn:"90d"});
      res
      .cookie("token",token,{
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", 
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", 
      })
      .send({success:true});
    });


    app.post("/logout",(req,res)=>{
      res.clearCookie("token",{
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", 
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", 
      })
      .send({success:true});
    })


    app.post("/add-volunteer",verifyToken,async(req,res)=>{
        const Volunteer=req.body;
        if(req.user?.email!==Volunteer.OrganizerEmail){
          return res.status(403).send({message:"Forbidden Access"});
         }
        const result=await volunteerCollection.insertOne(Volunteer);
        res.send(result)
    })


    app.post("/add-requests",verifyToken,async(req,res)=>{
      const data=req.body;
      if(req.user.email!==data.volunteerEmail){
        return res.status(403).send({message:"Forbidden Access"});
       }
      const request=req.body;
      const result=await requestsCollection.insertOne(request);
      const filter = { _id: new ObjectId(data.jobId) };
      const update={$inc:{noOfVolunteerNeed:-1}}
      const updateCount=await volunteerCollection.updateOne(filter,update);
      res.send(result);
    })

  


    app.get("/volunteer", async (req, res) => {
      const search=req.query.search;
      let query = {};

        // Add search condition if search is provided
        if (search) {
          query.title = { $regex: search, $options: "i" }; // Regex for case-insensitive search
        }
      const result = await volunteerCollection.find(query).toArray();
      res.send(result);
    });


   


    app.get("/volunteer-email/:email",verifyToken,async(req,res)=>{
      const email=req.params.email;
      const query={OrganizerEmail:email};
      if(req.user.email!==req.params.email){
       return res.status(403).send({message:"Forbidden Access"});
      }
      const result=await volunteerCollection.find(query).toArray();
      res.send(result);
    })

    app.get("/volunteer/:id",async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result= await volunteerCollection.findOne(query);
      res.send(result)
   });

    


    

    app.get("/requests",async(req,res)=>{
      const result=await requestsCollection.find().toArray();
      res.send(result);
    });


    
    

    app.get("/requests-email/:email",verifyToken,async(req,res)=>{
      const email=req.params.email;
      const query={volunteerEmail:email};
      if(req.user.email!==req.params.email){
        return res.status(403).send({message:"Forbidden Access"});
       }
      const result=await requestsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/requests/:id",async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result= await requestsCollection.findOne(query);
      res.send(result)
   });


   app.put("/update-volunteer/:id",verifyToken,async(req,res)=>{
    const id=req.params.id;
    const volunteerData=req.body;
    if(req.user.email!==volunteerData?.OrganizerEmail){
      return res.status(403).send({message:"Forbidden Access"});
     }
    const updated={$set:volunteerData};
    const query={_id: new ObjectId(id)};
    const options={upsert:true};
    const result= await volunteerCollection.updateOne(query,updated,options);
    res.send(result)
   })
    

   
 
   app.get("/volunteer-needs",async(req,res)=>{
    const date=new Date();
    const currentTime = date.getTime();
    const result=await volunteerCollection.
    find({ postDeadline: { $gte: currentTime } }).
    sort({postDeadline:1}).
    limit(6).toArray();
    res.send(result)
   })
  



    
    
    



    app.delete("/volunteer/:id",async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result=await volunteerCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/requests/:id",async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await requestsCollection.deleteOne(query);
      res.send(result);
    })
    
    
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message);
  }
}

run();

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
