import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useSessionHash } from "./useSessionHash.ts";
import { GoogleOAuthProvider } from '@react-oauth/google'
import {ThemeProvider} from '@0xsequence/design-system'
import "@0xsequence/design-system/styles.css"
function Dapp(){
  const { sessionHash } = useSessionHash()
  return(
    <GoogleOAuthProvider clientId="970987756660-6ibakd38eibf3cg9rq42hri7o0jn5va8.apps.googleusercontent.com" nonce={sessionHash} key={sessionHash}>
			<App />
		</GoogleOAuthProvider>
  )
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <Dapp/>
    </ThemeProvider>
  </React.StrictMode>,
)
