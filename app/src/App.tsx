import Profile from './pages/Profile'
import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import PostDetail from './pages/PostDetail'
import Write from './pages/Write'
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import CustomCursor from './sections/CustomCursor'
import SiteHeader from './components/SiteHeader'
import Guestbook from './pages/Guestbook'
import ChatWidget from './components/ChatWidget'

export default function App() {
  return (
    <>
      <CustomCursor />
      <SiteHeader />
      <ChatWidget />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/write" element={<Write />} />
        <Route path="/edit/:id" element={<Write />} />
        <Route path="/login" element={<Login />} />
        <Route path="/guestbook" element={<Guestbook />} />
          <Route path="/profile/:id" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
