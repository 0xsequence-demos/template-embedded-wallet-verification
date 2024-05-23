import { useState, useEffect } from 'react'
import './App.css'
import logo from './Sequence-Icon-Square.png'
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import embeddedWallet from './SequenceEmbeddedWallet.ts'
import { useTheme } from '@0xsequence/design-system';
import { Button, Text, Card } from '@0xsequence/design-system';

function App() {

  const {setTheme} = useTheme()

  setTheme('light')

  const [nonce, setNonce] = useState<any>(null)
  const [sessionHash, setSessionHash] = useState("")
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [walletVerified, setWalletVerified] = useState(false)
  const [walletRegistered, setWalletRegistered] = useState(false)
  const [isToggled, setIsToggled] = useState(false);

  const handleToggle = () => {
    setIsToggled(!isToggled);
  };

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

  }, [sessionHash, walletAddress, walletRegistered, walletVerified, nonce, isToggled])

  useEffect(() => {
    fetch('http://localhost:3001/check/' + walletAddress + '/' + isToggled, {
          method: 'GET',
      })
      .then(response => response.json()) // Parsing the JSON response
      .then(data => {console.log(data);setNonce(Object.values(data)[0]);if(JSON.stringify(data) !== JSON.stringify({})) {setWalletRegistered(true)}else setWalletRegistered(false)}) // Logging the response data
      .catch(error => console.error('Error:', error));
  }, [walletAddress, walletRegistered, isToggled])

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
            isExpiry: isToggled
        })
    })
    .then(response => response.json()) // Parsing the JSON response
    .then(data => {
      if(JSON.stringify(data) !== JSON.stringify({})) {
        setWalletRegistered(true)}
        console.log(data)
        setNonce((Object.values(data)[0] as any).nonce)
      }
    ) // Logging the response data
    .catch(error => console.error('Error:', error)); // Handling errors
  }

  const verify = async () => {
    const authProof = await embeddedWallet.sessionAuthProof({ nonce }) 

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
            messageProof: authProof.data.message,
            isExpiry: isToggled
        })
    })
    .then(response => response.json()) // Parsing the JSON response
    .then(data => {console.log(data);setWalletVerified(data.valid)}) // Logging the response data
    .catch(error => console.error('Error:', error)); // Handling errors
  }

  useEffect(() => {
    if(isToggled){
      setWalletRegistered(false)
      setWalletVerified(false)
    } else {
      setWalletVerified(false)
    }
  }, [isToggled])
  return (
    <>  
      <div style={{marginLeft: '35px'}}>
        <img width={'100px'} src={logo} />
        <br/>
          <Text>Sequence Embedded Wallet <br/>Proof Verification</Text>
          <br/>
          <br/>
          {
            walletAddress == '' && <GoogleLogin 
              nonce={sessionHash}
              key={sessionHash}
              onSuccess={handleGoogleLogin} shape="circle" width={230} />
          }
      </div>
      <br/> 
      <br/>
      {walletAddress != '' && <Card>
        <div className='App'>
          <div className="center-container">
            <>
              <p>optional: toggle for 30s proof expiry</p>
              <br/>
              <input 
              type="checkbox"
              id="switch"
              checked={isToggled}
              onChange={handleToggle}
              />
              <label htmlFor="switch"></label>
            </>
          </div>
        </div>
        <br/>
        <br/>
        <Button onClick={() => register()} label="register"/> 
        <Button disabled={!walletRegistered}  onClick={() => verify()} label="verify"/> 
        <p>is wallet registered: {walletRegistered.toString()}</p>
        <p>is wallet verified: {walletVerified.toString()}</p>
      </Card> }
    </>
  )
}

export default App
