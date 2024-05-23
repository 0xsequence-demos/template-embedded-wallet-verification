import { sequence } from "0xsequence";
import { ethers } from 'ethers'

import express from 'express'
import cors from 'cors'

//@ts-ignore
import Corestore from 'corestore'

import crypto from 'crypto';

const app = express()
const PORT = 3001;

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',  // Allow only this origin to access your server
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
    const { chainId, walletAddress, messageProof, signature, sessionID, nonce } = req.body
    const data = `SessionAuthProof ${sessionID} ${walletAddress} ${nonce}`;

    const hexString = messageProof;

    console.log(signature)
    // Remove the '0x' prefix if present
    const cleanHexString = hexString.startsWith('0x') ? hexString.substring(2) : hexString;

    // Convert the hex string to a Buffer
    const buffer = Buffer.from(cleanHexString, 'hex');

    // Convert the Buffer to a UTF-8 string
    const decodedString = buffer.toString('utf8');

    const message = `SessionAuthProof ${sessionID} ${walletAddress} ${nonce}`

    console.log(`SessionAuthProof ${sessionID} ${walletAddress} ${nonce}`)
    
    const api = new sequence.api.SequenceAPIClient("https://api.sequence.app");
    const { isValid } = await api.isValidMessageSignature({
        chainId,
        walletAddress,
        message,
        signature,
    });

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