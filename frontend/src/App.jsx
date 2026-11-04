import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Detail from "./pages/Detail";
import Login from "./pages/Login";
import MyLists from "./pages/MyLists";
import Yolo from "./pages/Yolo";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/:mediaType/:id" element={<Detail />} />
          <Route path="/yolo" element={<Yolo />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/my-lists"
            element={
              <ProtectedRoute>
                <MyLists />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
