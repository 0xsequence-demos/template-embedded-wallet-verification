import { sequence } from "0xsequence";
import { ethers } from 'ethers'

import express from 'express'
import cors from 'cors'

//@ts-ignore
import Corestore from 'corestore'

const app = express()
const PORT = 3001;

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',  // Allow only this origin to access your server
}));

const store = new Corestore('./my-storage')
const nonces = store.get({ name: 'off-chain-db', valueEncoding: 'json'})

function generateFutureTimestampBySeconds(seconds: any) {
    // Create a new Date object for the current time
    const now = new Date();
    
    // Calculate the future time in milliseconds by adding the specified number of seconds
    const futureTimeInMilliseconds = now.getTime() + seconds * 1000;
    
    // Return the future time in milliseconds
    return futureTimeInMilliseconds;
}

function isSessionActive(sessionString: any) {
    // Regular expression to extract the expiryTime from the string
    const regex = /SessionAuthProof \S+ \S+ (\d+)/;
    const match = sessionString.match(regex);
  
    if (!match) {
      console.error('Invalid session string format');
      return false;
    }
  
    // Extract the expiryTime (assuming it's a Unix timestamp)
    const expiryTime = parseInt(match[1], 10);

    // Get the current time in Unix timestamp format
    const currentTime = Date.now();
  
    return currentTime < expiryTime;
  }

app.post('/register', async (req: any,res: any) => {
    const {walletAddress, isExpiry } = req.body
    if(isExpiry){
        const time = generateFutureTimestampBySeconds(30)
        const walletNonceAddition: any = {}
        walletNonceAddition[walletAddress]= {isExpiry: true, nonce: time.toString()}
    
        await nonces.append(walletNonceAddition)
        res.send(walletNonceAddition)
    } else {
        const randomNonce = ethers.BigNumber.from(
            ethers.utils.hexlify(ethers.utils.randomBytes(20))
        )
    
        const walletNonceAddition: any = {}
        walletNonceAddition[walletAddress]= {isExpiry: false, nonce: randomNonce.toString()}

        await nonces.append(walletNonceAddition)
        res.send(walletNonceAddition)
    }
})

app.post('/verify', async (req, res) => {
    const { chainId, walletAddress, messageProof, signature, sessionID, nonce, isExpiry } = req.body
    const data = `SessionAuthProof ${sessionID} ${walletAddress} ${nonce}`;

    const hexString = messageProof;

    // Remove the '0x' prefix if present
    const cleanHexString = hexString.startsWith('0x') ? hexString.substring(2) : hexString;

    // Convert the hex string to a Buffer
    const buffer = Buffer.from(cleanHexString, 'hex');

    // Convert the Buffer to a UTF-8 string
    const decodedString = buffer.toString('utf8');

    const message = decodedString

    let active = true;
    if(isExpiry){
        active = isSessionActive(message)
    }
    
    const api = new sequence.api.SequenceAPIClient("https://api.sequence.app");
    const { isValid } = await api.isValidMessageSignature({
        chainId,
        walletAddress,
        message,
        signature,
    });

    res.send({valid: isValid&&active})
})

app.get('/check/:wallet/:isExpiry', async (req, res) => {
    const noncesArray = [];
    const fullStream = nonces.createReadStream();

    // Read all data into memory (be careful with large datasets)
    for await (const nonceObj of fullStream) {
        noncesArray.push(nonceObj);
    }

    // Reverse the array
    noncesArray.reverse();

    // Process in reverse order
    let walletFound = false;
    const obj: any = {};

    for (const nonceObj of noncesArray) {
        const wallet = Object.keys(nonceObj)[0];
        const nonce = (Object.values(nonceObj)[0] as any).nonce;
        const isExpiryBoolean = (Object.values(nonceObj)[0] as any).isExpiry;

        if (req.params.wallet == wallet && req.params.isExpiry == String(isExpiryBoolean)) {
            walletFound = true;
            obj[req.params.wallet] = nonce;
            break;
        }
    }

    res.send(obj);
});

app.listen(PORT, () => {
    console.log(`listening on port: ${PORT}`)
})