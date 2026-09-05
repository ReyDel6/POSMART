import React  from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {GoogleOAuthProvider} from '@react-oauth/google'
import { CartProvider } from './context/CartProvider.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="396283959303-np2qjj7nv9023rfgigis7p6dmkt7bup5.apps.googleusercontent.com">
      <CartProvider>
        <App />
      </CartProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)