import express from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import { participantsSchema, postBodySchema, userSchema } from "../joi/schemas.js"
import dayjs from 'dayjs'

const app = express();
app.use(cors());
app.use(express.json());

getTimeNow()

const mongoClient = new MongoClient("mongodb://127.0.0.1:27017");
let database;
let participantsCollection, messagesCollection;

mongoClient.connect().then(() => {
    database = mongoClient.db("teste_api");
    participantsCollection = database.collection('participants');
    messagesCollection = database.collection('messages');
});

 setInterval(() =>{
    removeParticipantes()
},15000)

app.post('/participants', async (req, res) => {
    try {
        const validation = participantsSchema.validate(req.body)
        if (validation.error) {
            console.log(validation.error.details)
            res.sendStatus(422)
            return;
        }

        const participante = await participantsCollection.findOne(req.body)
        if (participante) {
            res.status(409).send("Já temos um usuário com esse nome")
            return;
        }

        let timeStamp = Date.now()
        const hourNow = getTimeNow()

        await participantsCollection.insertOne({
            name: req.body.name,
            lastStatus: timeStamp
        })
        await messagesCollection.insertOne({
            from: req.body.name,
            to: 'todos',
            text: 'entra na sala...',
            type: 'status',
            time: hourNow
        })
        res.status(201).send("Bem Vindo!")

    } catch (err) {
        res.status(500).send("Deu xabu")
    }
})

app.get('/participants', async (req, res) => {
    try {
        const participants = await participantsCollection.find().toArray()
        res.send(participants)
        return

    } catch (err) {
        res.sendStatus(500)
    }
})

app.post('/messages', (req, res) => {
    let { user } = req.headers
    let userobj = { user: user }
    const validation = postBodySchema.validate(req.body)
    const validationUser = userSchema.validate(userobj)

    if (validation.error || validationUser.error) {
        res.sendStatus(422)
        return;
    }

    const time = getTimeNow()
    const mensagem = {
        from: user,
        to: req.body.to,
        text: req.body.text,
        type: req.body.type,
        time: time
    }

    const promise = database.collection('messages').insertOne(mensagem)
    promise.then(() => {
        res.status(200).send("Nem acredito, vou contar para a cleide")
    })
    promise.catch(() => { res.status(500).send('deu xabu') })
})

app.get('/messages', async (req, res) => {
    try {
        const mensagensDatabase = await messagesCollection.find().toArray()
        const mensagensToFront = []
        let { limit } = req.query
        limit = parseInt(limit)
        if (!limit) limit = mensagensDatabase.length -1
        let { user } = req.headers
        if (limit) {
            if (typeof(limit) == 'number' && limit > 0){}
            else {limit = mensagensDatabase.length - 1}
        }
        for (let i = mensagensDatabase.length-1; i >= 0; i--) {
            if (mensagensToFront.length >= limit) break
            if (mensagensDatabase[i].type == 'message'|| mensagensDatabase[i].type == 'status' ) mensagensToFront.unshift(mensagensDatabase[i])
            else if (mensagensDatabase[i].from == user || mensagensDatabase[i].to == user) mensagensToFront.unshift(mensagensDatabase[i])
        }
        res.status(200).send(mensagensToFront)
        return
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }

})

app.post('/status', async (req, res) => {
    try{
        let { user } = req.headers
        let userobj = { name: user }
        const participante = await participantsCollection.findOne(userobj)
        if (!participante) {
            res.status(404).send("Usuário não encontrado")
            return;
        }
        let newTime = Date.now()
        const novo = await participantsCollection.update(userobj,{$set:{lastStatus: newTime}})
        res.sendStatus(200)
        return
    } catch (err) {
        res.sendStatus(500)
    }
})

app.listen(5000, () => { console.log('Listening on port 5000') })

function getTimeNow() {
    const second = dayjs().second()
    const minute = dayjs().minute()
    const hour = dayjs().hour()
    return `${hour}:${minute}:${second}`
}

async function removeParticipantes(){
    try {
        console.log('Removing participants')
        let toRemove = []
        const participants = await participantsCollection.find().toArray()
        participants.forEach (async (participant) =>{
            let now = Date.now()
            const timeOff = now - participant.lastStatus
            if(timeOff>10000){
            let deleted = await participantsCollection.deleteOne({name: participant.name})
            }
        })
    } catch (err) {
        console.log(err)
    }

}