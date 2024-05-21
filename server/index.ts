import { sequence } from "0xsequence";
import { ethers } from 'ethers'

import express from 'express'
import cors from 'cors'

//@ts-ignore
import Corestore from 'corestore'

const app = express()
const PORT = 3000;

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',  // Allow only this origin to access your server
}));

const store = new Corestore('./my-storage')
const nonces = store.get({ name: 'off-chain-db', valueEncoding: 'json'})

app.post('/register', async (req: any,res: any) => {
    const {walletAddress } = req.body

    let walletFound = false
    let foundWallet = null
    const fullStream = nonces.createReadStream()
    for await (const nonceObj of fullStream) {
        const wallet = Object.keys(nonceObj)[0]
        if(walletAddress == wallet){
            walletFound = true
            foundWallet = nonceObj
            break;
        }
    }
    if(walletFound) {
        res.send(foundWallet)
    } else {
        const randomNonce = ethers.BigNumber.from(
            ethers.utils.hexlify(ethers.utils.randomBytes(20))
        )
    
        const walletNonceAddition: any = {}
        walletNonceAddition[walletAddress]= randomNonce.toString()
    
        await nonces.append(walletNonceAddition)
        res.send(walletNonceAddition)
    }

})

app.post('/verify', async (req, res) => {
    const { chainId, walletAddress, signature, sessionID, nonce } = req.body
    const message = `SessionAuthProof ${sessionID} ${walletAddress} ${nonce}`
    console.log(message)
    
    const api = new sequence.api.SequenceAPIClient("https://api.sequence.app");
    const { isValid } = await api.isValidMessageSignature({
        chainId,
        walletAddress,
        message,
        signature,
    });

    // const chainId = "polygon";
    // const walletAddress = "0x2fa0b551fdFa31a4471c1C52206fdb448ad997d1";
    // const message = "Hi, please sign this message";
    // const signature = "0x000501032a44625bec3b842df681db00a92a74dda5e42bcf0203596af90cecdbf9a768886e771178fd5561dd27ab005d0001000183d971056b1eca1bcc7289b9a6926677c5b07db4197925346367f61f2d09c732760719a91722acee0b24826f412cb69bd2125e48f231705a5be33d1f5523f9291c020101c50adeadb7fe15bee45dcb820610cdedcd314eb0030002f19915df00d669708608502d3011a09948b32674d6e443202a2ba884a4dcd26c2624ff33a8ee9836cc3ca2fbb8d3aa43382047b73d21646cb66cc2916076c1331c02";
    
    res.send({valid: isValid})
})

app.get('/check/:wallet', async (req, res) => {
    let walletFound = false
    const obj: any = {}

    const fullStream = nonces.createReadStream()
    for await (const nonceObj of fullStream) {
        const wallet = Object.keys(nonceObj)[0]
        const nonce = Object.values(nonceObj)[0]
        if(req.params.wallet == wallet){
            walletFound = true
            obj[req.params.wallet] = nonce
            break;
        }
    }
    res.send(obj)
})

app.listen(PORT, () => {
    console.log(`listening on port: ${PORT}`)
})