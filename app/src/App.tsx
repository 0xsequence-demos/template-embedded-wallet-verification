import { useState, useEffect } from 'react'
import './App.css'

import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import embeddedWallet from './SequenceEmbeddedWallet.ts'

function App() {
  const [nonce, setNonce] = useState<any>(null)
  const [sessionHash, setSessionHash] = useState("")
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [walletVerified, setWalletVerified] = useState(false)
  const [walletRegistered, setWalletRegistered] = useState(false)

  useEffect(() => {
    const handler = async () => {
      try {
          setSessionHash(await embeddedWallet.getSessionHash())
      } catch (error) {
          console.error(error)
      }
    }
    handler()
    return embeddedWallet.onSessionStateChanged(handler)
  }, [setSessionHash])

  useEffect(() => {

  }, [sessionHash, walletAddress, walletRegistered, walletVerified, nonce ])

  useEffect(() => {
    fetch('http://localhost:3001/check/' + walletAddress, {
          method: 'GET',
      })
      .then(response => response.json()) // Parsing the JSON response
      .then(data => {setNonce(Object.values(data)[0]);setWalletRegistered(true)}) // Logging the response data
      .catch(error => console.error('Error:', error));
  }, [walletAddress])

  useEffect(() => {
    setTimeout(async () => {
      try{
        const sessions = await embeddedWallet.listSessions()
        console.log(sessions)
        await embeddedWallet.dropSession({ sessionId: sessions[0].id })
      }catch(err){
        console.log(err)
      }
    }, 0)
  }, [])

  const handleGoogleLogin = async (tokenResponse: CredentialResponse) => {
    const res = await embeddedWallet.signIn({
      idToken: tokenResponse.credential!
    }, "Embbedded Wallet Verification")
    
    setWalletAddress(res.wallet)
  }

  const register = async () => {
    fetch('http://localhost:3001/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            walletAddress: walletAddress,
        })
    })
    .then(response => response.json()) // Parsing the JSON response
    .then(data => console.log(data)) // Logging the response data
    .catch(error => console.error('Error:', error)); // Handling errors
  }

  const verify = async () => {
    const authProof = await embeddedWallet.sessionAuthProof({ nonce }) 

    console.log(authProof)

    
    fetch('http://localhost:3001/verify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            walletAddress: walletAddress, 
            nonce: nonce,
            signature: authProof.data.signature,
            sessionID: authProof.data.sessionId,
            chainId: authProof.data.network,
            messageProof: authProof.data.message
        })
    })
    .then(response => response.json()) // Parsing the JSON response
    .then(data => {console.log(data);setWalletVerified(data.valid)}) // Logging the response data
    .catch(error => console.error('Error:', error)); // Handling errors
  }

  return (
    <>
      <div className='App'>
        <br/>
        {
          walletAddress == '' && <GoogleLogin 
            nonce={sessionHash}
            key={sessionHash}
            onSuccess={handleGoogleLogin} shape="circle" width={230} />
        }
        <br/> 
        {walletAddress != '' && <button onClick={() => register()}>register</button> }
        {walletAddress != '' && <button disabled={!walletRegistered} onClick={() => verify()}>verify</button> }
      </div>
      {walletAddress != '' && <p>is wallet registered: {walletRegistered.toString()}</p>}
      {walletAddress != '' && <p>is wallet verified: {walletVerified.toString()}</p>}
    </>
  )
}

export default App
