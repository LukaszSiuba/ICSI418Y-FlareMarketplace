import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './index.css'
import './global.css'
import { BrowserRouter } from 'react-router-dom'
//Don't touch this code, main.jsx file for our app which allows to render it.
const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>

)
