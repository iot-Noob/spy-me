import { Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import './App.css'
import { pages } from './index'
  import { toast, ToastContainer } from 'react-toastify';
  import 'react-toastify/dist/ReactToastify.css';

function App() {
 
  return (
    <>
        <ToastContainer
        position="top-right"   // top-right, top-center, bottom-left, etc.
        autoClose={5000}       // auto close after 3 seconds
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"        // "light", "dark", or "colored"
      />
 
<Suspense fallback={<div>Loading...</div>}>
  <Routes>
    {pages.map((v, i) => (
      <Route key={i} path={v.path} element={v.element} />
    ))}
  </Routes>
</Suspense>
     
    </>
  )
}

export default App
